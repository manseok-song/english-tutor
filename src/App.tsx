/**
 * AntiGravity - AI English Tutor for CEOs
 * 메인 앱 컴포넌트 (고도화 버전 v2)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ParticleCanvas } from './components/ParticleCanvas';
import { StatusIndicator } from './components/StatusIndicator';
import { ControlButton } from './components/ControlButton';
import { ApiKeyInput } from './components/ApiKeyInput';
import { TranscriptOverlay } from './components/TranscriptOverlay';
import { SettingsPanel } from './components/SettingsPanel';
import { useAudio } from './hooks/useAudio';
import { useGemini } from './hooks/useGemini';
import { useNetworkStatus, getNetworkQuality } from './hooks/useNetworkStatus';
import { GeminiError } from './services/GeminiService';
import { hapticService } from './services/HapticService';
import { audioService } from './services/AudioService';

const STORAGE_KEY = 'antigravity_api_key';
const SETTINGS_KEY = 'antigravity_settings';

interface AppSettings {
  vadThreshold: number;
  volume: number;
  voiceName: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  vadThreshold: 0.015,
  volume: 1.0,
  voiceName: 'Kore',
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiInput, setShowApiInput] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // 네트워크 상태
  const networkStatus = useNetworkStatus();
  const networkQuality = getNetworkQuality(networkStatus);

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
    setVolume,
  } = useAudio(sendAudio, {
    vadEnabled: true,
    vadThreshold: settings.vadThreshold,
    silenceFrames: 25,
  });

  // 시각화용 현재 진폭 (listening 또는 speaking 상태에 따라)
  const currentAmplitude = useMemo(() => {
    if (voiceState === 'speaking') {
      return playbackAmplitude;
    }
    return amplitude;
  }, [voiceState, amplitude, playbackAmplitude]);

  // 저장된 설정 로드
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        // 파싱 실패 시 기본값 사용
      }
    }
  }, []);

  // 볼륨 설정 적용
  useEffect(() => {
    setVolume(settings.volume);
  }, [settings.volume, setVolume]);

  // VAD 설정 적용
  useEffect(() => {
    audioService.setVADConfig({ threshold: settings.vadThreshold });
  }, [settings.vadThreshold]);

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

  // 연결 성공 시 햅틱 피드백
  useEffect(() => {
    if (connectionState === 'connected') {
      hapticService.connectionSuccess();
    }
  }, [connectionState]);

  // 에러 시 처리
  useEffect(() => {
    if (error) {
      setVoiceState('error');
      hapticService.errorFeedback();
      if (!error.retryable) {
        stopPlayback();
      }
    }
  }, [error, setVoiceState, stopPlayback]);

  // API 키 제출
  const handleApiKeySubmit = useCallback((key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    setShowApiInput(false);
    clearError();
    hapticService.buttonTap();
  }, [clearError]);

  // 설정 저장
  const handleSaveSettings = useCallback((key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
  }, []);

  const handleVadThresholdChange = useCallback((value: number) => {
    setSettings((prev) => {
      const newSettings = { ...prev, vadThreshold: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    setSettings((prev) => {
      const newSettings = { ...prev, volume: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const handleVoiceNameChange = useCallback((name: string) => {
    setSettings((prev) => {
      const newSettings = { ...prev, voiceName: name };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  // 연결
  const handleConnect = useCallback(async () => {
    if (!apiKey) {
      setShowApiInput(true);
      return;
    }
    hapticService.buttonTap();
    await connect(apiKey);
  }, [apiKey, connect]);

  // 연결 해제
  const handleDisconnect = useCallback(() => {
    hapticService.buttonTap();
    disconnect();
    stopRecording();
    stopPlayback();
  }, [disconnect, stopRecording, stopPlayback]);

  // 녹음 시작
  const handleStartRecording = useCallback(async () => {
    if (!isConnected) {
      await handleConnect();
    }

    hapticService.recordingStart();
    const success = await startRecording();
    if (!success) {
      setVoiceState('error');
      hapticService.errorFeedback();
    }
  }, [isConnected, handleConnect, startRecording, setVoiceState]);

  // 녹음 중지
  const handleStopRecording = useCallback(() => {
    hapticService.recordingStop();
    stopRecording();
  }, [stopRecording]);

  // 에러 메시지 포맷팅
  const formatErrorMessage = (err: GeminiError): string => {
    return err.message;
  };

  // API 입력 화면 표시
  if (showApiInput && !apiKey) {
    return <ApiKeyInput onSubmit={handleApiKeySubmit} />;
  }

  return (
    <div
      style={styles.container}
      role="application"
      aria-label="AntiGravity AI 영어 튜터"
    >
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

      {/* 네트워크 상태 표시 */}
      {!networkStatus.isOnline && (
        <div
          style={styles.offlineBanner}
          role="alert"
          aria-live="polite"
        >
          📡 오프라인 - 인터넷 연결을 확인하세요
        </div>
      )}

      {networkStatus.isOnline && networkQuality === 'poor' && (
        <div
          style={styles.poorNetworkBanner}
          role="status"
          aria-live="polite"
        >
          📶 네트워크 상태가 좋지 않습니다
        </div>
      )}

      {/* AI 응답 텍스트 */}
      <TranscriptOverlay text={transcript} />

      {/* 에러 메시지 */}
      {error && (
        <div
          style={styles.errorBanner}
          role="alert"
          aria-live="assertive"
        >
          <div style={styles.errorContent}>
            <span style={styles.errorIcon} aria-hidden="true">⚠️</span>
            <span style={styles.errorText}>{formatErrorMessage(error)}</span>
          </div>
          <div style={styles.errorActions}>
            {error.retryable && (
              <button
                onClick={handleConnect}
                style={styles.retryButton}
                aria-label="재연결 시도"
              >
                재시도
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              style={styles.errorButton}
              aria-label="설정 열기"
            >
              설정
            </button>
          </div>
        </div>
      )}

      {/* VAD 인디케이터 */}
      {isRecording && (
        <div
          style={{
            ...styles.vadIndicator,
            backgroundColor: isVoiceActive
              ? 'rgba(51, 204, 102, 0.3)'
              : 'rgba(255, 255, 255, 0.1)',
          }}
          role="status"
          aria-live="polite"
          aria-label={isVoiceActive ? '음성 감지 중' : '대기 중'}
        >
          <span style={styles.vadText} aria-hidden="true">
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
        onClick={() => {
          hapticService.buttonTap();
          setShowSettings(true);
        }}
        style={styles.settingsButton}
        aria-label="설정 열기"
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">⚙️</span>
      </button>

      {/* 연결 해제 버튼 (연결됨 상태에서만) */}
      {isConnected && (
        <button
          onClick={handleDisconnect}
          style={styles.disconnectButton}
          aria-label="연결 해제"
        >
          <span aria-hidden="true">✕</span>
        </button>
      )}

      {/* 설정 패널 */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSaveApiKey={handleSaveSettings}
        currentApiKey={apiKey}
        vadThreshold={settings.vadThreshold}
        onVadThresholdChange={handleVadThresholdChange}
        volume={settings.volume}
        onVolumeChange={handleVolumeChange}
        voiceName={settings.voiceName}
        onVoiceNameChange={handleVoiceNameChange}
      />
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
  offlineBanner: {
    position: 'absolute',
    top: 'max(env(safe-area-inset-top), 60px)',
    left: '20px',
    right: '20px',
    padding: '12px 16px',
    background: 'rgba(230, 77, 77, 0.9)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'center',
    zIndex: 60,
  },
  poorNetworkBanner: {
    position: 'absolute',
    top: 'max(env(safe-area-inset-top), 60px)',
    left: '20px',
    right: '20px',
    padding: '10px 16px',
    background: 'rgba(230, 204, 51, 0.2)',
    border: '1px solid rgba(230, 204, 51, 0.4)',
    borderRadius: '12px',
    color: '#E6CC33',
    fontSize: '13px',
    textAlign: 'center',
    zIndex: 60,
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
