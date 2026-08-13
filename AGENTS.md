# AGENTS.md — 프로젝트 규약 (Codex는 모든 작업 전에 이 문서를 따른다)

## 프로젝트 개요

브라우저 게임. 3D 오버월드에서 캐릭터를 클릭 이동으로 조작하다가, 특정 지역에 도착하면
2D 씬으로 전환된다. 2D 지역 안에서 숨은 음표 찾기 + 미니게임으로 음표를 수집하며,
음표를 얻을 때마다 배경음악의 스템(악기 트랙)이 하나씩 켜진다. 음표를 모두 모으면
그 지역의 노래가 완성된다. 상세 동작은 `SPEC.md`를 따른다.

- 대상: 데스크톱 + 모바일 브라우저 (터치 필수 지원)
- 배포: Vercel 정적 호스팅
- 심사 요건: 브라우저에서 즉시 실행되는 웹 빌드. 초기 로딩 3초 이내 목표.

## 기술 스택 (고정 — 임의로 바꾸지 않는다)

- Vite + TypeScript (strict)
- Three.js (3D 오버월드와 2D 지역 모두 — 2D는 OrthographicCamera + 스프라이트 평면)
- GSAP (카메라 연출, 씬 전환, UI 트윈)
- Web Audio API 직접 사용 (오디오 라이브러리 금지 — StemPlayer를 직접 구현)
- React/Vue 등 프레임워크 금지. UI는 DOM + CSS로 만든다.
- 상태 관리는 `src/core/store.ts`의 단일 스토어(EventTarget 기반)만 사용한다.

## 폴더 구조 (이 구조를 유지한다. 새 최상위 폴더를 만들지 않는다)

```
src/
  main.ts                 # 부트스트랩만. 로직 금지
  core/
    engine.ts             # renderer, 루프, resize
    assets.ts             # 로딩 매니저 (진행률 이벤트 발행)
    input.ts              # pointer 통합 입력 (mouse+touch)
    store.ts              # 게임 상태 (수집한 음표, 씬 상태, 설정)
  audio/
    stemPlayer.ts         # 스템 동기 재생/언뮤트 시스템
    sfx.ts                # 효과음
  scenes/
    sceneManager.ts       # 씬 전환 + 페이드 오버레이
    overworld/            # 3D 오버월드
    region/               # 2D 지역 (음표 찾기 + 미니게임)
  ui/                     # HUD, 음표 카운터, 다이얼로그, 로딩 화면
public/assets/
  models/  textures/  audio/stems/  audio/sfx/  ui/
```

## 에셋 규약 (매우 중요)

- 디자이너/사운드 에셋은 나중에 도착한다. **코드는 절대 에셋 완성을 기다리지 않는다.**
- 모든 에셋 참조는 `src/core/assetManifest.ts` 한 파일에만 정의한다.
  코드 곳곳에 경로 문자열을 하드코딩하지 않는다.
- 플레이스홀더 규칙:
  - 3D 캐릭터: 캡슐 + 구 (걷을 때 바운스 애니메이션을 코드로)
  - 바닥/배경 텍스처: 코드로 생성한 캔버스 텍스처 (격자 + 라벨 텍스트)
  - 음표 아이콘: 유니코드 ♪를 캔버스에 그려 텍스처화
  - 스템 오디오: WebAudio 오실레이터로 4마디 루프를 코드 생성 (트랙별 다른 음색)
- 실제 에셋이 도착하면 assetManifest의 경로만 바꿔서 교체된다. 이 원칙이 깨지는 PR 금지.

## 코딩 컨벤션

- 파일당 하나의 책임. 300줄 넘으면 분리를 검토한다.
- 클래스는 명시적 `dispose()`를 갖는다 (Three 리소스: geometry/material/texture 해제).
- 씬 전환 시 이전 씬을 완전히 dispose한다. 메모리 누수 금지.
- 매 프레임 객체 생성 금지 (Vector3 등은 재사용 버퍼로).
- 이벤트 이름, 상태 키는 `src/core/constants.ts`에 상수로 모은다.
- 주석은 한국어로 간결하게. 왜(why)만 적는다.
- `any` 금지. Three.js 타입을 정확히 쓴다.

## 입력 규약

- 모든 입력은 Pointer Events로만 처리한다 (mousedown/touchstart 직접 사용 금지).
- 클릭과 드래그를 구분한다: 이동 8px 미만 + 300ms 미만 = 탭(클릭).
- 모바일에서 더블탭 줌/스크롤 바운스가 게임을 방해하지 않게 CSS(touch-action) 처리.

## 성능 예산

- 초기 다운로드(에셋 포함) 5MB 이하, 첫 인터랙션까지 3초 이하.
- 드로우콜 100 이하, 데스크톱 60fps / 모바일 30fps 이상.
- 텍스처 최대 2048px. 모델은 Draco 압축 glb.
- 오디오는 사용자의 첫 제스처 이후에만 AudioContext를 resume한다 (자동재생 정책).

## 작업 방식

- 각 작업 후 `npm run build`가 통과해야 한다. 타입 에러를 남기지 않는다.
- 작업 단위마다 커밋한다. 커밋 메시지는 한국어 명령형("클릭 이동 구현").
- 기존 파일의 구조를 크게 바꾸는 리팩토링은 지시가 있을 때만 한다.
