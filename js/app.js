/**
 * app.js
 * AntiGravity 메인 앱 로직
 * Phase 2: VAD, Interruption, 파티클 UI, CEO 페르소나 통합
 */

import { Constants } from './constants.js';
import { AudioService } from './audioService.js';
import { GeminiService } from './geminiService.js';
import { VADService } from './vadService.js';
import { ParticleView } from './particleView.js';
import { getSystemPrompt } from './prompts.js';

// ===== 앱 상태 관리 =====
class AppState {
    constructor() {
        this.currentState = Constants.STATE.IDLE;
        this.isSessionActive = false;
        this.audioLevel = 0;
        this.errorMessage = null;
        this.isConnected = false;
        this.isUserSpeaking = false;  // VAD 기반 사용자 발화 상태

        // 이벤트 리스너 저장
        this.listeners = new Map();
    }

    // 상태 변경
    setState(newState) {
        if (this.currentState !== newState) {
            console.log(`[AppState] 상태 변경: ${this.currentState} → ${newState}`);
            this.currentState = newState;
            this.emit('stateChange', newState);
        }
    }

    // 세션 시작
    startSession() {
        if (this.isSessionActive) {
            console.warn('[AppState] 세션이 이미 활성화되어 있음');
            return false;
        }

        console.log('[AppState] 세션 시작');
        this.isSessionActive = true;
        this.errorMessage = null;
        this.setState(Constants.STATE.CONNECTING);
        this.emit('sessionStart');
        return true;
    }

    // 세션 종료
    endSession() {
        if (!this.isSessionActive) {
            console.warn('[AppState] 활성화된 세션이 없음');
            return false;
        }

        console.log('[AppState] 세션 종료');
        this.isSessionActive = false;
        this.audioLevel = 0;
        this.isUserSpeaking = false;
        this.setState(Constants.STATE.IDLE);
        this.emit('sessionEnd');
        return true;
    }

    // 에러 설정
    setError(message) {
        console.error('[AppState] 에러:', message);
        this.errorMessage = message;
        this.setState(Constants.STATE.ERROR);
        this.emit('error', message);
    }

    // 에러 초기화
    clearError() {
        this.errorMessage = null;
        if (this.currentState === Constants.STATE.ERROR) {
            this.setState(this.isSessionActive ? Constants.STATE.LISTENING : Constants.STATE.IDLE);
        }
    }

    // 오디오 레벨 업데이트
    updateAudioLevel(level) {
        this.audioLevel = level;
        this.emit('audioLevel', level);
    }

    // 사용자 발화 상태 업데이트
    setUserSpeaking(speaking) {
        this.isUserSpeaking = speaking;
        this.emit('userSpeaking', speaking);
    }

    // 이벤트 구독
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    // 이벤트 발행
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }
}

// ===== UI 컨트롤러 =====
class UIController {
    constructor(appState, onStartSession, onEndSession) {
        this.appState = appState;
        this.onStartSession = onStartSession;
        this.onEndSession = onEndSession;
        this.elements = {};

        this.init();
    }

    init() {
        // DOM 요소 캐싱
        this.elements = {
            statusOrb: document.getElementById('statusOrb'),
            statusLabel: document.getElementById('statusLabel'),
            errorMessage: document.getElementById('errorMessage'),
            startButton: document.getElementById('startButton'),
            settingsButton: document.getElementById('settingsButton'),
            settingsModal: document.getElementById('settingsModal'),
            apiKeyInput: document.getElementById('apiKeyInput'),
            vadThreshold: document.getElementById('vadThreshold'),
            vadThresholdValue: document.getElementById('vadThresholdValue'),
            saveSettings: document.getElementById('saveSettings'),
            closeSettings: document.getElementById('closeSettings'),
            audioLevelContainer: document.getElementById('audioLevelContainer'),
            audioLevelBar: document.getElementById('audioLevelBar')
        };

        // 이벤트 바인딩
        this.bindEvents();

        // 앱 상태 이벤트 구독
        this.subscribeToAppState();

        // 저장된 설정 로드
        this.loadSettings();

        console.log('[UIController] 초기화 완료');
    }

