# TASKS.md — Codex 작업 지시 시퀀스 (7일)

사용법: 각 태스크 블록을 통째로 Codex에 붙여넣는다. 한 블록 = 한 세션.
블록 안의 지시를 쪼개서 여러 번 보내지 말 것 (한도 절약).
각 태스크 시작 전 "AGENTS.md와 SPEC.md를 읽고 시작해"가 이미 블록에 포함돼 있다.

---

## Day 1 — 뼈대와 오버월드 이동

### Task 1-1
```
AGENTS.md와 SPEC.md를 읽고 시작해.

Vite + TypeScript + Three.js 프로젝트를 AGENTS.md의 폴더 구조대로 스캐폴딩해줘.
구현할 것:
1. core/engine.ts — WebGLRenderer, 메인 루프(rAF), 리사이즈 대응, 픽셀비 상한 2
2. core/assets.ts — LoadingManager 래퍼. 진행률(0~1) 이벤트 발행
3. ui/loading.ts — 로딩 화면 DOM 오버레이. 진행률 바 + 완료 시 "시작" 버튼
4. scenes/sceneManager.ts — 씬 인터페이스(init/update/dispose)와 전환 시 검은 페이드 오버레이
5. core/store.ts — EventTarget 기반 상태 스토어와 SPEC 5장의 상태 키
6. main.ts — 부트스트랩: 로딩 → 시작 버튼 → 오버월드 씬(빈 씬이어도 됨)
npm run build가 통과해야 하고, npm run dev로 빈 씬과 로딩 화면이 보여야 해.
```

### Task 1-2
```
AGENTS.md와 SPEC.md(2장)를 읽고 시작해.

scenes/overworld/를 구현해줘:
1. 격자 캔버스 텍스처를 입힌 바닥 평면(40×40유닛)과 사각 경계
2. 플레이스홀더 캐릭터: 캡슐+구, 걷는 동안 상하 바운스와 진행 방향 회전
3. core/input.ts — Pointer Events 통합 입력. 탭/드래그 구분(AGENTS.md 입력 규약)
4. 클릭 이동: 바닥 탭 → Raycaster → 목적지 마커 표시 → 캐릭터 등속 이동
5. 카메라: 쿼터뷰 PerspectiveCamera, 캐릭터 lerp 팔로우
모바일 터치에서도 동일하게 동작해야 해. 매 프레임 객체 생성 금지.
```

## Day 2 — 지역 진입과 2D 씬 골격

### Task 2-1
```
AGENTS.md와 SPEC.md(2~3장)를 읽고 시작해.

1. 오버월드에 지역 입구 1개를 추가(플레이스홀더: 빛나는 원기둥, 위치는 assetManifest에)
2. 캐릭터가 입구 반경 2유닛에 들어오면 하단 중앙에 "들어가기" DOM 버튼 표시, 이탈 시 숨김
3. 버튼 탭 → GSAP 카메라 줌인 + 페이드 → RegionScene으로 전환 (오버월드 dispose)
4. scenes/region/ 골격: OrthographicCamera + 4096×2048 플레이스홀더 배경(캔버스 생성 텍스처,
   구역별 색 블록과 번호 라벨을 그려서 좌표 잡기 쉽게)
5. 배경 드래그 팬 + 휠/핀치 줌(1x~2.5x), 카메라가 배경 밖을 못 보게 클램프
6. 우상단 "나가기" 버튼 → 페이드 → 오버월드 복귀(입구 앞에서 재개)
씬을 오가도 메모리가 늘면 안 돼. dispose를 검증하는 간단한 로그를 넣어줘.
```

## Day 3 — 스템 오디오 시스템

### Task 3-1
```
AGENTS.md와 SPEC.md(4장)를 읽고 시작해. 이 게임의 핵심 시스템이야.

audio/stemPlayer.ts를 구현해줘:
1. AudioContext 관리: 사용자 첫 제스처에서 resume. 이전에는 어떤 노드도 start하지 않기
2. 스템 K개를 받아 동시에 start, 각각 GainNode, loop=true로 무한 루프
3. unlockStem(id): gain 0→1을 2초 페이드. lockAll, setMasterVolume, BPM 조회 API
4. 플레이스홀더 스템 4개를 OfflineAudioContext로 코드 생성: 120BPM 4마디 —
   킥+하이햇 패턴 / 신스 베이스 라인 / 패드 화음(코드 진행) / 리드 멜로디.
   AudioBuffer로 렌더해서 실제 파일과 같은 인터페이스로 사용
5. assetManifest.ts에 음표→스템 매핑 테이블(SPEC 4장) 정의
6. store의 collectedNotes 변화를 구독해 자동으로 스템을 언뮤트
7. 오버월드에 있을 땐 마스터 0.3배, 지역에선 1.0
디버그용: 키보드 1~7로 음표 획득을 시뮬레이션할 수 있게 해줘(추후 제거 표시 주석).
```

