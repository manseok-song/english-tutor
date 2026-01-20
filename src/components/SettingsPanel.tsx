/**
 * SettingsPanel - 설정 패널 컴포넌트
 * VAD 임계값, 음성 선택, 볼륨 조절
 */

import React, { useState, useEffect } from 'react';
import { hapticService } from '../services/HapticService';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveApiKey: (key: string) => void;
  currentApiKey: string | null;
  vadThreshold: number;
  onVadThresholdChange: (value: number) => void;
  volume: number;
  onVolumeChange: (value: number) => void;
  voiceName: string;
  onVoiceNameChange: (name: string) => void;
}

const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Kore', description: '전문적이고 명확한 음성' },
  { id: 'Puck', name: 'Puck', description: '친근하고 활발한 음성' },
  { id: 'Charon', name: 'Charon', description: '차분하고 안정적인 음성' },
  { id: 'Fenrir', name: 'Fenrir', description: '깊고 웅장한 음성' },
  { id: 'Aoede', name: 'Aoede', description: '부드럽고 따뜻한 음성' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onSaveApiKey,
  currentApiKey,
  vadThreshold,
  onVadThresholdChange,
  volume,
  onVolumeChange,
  voiceName,
  onVoiceNameChange,
}) => {
  const [apiKey, setApiKey] = useState(currentApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setApiKey(currentApiKey || '');
  }, [currentApiKey]);

  const handleSave = () => {
    hapticService.buttonTap();
    onSaveApiKey(apiKey);
    onClose();
  };

  const handleVoiceSelect = (voice: string) => {
    hapticService.selectionChanged();
    onVoiceNameChange(voice);
  };

  const handleSliderChange = (
    value: number,
    setter: (v: number) => void
  ) => {
    setter(value);
  };

  if (!isOpen) return null;

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        style={styles.panel}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={styles.header}>
          <h2 id="settings-title" style={styles.title}>설정</h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
            aria-label="설정 닫기"
          >
            ✕
          </button>
        </div>

        {/* 컨텐츠 */}
        <div style={styles.content}>
          {/* API 키 섹션 */}
          <section style={styles.section}>
            <label htmlFor="api-key" style={styles.label}>
              Gemini API 키
            </label>
            <div style={styles.inputWrapper}>
              <input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                style={styles.input}
                autoComplete="off"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                style={styles.toggleButton}
                aria-label={showApiKey ? 'API 키 숨기기' : 'API 키 보이기'}
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
            </div>
            <p style={styles.hint}>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
              >
                Google AI Studio에서 발급
              </a>
            </p>
          </section>

          {/* 음성 선택 섹션 */}
          <section style={styles.section}>
            <label style={styles.label}>AI 음성</label>
            <div style={styles.voiceGrid}>
              {AVAILABLE_VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => handleVoiceSelect(voice.id)}
                  style={{
                    ...styles.voiceButton,
                    ...(voiceName === voice.id ? styles.voiceButtonActive : {}),
                  }}
                  aria-pressed={voiceName === voice.id}
                >
                  <span style={styles.voiceName}>{voice.name}</span>
                  <span style={styles.voiceDesc}>{voice.description}</span>
                </button>
              ))}
            </div>
          </section>

          {/* VAD 임계값 섹션 */}
          <section style={styles.section}>
            <label htmlFor="vad-threshold" style={styles.label}>
              음성 감지 민감도: {Math.round(vadThreshold * 1000)}
            </label>
            <input
              id="vad-threshold"
              type="range"
              min="5"
              max="50"
              value={vadThreshold * 1000}
              onChange={(e) =>
                handleSliderChange(
                  parseInt(e.target.value) / 1000,
                  onVadThresholdChange
                )
              }
              style={styles.slider}
              aria-valuemin={5}
              aria-valuemax={50}
              aria-valuenow={Math.round(vadThreshold * 1000)}
            />
            <div style={styles.sliderLabels}>
              <span>높음 (조용한 환경)</span>
              <span>낮음 (시끄러운 환경)</span>
            </div>
          </section>

          {/* 볼륨 섹션 */}
          <section style={styles.section}>
            <label htmlFor="volume" style={styles.label}>
              AI 응답 볼륨: {Math.round(volume * 100)}%
            </label>
            <input
              id="volume"
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) =>
                handleSliderChange(
                  parseInt(e.target.value) / 100,
                  onVolumeChange
                )
              }
              style={styles.slider}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(volume * 100)}
            />
          </section>
        </div>

        {/* 푸터 */}
        <div style={styles.footer}>
          <button
            onClick={handleSave}
            style={styles.saveButton}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.2s ease-out',
  },
  panel: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '85vh',
    background: '#1a1a1a',
    borderRadius: '20px 20px 0 0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.3s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  section: {
    marginBottom: '28px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '10px',
  },
  inputWrapper: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '14px 16px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
  },
  toggleButton: {
    width: '48px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '18px',
  },
  hint: {
    marginTop: '8px',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  link: {
    color: '#3366E6',
    textDecoration: 'none',
  },
  voiceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  voiceButton: {
    padding: '14px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  voiceButtonActive: {
    background: 'rgba(51, 102, 230, 0.2)',
    borderColor: '#3366E6',
  },
  voiceName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '4px',
  },
  voiceDesc: {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    appearance: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    outline: 'none',
    cursor: 'pointer',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  footer: {
    padding: '16px 24px',
    paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    width: '100%',
    padding: '16px',
    background: '#3366E6',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
