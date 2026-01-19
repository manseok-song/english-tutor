/**
 * AntiGravity 타입 정의
 */

// 음성 인터페이스 상태
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

// WebSocket 연결 상태
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// 파티클 색상
export interface ParticleColor {
  r: number;
  g: number;
  b: number;
}

// 파티클 모델
export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
}

// 오디오 설정
export interface AudioConfig {
  inputSampleRate: number;
  outputSampleRate: number;
  channels: number;
  bufferSize: number;
}

// Gemini 메시지 타입
export interface GeminiSetupMessage {
  setup: {
    model: string;
    generation_config?: {
      response_modalities: string[];
      speech_config?: {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: string;
          };
        };
      };
    };
    system_instruction?: {
      parts: Array<{ text: string }>;
    };
  };
}

export interface GeminiRealtimeInput {
  realtime_input: {
    media_chunks: Array<{
      mime_type: string;
      data: string;
    }>;
  };
}

export interface GeminiResponse {
  setupComplete?: Record<string, never>;
  serverContent?: {
    modelTurn?: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
}

// 상태별 색상 맵핑
export const STATE_COLORS: Record<VoiceState, ParticleColor> = {
  idle: { r: 51, g: 102, b: 230 },      // 파랑
  listening: { r: 51, g: 204, b: 102 }, // 초록
  processing: { r: 230, g: 204, b: 51 }, // 노랑
  speaking: { r: 153, g: 102, b: 230 }, // 보라
  error: { r: 230, g: 77, b: 77 },      // 빨강
};

// 상태별 표시 텍스트
export const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Ready',
  listening: 'Listening...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
  error: 'Error',
};

// 앱 상수
export const CONSTANTS = {
  GEMINI_WS_URL: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent',
  GEMINI_MODEL: 'gemini-2.0-flash-exp',
  INPUT_SAMPLE_RATE: 16000,
  OUTPUT_SAMPLE_RATE: 24000,
  BUFFER_SIZE: 4096,
  PARTICLE_COUNT: 60,
  RECONNECT_MAX_ATTEMPTS: 5,
  PING_INTERVAL: 25000,
} as const;