    bindEvents() {
        // 시작/종료 버튼
        this.elements.startButton.addEventListener('click', () => {
            if (this.appState.isSessionActive) {
                if (this.onEndSession) {
                    this.onEndSession();
                }
            } else {
                this.handleStartSession();
            }
        });

        // 설정 버튼
        this.elements.settingsButton.addEventListener('click', () => {
            this.openSettings();
        });

        // 설정 저장
        this.elements.saveSettings.addEventListener('click', () => {
            this.saveSettings();
        });

        // 설정 닫기
        this.elements.closeSettings.addEventListener('click', () => {
            this.closeSettings();
        });

        // VAD 슬라이더
        this.elements.vadThreshold.addEventListener('input', (e) => {
            this.elements.vadThresholdValue.textContent = e.target.value;
        });

        // 모달 외부 클릭 시 닫기
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });

        // 키보드 단축키 (스페이스바로 시작/종료)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                this.elements.startButton.click();
            }
        });
    }

    subscribeToAppState() {
        // 상태 변경 시 UI 업데이트
        this.appState.on('stateChange', (state) => {
            this.updateOrbState(state);
            this.updateStatusText(state);
            this.updateButton(state);
        });

        // 에러 발생 시
        this.appState.on('error', (message) => {
            this.showError(message);
        });

        // 오디오 레벨 업데이트
        this.appState.on('audioLevel', (level) => {
            this.updateAudioLevel(level);
        });

        // 세션 시작 시
        this.appState.on('sessionStart', () => {
            this.elements.audioLevelContainer.classList.remove('hidden');
        });

        // 세션 종료 시
        this.appState.on('sessionEnd', () => {
            this.elements.audioLevelContainer.classList.add('hidden');
        });
    }

    updateOrbState(state) {
        const orb = this.elements.statusOrb;
        orb.className = `status-orb ${state}`;
    }

    updateStatusText(state) {
        this.elements.statusLabel.textContent = Constants.STATE_TEXT[state] || '알 수 없음';
    }

    updateButton(state) {
        const button = this.elements.startButton;
        const isActive = this.appState.isSessionActive;

        if (isActive) {
            button.classList.add('active');
            button.querySelector('.button-icon').textContent = '⏹️';
            button.querySelector('.button-text').textContent = '종료';
        } else {
            button.classList.remove('active');
            button.querySelector('.button-icon').textContent = '🎤';
            button.querySelector('.button-text').textContent = '시작';
        }
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
    }

    hideError() {
        this.elements.errorMessage.classList.add('hidden');
    }

    updateAudioLevel(level) {
        const percentage = Math.min(level * 100, 100);
        this.elements.audioLevelBar.style.width = `${percentage}%`;
    }

    openSettings() {
        this.elements.settingsModal.classList.remove('hidden');
    }

    closeSettings() {
        this.elements.settingsModal.classList.add('hidden');
    }

    loadSettings() {
        const apiKey = localStorage.getItem(Constants.STORAGE.API_KEY) || '';
        this.elements.apiKeyInput.value = apiKey;

        const vadThreshold = localStorage.getItem(Constants.STORAGE.VAD_THRESHOLD) || '50';
        this.elements.vadThreshold.value = vadThreshold;
        this.elements.vadThresholdValue.textContent = vadThreshold;
    }

    saveSettings() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        const vadThreshold = this.elements.vadThreshold.value;

        localStorage.setItem(Constants.STORAGE.API_KEY, apiKey);
        localStorage.setItem(Constants.STORAGE.VAD_THRESHOLD, vadThreshold);

        console.log('[UIController] 설정 저장됨');
        this.closeSettings();

        // 앱에 VAD 임계값 변경 알림
        this.appState.emit('settingsChanged', { vadThreshold: parseInt(vadThreshold) });
    }

    handleStartSession() {
        const apiKey = localStorage.getItem(Constants.STORAGE.API_KEY);
        if (!apiKey) {
            this.appState.setError('API 키를 설정해주세요');
            this.openSettings();
            return;
        }

        this.hideError();

        if (this.onStartSession) {
            this.onStartSession();
        }
    }
}

