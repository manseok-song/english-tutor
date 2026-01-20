# AntiGravity 작업 일지

## 2026-01-20 (오늘)

### 완료된 작업

#### Phase 1: 프로젝트 구조 및 기본 기능
- [x] Xcode → PWA (웹앱)으로 플랫폼 변경 결정
- [x] 프로젝트 구조 생성
  - `index.html`, `manifest.json`, `sw.js`
  - `css/styles.css`
  - `js/app.js`, `constants.js`, `audioService.js`, `geminiService.js`

#### Phase 2: 핵심 기능 구현
- [x] VAD (Voice Activity Detection) - `vadService.js`
- [x] 파티클 애니메이션 - `particleView.js`
- [x] CEO 페르소나 프롬프트 - `prompts.js`
- [x] Interruption 기능 (AI 응답 중 끼어들기)

#### Phase 3: 배포 및 문서화
- [x] GitHub 저장소 생성 및 푸시
- [x] GitHub Pages 배포 활성화
- [x] README.md, DEPLOY.md 작성
- [x] .gitignore 설정

### 버그 수정

#### 1. Gemini API 연결 오류
- **문제**: "듣는 중"만 표시되고 응답 없음
- **원인 1**: API 버전 오류 (`v1alpha` → `v1beta`)
- **원인 2**: 모델명 오류 (`gemini-2.0-flash-exp` → `gemini-2.0-flash-live-001`)
- **원인 3**: Setup 메시지 형식 (`snake_case` → `camelCase`)
- **원인 4**: 오디오 전송 형식 (`mediaChunks` → `audio.data`)
- **상태**: 수정 완료

#### 2. UI 버그 - 정지 아이콘 중복
- **문제**: 정지 버튼에 아이콘이 두 개 표시됨
- **원인**: CSS `::after` 와 JavaScript 둘 다 아이콘 설정
- **해결**: CSS `::after` 규칙 제거
- **상태**: 수정 완료

#### 3. GitHub Pages 경로 오류
- **문제**: Service Worker, manifest 등 경로 불일치
- **해결**: 절대경로(`/`) → 상대경로(`./`)로 변경
- **상태**: 수정 완료

#### 4. 서버 연결 끊김
- **문제**: "서버 연결이 끊어졌습니다" 에러
- **조치**: 디버그 로그 UI 추가 (모바일 테스트용)
- **상태**: 디버깅 중

#### 5. 파장 시각화 추가
- **기능**: 음성 감지 시 울렁이는 파장 애니메이션
- **파일**: `js/waveView.js` 신규 생성
- **구현**: Canvas 기반 사인파 조합, 오디오 레벨 연동
- **상태**: 완료

#### 6. AI 인사 기능 추가
- **기능**: 세션 시작 시 AI가 먼저 인사
- **구현**: `geminiService.sendText()` 트리거
- **상태**: 완료

### 현재 상태

```
배포 URL: https://manseok-song.github.io/english-tutor/
캐시 버전: antigravity-v5
API 버전: v1beta
모델: gemini-2.0-flash-exp
```

### 다음 작업

- [ ] AI 응답 테스트
- [ ] 오디오 재생 테스트
- [ ] 모바일 테스트 완료
- [ ] PWA 아이콘 추가 (192x192, 512x512)

---

## 기술 사양

### Gemini Live API 메시지 형식

#### Setup 메시지 (연결 후 첫 메시지)
```json
{
  "setup": {
    "model": "models/gemini-2.0-flash-live-001",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": {
            "voiceName": "Aoede"
          }
        }
      }
    },
    "systemInstruction": {
      "parts": [{"text": "..."}]
    }
  }
}
```

#### 오디오 입력 메시지
```json
{
  "realtimeInput": {
    "audio": {
      "data": "base64-encoded-pcm-16bit-16khz"
    }
  }
}
```

### WebSocket Close 코드
| 코드 | 의미 |
|------|------|
| 1000 | 정상 종료 |
| 1001 | 서버 종료 |
| 1006 | 비정상 종료 (네트워크 문제) |
| 1011 | 서버 내부 오류 |

---

*최종 업데이트: 2026-01-20*
