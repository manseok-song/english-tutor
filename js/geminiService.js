/**
 * geminiService.js
 * Gemini Multimodal Live API WebSocket 통신 서비스
 */

import { Constants } from './constants.js';

/**
 * GeminiService - Gemini API WebSocket 연결 및 통신 관리
 */
export class GeminiService {
    constructor() {
        // WebSocket
        this.websocket = null;

        // 상태
        this.isConnected = false;
        this.isSetupComplete = false;
        this.reconnectAttempts = 0;

        // 콜백
        this.onConnected = null;        // 연결 성공
        this.onDisconnected = null;     // 연결 해제
        this.onAudioResponse = null;    // 오디오 응답 수신
        this.onTextResponse = null;     // 텍스트 응답 수신
        this.onError = null;            // 에러 발생
        this.onSetupComplete = null;    // 설정 완료

        // API 키
        this.apiKey = null;

        console.log('[GeminiService] 초기화됨');
    }

    /**
     * API 키 설정
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * WebSocket 연결
     */
    async connect() {
        if (this.isConnected) {
            console.warn('[GeminiService] 이미 연결되어 있음');
            return true;
        }

        // API 키 확인
        if (!this.apiKey) {
            this.apiKey = localStorage.getItem(Constants.STORAGE.API_KEY);
        }

        if (!this.apiKey) {
            this.handleError('API 키가 설정되지 않았습니다');
            return false;
        }

        try {
            console.log('[GeminiService] WebSocket 연결 중...');

            // WebSocket URL 구성 (API 키 포함)
            const wsUrl = `${Constants.API.GEMINI_WEBSOCKET_URL}?key=${this.apiKey}`;

            // WebSocket 연결
            this.websocket = new WebSocket(wsUrl);

            // 이벤트 핸들러 설정
            this.setupEventHandlers();

            // 연결 대기 (타임아웃 포함)
            return await this.waitForConnection();

        } catch (error) {
            console.error('[GeminiService] 연결 실패:', error);
            this.handleError('Gemini API 연결에 실패했습니다');
            return false;
        }
    }