// ===== 메인 앱 클래스 =====
class AntiGravityApp {
    constructor() {
        // 서비스 인스턴스
        this.audioService = new AudioService();
        this.geminiService = new GeminiService();
        this.vadService = new VADService();
        this.particleView = new ParticleView('particleCanvas');

        // 앱 상태
        this.appState = new AppState();

        // UI 컨트롤러
        this.uiController = new UIController(
            this.appState,
            () => this.startSession(),
            () => this.endSession()
        );

        // 서비스 이벤트 연결
        this.setupServiceCallbacks();

        // 설정 변경 이벤트
        this.appState.on('settingsChanged', (settings) => {
            if (settings.vadThreshold !== undefined) {
                this.vadService.setThreshold(settings.vadThreshold);
            }
        });

        // 상태 변경 시 파티클 업데이트
        this.appState.on('stateChange', (state) => {
            this.particleView.setState(state);
        });

        // 오디오 레벨 시 파티클 업데이트
        this.appState.on('audioLevel', (level) => {
            this.particleView.setAudioLevel(level);
        });

        // 지연 시간 측정
        this.latencyStart = null;

        // Interruption 관련
        this.isAISpeaking = false;
        this.currentPlaybackTimeout = null;

        // 초기 VAD 설정 로드
        const savedThreshold = localStorage.getItem(Constants.STORAGE.VAD_THRESHOLD);
        if (savedThreshold) {
            this.vadService.setThreshold(parseInt(savedThreshold));
        }

        console.log(`[AntiGravity] ${Constants.APP.NAME} v${Constants.APP.VERSION} 초기화 완료`);
    }

    /**
     * 서비스 콜백 설정
     */
    setupServiceCallbacks() {
        // === AudioService 콜백 ===

        // 오디오 데이터 수신 시 → Gemini로 전송
        this.audioService.onAudioData = (pcmData) => {
            // AI가 말하는 중이 아닐 때만 전송
            if (this.geminiService.isConnected &&
                this.geminiService.isSetupComplete &&
                !this.isAISpeaking) {
                this.geminiService.sendAudio(pcmData);

                // 지연 시간 측정 시작
                if (!this.latencyStart && this.appState.isUserSpeaking) {
                    this.latencyStart = Date.now();
                }
            }
        };

        // 오디오 레벨 업데이트 → VAD로 전달
        this.audioService.onAudioLevel = (level) => {
            this.appState.updateAudioLevel(level);
            this.vadService.processAudioLevel(level);
        };

        // AudioService 에러
        this.audioService.onError = (message) => {
            this.appState.setError(message);
        };

        // === VADService 콜백 ===

        // 말하기 시작
        this.vadService.onSpeechStart = () => {
            console.log('[App] 사용자 말하기 시작');
            this.appState.setUserSpeaking(true);

            // Interruption: AI가 말하는 중이면 중단
            if (this.isAISpeaking) {
                this.handleInterruption();
            }
        };

        // 말하기 종료
        this.vadService.onSpeechEnd = (duration) => {
            console.log('[App] 사용자 말하기 종료, 지속시간:', duration, 'ms');
            this.appState.setUserSpeaking(false);
        };

        // === GeminiService 콜백 ===

        // 연결 성공
        this.geminiService.onConnected = () => {
            console.log('[App] Gemini 연결됨');
            this.appState.isConnected = true;
        };

        // 연결 해제
        this.geminiService.onDisconnected = () => {
            console.log('[App] Gemini 연결 해제됨');
            this.appState.isConnected = false;

            if (this.appState.isSessionActive) {
                this.appState.setError('서버 연결이 끊어졌습니다');
            }
        };

        // 설정 완료
        this.geminiService.onSetupComplete = async () => {
            console.log('[App] Gemini 설정 완료, 녹음 시작');

            const started = await this.audioService.startRecording();

            if (started) {
                this.appState.setState(Constants.STATE.LISTENING);
            } else {
                this.appState.setError('마이크 시작에 실패했습니다');
            }
        };

        // 오디오 응답 수신 → 스피커로 재생
        this.geminiService.onAudioResponse = (audioData) => {
            // 지연 시간 측정
            if (this.latencyStart) {
                const latency = Date.now() - this.latencyStart;
                console.log(`[App] 응답 지연 시간: ${latency}ms`);
                this.latencyStart = null;
            }

            // AI 말하기 시작
            this.isAISpeaking = true;
            this.appState.setState(Constants.STATE.SPEAKING);

            // 오디오 재생
            this.audioService.playAudio(audioData, Constants.AUDIO.OUTPUT_SAMPLE_RATE);

            // 재생 완료 후 Listening으로 복귀
            const duration = (audioData.byteLength / 2) / Constants.AUDIO.OUTPUT_SAMPLE_RATE * 1000;

            // 이전 타임아웃 취소
            if (this.currentPlaybackTimeout) {
                clearTimeout(this.currentPlaybackTimeout);
            }

            this.currentPlaybackTimeout = setTimeout(() => {
                this.isAISpeaking = false;
                if (this.appState.isSessionActive && this.appState.currentState === Constants.STATE.SPEAKING) {
                    this.appState.setState(Constants.STATE.LISTENING);
                }
            }, duration + 100);
        };

        // 텍스트 응답 수신 (디버깅용)
        this.geminiService.onTextResponse = (text) => {
            console.log('[App] 텍스트 응답:', text);
        };

        // GeminiService 에러
        this.geminiService.onError = (message) => {
            this.appState.setError(message);
        };
    }

