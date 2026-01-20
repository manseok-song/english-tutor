# AntiGravity 배포 가이드

## 🚀 배포 옵션

### 1. GitHub Pages (무료, 추천)

```bash
# 1. GitHub 저장소 생성
# 2. 코드 푸시
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/antigravity.git
git push -u origin main

# 3. Settings → Pages → Source: main branch
# 4. https://username.github.io/antigravity/ 에서 접속
```

### 2. Vercel (무료)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 3. Netlify (무료)

1. [Netlify](https://netlify.com) 접속
2. "Add new site" → "Import an existing project"
3. GitHub 저장소 연결
4. 자동 배포 완료

### 4. Cloudflare Pages (무료)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 접속
2. Pages → Create a project
3. GitHub 연결 후 저장소 선택
4. Build settings: 없음 (정적 사이트)

### 5. 자체 서버 (Nginx)

```nginx
# /etc/nginx/sites-available/antigravity
server {
    listen 443 ssl http2;
    server_name antigravity.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/antigravity;
    index index.html;

    # PWA Service Worker
    location /sw.js {
        add_header Cache-Control "no-cache";
        add_header Service-Worker-Allowed "/";
    }

    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🔒 보안 설정

### HTTPS 필수

마이크 접근(getUserMedia)은 보안 컨텍스트에서만 허용됩니다:
- `https://` 프로토콜
- `localhost` (개발용)
- `127.0.0.1` (개발용)

### API 키 보안

**현재 구조의 한계:**
- 클라이언트 사이드 앱이므로 API 키가 브라우저에 노출됨
- localStorage에 저장되어 사용자별로 관리됨

**보안 강화 옵션:**

1. **프록시 서버 사용 (권장)**
```javascript
// 백엔드 프록시를 통해 API 호출
// API 키는 서버에만 저장
const response = await fetch('/api/gemini', {
    method: 'POST',
    body: audioData
});
```

2. **API 키 제한 설정**
- [Google Cloud Console](https://console.cloud.google.com)에서
- API 키에 HTTP 리퍼러 제한 추가
- 특정 도메인에서만 사용 가능하도록 설정

3. **사용량 제한**
- 일일 요청 수 제한 설정
- 비정상 사용 모니터링

## 📱 PWA 설치 프롬프트

### iOS (Safari)

1. Safari에서 앱 URL 접속
2. 공유 버튼 탭
3. "홈 화면에 추가" 선택
4. 이름 확인 후 "추가"

### Android (Chrome)

1. Chrome에서 앱 URL 접속
2. 메뉴(⋮) → "앱 설치" 또는
3. 자동으로 표시되는 "홈 화면에 추가" 배너 클릭

### Desktop (Chrome)

1. Chrome에서 앱 URL 접속
2. 주소창 오른쪽 설치 아이콘 클릭
3. 또는 메뉴 → "AntiGravity 설치"

## 🎨 아이콘 생성

PWA 아이콘이 필요합니다:

```bash
# icons 폴더에 다음 파일 추가
icons/
├── icon-192.png   # 192x192 PNG
└── icon-512.png   # 512x512 PNG
```

**아이콘 생성 도구:**
- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- [Favicon.io](https://favicon.io)

## 🔄 업데이트 배포

### Service Worker 캐시 갱신

`sw.js`의 `CACHE_NAME`을 변경하면 자동으로 새 버전 설치:

```javascript
// sw.js
const CACHE_NAME = 'antigravity-v3';  // 버전 증가
```

### 사용자에게 업데이트 알림

```javascript
// app.js에 추가 (선택사항)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // 새 버전 사용 가능
                    if (confirm('새 버전이 있습니다. 새로고침 하시겠습니까?')) {
                        window.location.reload();
                    }
                }
            });
        });
    });
}
```

## 📊 모니터링

### Google Analytics 추가 (선택)

```html
<!-- index.html <head>에 추가 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 에러 모니터링 (Sentry)

```javascript
// app.js 상단에 추가
import * as Sentry from '@sentry/browser';
Sentry.init({ dsn: 'YOUR_SENTRY_DSN' });
```

## ✅ 배포 체크리스트

- [ ] HTTPS 설정 완료
- [ ] API 키 제한 설정
- [ ] PWA 아이콘 추가 (192x192, 512x512)
- [ ] manifest.json 확인
- [ ] Service Worker 정상 동작 확인
- [ ] 모바일 테스트 (iOS Safari, Android Chrome)
- [ ] 마이크 권한 정상 동작 확인
- [ ] 오프라인 폴백 확인

---

**문의**: Issues 페이지에 등록해주세요.
