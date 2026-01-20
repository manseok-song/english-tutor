/**
 * sw.js
 * AntiGravity Service Worker (PWA 지원)
 * 오프라인 캐싱 및 백그라운드 동기화
 */

const CACHE_NAME = 'antigravity-v5';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/constants.js',
    './js/audioService.js',
    './js/geminiService.js',
    './js/vadService.js',
    './js/particleView.js',
    './js/waveView.js',
    './js/prompts.js',
    './manifest.json'
];

// 설치 이벤트 - 에셋 캐싱
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] 설치 중...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] 에셋 캐싱 중...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[ServiceWorker] 설치 완료');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[ServiceWorker] 캐싱 실패:', error);
            })
    );
});

// 활성화 이벤트 - 이전 캐시 정리
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] 활성화 중...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log('[ServiceWorker] 이전 캐시 삭제:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] 활성화 완료');
                return self.clients.claim();
            })
    );
});

// Fetch 이벤트 - 네트워크 우선, 캐시 폴백 전략
self.addEventListener('fetch', (event) => {
    // WebSocket 요청은 처리하지 않음
    if (event.request.url.includes('wss://') ||
        event.request.url.includes('ws://') ||
        event.request.url.includes('generativelanguage.googleapis.com')) {
        return;
    }

    // API 요청은 캐싱하지 않음
    if (event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        // 네트워크 우선 시도
        fetch(event.request)
            .then((response) => {
                // 유효한 응답이면 캐시에 저장
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                }
                return response;
            })
            .catch(() => {
                // 네트워크 실패 시 캐시에서 반환
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // HTML 요청인 경우 index.html 반환
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                        return null;
                    });
            })
    );
});

// 푸시 알림 (향후 확장용)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body || 'AntiGravity 알림',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [100, 50, 100],
            data: data.url || '/'
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'AntiGravity', options)
        );
    }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 이미 열린 창이 있으면 포커스
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // 없으면 새 창 열기
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data || '/');
                }
            })
    );
});
