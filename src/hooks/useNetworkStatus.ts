/**
 * useNetworkStatus - 네트워크 상태 감지 훅
 */

import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number | null; // Mbps
  rtt: number | null; // ms (Round Trip Time)
}

interface NetworkInformation {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: 'unknown',
    downlink: null,
    rtt: null,
  }));

  const updateNetworkInfo = useCallback(() => {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    setStatus({
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
    });
  }, []);

  useEffect(() => {
    // 초기 상태 설정
    updateNetworkInfo();

    // 온라인/오프라인 이벤트
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
      updateNetworkInfo();
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API (Chrome, Edge)
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  return status;
}

/**
 * 네트워크 품질 판단
 */
export function getNetworkQuality(status: NetworkStatus): 'good' | 'moderate' | 'poor' | 'offline' {
  if (!status.isOnline) return 'offline';

  if (status.effectiveType === '4g' || (status.downlink && status.downlink >= 5)) {
    return 'good';
  }

  if (status.effectiveType === '3g' || (status.downlink && status.downlink >= 1)) {
    return 'moderate';
  }

  return 'poor';
}