    /**
     * 연결 대기
     */
    waitForConnection() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (!this.isConnected) {
                    this.handleError('연결 타임아웃');
                    resolve(false);
                }
            }, Constants.API.CONNECTION_TIMEOUT);

            this.websocket.onopen = () => {
                clearTimeout(timeout);
                console.log('[GeminiService] WebSocket 연결 성공');
                this.isConnected = true;
                this.reconnectAttempts = 0;

                // 초기 설정 전송
                this.sendSetup();

                if (this.onConnected) {
                    this.onConnected();
                }

                resolve(true);
            };

            this.websocket.onerror = (error) => {
                clearTimeout(timeout);
                console.error('[GeminiService] WebSocket 에러:', error);
                this.handleError('WebSocket 연결 오류');
                resolve(false);
            };
        });
    }

    /**
     * WebSocket 이벤트 핸들러 설정
     */
    setupEventHandlers() {
        this.websocket.onmessage = (event) => {
            this.handleMessage(event);
        };

        this.websocket.onclose = (event) => {
            console.log('[GeminiService] WebSocket 연결 종료:', event.code, event.reason);
            this.isConnected = false;
            this.isSetupComplete = false;

            if (this.onDisconnected) {
                this.onDisconnected(event);
            }

            // 비정상 종료 시 재연결 시도
            if (event.code !== 1000 && this.reconnectAttempts < Constants.API.MAX_RECONNECT_ATTEMPTS) {
                this.scheduleReconnect();
            }
        };

        this.websocket.onerror = (error) => {
            console.error('[GeminiService] WebSocket 에러:', error);
            this.handleError('WebSocket 통신 오류');
        };
    }

    /**
     * 초기 설정 메시지 전송
     */
    sendSetup() {
        const setupMessage = {
            setup: {
                model: Constants.API.GEMINI_MODEL,
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Aoede'  // 여성 영어 음성
                            }
                        }
                    }
                },
                systemInstruction: {
                    parts: [{
                        text: this.getSystemPrompt()
                    }]
                }
            }
        };

        this.send(setupMessage);
        console.log('[GeminiService] 설정 메시지 전송됨');
    }

    /**
     * 시스템 프롬프트 (CEO 페르소나)
     */
    getSystemPrompt() {
        return `You are an AI English tutor specifically designed for busy tech startup CEOs in Korea who want to practice business English during their commute.

PERSONA:
- Name: Alex
- Role: Experienced business English coach
- Style: Professional yet friendly, efficient and to-the-point

BEHAVIOR RULES:
1. Keep all responses under 3 sentences - CEOs have limited time
2. Focus on business English: meetings, negotiations, presentations, investor pitches
3. Understand Korean business terms: Series A, 정부과제 (government grants), AI Agent, etc.
4. Provide gentle corrections for pronunciation and grammar
5. Use natural, conversational American English
6. If the user speaks in Korean, respond in English to encourage practice

TOPICS YOU EXCEL AT:
- Investor pitch presentations
- Business negotiations
- Email and meeting communication
- Tech industry vocabulary
- Startup ecosystem terminology

INTERACTION STYLE:
- Start conversations with a brief greeting
- Ask follow-up questions to keep the conversation flowing
- Provide quick tips when you notice common mistakes
- Be encouraging but honest about areas for improvement`;
    }

    /**
     * 메시지 수신 처리
     */
    handleMessage(event) {
        try {
            // 텍스트 메시지
            if (typeof event.data === 'string') {
                const message = JSON.parse(event.data);
                this.processTextMessage(message);
            }
            // 바이너리 메시지 (오디오)
            else if (event.data instanceof Blob) {
                this.processAudioMessage(event.data);
            }
        } catch (error) {
            console.error('[GeminiService] 메시지 파싱 오류:', error);
        }
    }

    /**
     * 텍스트 메시지 처리
     */
    processTextMessage(message) {
        console.log('[GeminiService] 수신 메시지:', message);

        // 설정 완료 응답
        if (message.setupComplete) {
            console.log('[GeminiService] 설정 완료');
            this.isSetupComplete = true;
            if (this.onSetupComplete) {
                this.onSetupComplete();
            }
            return;
        }

        // 서버 컨텐츠 (응답)
        if (message.serverContent) {
            const content = message.serverContent;

            // 모델 턴 (응답 중)
            if (content.modelTurn) {
                const parts = content.modelTurn.parts || [];

                for (const part of parts) {
                    // 텍스트 응답
                    if (part.text && this.onTextResponse) {
                        this.onTextResponse(part.text);
                    }

                    // 인라인 오디오 데이터
                    if (part.inlineData && part.inlineData.mimeType?.includes('audio')) {
                        const audioData = this.base64ToArrayBuffer(part.inlineData.data);
                        if (this.onAudioResponse) {
                            this.onAudioResponse(audioData);
                        }
                    }
                }
            }

            // 턴 완료
            if (content.turnComplete) {
                console.log('[GeminiService] 응답 턴 완료');
            }
        }

        // 에러 응답
        if (message.error) {
            this.handleError(`API 에러: ${message.error.message || '알 수 없는 오류'}`);
        }
    }

    /**
     * 바이너리 오디오 메시지 처리
     */
    async processAudioMessage(blob) {
        try {
            const arrayBuffer = await blob.arrayBuffer();

            if (this.onAudioResponse) {
                this.onAudioResponse(arrayBuffer);
            }
        } catch (error) {
            console.error('[GeminiService] 오디오 처리 오류:', error);
        }
    }

    /**
     * 오디오 데이터 전송
     * @param {Int16Array} pcmData - PCM 16bit 오디오 데이터
     */
    sendAudio(pcmData) {
        if (!this.isConnected || !this.isSetupComplete) {
            console.warn('[GeminiService] 연결되지 않았거나 설정이 완료되지 않음');
            return;
        }

        // Base64 인코딩
        const base64Data = this.arrayBufferToBase64(pcmData.buffer);

        // 실시간 입력 메시지 (Gemini Live API 형식)
        const message = {
            realtimeInput: {
                audio: {
                    data: base64Data
                }
            }
        };

        this.send(message);
    }

    /**
     * 텍스트 메시지 전송
     * @param {string} text - 전송할 텍스트
     */
    sendText(text) {
        if (!this.isConnected || !this.isSetupComplete) {
            console.warn('[GeminiService] 연결되지 않았거나 설정이 완료되지 않음');
            return;
        }

        const message = {
            clientContent: {
                turns: [{
                    role: 'user',
                    parts: [{ text }]
                }],
                turnComplete: true
            }
        };

        this.send(message);
    }

    /**
     * 메시지 전송
     */
    send(message) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            console.warn('[GeminiService] WebSocket이 열려있지 않음');
            return;
        }

        const jsonMessage = JSON.stringify(message);
        this.websocket.send(jsonMessage);
    }

    /**
     * 연결 해제
     */
    disconnect() {
        if (this.websocket) {
            console.log('[GeminiService] 연결 해제 중...');
            this.websocket.close(1000, 'Client disconnect');
            this.websocket = null;
        }

        this.isConnected = false;
        this.isSetupComplete = false;
    }

    /**
     * 재연결 스케줄링
     */
    scheduleReconnect() {
        this.reconnectAttempts++;
        console.log(`[GeminiService] ${Constants.API.RECONNECT_DELAY}ms 후 재연결 시도 (${this.reconnectAttempts}/${Constants.API.MAX_RECONNECT_ATTEMPTS})`);

        setTimeout(() => {
            this.connect();
        }, Constants.API.RECONNECT_DELAY);
    }

    /**
     * 에러 처리
     */
    handleError(message) {
        console.error('[GeminiService] 에러:', message);
        if (this.onError) {
            this.onError(message);
        }
    }

    /**
     * ArrayBuffer → Base64 변환
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Base64 → ArrayBuffer 변환
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * 리소스 정리
     */
    destroy() {
        console.log('[GeminiService] 리소스 정리');
        this.disconnect();
        this.onConnected = null;
        this.onDisconnected = null;
        this.onAudioResponse = null;
        this.onTextResponse = null;
        this.onError = null;
    }
}

export default GeminiService;
