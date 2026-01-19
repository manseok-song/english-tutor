# AntiGravity 🌌

> Zero-Touch, Eyes-Free English Tutor for CEOs
> 운전 중인 40대 경영자를 위한 초저지연 AI 비즈니스 영어 튜터

## 📱 Quick Start

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 아이폰에서 접속
- 같은 네트워크에서 `http://<your-ip>:3000` 접속
- Safari에서 "홈 화면에 추가" 선택하면 앱처럼 사용 가능

## 🔑 API Key 설정

1. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 API 키 발급
2. 앱 첫 실행 시 API 키 입력
3. 키는 로컬 스토리지에만 저장됨 (외부 전송 없음)

## 🎯 주요 기능

### 실시간 음성 대화
- Gemini Multimodal Live API 사용
- WebSocket 기반 양방향 스트리밍
- < 500ms 저지연 응답

### CEO 맞춤형 페르소나
- 비즈니스 영어 전문
- Series A, 정부과제, AI Agent 등 용어 이해
- 3문장 이내 간결한 답변

### Ambient UI
- 상태별 파티클 애니메이션
- 다크 모드 최적화
- 운전 중 시선 분산 최소화

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Audio**: Web Audio API
- **Network**: WebSocket
- **AI**: Gemini 2.0 Flash (Multimodal Live)
- **PWA**: Service Worker + Manifest

## 📁 프로젝트 구조

```
src/
├── App.tsx                 # 메인 앱
├── components/
│   ├── ParticleCanvas.tsx  # 파티클 애니메이션
│   ├── StatusIndicator.tsx # 상태 표시
│   ├── ControlButton.tsx   # 제어 버튼
│   ├── ApiKeyInput.tsx     # API 키 입력
│   └── TranscriptOverlay.tsx # 응답 텍스트
├── services/
│   ├── AudioService.ts     # 오디오 처리
│   └── GeminiService.ts    # WebSocket 통신
├── hooks/
│   ├── useAudio.ts         # 오디오 훅
│   └── useGemini.ts        # Gemini 훅
└── types/
    └── index.ts            # 타입 정의
```

## 🚗 차량 연결 자동 실행 (iOS Shortcuts)

1. iOS 단축어 앱 실행
2. 새 자동화 생성: "충전기 연결 시"
3. 동작: Safari에서 AntiGravity URL 열기

## ⚠️ 주의사항

- **마이크 권한**: 첫 사용 시 브라우저에서 마이크 권한 허용 필요
- **HTTPS**: 프로덕션 배포 시 HTTPS 필수 (마이크 접근 정책)
- **API 키**: public repo에 API 키 커밋 금지

## 📜 License

© 2024 AntiGravity Project. Powered by Gemini.
