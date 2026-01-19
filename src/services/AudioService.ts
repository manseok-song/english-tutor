/**
 * AudioService - Web Audio API를 사용한 오디오 캡처 및 재생
 */

import { CONSTANTS } from '../types';

export class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;

  private playbackQueue: Float32Array[] = [];
  private isPlaying = false;

  public onAudioData: ((data: ArrayBuffer) => void) | null = null;
  public onAmplitudeChange: ((amplitude: number) => void) | null = null;

  /**
   * 오디오 컨텍스트 초기화
   */
  async initialize(): Promise<boolean> {
    try {
      // AudioContext 생성 (iOS Safari 호환)
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: CONSTANTS.INPUT_SAMPLE_RATE,
      });

      // iOS에서 AudioContext resume 필요
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      return true;
    } catch (error) {
      console.error('❌ AudioContext 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 마이크 캡처 시작
   */
  async startCapture(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        await this.initialize();
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

      // 오디오 노드 체인 구성
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(CONSTANTS.BUFFER_SIZE, 1, 1);

      // 오디오 데이터 처리
      this.processorNode.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);

        // 진폭 계산
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const amplitude = sum / inputData.length;
        this.onAmplitudeChange?.(amplitude);

        // Float32 -> Int16 PCM 변환
        const pcmData = this.float32ToInt16(inputData);
        this.onAudioData?.(pcmData.buffer);
      };

      // 노드 연결
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      console.log('🎤 마이크 캡처 시작');
      return true;
    } catch (error) {
      console.error('❌ 마이크 캡처 실패:', error);
      return false;
    }
  }

  /**
   * 마이크 캡처 중지
   */
  stopCapture(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
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

    // Int16 -> Float32 변환
    const int16Array = new Int16Array(pcmData);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    // 재생 큐에 추가
    this.playbackQueue.push(float32Array);

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
      return;
    }

    this.isPlaying = true;

    const float32Array = this.playbackQueue.shift()!;

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
  }

  /**
   * Float32 -> Int16 PCM 변환
   */
  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return int16Array;
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.stopCapture();
    this.stopPlayback();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// 싱글톤 인스턴스
export const audioService = new AudioService();