## Day 4 — 숨은 음표 찾기

### Task 4-1
```
AGENTS.md와 SPEC.md(3-1장)를 읽고 시작해.

1. 숨은 음표 데이터: scenes/region/noteSpots.ts에 배경 UV 좌표(0~1) 기반으로 4개 정의
2. 음표 스프라이트(캔버스에 ♪ 그린 텍스처)를 배경 위 해당 좌표에 배치. 줌 레벨과
   무관하게 화면상 약 20px 크기 유지
3. 탭 판정: 화면 기준 24px. 성공 → 반짝 파티클 + 획득 사운드(sfx.ts, 코드 생성 비프)
   + store.collectedNotes에 추가(→ 스템이 켜짐) + 스프라이트 제거
4. HUD ui/hud.ts: 좌상단 ♪ n/7 카운터, 획득 시 펄스. 우상단 음소거 토글
5. 힌트: 60초 무획득 시 미발견 음표 1개 근처에 파동 이펙트 1회
6. localStorage 저장/복원, 타이틀에 "처음부터" 버튼
```

## Day 5 — 미니게임

### Task 5-1
```
AGENTS.md와 SPEC.md(3-2장)를 읽고 시작해.

미니게임 공통 프레임 + 2종을 구현해줘. 전부 DOM+Canvas 모달 오버레이로, 게임 씬과 분리:
1. scenes/region/minigames/frame.ts — 모달 열기/닫기, 클리어 콜백, 재도전 버튼
2. 지역 배경에 미니게임 입구 3개(문 아이콘 스프라이트, 좌표는 noteSpots처럼 데이터로)
3. 타이밍 바: 좌우로 움직이는 바를 목표 구간에서 탭, 3회 성공 클리어.
   속도는 회차마다 10%씩 증가
4. 리듬 탭: stemPlayer의 BPM에 동기화된 노트가 흘러오고 판정선에서 탭.
   16노트, 정확도 70% 이상 클리어. 판정 Perfect/Good/Miss 표시
클리어 → 음표 1개 획득(기존 획득 플로우 재사용), 입구가 완료 표시로 바뀜.
모바일 터치 확인 필수.
```

### Task 5-2 (여유 있을 때만)
```
SPEC.md 3-2장의 미니게임 3(소리 기억하기)을 같은 프레임으로 추가해줘.
4버튼, 사운드는 sfx.ts에 4음 추가, 3라운드. 시간이 없으면 이 태스크는 스킵한다.
```

## Day 6 — 실제 에셋 통합 + 폴리시

### Task 6-1
```
AGENTS.md의 에셋 규약을 확인하고 시작해.

public/assets/에 실제 에셋이 들어왔어. assetManifest.ts의 경로를 실제 파일로 교체하고:
1. 캐릭터 glb 로드(Draco), idle/walk 애니메이션 전환
2. 오버월드 바닥/소품 텍스처 교체, 지역 배경 일러스트 교체(noteSpots 좌표 재조정)
3. 스템 오디오 파일 교체(개수/길이는 manifest 기준으로 동작 확인)
4. UI 아이콘 교체
빠진 에셋은 플레이스홀더가 그대로 남아야 해(폴백 로직 확인).
번들 리포트를 확인해서 총 다운로드가 5MB를 넘으면 알려줘.
```

### Task 6-2
```
폴리시 패스:
1. 씬 전환 페이드 타이밍/이징 다듬기, 획득 연출 강화(파티클, 사운드 레이어)
2. 모바일 실기기 이슈 수정: 터치 판정 크기, 세로 화면 대응(가로 회전 안내 오버레이)
3. 로딩 화면에 게임 방법 1줄 안내 추가
4. 완성(엔딩) 연출 구현 — SPEC.md 7장 그대로
```

## Day 7 — 배포와 제출

### Task 7-1
```
1. Vercel 배포 설정(정적 빌드). 캐시 헤더: 에셋 immutable, index.html no-cache
2. 최종 QA 체크리스트를 만들어 실행: 첫 로딩 시간, 전 플로우 클리어 가능,
   씬 왕복 10회 메모리, 모바일 사파리/크롬, 음소거 상태 새로고침 복원
3. README.md 작성: 게임 소개, 플레이 방법, 기술 스택, Codex 활용 방식 요약
```

---

## 운영 팁 (Codex 한도 절약)

- 에러가 나면 에러 전문 + 재현 방법을 먼저 Claude와 분석해 원인을 좁힌 뒤,
  Codex에는 "X 파일의 Y가 원인이니 이렇게 고쳐줘"로 한 번에 지시한다
- "안 돼, 다시 해봐"식 재시도 금지 — 매번 무엇이 어떻게 다른지 명시한다
- 하루 작업 시작 시 `git status`가 깨끗한지 확인하고, 태스크 단위로 커밋을 남긴다
  (커밋 히스토리 = Codex Collaboration 증빙)
