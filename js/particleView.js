/**
 * particleView.js
 * Canvas 기반 플로팅 파티클 애니메이션
 * 앱 상태에 따라 색상과 동작이 변화
 */

import { Constants } from './constants.js';

/**
 * Particle - 개별 파티클 클래스
 */
class Particle {
    constructor(canvas, color) {
        this.canvas = canvas;
        this.reset(color);
    }

    reset(color) {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.baseSize = Math.random() * 3 + 1;
        this.size = this.baseSize;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.color = color;
        this.alpha = Math.random() * 0.5 + 0.3;
        this.baseAlpha = this.alpha;

        // 파동 효과용
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = Math.random() * 0.02 + 0.01;
        this.orbitRadius = Math.random() * 50 + 20;
    }

    update(state, audioLevel) {
        // 기본 이동
        this.x += this.speedX;
        this.y += this.speedY;

        // 상태별 동작
        switch (state) {
            case Constants.STATE.IDLE:
                this.updateIdle();
                break;
            case Constants.STATE.LISTENING:
                this.updateListening(audioLevel);
                break;
            case Constants.STATE.SPEAKING:
                this.updateSpeaking(audioLevel);
                break;
            case Constants.STATE.CONNECTING:
                this.updateConnecting();
                break;
            case Constants.STATE.ERROR:
                this.updateError();
                break;
        }

        // 경계 처리 (부드러운 래핑)
        this.wrapBounds();
    }

    updateIdle() {
        // 천천히 부유하는 효과
        this.angle += this.angleSpeed * 0.5;
        this.x += Math.sin(this.angle) * 0.3;
        this.y += Math.cos(this.angle) * 0.3;
        this.size = this.baseSize;
        this.alpha = this.baseAlpha;
    }

    updateListening(audioLevel) {
        // 음성 크기에 반응하는 파동
        const intensity = 1 + audioLevel * 3;
        this.angle += this.angleSpeed * intensity;

        // 오디오 레벨에 따라 크기와 투명도 변화
        this.size = this.baseSize * (1 + audioLevel * 2);
        this.alpha = Math.min(1, this.baseAlpha + audioLevel * 0.5);

        // 파동 효과
        this.x += Math.sin(this.angle) * intensity * 0.5;
        this.y += Math.cos(this.angle) * intensity * 0.5;
    }

    updateSpeaking(audioLevel) {
        // 퍼져나가는 오라 효과
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 중심에서 바깥으로 퍼지는 효과
        const dx = this.x - centerX;
        const dy = this.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const speed = 1 + audioLevel * 2;
            this.x += (dx / distance) * speed;
            this.y += (dy / distance) * speed;
        }

