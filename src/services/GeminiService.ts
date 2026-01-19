/**
 * GeminiService - Gemini Multimodal Live API WebSocket 클라이언트
 * 강화된 에러 처리 및 재연결 로직
 */

import {
  CONSTANTS,
  ConnectionState,
  GeminiSetupMessage,
  GeminiRealtimeInput,
  GeminiResponse,
} from '../types';

// 에러 타입 정의
export type GeminiErrorType =
  | 'API_KEY_INVALID'
  | 'API_KEY_MISSING'
  | 'NETWORK_ERROR'
  | 'CONNECTION_TIMEOUT'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'WEBSOCKET_ERROR'
  | 'UNKNOWN';

export interface GeminiError {
  type: GeminiErrorType;
  message: string;
  retryable: boolean;
  details?: unknown;
}

// CEO 영어 튜터 시스템 프롬프트 (개선됨)
const CEO_PERSONA_PROMPT = `You are an expert English tutor specifically designed for busy Korean tech startup CEOs who are learning English during their commute.

## Your Role
- You are a patient, encouraging, and professional English conversation partner
- Focus on business English relevant to tech startups: fundraising, pitching, negotiations, team management
- Understand Korean business culture and common English mistakes Korean speakers make

## Communication Style
- Keep responses concise: MAX 2-3 sentences unless asked for more detail
- Speak clearly and at a moderate pace suitable for intermediate learners
- Use vocabulary relevant to: AI Agents, Government Grants (정부과제), Series A/B funding, investor meetings, product demos

## Key Behaviors
1. When the user makes a grammar or pronunciation mistake, gently correct them with the pattern:
   "Good try! A more natural way to say that would be: [correct phrase]. [Brief 1-sentence explanation]"
2. Provide natural alternatives that native speakers would use in business contexts
3. If the user seems stuck or pauses for too long, provide helpful prompts
4. Celebrate small wins to keep motivation high

## Example Topics You Can Help With
- Preparing for investor pitch meetings ("How do I explain our burn rate?")
- Negotiating with international partners
- Writing professional emails and LinkedIn messages
- Conference call and video meeting etiquette
- Small talk with foreign clients and investors
- Explaining technical products to non-technical audiences

## Important Context
- The user is driving, so keep all interactions brief and crystal clear
- They prefer direct, actionable feedback over lengthy explanations
- Time is precious - be efficient but warm and encouraging
- If they make mistakes, focus on the most important one to correct

## Session Start
Greet the user warmly but briefly (1 sentence), then ask what they'd like to practice today. Suggest 2-3 quick options if they seem unsure.`;

export class GeminiService {
  private ws: WebSocket | null = null;
  private apiKey: string = '';
  private reconnectAttempts = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private isSetupComplete = false;
  private lastActivityTime = 0;

  // 상태
  public connectionState: ConnectionState = 'disconnected';

  // 콜백
  public onConnectionStateChange: ((state: ConnectionState) => void) | null = null;
  public onAudioReceived: ((data: ArrayBuffer) => void) | null = null;
  public onTranscriptReceived: ((text: string, isFinal: boolean) => void) | null = null;
  public onSetupComplete: (() => void) | null = null;
  public onError: ((error: GeminiError) => void) | null = null;
  public onTurnComplete: (() => void) | null = null;
  public onInterrupted: (() => void) | null = null;

  /**
   * API 키 설정
   */
  setApiKey(key: string): void {
    this.apiKey = key.trim();
  }

  /**
   * API 키 유효성 검사
   */
  private validateApiKey(): GeminiError | null {
    if (!this.apiKey) {
      return {
        type: 'API_KEY_MISSING',
        message: 'API 키가 설정되지 않았습니다',
        retryable: false,
      };
    }

    // 기본 형식 검사 (Google API 키는 보통 39자)
    if (this.apiKey.length < 30) {
      return {
        type: 'API_KEY_INVALID',
        message: 'API 키 형식이 올바르지 않습니다',
        retryable: false,
      };
    }

    return null;
  }

  /**
   * WebSocket 연결
   */
  async connect(): Promise<boolean> {
    // API 키 검증
    const keyError = this.validateApiKey();
    if (keyError) {
      this.onError?.(keyError);
      return false;
    }

    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return true;
    }

    this.setConnectionState('connecting');
    this.clearTimeouts();

