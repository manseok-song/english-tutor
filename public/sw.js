// AntiGravity Service Worker v2
const CACHE_NAME = 'antigravity-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/audio-worklet-processor.js',
];

// 설치 시 정적 자산 캐싱
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 활성화 시 이전 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch 전략: 네트워크 우선, 캐시 폴백
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // WebSocket은 캐싱하지 않음
  if (url.protocol === 'wss:' || url.protocol === 'ws:') {
    return;
  }

  // API 요청은 캐싱하지 않음
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // AudioWorklet 프로세서는 캐시 우선 (오프라인 지원)
  if (url.pathname.includes('audio-worklet-processor.js')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // 정적 자산: 캐시 우선, 네트워크 폴백
  if (STATIC_ASSETS.some((asset) => url.pathname === asset || url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }

  // 기타: 네트워크 우선, 캐시 폴백
  event.respondWith(
    fetch(request)
      .then((response) => {
        // GET 요청만 캐싱
        if (request.method === 'GET' && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          // 오프라인 페이지 반환 (있는 경우)
          if (request.destination === 'document') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// 푸시 알림 (향후 확장용)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    self.registration.showNotification(data.title || 'AntiGravity', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    });
  }
});

// 백그라운드 동기화 (향후 확장용)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-conversation') {
    console.log('[SW] Background sync triggered');
  }
});
