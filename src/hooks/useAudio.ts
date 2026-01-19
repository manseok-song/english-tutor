/**
 * useAudio - 오디오 캡처 및 재생 관리 훅
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { audioService } from '../services/AudioService';
import { VoiceState } from '../types';

interface UseAudioReturn {
  isRecording: boolean;
  amplitude: number;
  voiceState: VoiceState;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  playAudio: (data: ArrayBuffer) => void;
  setVoiceState: (state: VoiceState) => void;
}

export function useAudio(onAudioData: (data: ArrayBuffer) => void): UseAudioReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const onAudioDataRef = useRef(onAudioData);

  // 콜백 레퍼런스 업데이트
  useEffect(() => {
    onAudioDataRef.current = onAudioData;
  }, [onAudioData]);

  // 오디오 서비스 콜백 설정
  useEffect(() => {
    audioService.onAudioData = (data) => {
      onAudioDataRef.current(data);
    };

    audioService.onAmplitudeChange = (amp) => {
      setAmplitude(amp);
    };

    return () => {
      audioService.onAudioData = null;
      audioService.onAmplitudeChange = null;
    };
  }, []);

  // 녹음 시작
  const startRecording = useCallback(async (): Promise<boolean> => {
    const success = await audioService.startCapture();
    if (success) {
      setIsRecording(true);
      setVoiceState('listening');
    } else {
      setVoiceState('error');
    }
    return success;
  }, []);

  // 녹음 중지
  const stopRecording = useCallback(() => {
    audioService.stopCapture();
    setIsRecording(false);
    setAmplitude(0);
    setVoiceState('idle');
  }, []);

  // 오디오 재생
  const playAudio = useCallback((data: ArrayBuffer) => {
    setVoiceState('speaking');
    audioService.playAudio(data);
  }, []);

  return {
    isRecording,
    amplitude,
    voiceState,
    startRecording,
    stopRecording,
    playAudio,
    setVoiceState,
  };
}