    try {
      const url = `${CONSTANTS.GEMINI_WS_URL}?key=${this.apiKey}`;
      this.ws = new WebSocket(url);

      return new Promise((resolve) => {
        if (!this.ws) {
          resolve(false);
          return;
        }

        // 연결 타임아웃
        this.connectionTimeout = setTimeout(() => {
          if (this.connectionState === 'connecting') {
            this.onError?.({
              type: 'CONNECTION_TIMEOUT',
              message: '연결 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.',
              retryable: true,
            });
            this.disconnect();
            resolve(false);
          }
        }, 15000);

        this.ws.onopen = () => {
          console.log('🔌 WebSocket 연결됨');
          this.lastActivityTime = Date.now();
          this.sendSetupMessage();
        };

        this.ws.onmessage = (event) => {
          this.lastActivityTime = Date.now();
          this.handleMessage(event.data);
          if (this.isSetupComplete && this.connectionState === 'connecting') {
            this.clearTimeouts();
            resolve(true);
          }
        };

        this.ws.onerror = (event) => {
          console.error('❌ WebSocket 에러:', event);
          this.handleWebSocketError(event);
          resolve(false);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket 연결 해제:', event.code, event.reason);
          this.handleDisconnect(event);
        };
      });
    } catch (error) {
      console.error('❌ 연결 실패:', error);
      this.setConnectionState('disconnected');
      this.onError?.({
        type: 'NETWORK_ERROR',
        message: '네트워크 연결에 실패했습니다',
        retryable: true,
        details: error,
      });
      return false;
    }
  }

  /**
   * 연결 해제
   */
  disconnect(): void {
    this.clearTimeouts();
    this.stopPing();

    if (this.ws) {
      this.ws.onclose = null; // 재연결 방지
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }

    this.isSetupComplete = false;
    this.reconnectAttempts = 0;
    this.setConnectionState('disconnected');
  }

  /**
   * 오디오 데이터 전송
   */
  sendAudio(data: ArrayBuffer): void {
    if (!this.ws || this.connectionState !== 'connected' || !this.isSetupComplete) {
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket이 열려있지 않음');
      return;
    }

    const base64Data = this.arrayBufferToBase64(data);

    const message: GeminiRealtimeInput = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: 'audio/pcm;rate=16000',
            data: base64Data,
          },
        ],
      },
    };

    try {
      this.ws.send(JSON.stringify(message));
      this.lastActivityTime = Date.now();
    } catch (error) {
      console.error('❌ 오디오 전송 실패:', error);
    }
  }

  /**
   * 텍스트 메시지 전송
   */
  sendText(text: string): void {
    if (!this.ws || this.connectionState !== 'connected' || !this.isSetupComplete) {
      return;
    }

    const message = {
      client_content: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turn_complete: true,
      },
    };

    try {
      this.ws.send(JSON.stringify(message));
      this.lastActivityTime = Date.now();
    } catch (error) {
      console.error('❌ 텍스트 전송 실패:', error);
    }
  }

  /**
   * 셋업 메시지 전송
   */
  private sendSetupMessage(): void {
    if (!this.ws) return;

    const setupMessage: GeminiSetupMessage = {
      setup: {
        model: `models/${CONSTANTS.GEMINI_MODEL}`,
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: 'Kore', // 깔끔하고 전문적인 음성
              },
            },
          },
        },
        system_instruction: {
          parts: [{ text: CEO_PERSONA_PROMPT }],
        },
      },
    };

    try {
      this.ws.send(JSON.stringify(setupMessage));
      console.log('📤 Setup 메시지 전송');
    } catch (error) {
      console.error('❌ Setup 메시지 전송 실패:', error);
    }
  }

  /**
   * 메시지 처리
   */
  private handleMessage(data: string): void {
    try {
      const response: GeminiResponse = JSON.parse(data);

      // 셋업 완료
      if (response.setupComplete) {
        console.log('✅ Gemini 셋업 완료');
        this.isSetupComplete = true;
        this.setConnectionState('connected');
        this.startPing();
        this.onSetupComplete?.();
        return;
      }

      // 서버 컨텐츠 (오디오/텍스트 응답)
      if (response.serverContent?.modelTurn) {
        for (const part of response.serverContent.modelTurn.parts) {
          // 텍스트 응답
          if (part.text) {
            this.onTranscriptReceived?.(part.text, false);
          }

          // 오디오 응답
          if (part.inlineData?.mimeType.includes('audio')) {
            const audioData = this.base64ToArrayBuffer(part.inlineData.data);
            this.onAudioReceived?.(audioData);
          }
        }
      }

      // 턴 완료
      if (response.serverContent?.turnComplete) {
        console.log('✅ AI 턴 완료');
        this.onTurnComplete?.();
      }

      // 인터럽트
      if (response.serverContent?.interrupted) {
        console.log('🛑 응답 인터럽트');
        this.onInterrupted?.();
      }
    } catch (error) {
      console.error('❌ 메시지 파싱 오류:', error);
    }
  }

  /**
   * WebSocket 에러 처리
   */
  private handleWebSocketError(event: Event): void {
    let error: GeminiError;

    // 에러 타입 추론
    if (!navigator.onLine) {
      error = {
        type: 'NETWORK_ERROR',
        message: '인터넷 연결이 끊어졌습니다',
        retryable: true,
      };
    } else {
      error = {
        type: 'WEBSOCKET_ERROR',
        message: '서버 연결 중 오류가 발생했습니다',
        retryable: true,
        details: event,
      };
    }

    this.onError?.(error);
  }

  /**
   * 연결 해제 처리
   */
  private handleDisconnect(event: CloseEvent): void {
    this.clearTimeouts();
    this.stopPing();
    this.isSetupComplete = false;

    // 정상 종료가 아닌 경우에만 재연결
    if (event.code !== 1000 && this.reconnectAttempts < CONSTANTS.RECONNECT_MAX_ATTEMPTS) {
      this.setConnectionState('reconnecting');
      this.reconnectAttempts++;

      // 지수 백오프 (1초, 2초, 4초, 8초, 16초)
      const delay = Math.min(Math.pow(2, this.reconnectAttempts - 1) * 1000, 16000);
      console.log(`🔄 ${delay / 1000}초 후 재연결 시도 (${this.reconnectAttempts}/${CONSTANTS.RECONNECT_MAX_ATTEMPTS})`);

      setTimeout(() => {
        if (this.connectionState === 'reconnecting') {
          this.connect();
        }
      }, delay);
    } else if (event.code !== 1000) {
      this.setConnectionState('disconnected');

      // 에러 코드에 따른 메시지
      let errorType: GeminiErrorType = 'UNKNOWN';
      let message = '연결이 끊어졌습니다';

      if (event.code === 4001 || event.reason?.includes('API key')) {
        errorType = 'API_KEY_INVALID';
        message = 'API 키가 유효하지 않습니다. 설정을 확인해주세요.';
      } else if (event.code === 4029 || event.reason?.includes('rate limit')) {
        errorType = 'RATE_LIMIT';
        message = '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (event.code >= 4000 && event.code < 5000) {
        errorType = 'SERVER_ERROR';
        message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }

      this.onError?.({
        type: errorType,
        message,
        retryable: errorType !== 'API_KEY_INVALID',
        details: { code: event.code, reason: event.reason },
      });
    } else {
      this.setConnectionState('disconnected');
    }
  }

  /**
   * 연결 상태 변경
   */
  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.onConnectionStateChange?.(state);

    if (state === 'connected') {
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Ping 시작 (연결 유지)
   */
  private startPing(): void {
    this.stopPing();

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // 마지막 활동으로부터 시간 체크
        const timeSinceLastActivity = Date.now() - this.lastActivityTime;

        if (timeSinceLastActivity > 60000) {
          // 1분 이상 비활성 → 연결 체크
          console.log('⚠️ 장시간 비활성, 연결 상태 확인 중...');
        }

        // 빈 메시지로 연결 유지
        try {
          this.ws.send('{}');
        } catch {
          console.warn('⚠️ Ping 전송 실패');
        }
      }
    }, CONSTANTS.PING_INTERVAL);
  }

  /**
   * Ping 중지
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * 타임아웃 정리
   */
  private clearTimeouts(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * ArrayBuffer -> Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    return btoa(binary);
  }

  /**
   * Base64 -> ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.isSetupComplete;
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.disconnect();
    this.onConnectionStateChange = null;
    this.onAudioReceived = null;
    this.onTranscriptReceived = null;
    this.onSetupComplete = null;
    this.onError = null;
    this.onTurnComplete = null;
    this.onInterrupted = null;
  }
}

// 싱글톤 인스턴스
export const geminiService = new GeminiService();