        // 크기와 투명도 변화
        this.size = this.baseSize * (1.5 + audioLevel);
        this.alpha = Math.max(0.1, this.baseAlpha - distance / this.canvas.width);
    }

    updateConnecting() {
        // 회전하는 효과
        this.angle += this.angleSpeed * 2;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.x = centerX + Math.cos(this.angle) * this.orbitRadius;
        this.y = centerY + Math.sin(this.angle) * this.orbitRadius;

        // 깜빡이는 효과
        this.alpha = 0.3 + Math.sin(this.angle * 5) * 0.3;
    }

    updateError() {
        // 떨리는 효과
        this.x += (Math.random() - 0.5) * 2;
        this.y += (Math.random() - 0.5) * 2;
        this.alpha = 0.5 + Math.random() * 0.3;
    }

    wrapBounds() {
        const margin = 50;

        if (this.x < -margin) this.x = this.canvas.width + margin;
        if (this.x > this.canvas.width + margin) this.x = -margin;
        if (this.y < -margin) this.y = this.canvas.height + margin;
        if (this.y > this.canvas.height + margin) this.y = -margin;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color.replace(')', `, ${this.alpha})`).replace('rgb', 'rgba');
        ctx.fill();

        // 글로우 효과
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.size * 3;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

/**
 * ParticleView - 파티클 시스템 관리
 */
export class ParticleView {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('[ParticleView] 캔버스를 찾을 수 없음:', canvasId);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationId = null;

        // 상태
        this.currentState = Constants.STATE.IDLE;
        this.audioLevel = 0;
        this.targetColor = this.getColorForState(Constants.STATE.IDLE);
        this.currentColor = this.targetColor;

        // 설정
        this.particleCount = Constants.UI.DEFAULT_PARTICLE_COUNT;
        this.fps = Constants.UI.PARTICLE_FPS;
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / this.fps;

        // 초기화
        this.init();

        console.log('[ParticleView] 초기화됨');
    }

    init() {
        // 캔버스 크기 설정
        this.resize();

        // 리사이즈 이벤트
        window.addEventListener('resize', () => this.resize());

        // 파티클 생성
        this.createParticles();

        // 애니메이션 시작
        this.start();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(new Particle(this.canvas, this.currentColor));
        }
    }

    /**
     * 상태 변경
     */
    setState(state) {
        if (this.currentState !== state) {
            console.log('[ParticleView] 상태 변경:', this.currentState, '→', state);
            this.currentState = state;
            this.targetColor = this.getColorForState(state);
        }
    }

    /**
     * 오디오 레벨 업데이트
     */
    setAudioLevel(level) {
        this.audioLevel = level;
    }

    /**
     * 상태별 색상 반환
     */
    getColorForState(state) {
        const colors = {
            [Constants.STATE.IDLE]: Constants.UI.IDLE_COLOR,
            [Constants.STATE.CONNECTING]: '#6B7280',
            [Constants.STATE.LISTENING]: Constants.UI.LISTENING_COLOR,
            [Constants.STATE.SPEAKING]: Constants.UI.SPEAKING_COLOR,
            [Constants.STATE.ERROR]: Constants.UI.ERROR_COLOR
        };

        const hex = colors[state] || colors[Constants.STATE.IDLE];
        return this.hexToRgb(hex);
    }

    /**
     * HEX → RGB 변환
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
        }
        return 'rgb(59, 130, 246)'; // 기본 파란색
    }

    /**
     * 색상 부드러운 전환
     */
    lerpColor() {
        // 현재 색상을 목표 색상으로 부드럽게 전환
        if (this.currentColor !== this.targetColor) {
            this.currentColor = this.targetColor;
            // 파티클 색상 업데이트
            this.particles.forEach(p => {
                p.color = this.currentColor;
            });
        }
    }

    /**
     * 애니메이션 프레임
     */
    animate(timestamp) {
        // FPS 제한
        const elapsed = timestamp - this.lastFrameTime;
        if (elapsed < this.frameInterval) {
            this.animationId = requestAnimationFrame((t) => this.animate(t));
            return;
        }
        this.lastFrameTime = timestamp - (elapsed % this.frameInterval);

        // 색상 전환
        this.lerpColor();

        // 캔버스 클리어 (약간의 트레일 효과)
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 파티클 업데이트 및 렌더링
        this.particles.forEach(particle => {
            particle.update(this.currentState, this.audioLevel);
            particle.draw(this.ctx);
        });

        // 중앙 글로우 효과 (Speaking 상태)
        if (this.currentState === Constants.STATE.SPEAKING) {
            this.drawCenterGlow();
        }

        // 다음 프레임
        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    /**
     * 중앙 글로우 효과
     */
    drawCenterGlow() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 100 + this.audioLevel * 50;

        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );

        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');  // 보라색
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    /**
     * 애니메이션 시작
     */
    start() {
        if (this.animationId) return;
        this.animationId = requestAnimationFrame((t) => this.animate(t));
        console.log('[ParticleView] 애니메이션 시작');
    }

    /**
     * 애니메이션 중지
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            console.log('[ParticleView] 애니메이션 중지');
        }
    }

    /**
     * 리소스 정리
     */
    destroy() {
        this.stop();
        window.removeEventListener('resize', this.resize);
        this.particles = [];
        console.log('[ParticleView] 리소스 정리됨');
    }
}

export default ParticleView;
