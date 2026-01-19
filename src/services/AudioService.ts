/**
 * AudioService - Web Audio API를 사용한 오디오 캡처 및 재생
 * AudioWorklet 기반 (ScriptProcessorNode deprecated 대체)
 */

import { CONSTANTS } from '../types';

export interface VADState {
  isSpeaking: boolean;
  silenceFrames: number;
}

export class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyzerNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;

  private playbackQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private isWorkletReady = false;

  // 콜백
  public onAudioData: ((data: ArrayBuffer, isVoiceActive: boolean) => void) | null = null;
  public onAmplitudeChange: ((amplitude: number) => void) | null = null;
  public onPlaybackAmplitudeChange: ((amplitude: number) => void) | null = null;
  public onVADStateChange: ((speaking: boolean) => void) | null = null;

  // VAD 설정
  private vadEnabled = true;
  private vadThreshold = 0.015;
  private silenceThreshold = 25;

  /**
   * AudioWorklet 초기화
   */
  async initialize(): Promise<boolean> {
    try {
      // AudioContext 생성 (iOS Safari 호환)
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.audioContext = new AudioContextClass({
        sampleRate: CONSTANTS.INPUT_SAMPLE_RATE,
      });

      // iOS에서 AudioContext resume 필요
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // AudioWorklet 모듈 로드
      try {
        await this.audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
        this.isWorkletReady = true;
        console.log('✅ AudioWorklet 초기화 완료');
      } catch (workletError) {
        console.warn('⚠️ AudioWorklet 로드 실패, 폴백 모드 사용:', workletError);
        this.isWorkletReady = false;
      }

      return true;
    } catch (error) {
      console.error('❌ AudioContext 초기화 실패:', error);
      return false;
    }
  }

  /**
   * VAD 설정 변경
   */
  setVADConfig(config: { enabled?: boolean; threshold?: number; silenceFrames?: number }): void {
    if (config.enabled !== undefined) this.vadEnabled = config.enabled;
    if (config.threshold !== undefined) this.vadThreshold = config.threshold;
    if (config.silenceFrames !== undefined) this.silenceThreshold = config.silenceFrames;

    // Worklet에 설정 전달
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'setVadThreshold', value: this.vadThreshold });
      this.workletNode.port.postMessage({ type: 'setSilenceThreshold', value: this.silenceThreshold });
    }
  }

  /**
   * 마이크 캡처 시작
   */
  async startCapture(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }

      // 마이크 권한 요청
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: CONSTANTS.INPUT_SAMPLE_RATE,
        },
      });

      if (!this.audioContext) return false;

      // Resume context (iOS 필수)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 소스 노드 생성
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      if (this.isWorkletReady) {
        // AudioWorklet 사용
        await this.setupWorklet();
      } else {
        // 폴백: ScriptProcessorNode
        this.setupScriptProcessor();
      }

      console.log('🎤 마이크 캡처 시작');
      return true;
    } catch (error) {
      console.error('❌ 마이크 캡처 실패:', error);
      return false;
    }
  }

  /**
   * AudioWorklet 설정
   */
  private async setupWorklet(): Promise<void> {
    if (!this.audioContext || !this.sourceNode) return;

    this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-capture-processor');

    // Worklet 메시지 수신
    this.workletNode.port.onmessage = (event) => {
      const { type, value, buffer, isVoiceActive, speaking } = event.data;

      switch (type) {
        case 'amplitude':
          this.onAmplitudeChange?.(value);
          break;
        case 'audioData':
          if (this.vadEnabled) {
            // VAD 활성화: 음성 활동 시에만 전송
            if (isVoiceActive) {
              this.onAudioData?.(buffer, true);
            }
          } else {
            // VAD 비활성화: 항상 전송
            this.onAudioData?.(buffer, true);
          }
          break;
        case 'vadState':
          this.onVADStateChange?.(speaking);
          break;
      }
    };

    // VAD 설정 전달
    this.workletNode.port.postMessage({ type: 'setVadThreshold', value: this.vadThreshold });
    this.workletNode.port.postMessage({ type: 'setSilenceThreshold', value: this.silenceThreshold });

    // 노드 연결 (출력 없이 분석만)
    this.sourceNode.connect(this.workletNode);
    // Worklet은 destination에 연결하지 않음 (마이크 피드백 방지)
  }

  /**
   * 폴백: ScriptProcessorNode 설정 (deprecated but 호환성용)
   */
  private setupScriptProcessor(): void {
    if (!this.audioContext || !this.sourceNode) return;

    const processor = this.audioContext.createScriptProcessor(CONSTANTS.BUFFER_SIZE, 1, 1);
    let silenceFrames = 0;
    let isSpeaking = false;

    processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);

      // RMS 계산
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onAmplitudeChange?.(rms);

      // VAD
      const isVoiceActive = rms > this.vadThreshold;
      if (isVoiceActive) {
        silenceFrames = 0;
        if (!isSpeaking) {
          isSpeaking = true;
          this.onVADStateChange?.(true);
        }
      } else {
        silenceFrames++;
        if (isSpeaking && silenceFrames > this.silenceThreshold) {
          isSpeaking = false;
          this.onVADStateChange?.(false);
        }
      }

      // PCM 변환 및 전송
      if (!this.vadEnabled || isSpeaking || silenceFrames < 5) {
        const pcmData = this.float32ToInt16(inputData);
        this.onAudioData?.(pcmData.buffer, isVoiceActive);
      }
    };

    this.sourceNode.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  /**
   * 마이크 캡처 중지
   */
  stopCapture(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    console.log('🛑 마이크 캡처 중지');
  }

  /**
   * 오디오 재생 (24kHz PCM16 -> 재생)
   */
  async playAudio(pcmData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    if (!this.audioContext) return;

    // Resume context (iOS 필수)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.playbackQueue.push(pcmData);

    if (!this.isPlaying) {
      this.processPlaybackQueue();
    }
  }

  /**
   * 재생 큐 처리
   */
  private async processPlaybackQueue(): Promise<void> {
    if (!this.audioContext || this.playbackQueue.length === 0) {
      this.isPlaying = false;
      this.onPlaybackAmplitudeChange?.(0);
      return;
    }

    this.isPlaying = true;

    const pcmData = this.playbackQueue.shift()!;

    // Int16 -> Float32 변환
    const int16Array = new Int16Array(pcmData);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    // 재생 중 진폭 계산
    let sum = 0;
    for (let i = 0; i < float32Array.length; i++) {
      sum += float32Array[i] * float32Array[i];
    }
    const rms = Math.sqrt(sum / float32Array.length);
    this.onPlaybackAmplitudeChange?.(rms * 3); // 증폭

    // AudioBuffer 생성 (24kHz)
    const audioBuffer = this.audioContext.createBuffer(
      1,
      float32Array.length,
      CONSTANTS.OUTPUT_SAMPLE_RATE
    );
    audioBuffer.copyToChannel(float32Array, 0);

    // 버퍼 소스 생성 및 재생
    const bufferSource = this.audioContext.createBufferSource();
    bufferSource.buffer = audioBuffer;

    if (!this.gainNode) {
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      this.gainNode.connect(this.audioContext.destination);
    }

    bufferSource.connect(this.gainNode);
    bufferSource.start();

    // 재생 완료 후 다음 처리
    bufferSource.onended = () => {
      this.processPlaybackQueue();
    };
  }

  /**
   * 재생 중지
   */
  stopPlayback(): void {
    this.playbackQueue = [];
    this.isPlaying = false;
    this.onPlaybackAmplitudeChange?.(0);
  }

  /**
   * 볼륨 조절
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Float32 -> Int16 PCM 변환
   */
  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return int16Array;
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.stopCapture();
    this.stopPlayback();

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('🧹 AudioService 리소스 정리 완료');
  }
}

// 싱글톤 인스턴스
export const audioService = new AudioService();