    /**
     * Interruption 처리 - 사용자가 AI 응답 중 끼어들기
     */
    handleInterruption() {
        console.log('[App] Interruption 발생 - AI 응답 중단');

        // 오디오 재생 중지
        this.audioService.stopPlayback();

        // 타임아웃 취소
        if (this.currentPlaybackTimeout) {
            clearTimeout(this.currentPlaybackTimeout);
            this.currentPlaybackTimeout = null;
        }

        // AI 말하기 상태 해제
        this.isAISpeaking = false;

        // Listening 상태로 전환
        this.appState.setState(Constants.STATE.LISTENING);
    }

    /**
     * 세션 시작
     */
    async startSession() {
        console.log('[App] 세션 시작 요청');

        if (!this.appState.startSession()) {
            return;
        }

        try {
            // CEO 페르소나 프롬프트 설정
            this.geminiService.getSystemPrompt = () => getSystemPrompt('full');

            // Gemini 연결
            const connected = await this.geminiService.connect();

            if (!connected) {
                this.appState.setError('Gemini API 연결에 실패했습니다');
                this.appState.endSession();
            }

        } catch (error) {
            console.error('[App] 세션 시작 오류:', error);
            this.appState.setError('세션 시작에 실패했습니다');
            this.appState.endSession();
        }
    }

    /**
     * 세션 종료
     */
    endSession() {
        console.log('[App] 세션 종료 요청');

        // VAD 종료
        this.vadService.forceEnd();

        // 녹음 중지
        this.audioService.stopRecording();

        // Gemini 연결 해제
        this.geminiService.disconnect();

        // 앱 상태 종료
        this.appState.endSession();

        // 지연 시간 측정 초기화
        this.latencyStart = null;

        // Interruption 관련 초기화
        this.isAISpeaking = false;
        if (this.currentPlaybackTimeout) {
            clearTimeout(this.currentPlaybackTimeout);
            this.currentPlaybackTimeout = null;
        }
    }

    /**
     * 앱 정리
     */
    destroy() {
        this.endSession();
        this.audioService.destroy();
        this.geminiService.destroy();
        this.vadService.destroy();
        this.particleView.destroy();
    }
}

// DOM 로드 후 앱 시작
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AntiGravityApp();
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});
