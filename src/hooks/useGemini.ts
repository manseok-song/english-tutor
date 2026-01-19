/**
 * useGemini - Gemini WebSocket 연결 관리 훅
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { geminiService } from '../services/GeminiService';
import { ConnectionState } from '../types';

interface UseGeminiReturn {
  connectionState: ConnectionState;
  transcript: string;
  error: string | null;
  connect: (apiKey: string) => Promise<boolean>;
  disconnect: () => void;
  sendAudio: (data: ArrayBuffer) => void;
  onAudioReceived: (callback: (data: ArrayBuffer) => void) => void;
}

export function useGemini(): UseGeminiReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const audioCallbackRef = useRef<((data: ArrayBuffer) => void) | null>(null);

  // Gemini 서비스 콜백 설정
  useEffect(() => {
    geminiService.onConnectionStateChange = (state) => {
      setConnectionState(state);
      if (state === 'connected') {
        setError(null);
      }
    };

    geminiService.onTranscriptReceived = (text) => {
      setTranscript(text);
    };

    geminiService.onAudioReceived = (data) => {
      audioCallbackRef.current?.(data);
    };

    geminiService.onError = (err) => {
      setError(err);
    };

    return () => {
      geminiService.onConnectionStateChange = null;
      geminiService.onTranscriptReceived = null;
      geminiService.onAudioReceived = null;
      geminiService.onError = null;
    };
  }, []);

  // 연결
  const connect = useCallback(async (apiKey: string): Promise<boolean> => {
    setError(null);
    geminiService.setApiKey(apiKey);
    return await geminiService.connect();
  }, []);

  // 연결 해제
  const disconnect = useCallback(() => {
    geminiService.disconnect();
  }, []);

  // 오디오 전송
  const sendAudio = useCallback((data: ArrayBuffer) => {
    geminiService.sendAudio(data);
  }, []);

  // 오디오 수신 콜백 등록
  const onAudioReceived = useCallback((callback: (data: ArrayBuffer) => void) => {
    audioCallbackRef.current = callback;
  }, []);

  return {
    connectionState,
    transcript,
    error,
    connect,
    disconnect,
    sendAudio,
    onAudioReceived,
  };
}
