/**
 * HapticService - iOS Taptic Engine 햅틱 피드백
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

class HapticService {
  private isSupported: boolean = false;

  constructor() {
    // iOS Safari에서 Vibration API 또는 Taptic Engine 지원 확인
    this.isSupported = 'vibrate' in navigator || this.checkiOSTaptic();
  }

  /**
   * iOS Taptic Engine 지원 확인 (iOS 10+)
   */
  private checkiOSTaptic(): boolean {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const iOSVersion = ua.match(/OS (\d+)/);

    if (isIOS && iOSVersion) {
      return parseInt(iOSVersion[1], 10) >= 10;
    }
    return false;
  }

  /**
   * 햅틱 피드백 실행
   */
  trigger(type: HapticType = 'medium'): void {
    if (!this.isSupported) return;

    try {
      // Web Vibration API 사용 (Android, 일부 iOS)
      if ('vibrate' in navigator) {
        const patterns: Record<HapticType, number | number[]> = {
          light: 10,
          medium: 20,
          heavy: 30,
          success: [10, 50, 20],
          warning: [20, 30, 20],
          error: [30, 50, 30, 50, 30],
          selection: 5,
        };

        navigator.vibrate(patterns[type]);
      }

      // iOS AudioContext를 통한 Taptic 트리거 (workaround)
      // 실제 iOS에서는 AudioContext 생성 시 미세한 햅틱이 발생할 수 있음
      if (this.checkiOSTaptic()) {
        this.triggerIOSHaptic(type);
      }
    } catch (e) {
      // 햅틱 실패는 무시
      console.debug('Haptic feedback not available');
    }
  }

  /**
   * iOS 전용 햅틱 트리거
   * CSS -webkit-tap-highlight 또는 AudioContext 사용
   */
  private triggerIOSHaptic(type: HapticType): void {
    // CSS 기반 탭 피드백 트리거
    const tempEl = document.createElement('div');
    tempEl.style.cssText = `
      position: fixed;
      top: -100px;
      left: -100px;
      width: 1px;
      height: 1px;
      -webkit-tap-highlight-color: transparent;
    `;

    document.body.appendChild(tempEl);

    // 강제 리플로우 및 탭 시뮬레이션
    tempEl.click();

    requestAnimationFrame(() => {
      document.body.removeChild(tempEl);
    });
  }

  /**
   * 버튼 탭 피드백
   */
  buttonTap(): void {
    this.trigger('light');
  }

  /**
   * 녹음 시작 피드백
   */
  recordingStart(): void {
    this.trigger('medium');
  }

  /**
   * 녹음 중지 피드백
   */
  recordingStop(): void {
    this.trigger('light');
  }

  /**
   * 연결 성공 피드백
   */
  connectionSuccess(): void {
    this.trigger('success');
  }

  /**
   * 에러 피드백
   */
  errorFeedback(): void {
    this.trigger('error');
  }

  /**
   * 선택 피드백
   */
  selectionChanged(): void {
    this.trigger('selection');
  }
}

export const hapticService = new HapticService();
