# AntiGravity 🌌

**운전 중인 CEO를 위한 핸즈프리 AI 영어 튜터**

> Zero-Touch, Eyes-Free English Tutor for Busy Tech Startup CEOs

## 🎯 Overview

AntiGravity는 바쁜 테크 스타트업 대표를 위해 설계된 AI 음성 학습 웹앱입니다.
Google Gemini Multimodal Live API를 활용하여 실시간 음성 대화로 비즈니스 영어를 학습할 수 있습니다.

### 핵심 기능

- **🎤 실시간 음성 대화**: 마이크 → Gemini AI → 스피커 양방향 스트리밍
- **⚡ 초저지연**: WebSocket 기반 < 500ms 응답
- **🔮 Ambient UI**: 상태별 파티클 애니메이션 (Idle/Listening/Speaking)
- **👔 CEO 페르소나**: 비즈니스 영어 특화 튜터 (3문장 이내 간결한 응답)
- **🗣️ Full-duplex**: 사용자가 말을 끊으면 AI 응답 즉시 중단

## 📱 설치 방법

### 웹 브라우저에서 바로 사용

1. HTTPS 서버에 배포 후 URL 접속
2. Chrome/Safari에서 "홈 화면에 추가" 선택
3. PWA로 설치 완료!

### 로컬 개발 환경

```bash
# 프로젝트 클론
git clone <repository-url>
cd AntiGravity

# HTTPS 로컬 서버 실행 (마이크 권한에 HTTPS 필요)
npx serve --ssl

# 또는 Python
python -m http.server 8000 --bind 127.0.0.1
# (localhost는 HTTPS 없이도 마이크 허용)
```

## 🔑 API 키 설정

### Gemini API 키 발급

1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. "Create API Key" 클릭
3. 발급받은 키 복사

### 앱에서 설정

1. 앱 실행 후 ⚙️ 설정 버튼 클릭
2. "Gemini API Key" 입력란에 키 붙여넣기
3. "저장" 클릭

> ⚠️ **보안 주의**: API 키는 브라우저 localStorage에 저장됩니다.
> 공용 컴퓨터에서는 사용 후 키를 삭제하세요.

## 🚀 사용 방법

1. **시작**: 🎤 버튼 클릭 또는 스페이스바
2. **대화**: 영어로 말하면 AI가 응답
3. **끼어들기**: AI가 말하는 중에도 말하면 즉시 중단
4. **종료**: ⏹️ 버튼 클릭

### 상태 표시

| 상태 | 색상 | 설명 |
|------|------|------|
| 🔵 Idle | 파란색 | 대기 중 |
| 🟢 Listening | 초록색 | 듣는 중 |
| 🟣 Speaking | 보라색 | AI 응답 중 |
| ⚪ Connecting | 회색 | 연결 중 |
| 🔴 Error | 빨간색 | 오류 발생 |

## 📁 프로젝트 구조

```
AntiGravity/
├── index.html           # 메인 HTML
├── manifest.json        # PWA 매니페스트
├── sw.js               # Service Worker
├── css/
│   └── styles.css      # 스타일 (다크 모드)
├── js/
│   ├── app.js          # 메인 앱 로직
│   ├── audioService.js # Web Audio API
│   ├── geminiService.js# Gemini WebSocket
│   ├── vadService.js   # 음성 감지 (VAD)
│   ├── particleView.js # 파티클 애니메이션
│   ├── prompts.js      # CEO 페르소나
│   └── constants.js    # 상수 정의
└── icons/              # PWA 아이콘
```

## 🛠️ 기술 스택

- **Frontend**: Vanilla JavaScript (ES6+ Modules)
- **Audio**: Web Audio API (AudioContext, MediaStream)
- **Network**: WebSocket (Gemini Multimodal Live API)
- **UI**: CSS3 (Dark Mode, Canvas 파티클)
- **PWA**: Service Worker, Web App Manifest

## 📊 브라우저 지원

| 브라우저 | 지원 | 비고 |
|----------|------|------|
| Chrome | ✅ | 권장 |
| Edge | ✅ | Chromium 기반 |
| Safari | ✅ | iOS 17+ |
| Firefox | ⚠️ | 일부 기능 제한 |

## 🔧 문제 해결

### 마이크가 작동하지 않음
- HTTPS 또는 localhost에서만 마이크 접근 가능
- 브라우저 설정에서 마이크 권한 확인

### API 연결 실패
- API 키가 올바른지 확인
- 네트워크 연결 상태 확인
- [Google AI Studio](https://aistudio.google.com) 에서 API 상태 확인

### 소리가 들리지 않음
- 볼륨 설정 확인
- 다른 탭에서 오디오 재생 중인지 확인

## 📝 라이선스

MIT License

## 🙏 Credits

- Powered by [Google Gemini](https://ai.google.dev/)
- Particle animation inspired by ambient music visualizers

---

**© 2024 AntiGravity Project**
