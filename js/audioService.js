/**
 * audioService.js
 * Web Audio API를 사용한 마이크 입력 및 오디오 재생 서비스
 */

import { Constants } from './constants.js';

/**
 * AudioService - 마이크 입력 및 스피커 출력 관리
 */
export class AudioService {
    constructor() {
        // AudioContext
        this.audioContext = null;

        // 마이크 관련
        this.mediaStream = null;
        this.sourceNode = null;
        this.analyserNode = null;
        this.processorNode = null;

        // 스피커 관련 (오디오 재생)
        this.gainNode = null;

        // 상태
        this.isRecording = false;
        this.isPlaying = false;

        // 콜백
        this.onAudioData = null;      // PCM 데이터 콜백
        this.onAudioLevel = null;     // 오디오 레벨 콜백
        this.onError = null;          // 에러 콜백

        // 분석 데이터
        this.analyserData = null;

        console.log('[AudioService] 초기화됨');
    }

    /**
     * 마이크 권한 요청 및 오디오 스트림 획득
     */
    async requestMicrophonePermission() {
        try {
            console.log('[AudioService] 마이크 권한 요청 중...');

            // 마이크 스트림 요청
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: Constants.AUDIO.INPUT_SAMPLE_RATE,
                    channelCount: Constants.AUDIO.CHANNELS,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            console.log('[AudioService] 마이크 권한 획득 완료');
            return true;
        } catch (error) {
            console.error('[AudioService] 마이크 권한 요청 실패:', error);

            if (error.name === 'NotAllowedError') {
                this.handleError('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
            } else if (error.name === 'NotFoundError') {
                this.handleError('마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
            } else {
                this.handleError(`마이크 접근 오류: ${error.message}`);
            }

            return false;
        }
    }

    /**
     * AudioContext 초기화
     */
    async initAudioContext() {
        if (this.audioContext) {
            return;
        }

        try {
            // AudioContext 생성
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: Constants.AUDIO.INPUT_SAMPLE_RATE
            });

            // 일시 중단 상태면 재개
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            console.log('[AudioService] AudioContext 초기화 완료, 샘플레이트:', this.audioContext.sampleRate);

            // Gain 노드 (볼륨 조절용)
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);

        } catch (error) {
            console.error('[AudioService] AudioContext 초기화 실패:', error);
            this.handleError('오디오 시스템 초기화에 실패했습니다.');
        }
    }

    /**
     * 녹음 시작
     */
    async startRecording() {
        if (this.isRecording) {
            console.warn('[AudioService] 이미 녹음 중');
            return false;
        }

        // 마이크 권한 확인
        if (!this.mediaStream) {
            const hasPermission = await this.requestMicrophonePermission();
            if (!hasPermission) {
                return false;
            }
        }

        // AudioContext 초기화
        await this.initAudioContext();

        try {
            // 마이크 소스 노드 생성
            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Analyser 노드 (오디오 레벨 분석용)
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 2048;
            this.analyserData = new Float32Array(this.analyserNode.fftSize);

            // ScriptProcessor 노드 (PCM 데이터 추출용)
            // 참고: ScriptProcessor는 deprecated이지만 AudioWorklet보다 호환성이 좋음
            this.processorNode = this.audioContext.createScriptProcessor(
                Constants.AUDIO.BUFFER_SIZE,
                Constants.AUDIO.CHANNELS,
                Constants.AUDIO.CHANNELS
            );

            // 노드 연결: 마이크 → Analyser → Processor
            this.sourceNode.connect(this.analyserNode);
            this.analyserNode.connect(this.processorNode);
            this.processorNode.connect(this.audioContext.destination);

            // 오디오 처리 이벤트
            this.processorNode.onaudioprocess = (event) => {
                this.handleAudioProcess(event);
            };

            // 오디오 레벨 모니터링 시작
            this.startLevelMonitoring();

            this.isRecording = true;
            console.log('[AudioService] 녹음 시작');

            return true;
        } catch (error) {
            console.error('[AudioService] 녹음 시작 실패:', error);
            this.handleError('녹음 시작에 실패했습니다.');
            return false;
        }
    }

    /**
     * 녹음 중지
     */
    stopRecording() {
        if (!this.isRecording) {
            return;
        }

        console.log('[AudioService] 녹음 중지');

        // 노드 연결 해제
        if (this.processorNode) {
            this.processorNode.disconnect();
            this.processorNode.onaudioprocess = null;
            this.processorNode = null;
        }

        if (this.analyserNode) {
            this.analyserNode.disconnect();
            this.analyserNode = null;
        }

        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        // 레벨 모니터링 중지
        this.stopLevelMonitoring();

        this.isRecording = false;
    }

    /**
     * 오디오 처리 이벤트 핸들러
     */
    handleAudioProcess(event) {
        if (!this.isRecording || this.isPlaying) {
            return;
        }

        // 입력 채널 데이터 (Float32Array, -1.0 ~ 1.0)
        const inputData = event.inputBuffer.getChannelData(0);

        // PCM 16bit로 변환
        const pcmData = this.float32ToPCM16(inputData);

        // 콜백 호출
        if (this.onAudioData) {
            this.onAudioData(pcmData);
        }
    }

    /**
     * Float32 → PCM 16bit 변환
     */
    float32ToPCM16(float32Array) {
        const pcm16 = new Int16Array(float32Array.length);

        for (let i = 0; i < float32Array.length; i++) {
            // -1.0 ~ 1.0 → -32768 ~ 32767
            const sample = Math.max(-1, Math.min(1, float32Array[i]));
            pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        return pcm16;
    }

    /**
     * PCM 16bit → Float32 변환
     */
    pcm16ToFloat32(pcm16Array) {
        const float32 = new Float32Array(pcm16Array.length);

        for (let i = 0; i < pcm16Array.length; i++) {
            // -32768 ~ 32767 → -1.0 ~ 1.0
            float32[i] = pcm16Array[i] / 0x8000;
        }

        return float32;
    }

    /**
     * 오디오 레벨 모니터링 시작
     */
    startLevelMonitoring() {
        if (this.levelInterval) {
            return;
        }

        this.levelInterval = setInterval(() => {
            if (!this.analyserNode || !this.isRecording) {
                return;
            }

            // 시간 도메인 데이터 획득
            this.analyserNode.getFloatTimeDomainData(this.analyserData);

            // RMS (Root Mean Square) 계산
            let sum = 0;
            for (let i = 0; i < this.analyserData.length; i++) {
                sum += this.analyserData[i] * this.analyserData[i];
            }
            const rms = Math.sqrt(sum / this.analyserData.length);

            // 0.0 ~ 1.0 범위로 정규화 (로그 스케일 적용)
            const level = Math.min(1, rms * 5); // 민감도 조절

            // 콜백 호출
            if (this.onAudioLevel) {
                this.onAudioLevel(level);
            }

        }, 50); // 50ms 간격
    }

    /**
     * 오디오 레벨 모니터링 중지
     */
    stopLevelMonitoring() {
        if (this.levelInterval) {
            clearInterval(this.levelInterval);
            this.levelInterval = null;
        }
    }

    /**
     * PCM 오디오 재생
     * @param {Int16Array|ArrayBuffer} pcmData - PCM 16bit 데이터
     * @param {number} sampleRate - 샘플레이트 (기본: 24000)
     */
    async playAudio(pcmData, sampleRate = Constants.AUDIO.OUTPUT_SAMPLE_RATE) {
        if (!this.audioContext) {
            await this.initAudioContext();
        }

        try {
            // Int16Array로 변환
            let int16Data;
            if (pcmData instanceof ArrayBuffer) {
                int16Data = new Int16Array(pcmData);
            } else if (pcmData instanceof Int16Array) {
                int16Data = pcmData;
            } else {
                console.error('[AudioService] 지원하지 않는 오디오 데이터 형식');
                return;
            }

            // Float32로 변환
            const float32Data = this.pcm16ToFloat32(int16Data);

            // AudioBuffer 생성
            const audioBuffer = this.audioContext.createBuffer(
                1, // 채널 수 (모노)
                float32Data.length,
                sampleRate
            );

            // 데이터 복사
            audioBuffer.getChannelData(0).set(float32Data);

            // BufferSource 노드 생성 및 재생
            const bufferSource = this.audioContext.createBufferSource();
            bufferSource.buffer = audioBuffer;
            bufferSource.connect(this.gainNode);

            this.isPlaying = true;

            bufferSource.onended = () => {
                this.isPlaying = false;
            };

            bufferSource.start();

        } catch (error) {
            console.error('[AudioService] 오디오 재생 실패:', error);
            this.isPlaying = false;
        }
    }

    /**
     * 오디오 재생 중지
     */
    stopPlayback() {
        // 현재 재생 중인 오디오를 중지하려면 BufferSource 참조가 필요
        // 간단히 isPlaying 플래그만 설정
        this.isPlaying = false;
    }

    /**
     * 볼륨 설정
     * @param {number} volume - 볼륨 (0.0 ~ 1.0)
     */
    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * 에러 처리
     */
    handleError(message) {
        console.error('[AudioService] 에러:', message);
        if (this.onError) {
            this.onError(message);
        }
    }

    /**
     * 리소스 정리
     */
    destroy() {
        console.log('[AudioService] 리소스 정리');

        this.stopRecording();

        // 미디어 스트림 정리
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // AudioContext 정리
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

export default AudioService;
