/**
 * useGemini - Gemini WebSocket 연결 관리 훅 (개선됨)
 * 강화된 에러 처리, 대화 기록 통합
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { geminiService, GeminiError } from '../services/GeminiService';
import { conversationHistoryService } from '../services/ConversationHistoryService';
import { ConnectionState } from '../types';

interface UseGeminiReturn {
  connectionState: ConnectionState;
  transcript: string;
  error: GeminiError | null;
  isConnected: boolean;
  connect: (apiKey: string) => Promise<boolean>;
  disconnect: () => void;
  sendAudio: (data: ArrayBuffer) => void;
  sendText: (text: string) => void;
  onAudioReceived: (callback: (data: ArrayBuffer) => void) => void;
  clearError: () => void;
}

export function useGemini(): UseGeminiReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<GeminiError | null>(null);

  const audioCallbackRef = useRef<((data: ArrayBuffer) => void) | null>(null);
  const transcriptBufferRef = useRef<string>('');

  // Gemini 서비스 콜백 설정
  useEffect(() => {
    // 연결 상태 변경
    geminiService.onConnectionStateChange = (state) => {
      setConnectionState(state);
      if (state === 'connected') {
        setError(null);
        // 대화 세션 시작
        conversationHistoryService.startSession();
      } else if (state === 'disconnected') {
        // 대화 세션 종료
        conversationHistoryService.endSession();
      }
    };

    // 텍스트 응답 수신
    geminiService.onTranscriptReceived = (text, isFinal) => {
      if (isFinal) {
        setTranscript(text);
        transcriptBufferRef.current = '';
        // 대화 기록 저장
        conversationHistoryService.saveMessage('assistant', text);
      } else {
        transcriptBufferRef.current += text;
        setTranscript(transcriptBufferRef.current);
      }
    };

    // 오디오 응답 수신
    geminiService.onAudioReceived = (data) => {
      audioCallbackRef.current?.(data);
    };

    // 에러 수신
    geminiService.onError = (err) => {
      setError(err);
      console.error('🔴 Gemini 에러:', err.type, err.message);
    };

    // 턴 완료
    geminiService.onTurnComplete = () => {
      // 최종 텍스트가 있으면 저장
      if (transcriptBufferRef.current) {
        conversationHistoryService.saveMessage('assistant', transcriptBufferRef.current);
        transcriptBufferRef.current = '';
      }
    };

    // 인터럽트
    geminiService.onInterrupted = () => {
      transcriptBufferRef.current = '';
    };

    // 대화 기록 서비스 초기화
    conversationHistoryService.initialize();

    return () => {
      geminiService.onConnectionStateChange = null;
      geminiService.onTranscriptReceived = null;
      geminiService.onAudioReceived = null;
      geminiService.onError = null;
      geminiService.onTurnComplete = null;
      geminiService.onInterrupted = null;
    };
  }, []);

  // 연결
  const connect = useCallback(async (apiKey: string): Promise<boolean> => {
    setError(null);
    transcriptBufferRef.current = '';
    setTranscript('');

    geminiService.setApiKey(apiKey);
    return await geminiService.connect();
  }, []);

  // 연결 해제
  const disconnect = useCallback(() => {
    geminiService.disconnect();
    setTranscript('');
    transcriptBufferRef.current = '';
  }, []);

  // 오디오 전송
  const sendAudio = useCallback((data: ArrayBuffer) => {
    geminiService.sendAudio(data);
  }, []);

  // 텍스트 전송
  const sendText = useCallback((text: string) => {
    geminiService.sendText(text);
    // 사용자 메시지 저장
    conversationHistoryService.saveMessage('user', text);
  }, []);

  // 오디오 수신 콜백 등록
  const onAudioReceived = useCallback((callback: (data: ArrayBuffer) => void) => {
    audioCallbackRef.current = callback;
  }, []);

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 클린업
  useEffect(() => {
    return () => {
      geminiService.dispose();
      conversationHistoryService.dispose();
    };
  }, []);

  return {
    connectionState,
    transcript,
    error,
    isConnected: connectionState === 'connected',
    connect,
    disconnect,
    sendAudio,
    sendText,
    onAudioReceived,
    clearError,
  };
}
