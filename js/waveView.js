/**
 * waveView.js
 * AntiGravity 파장 시각화
 * 음성 감지 시 울렁이는 파장 애니메이션
 */

import { Constants } from './constants.js';

export class WaveView {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn('[WaveView] Canvas not found:', canvasId);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.isAnimating = false;
        this.animationId = null;

        // 파장 상태
        this.audioLevel = 0;
        this.targetLevel = 0;
        this.phase = 0;
        this.isActive = false;

        // 색상 설정
        this.colors = {
            listening: Constants.UI.LISTENING_COLOR,
            speaking: Constants.UI.SPEAKING_COLOR,
            idle: Constants.UI.IDLE_COLOR
        };
        this.currentColor = this.colors.listening;

        // 파장 파라미터
        this.waveCount = 3;          // 파장 수
        this.baseAmplitude = 15;     // 기본 진폭
        this.frequency = 0.02;       // 주파수
        this.phaseSpeed = 0.05;      // 위상 변화 속도

        this.setupCanvas();
        console.log('[WaveView] 초기화 완료');
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);

        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * 파장 활성화/비활성화
     */
    setActive(active) {
        this.isActive = active;

        if (active) {
            this.canvas.classList.add('active');
            if (!this.isAnimating) {
                this.startAnimation();
            }
        } else {
            this.canvas.classList.remove('active');
            this.targetLevel = 0;
        }
    }

    /**
     * 오디오 레벨 설정 (0-1 범위)
     */
    setAudioLevel(level) {
        this.targetLevel = Math.min(level * 3, 1);  // 레벨 증폭
    }

    /**
     * 상태에 따른 색상 변경
     */
    setState(state) {
        switch (state) {
            case Constants.STATE.LISTENING:
                this.currentColor = this.colors.listening;
                break;
            case Constants.STATE.SPEAKING:
                this.currentColor = this.colors.speaking;
                break;
            default:
                this.currentColor = this.colors.idle;
        }
    }

    /**
     * 애니메이션 시작
     */
    startAnimation() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.animate();
    }

    /**
     * 애니메이션 정지
     */
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * 메인 애니메이션 루프
     */
    animate() {
        if (!this.isAnimating) return;

        // 오디오 레벨 부드럽게 전환
        this.audioLevel += (this.targetLevel - this.audioLevel) * 0.1;

        // 위상 업데이트
        this.phase += this.phaseSpeed;

        // 그리기
        this.draw();

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * 파장 그리기
     */
    draw() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;
        const centerY = height / 2;

        // 캔버스 클리어
        ctx.clearRect(0, 0, width, height);

        // 파장이 활성화되지 않으면 그리지 않음
        if (this.audioLevel < 0.01 && !this.isActive) return;

        // 각 파장 그리기
        for (let w = 0; w < this.waveCount; w++) {
            const waveOffset = w * 0.3;
            const opacity = 0.3 + (0.3 * (this.waveCount - w) / this.waveCount);
            const amplitude = this.baseAmplitude * (1 + this.audioLevel * 2) * (1 - w * 0.2);

            this.drawWave(ctx, width, height, centerY, amplitude, waveOffset, opacity);
        }
    }

    /**
     * 단일 파장 그리기
     */
    drawWave(ctx, width, height, centerY, amplitude, phaseOffset, opacity) {
        ctx.beginPath();
        ctx.strokeStyle = this.hexToRgba(this.currentColor, opacity);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 파장 그리기
        for (let x = 0; x <= width; x++) {
            // 여러 주파수 조합으로 자연스러운 파형 생성
            const freq1 = this.frequency;
            const freq2 = this.frequency * 2.3;
            const freq3 = this.frequency * 0.7;

            let y = Math.sin(x * freq1 + this.phase + phaseOffset) * amplitude;
            y += Math.sin(x * freq2 + this.phase * 1.3 + phaseOffset) * amplitude * 0.3;
            y += Math.sin(x * freq3 + this.phase * 0.7 + phaseOffset) * amplitude * 0.5;

            // 가장자리 페이드 아웃
            const edgeFade = this.getEdgeFade(x, width);
            y *= edgeFade;

            if (x === 0) {
                ctx.moveTo(x, centerY + y);
            } else {
                ctx.lineTo(x, centerY + y);
            }
        }

        ctx.stroke();
    }

    /**
     * 가장자리 페이드 계산
     */
    getEdgeFade(x, width) {
        const fadeWidth = width * 0.15;

        if (x < fadeWidth) {
            return x / fadeWidth;
        } else if (x > width - fadeWidth) {
            return (width - x) / fadeWidth;
        }
        return 1;
    }

    /**
     * HEX to RGBA 변환
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * 리소스 정리
     */
    destroy() {
        this.stopAnimation();
        window.removeEventListener('resize', this.resizeCanvas);
        console.log('[WaveView] 파괴됨');
    }
}

export default WaveView;
