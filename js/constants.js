/**
 * constants.js
 * AntiGravity 앱 전역 상수 정의
 */

export const Constants = {
    // API 설정
    API: {
        // Gemini WebSocket 엔드포인트
        GEMINI_WEBSOCKET_URL: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent',

        // Gemini 모델명
        GEMINI_MODEL: 'models/gemini-2.0-flash-exp',

        // 연결 타임아웃 (ms)
        CONNECTION_TIMEOUT: 10000,

        // 재연결 대기 시간 (ms)
        RECONNECT_DELAY: 2000,

        // 최대 재연결 시도 횟수
        MAX_RECONNECT_ATTEMPTS: 3
    },

    // 오디오 설정
    AUDIO: {
        // 마이크 입력 샘플레이트 (Hz)
        INPUT_SAMPLE_RATE: 16000,

        // 출력 샘플레이트 (Hz)
        OUTPUT_SAMPLE_RATE: 24000,

        // 비트 깊이
        BIT_DEPTH: 16,

        // 채널 수 (모노)
        CHANNELS: 1,

        // 오디오 버퍼 크기
        BUFFER_SIZE: 4096,

        // VAD 임계값 (0-1 범위)
        VAD_THRESHOLD: 0.02,

        // 침묵 감지 시간 (ms)
        SILENCE_TIMEOUT: 1500
    },

    // UI 설정
    UI: {
        // 배경색 (다크 모드)
        BG_COLOR: '#0A0A0A',

        // Idle 상태 색상 (푸른색)
        IDLE_COLOR: '#3B82F6',

        // Listening 상태 색상 (초록색)
        LISTENING_COLOR: '#22C55E',

        // Speaking 상태 색상 (보라색)
        SPEAKING_COLOR: '#8B5CF6',

        // Error 상태 색상 (빨간색)
        ERROR_COLOR: '#EF4444',

        // 파티클 애니메이션 FPS
        PARTICLE_FPS: 60,

        // 기본 파티클 수
        DEFAULT_PARTICLE_COUNT: 100
    },

    // 앱 상태
    STATE: {
        IDLE: 'idle',
        CONNECTING: 'connecting',
        LISTENING: 'listening',
        SPEAKING: 'speaking',
        ERROR: 'error'
    },

    // 상태별 텍스트
    STATE_TEXT: {
        idle: '대기 중',
        connecting: '연결 중...',
        listening: '듣는 중...',
        speaking: '말하는 중...',
        error: '오류 발생'
    },

    // 로컬 스토리지 키
    STORAGE: {
        API_KEY: 'antigravity_api_key',
        VAD_THRESHOLD: 'antigravity_vad_threshold',
        SETTINGS: 'antigravity_settings'
    },

    // 앱 정보
    APP: {
        NAME: 'AntiGravity',
        VERSION: '1.0.0',
        DESCRIPTION: '운전 중인 CEO를 위한 핸즈프리 AI 영어 튜터'
    }
};

export default Constants;
