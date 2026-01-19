/**
 * AntiGravity - AI English Tutor for CEOs
 * 메인 앱 컴포넌트
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ParticleCanvas } from './components/ParticleCanvas';
import { StatusIndicator } from './components/StatusIndicator';
import { ControlButton } from './components/ControlButton';
import { ApiKeyInput } from './components/ApiKeyInput';
import { TranscriptOverlay } from './components/TranscriptOverlay';
import { useAudio } from './hooks/useAudio';
import { useGemini } from './hooks/useGemini';

const STORAGE_KEY = 'antigravity_api_key';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiInput, setShowApiInput] = useState(true);

  // Gemini 훅
  const {
    connectionState,
    transcript,
    error,
    connect,
    disconnect,
    sendAudio,
    onAudioReceived,
  } = useGemini();

  // 오디오 훅 (Gemini로 오디오 데이터 전송)
  const {
    isRecording,
    amplitude,
    voiceState,
    startRecording,
    stopRecording,
    playAudio,
    setVoiceState,
  } = useAudio(sendAudio);

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
    }
  }, [error, setVoiceState]);

  // API 키 제출
  const handleApiKeySubmit = useCallback((key: string) => {
    setApiKey(key);
    setShowApiInput(false);
  }, []);

  // 연결
  const handleConnect = useCallback(async () => {
    if (!apiKey) {
      setShowApiInput(true);
      return;
    }
    await connect(apiKey);
  }, [apiKey, connect]);

  // 녹음 시작
  const handleStartRecording = useCallback(async () => {
    const success = await startRecording();
    if (!success) {
      alert('마이크 접근 권한이 필요합니다.');
    }
  }, [startRecording]);

  // 녹음 중지
  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // API 입력 화면 표시
  if (showApiInput) {
    return <ApiKeyInput onSubmit={handleApiKeySubmit} />;
  }

  return (
    <div style={styles.container}>
      {/* 파티클 배경 */}
      <ParticleCanvas voiceState={voiceState} amplitude={amplitude} />

      {/* 상태 표시 */}
      <StatusIndicator voiceState={voiceState} connectionState={connectionState} />

      {/* AI 응답 텍스트 */}
      <TranscriptOverlay text={transcript} />

      {/* 에러 메시지 */}
      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={() => setShowApiInput(true)} style={styles.errorButton}>
            설정
          </button>
        </div>
      )}

      {/* 컨트롤 버튼 */}
      <div style={styles.controls}>
        <ControlButton
          connectionState={connectionState}
          voiceState={voiceState}
          isRecording={isRecording}
          onConnect={handleConnect}
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
    paddingBottom: 'env(safe-area-inset-bottom, 20px)',
    zIndex: 30,
  },
  errorBanner: {
    position: 'absolute',
    top: '100px',
    left: '24px',
    right: '24px',
    padding: '12px 16px',
    background: 'rgba(230, 77, 77, 0.2)',
    border: '1px solid rgba(230, 77, 77, 0.4)',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#E64D4D',
    fontSize: '14px',
    zIndex: 40,
  },
  errorButton: {
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  settingsButton: {
    position: 'absolute',
    top: '60px',
    right: '20px',
    width: '40px',
    height: '40px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '50%',
    fontSize: '18px',
    cursor: 'pointer',
    zIndex: 50,
  },
};

export default App;
