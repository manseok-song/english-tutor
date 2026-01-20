/**
 * vadService.js
 * Voice Activity Detection (VAD) - 음성 감지 서비스
 */

import { Constants } from './constants.js';

/**
 * VADService - 음성 활동 감지
 * 오디오 레벨 기반으로 사용자가 말하고 있는지 감지
 */
export class VADService {
    constructor() {
        // 설정
        this.threshold = Constants.AUDIO.VAD_THRESHOLD;  // 음성 감지 임계값
        this.silenceTimeout = Constants.AUDIO.SILENCE_TIMEOUT;  // 침묵 타임아웃 (ms)

        // 상태
        this.isSpeaking = false;      // 현재 말하고 있는지
        this.silenceStartTime = null; // 침묵 시작 시간
        this.speechStartTime = null;  // 말하기 시작 시간

        // 디바운스
        this.debounceDelay = 100;     // 디바운스 지연 (ms)
        this.consecutiveSpeech = 0;   // 연속 음성 감지 횟수
        this.consecutiveSilence = 0;  // 연속 침묵 감지 횟수
        this.requiredConsecutive = 3; // 상태 변경에 필요한 연속 횟수

        // 콜백
        this.onSpeechStart = null;    // 말하기 시작
        this.onSpeechEnd = null;      // 말하기 종료
        this.onVoiceActivity = null;  // 음성 활동 (speaking/silent)

        // 통계
        this.stats = {
            totalSpeechTime: 0,
            speechCount: 0,
            avgLevel: 0,
            maxLevel: 0
        };

        // 레벨 히스토리 (스무딩용)
        this.levelHistory = [];
        this.historySize = 5;

        console.log('[VADService] 초기화됨, 임계값:', this.threshold);
    }

    /**
     * 임계값 설정 (0-100 → 0.0-0.1 범위)
     * @param {number} value - 슬라이더 값 (0-100)
     */
    setThreshold(value) {
        // 슬라이더 값을 실제 임계값으로 변환
        // 낮은 값 = 더 민감 (작은 소리도 감지)
        // 높은 값 = 덜 민감 (큰 소리만 감지)
        this.threshold = (100 - value) / 1000;  // 0.1 ~ 0.001 범위
        console.log('[VADService] 임계값 변경:', this.threshold);
    }

    /**
     * 오디오 레벨 처리
     * @param {number} level - 오디오 레벨 (0.0 ~ 1.0)
     */
    processAudioLevel(level) {
        // 레벨 히스토리에 추가 (스무딩)
        this.levelHistory.push(level);
        if (this.levelHistory.length > this.historySize) {
            this.levelHistory.shift();
        }

        // 평균 레벨 계산 (노이즈 필터링)
        const smoothedLevel = this.levelHistory.reduce((a, b) => a + b, 0) / this.levelHistory.length;

        // 통계 업데이트
        this.updateStats(smoothedLevel);

        // 음성 감지 여부
        const isVoiceDetected = smoothedLevel > this.threshold;

        if (isVoiceDetected) {
            this.handleVoiceDetected(smoothedLevel);
        } else {
            this.handleSilenceDetected();
        }

        // 음성 활동 콜백
        if (this.onVoiceActivity) {
            this.onVoiceActivity({
                level: smoothedLevel,
                isSpeaking: this.isSpeaking,
                threshold: this.threshold
            });
        }
    }

    /**
     * 음성 감지 처리
     */
    handleVoiceDetected(level) {
        this.consecutiveSilence = 0;
        this.consecutiveSpeech++;

        // 디바운스: 연속으로 음성이 감지되어야 말하기 시작으로 판단
        if (!this.isSpeaking && this.consecutiveSpeech >= this.requiredConsecutive) {
            this.startSpeaking();
        }

        // 말하는 중이면 침묵 타이머 리셋
        if (this.isSpeaking) {
            this.silenceStartTime = null;
        }
    }

    /**
     * 침묵 감지 처리
     */
    handleSilenceDetected() {
        this.consecutiveSpeech = 0;
        this.consecutiveSilence++;

        if (this.isSpeaking) {
            // 침묵 시작 시간 기록
            if (!this.silenceStartTime) {
                this.silenceStartTime = Date.now();
            }

            // 침묵이 타임아웃을 초과하면 말하기 종료
            const silenceDuration = Date.now() - this.silenceStartTime;
            if (silenceDuration >= this.silenceTimeout) {
                this.endSpeaking();
            }
        }
    }

    /**
     * 말하기 시작
     */
    startSpeaking() {
        if (this.isSpeaking) return;

        console.log('[VADService] 말하기 시작');
        this.isSpeaking = true;
        this.speechStartTime = Date.now();
        this.silenceStartTime = null;
        this.stats.speechCount++;

        if (this.onSpeechStart) {
            this.onSpeechStart();
        }
    }

    /**
     * 말하기 종료
     */
    endSpeaking() {
        if (!this.isSpeaking) return;

        const speechDuration = Date.now() - this.speechStartTime;
        console.log('[VADService] 말하기 종료, 지속시간:', speechDuration, 'ms');

        this.isSpeaking = false;
        this.stats.totalSpeechTime += speechDuration;
        this.speechStartTime = null;
        this.silenceStartTime = null;

        if (this.onSpeechEnd) {
            this.onSpeechEnd(speechDuration);
        }
    }

    /**
     * 강제 종료 (세션 종료 시)
     */
    forceEnd() {
        if (this.isSpeaking) {
            this.endSpeaking();
        }
        this.reset();
    }

    /**
     * 상태 리셋
     */
    reset() {
        this.isSpeaking = false;
        this.silenceStartTime = null;
        this.speechStartTime = null;
        this.consecutiveSpeech = 0;
        this.consecutiveSilence = 0;
        this.levelHistory = [];
    }

    /**
     * 통계 업데이트
     */
    updateStats(level) {
        // 이동 평균
        this.stats.avgLevel = this.stats.avgLevel * 0.9 + level * 0.1;

        // 최대 레벨
        if (level > this.stats.maxLevel) {
            this.stats.maxLevel = level;
        }
    }

    /**
     * 통계 조회
     */
    getStats() {
        return {
            ...this.stats,
            isSpeaking: this.isSpeaking,
            threshold: this.threshold
        };
    }

    /**
     * 현재 말하고 있는지 확인
     */
    getSpeakingState() {
        return this.isSpeaking;
    }

    /**
     * 리소스 정리
     */
    destroy() {
        this.forceEnd();
        this.onSpeechStart = null;
        this.onSpeechEnd = null;
        this.onVoiceActivity = null;
        console.log('[VADService] 리소스 정리됨');
    }
}

export default VADService;
