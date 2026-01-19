/**
 * ControlButton - 녹음 시작/중지 및 연결 버튼
 */

import React, { useState } from 'react';
import { ConnectionState, VoiceState, STATE_COLORS } from '../types';

interface ControlButtonProps {
  connectionState: ConnectionState;
  voiceState: VoiceState;
  isRecording: boolean;
  onConnect: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const ControlButton: React.FC<ControlButtonProps> = ({
  connectionState,
  voiceState,
  isRecording,
  onConnect,
  onStartRecording,
  onStopRecording,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  // 버튼 색상
  const getButtonColor = (): string => {
    if (connectionState !== 'connected') {
      return '#3366E6';
    }
    return isRecording ? '#E64D4D' : '#33CC66';
  };

  // 버튼 아이콘
  const getButtonIcon = (): string => {
    if (connectionState !== 'connected') {
      return '📡';
    }
    return isRecording ? '⏹' : '🎤';
  };

  // 버튼 클릭 핸들러
  const handleClick = () => {
    if (connectionState !== 'connected') {
      onConnect();
    } else if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  const color = getButtonColor();

  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.button,
          transform: isPressed ? 'scale(0.92)' : 'scale(1)',
          boxShadow: `0 0 30px ${color}40`,
        }}
        onClick={handleClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
      >
        {/* 외부 링 */}
        <div
          style={{
            ...styles.outerRing,
            borderColor: `${color}50`,
          }}
        />

        {/* 내부 원 */}
        <div
          style={{
            ...styles.innerCircle,
            background: `linear-gradient(135deg, ${color}cc 0%, ${color}80 100%)`,
          }}
        >
          <span style={styles.icon}>{getButtonIcon()}</span>
        </div>
      </button>

      {/* 안내 텍스트 */}
      <p style={styles.hint}>
        {connectionState !== 'connected'
          ? 'Tap to connect'
          : isRecording
          ? 'Tap to stop'
          : 'Tap to speak'}
      </p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    paddingBottom: '40px',
  },
  button: {
    position: 'relative',
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.3s ease',
    WebkitTapHighlightColor: 'transparent',
  },
  outerRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '50%',
    border: '2px solid',
  },
  innerCircle: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    right: '12px',
    bottom: '12px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: '28px',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
  },
  hint: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.5)',
    margin: 0,
  },
};
