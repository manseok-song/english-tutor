/**
 * GeminiService - Gemini Multimodal Live API WebSocket 클라이언트
 */

import {
  CONSTANTS,
  ConnectionState,
  GeminiSetupMessage,
  GeminiRealtimeInput,
  GeminiResponse,
} from '../types';

// CEO 영어 튜터 시스템 프롬프트
const CEO_PERSONA_PROMPT = `You are an expert English tutor specifically designed for busy Korean tech startup CEOs who are learning English during their commute.

## Your Role
- You are a patient, encouraging, and professional English conversation partner
- Focus on business English relevant to tech startups: fundraising, pitching, negotiations, team management
- Understand Korean business culture and common English mistakes Korean speakers make

## Communication Style
- Keep responses concise: MAX 3 sentences unless asked for more detail
- Speak clearly and at a moderate pace suitable for intermediate learners
- Use vocabulary relevant to: AI Agents, Government Grants (정부과제), Series A/B funding, investor meetings

## Key Behaviors
1. When the user makes a grammar or pronunciation mistake, gently correct them
2. Provide the correct phrase and explain briefly why
3. Offer natural alternatives that native speakers would use
4. If the user seems stuck, provide helpful prompts or sentence starters

## Example Topics You Can Help With
- Preparing for investor pitch meetings
- Negotiating with international partners
- Writing professional emails
- Conference call etiquette
- Small talk with foreign clients

## Important Context
- The user is driving, so keep interactions brief and clear
- They prefer direct feedback over lengthy explanations
- Time is precious - be efficient but warm

Start by greeting the user briefly and asking what they'd like to practice today.`;

export class GeminiService {
  private ws: WebSocket | null = null;
  private apiKey: string = '';
  private reconnectAttempts = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isSetupComplete = false;

  public connectionState: ConnectionState = 'disconnected';
  public onConnectionStateChange: ((state: ConnectionState) => void) | null = null;
  public onAudioReceived: ((data: ArrayBuffer) => void) | null = null;
  public onTranscriptReceived: ((text: string) => void) | null = null;
  public onSetupComplete: (() => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  /**
   * API 키 설정
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * WebSocket 연결
   */
  async connect(): Promise<boolean> {
    if (!this.apiKey) {
      this.onError?.('API 키가 설정되지 않았습니다');
      return false;
    }

    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return true;
    }

    this.setConnectionState('connecting');

    try {
      const url = `${CONSTANTS.GEMINI_WS_URL}?key=${this.apiKey}`;
      this.ws = new WebSocket(url);

      return new Promise((resolve) => {
        if (!this.ws) {
          resolve(false);
          return;
        }

        this.ws.onopen = () => {
          console.log('🔌 WebSocket 연결됨');
          this.sendSetupMessage();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
          if (this.isSetupComplete) {
            resolve(true);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket 에러:', error);
          this.onError?.('연결 중 오류가 발생했습니다');
          resolve(false);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket 연결 해제');
          this.handleDisconnect();
        };

        // 타임아웃
        setTimeout(() => {
          if (this.connectionState === 'connecting') {
            this.onError?.('연결 시간 초과');
            this.disconnect();
            resolve(false);
          }
        }, 30000);
      });
    } catch (error) {
      console.error('❌ 연결 실패:', error);
      this.setConnectionState('disconnected');
      return false;
    }
  }

  /**
   * 연결 해제
   */
  disconnect(): void {
    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isSetupComplete = false;
    this.setConnectionState('disconnected');
  }

  /**
   * 오디오 데이터 전송
   */
  sendAudio(data: ArrayBuffer): void {
    if (!this.ws || this.connectionState !== 'connected' || !this.isSetupComplete) {
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

    this.ws.send(JSON.stringify(message));
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
                voice_name: 'Kore',
              },
            },
          },
        },
        system_instruction: {
          parts: [{ text: CEO_PERSONA_PROMPT }],
        },
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
    console.log('📤 Setup 메시지 전송');
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
            this.onTranscriptReceived?.(part.text);
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
      }

      // 인터럽트
      if (response.serverContent?.interrupted) {
        console.log('🛑 응답 인터럽트');
      }
    } catch (error) {
      console.error('❌ 메시지 파싱 오류:', error);
    }
  }

  /**
   * 연결 해제 처리
   */
  private handleDisconnect(): void {
    this.stopPing();
    this.isSetupComplete = false;

    if (this.reconnectAttempts < CONSTANTS.RECONNECT_MAX_ATTEMPTS) {
      this.setConnectionState('reconnecting');
      this.reconnectAttempts++;

      const delay = Math.pow(2, this.reconnectAttempts - 1) * 1000;
      console.log(`🔄 ${delay / 1000}초 후 재연결 시도 (${this.reconnectAttempts}/${CONSTANTS.RECONNECT_MAX_ATTEMPTS})`);

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.setConnectionState('disconnected');
      this.onError?.('연결이 끊어졌습니다. 다시 시도해주세요.');
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
   * Ping 시작
   */
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // 빈 메시지로 연결 유지
        this.ws.send('{}');
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
   * ArrayBuffer -> Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
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
}

// 싱글톤 인스턴스
export const geminiService = new GeminiService();
