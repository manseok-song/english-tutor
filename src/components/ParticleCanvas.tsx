/**
 * ParticleCanvas - 상태에 따라 반응하는 파티클 애니메이션
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { VoiceState, Particle, STATE_COLORS, CONSTANTS } from '../types';

interface ParticleCanvasProps {
  voiceState: VoiceState;
  amplitude: number;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ voiceState, amplitude }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  // 파티클 초기화
  const initParticles = useCallback((width: number, height: number) => {
    particlesRef.current = Array.from({ length: CONSTANTS.PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 10 + 6,
      opacity: Math.random() * 0.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  // 파티클 업데이트
  const updateParticle = useCallback(
    (particle: Particle, width: number, height: number): Particle => {
      // 상태에 따른 속도 조절
      let speedMultiplier: number;
      let sizeMultiplier: number;

      switch (voiceState) {
        case 'idle':
          speedMultiplier = 0.3;
          sizeMultiplier = 1.0;
          break;
        case 'listening':
          speedMultiplier = 0.5 + amplitude * 3;
          sizeMultiplier = 1.0 + amplitude * 0.8;
          break;
        case 'processing':
          speedMultiplier = 1.5;
          sizeMultiplier = 1.2;
          break;
        case 'speaking':
          speedMultiplier = 0.8 + amplitude * 2;
          sizeMultiplier = 1.5 + amplitude * 0.5;
          break;
        case 'error':
          speedMultiplier = 0.1;
          sizeMultiplier = 0.8;
          break;
        default:
          speedMultiplier = 0.3;
          sizeMultiplier = 1.0;
      }

      // 위치 업데이트
      let newX = particle.x + particle.vx * speedMultiplier;
      let newY = particle.y + particle.vy * speedMultiplier;

      // 사인파 움직임 (부유감)
      newX += Math.sin(particle.phase) * 0.5;
      newY += Math.cos(particle.phase * 0.7) * 0.3;

      // 경계 처리
      let newVx = particle.vx;
      let newVy = particle.vy;

      if (newX < 0 || newX > width) {
        newVx *= -1;
        newX = Math.max(0, Math.min(width, newX));
      }
      if (newY < 0 || newY > height) {
        newVy *= -1;
        newY = Math.max(0, Math.min(height, newY));
      }

      // 크기 조정
      const baseSize = particle.size;
      const newSize = Math.max(4, Math.min(24, baseSize * sizeMultiplier));

      return {
        ...particle,
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
        size: newSize + (newSize - baseSize) * 0.1, // 부드러운 크기 전환
        phase: particle.phase + 0.02,
      };
    },
    [voiceState, amplitude]
  );

  // 렌더링
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // 배경 클리어 (잔상 효과)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, width, height);

    // 현재 색상
    const color = STATE_COLORS[voiceState];

    // 중앙 글로우
    const centerX = width / 2;
    const centerY = height / 2;
    let glowSize: number;
    let glowOpacity: number;

    switch (voiceState) {
      case 'idle':
        glowSize = 100;
        glowOpacity = 0.15;
        break;
      case 'listening':
        glowSize = 120 + amplitude * 100;
        glowOpacity = 0.2 + amplitude * 0.3;
        break;
      case 'processing':
        glowSize = 150;
        glowOpacity = 0.3;
        break;
      case 'speaking':
        glowSize = 180 + amplitude * 80;
        glowOpacity = 0.35;
        break;
      case 'error':
        glowSize = 80;
        glowOpacity = 0.2;
        break;
      default:
        glowSize = 100;
        glowOpacity = 0.15;
    }

    // 중앙 글로우 그리기
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowSize);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowOpacity})`);
    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowOpacity * 0.5})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(centerX, centerY, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 파티클 업데이트 및 그리기
    particlesRef.current = particlesRef.current.map((p) => updateParticle(p, width, height));

    for (const particle of particlesRef.current) {
      const particleGradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size
      );

      particleGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity})`);
      particleGradient.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity * 0.3})`);
      particleGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particleGradient;
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(render);
  }, [voiceState, amplitude, updateParticle]);

  // 캔버스 리사이즈
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      if (particlesRef.current.length === 0) {
        initParticles(rect.width, rect.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [initParticles]);

  // 애니메이션 루프
  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at center, #0a0a0a 0%, #000 100%)',
      }}
    />
  );
};
