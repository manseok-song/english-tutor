/**
 * StatusIndicator - 연결 및 음성 상태 표시
 */

import React from 'react';
import { VoiceState, ConnectionState, STATE_COLORS, STATE_LABELS } from '../types';

interface StatusIndicatorProps {
  voiceState: VoiceState;
  connectionState: ConnectionState;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  voiceState,
  connectionState,
}) => {
  // 연결 상태 색상
  const getConnectionColor = (): string => {
    switch (connectionState) {
      case 'connected':
        return '#33CC66';
      case 'connecting':
      case 'reconnecting':
        return '#E6CC33';
      case 'disconnected':
        return '#E64D4D';
    }
  };

  // 연결 상태 텍스트
  const getConnectionText = (): string => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
    }
  };

  // 음성 상태 아이콘
  const getVoiceIcon = (): string => {
    switch (voiceState) {
      case 'idle':
        return '◯';
      case 'listening':
        return '◉';
      case 'processing':
        return '◎';
      case 'speaking':
        return '◉';
      case 'error':
        return '⚠';
    }
  };

  const voiceColor = STATE_COLORS[voiceState];

  return (
    <div style={styles.container}>
      {/* 상단 연결 상태 */}
      <div style={styles.connectionBar}>
        <div
          style={{
            ...styles.connectionDot,
            backgroundColor: getConnectionColor(),
            animation: connectionState === 'connected' ? 'pulse 2s infinite' : 'none',
          }}
        />
        <span style={styles.connectionText}>{getConnectionText()}</span>
      </div>

      {/* 하단 음성 상태 */}
      <div style={styles.voiceStatus}>
        <span
          style={{
            ...styles.voiceIcon,
            color: `rgb(${voiceColor.r}, ${voiceColor.g}, ${voiceColor.b})`,
          }}
        >
          {getVoiceIcon()}
        </span>
        <span style={styles.voiceLabel}>{STATE_LABELS[voiceState]}</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '60px 24px',
    pointerEvents: 'none',
    zIndex: 10,
  },
  connectionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  connectionText: {
    fontSize: '12px',
    fontWeight: '500',
    fontFamily: 'monospace',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  voiceStatus: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  voiceIcon: {
    fontSize: '28px',
  },
  voiceLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
};
