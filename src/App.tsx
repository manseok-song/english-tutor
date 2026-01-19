/**
 * AntiGravity - AI English Tutor for CEOs
 * 메인 앱 컴포넌트 (고도화 버전)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ParticleCanvas } from './components/ParticleCanvas';
import { StatusIndicator } from './components/StatusIndicator';
import { ControlButton } from './components/ControlButton';
import { ApiKeyInput } from './components/ApiKeyInput';
import { TranscriptOverlay } from './components/TranscriptOverlay';
import { useAudio } from './hooks/useAudio';
import { useGemini } from './hooks/useGemini';
import { GeminiError } from './services/GeminiService';

const STORAGE_KEY = 'antigravity_api_key';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiInput, setShowApiInput] = useState(true);

  // Gemini 훅
  const {
    connectionState,
    transcript,
    error,
    isConnected,
    connect,
    disconnect,
    sendAudio,
    onAudioReceived,
    clearError,
  } = useGemini();

  // 오디오 훅 (Gemini로 오디오 데이터 전송)
  const {
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
  } = useAudio(sendAudio, {
    vadEnabled: true,
    vadThreshold: 0.015,
    silenceFrames: 25,
  });

  // 시각화용 현재 진폭 (listening 또는 speaking 상태에 따라)
  const currentAmplitude = useMemo(() => {
    if (voiceState === 'speaking') {
      return playbackAmplitude;
    }
    return amplitude;
  }, [voiceState, amplitude, playbackAmplitude]);

  // Gemini 오디오 수신 시 재생
  useEffect(() => {
    onAudioReceived((data) => {
      playAudio(data);
    });
  }, [onAudioReceived, playAudio]);

  // 저장된 API 키 확인
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
      setShowApiInput(false);
    }
  }, []);

  // 에러 시 음성 상태 업데이트
  useEffect(() => {
    if (error) {
      setVoiceState('error');
      // 재시도 가능한 에러가 아니면 재생 중지
      if (!error.retryable) {
        stopPlayback();
      }
    }
  }, [error, setVoiceState, stopPlayback]);

  // API 키 제출
  const handleApiKeySubmit = useCallback((key: string) => {
    setApiKey(key);
    setShowApiInput(false);
    clearError();
  }, [clearError]);

  // 연결
  const handleConnect = useCallback(async () => {
    if (!apiKey) {
      setShowApiInput(true);
      return;
    }
    await connect(apiKey);
  }, [apiKey, connect]);

  // 연결 해제
  const handleDisconnect = useCallback(() => {
    disconnect();
    stopRecording();
    stopPlayback();
  }, [disconnect, stopRecording, stopPlayback]);

  // 녹음 시작
  const handleStartRecording = useCallback(async () => {
    // 먼저 연결 확인
    if (!isConnected) {
      await handleConnect();
    }

    const success = await startRecording();
    if (!success) {
      // 마이크 권한 에러 표시
      setVoiceState('error');
    }
  }, [isConnected, handleConnect, startRecording, setVoiceState]);

  // 녹음 중지
  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // 에러 메시지 포맷팅
  const formatErrorMessage = (err: GeminiError): string => {
    return err.message;
  };

  // API 입력 화면 표시
  if (showApiInput) {
    return <ApiKeyInput onSubmit={handleApiKeySubmit} />;
  }

  return (
    <div style={styles.container}>
      {/* 파티클 배경 */}
      <ParticleCanvas
        voiceState={voiceState}
        amplitude={currentAmplitude}
        isVoiceActive={isVoiceActive}
      />

      {/* 상태 표시 */}
      <StatusIndicator
        voiceState={voiceState}
        connectionState={connectionState}
      />

      {/* AI 응답 텍스트 */}
      <TranscriptOverlay text={transcript} />

      {/* 에러 메시지 */}
      {error && (
        <div style={styles.errorBanner}>
          <div style={styles.errorContent}>
            <span style={styles.errorIcon}>⚠️</span>
            <span style={styles.errorText}>{formatErrorMessage(error)}</span>
          </div>
          <div style={styles.errorActions}>
            {error.retryable && (
              <button
                onClick={handleConnect}
                style={styles.retryButton}
              >
                재시도
              </button>
            )}
            <button
              onClick={() => setShowApiInput(true)}
              style={styles.errorButton}
            >
              설정
            </button>
          </div>
        </div>
      )}

      {/* VAD 인디케이터 */}
      {isRecording && (
        <div style={{
          ...styles.vadIndicator,
          backgroundColor: isVoiceActive
            ? 'rgba(51, 204, 102, 0.3)'
            : 'rgba(255, 255, 255, 0.1)',
        }}>
          <span style={styles.vadText}>
            {isVoiceActive ? '🎙️ 음성 감지 중' : '🔇 대기 중...'}
          </span>
        </div>
      )}

      {/* 컨트롤 버튼 */}
      <div style={styles.controls}>
        <ControlButton
          connectionState={connectionState}
          voiceState={voiceState}
          isRecording={isRecording}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
        />
      </div>

      {/* 설정 버튼 */}
      <button
        onClick={() => setShowApiInput(true)}
        style={styles.settingsButton}
        aria-label="Settings"
      >
        ⚙️
      </button>

      {/* 연결 해제 버튼 (연결됨 상태에서만) */}
      {isConnected && (
        <button
          onClick={handleDisconnect}
          style={styles.disconnectButton}
          aria-label="Disconnect"
        >
          ✕
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#000',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
    zIndex: 30,
  },
  errorBanner: {
    position: 'absolute',
    top: '100px',
    left: '20px',
    right: '20px',
    padding: '14px 16px',
    background: 'rgba(230, 77, 77, 0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(230, 77, 77, 0.3)',
    borderRadius: '14px',
    zIndex: 40,
  },
  errorContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  errorIcon: {
    fontSize: '16px',
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px',
    flex: 1,
  },
  errorActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  retryButton: {
    padding: '8px 16px',
    background: 'rgba(51, 204, 102, 0.2)',
    border: '1px solid rgba(51, 204, 102, 0.4)',
    borderRadius: '8px',
    color: '#33CC66',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  errorButton: {
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  vadIndicator: {
    position: 'absolute',
    bottom: '140px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    borderRadius: '20px',
    transition: 'background-color 0.3s ease',
    zIndex: 25,
  },
  vadText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '12px',
    fontWeight: '500',
  },
  settingsButton: {
    position: 'absolute',
    top: 'max(env(safe-area-inset-top), 20px)',
    right: '20px',
    width: '44px',
    height: '44px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    fontSize: '18px',
    cursor: 'pointer',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectButton: {
    position: 'absolute',
    top: 'max(env(safe-area-inset-top), 20px)',
    left: '20px',
    width: '44px',
    height: '44px',
    background: 'rgba(230, 77, 77, 0.2)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(230, 77, 77, 0.3)',
    borderRadius: '50%',
    fontSize: '16px',
    color: '#E64D4D',
    cursor: 'pointer',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default App;
