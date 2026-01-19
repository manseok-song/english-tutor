/**
 * TranscriptOverlay - AI 응답 텍스트 표시
 */

import React, { useEffect, useState } from 'react';

interface TranscriptOverlayProps {
  text: string;
  autoHideDelay?: number;
}

export const TranscriptOverlay: React.FC<TranscriptOverlayProps> = ({
  text,
  autoHideDelay = 5000,
}) => {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (text) {
      setDisplayText(text);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [text, autoHideDelay]);

  if (!visible || !displayText) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.bubble}>
        <p style={styles.text}>{displayText}</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    left: '24px',
    right: '24px',
    bottom: '160px',
    display: 'flex',
    justifyContent: 'center',
    animation: 'slideUp 0.3s ease-out',
    zIndex: 20,
    pointerEvents: 'none',
  },
  bubble: {
    maxWidth: '100%',
    padding: '16px 20px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  text: {
    fontSize: '15px',
    lineHeight: '1.5',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: 0,
    textAlign: 'center',
  },
};
