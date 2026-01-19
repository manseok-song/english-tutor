/**
 * useAudio - 오디오 캡처 및 재생 관리 훅 (개선됨)
 * VAD, 재생 진폭 분석 지원
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { audioService } from '../services/AudioService';
import { VoiceState } from '../types';

interface UseAudioOptions {
  vadEnabled?: boolean;
  vadThreshold?: number;
  silenceFrames?: number;
}

interface UseAudioReturn {
  isRecording: boolean;
  amplitude: number;
  playbackAmplitude: number;
  voiceState: VoiceState;
  isVoiceActive: boolean;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  playAudio: (data: ArrayBuffer) => void;
  stopPlayback: () => void;
  setVoiceState: (state: VoiceState) => void;
  setVolume: (volume: number) => void;
}

export function useAudio(
  onAudioData: (data: ArrayBuffer) => void,
  options: UseAudioOptions = {}
): UseAudioReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [playbackAmplitude, setPlaybackAmplitude] = useState(0);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const onAudioDataRef = useRef(onAudioData);
  const isPlayingRef = useRef(false);

  // 옵션 기본값
  const {
    vadEnabled = true,
    vadThreshold = 0.015,
    silenceFrames = 25,
  } = options;

  // 콜백 레퍼런스 업데이트
  useEffect(() => {
    onAudioDataRef.current = onAudioData;
  }, [onAudioData]);

  // VAD 설정 적용
  useEffect(() => {
    audioService.setVADConfig({
      enabled: vadEnabled,
      threshold: vadThreshold,
      silenceFrames,
    });
  }, [vadEnabled, vadThreshold, silenceFrames]);

  // 오디오 서비스 콜백 설정
  useEffect(() => {
    audioService.onAudioData = (data, voiceActive) => {
      onAudioDataRef.current(data);
      setIsVoiceActive(voiceActive);
    };

    audioService.onAmplitudeChange = (amp) => {
      setAmplitude(amp);
    };

    audioService.onPlaybackAmplitudeChange = (amp) => {
      setPlaybackAmplitude(amp);
    };

    audioService.onVADStateChange = (speaking) => {
      setIsVoiceActive(speaking);
      if (speaking && !isPlayingRef.current) {
        setVoiceState('listening');
      }
    };

    return () => {
      audioService.onAudioData = null;
      audioService.onAmplitudeChange = null;
      audioService.onPlaybackAmplitudeChange = null;
      audioService.onVADStateChange = null;
    };
  }, []);

  // 녹음 시작
  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const success = await audioService.startCapture();
      if (success) {
        setIsRecording(true);
        setVoiceState('listening');
        return true;
      } else {
        setVoiceState('error');
        return false;
      }
    } catch (error) {
      console.error('❌ 녹음 시작 실패:', error);
      setVoiceState('error');
      return false;
    }
  }, []);

  // 녹음 중지
  const stopRecording = useCallback(() => {
    audioService.stopCapture();
    setIsRecording(false);
    setAmplitude(0);
    setIsVoiceActive(false);
    if (!isPlayingRef.current) {
      setVoiceState('idle');
    }
  }, []);

  // 오디오 재생
  const playAudio = useCallback((data: ArrayBuffer) => {
    isPlayingRef.current = true;
    setVoiceState('speaking');
    audioService.playAudio(data);
  }, []);

  // 재생 중지
  const stopPlayback = useCallback(() => {
    audioService.stopPlayback();
    isPlayingRef.current = false;
    setPlaybackAmplitude(0);
    if (isRecording) {
      setVoiceState('listening');
    } else {
      setVoiceState('idle');
    }
  }, [isRecording]);

  // 볼륨 설정
  const setVolume = useCallback((volume: number) => {
    audioService.setVolume(volume);
  }, []);

  // 재생 완료 감지
  useEffect(() => {
    if (playbackAmplitude === 0 && isPlayingRef.current) {
      // 재생이 끝난 것으로 추정
      const timer = setTimeout(() => {
        if (playbackAmplitude === 0) {
          isPlayingRef.current = false;
          if (isRecording) {
            setVoiceState('listening');
          } else {
            setVoiceState('idle');
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [playbackAmplitude, isRecording]);

  // 클린업
  useEffect(() => {
    return () => {
      audioService.dispose();
    };
  }, []);

  return {
    isRecording,
    amplitude,
    playbackAmplitude,
    voiceState,
    isVoiceActive,
    startRecording,
    stopRecording,
    playAudio,
    stopPlayback,
    setVoiceState,
    setVolume,
  };
}
