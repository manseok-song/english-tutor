/**
 * ApiKeyInput - API 키 입력 화면
 */

import React, { useState, useEffect } from 'react';

interface ApiKeyInputProps {
  onSubmit: (apiKey: string) => void;
}

const STORAGE_KEY = 'antigravity_api_key';

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onSubmit }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // 저장된 API 키 불러오기
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem(STORAGE_KEY, apiKey.trim());
      onSubmit(apiKey.trim());
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* 로고 */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🌌</span>
          <h1 style={styles.title}>AntiGravity</h1>
          <p style={styles.subtitle}>AI English Tutor for CEOs</p>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Google AI Studio API Key</label>
          <div style={styles.inputWrapper}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              style={styles.input}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              style={styles.toggleButton}
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitButton,
              opacity: apiKey.trim() ? 1 : 0.5,
            }}
            disabled={!apiKey.trim()}
          >
            Start Session
          </button>
        </form>

        {/* 안내 */}
        <div style={styles.info}>
          <p style={styles.infoText}>
            API 키는 기기에만 저장되며 외부로 전송되지 않습니다.
          </p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            API 키 발급받기 →
          </a>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    padding: '24px',
    zIndex: 100,
  },
  content: {
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  logo: {
    textAlign: 'center',
  },
  logoIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '14px 48px 14px 16px',
    fontSize: '15px',
    color: '#fff',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s',
  },
  toggleButton: {
    position: 'absolute',
    right: '12px',
    padding: '4px',
    fontSize: '18px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  submitButton: {
    marginTop: '8px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #3366E6 0%, #5533E6 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.15s',
  },
  info: {
    textAlign: 'center',
  },
  infoText: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.4)',
    margin: '0 0 8px 0',
  },
  link: {
    fontSize: '13px',
    color: '#3366E6',
    textDecoration: 'none',
  },
};
