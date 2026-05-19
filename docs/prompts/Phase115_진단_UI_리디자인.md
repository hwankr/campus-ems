# Phase 115 — 진단 콘솔 UI 리디자인

> Phase110 진단/재생 기능은 그대로 두고, 시연 심사위원에게 "완성도 있는 시설팀 관제 대시보드"로 보이도록 시각 언어를 통일한다. 기능 로직과 데이터 계약은 손대지 않는다.

---

## 사전 전제

- Phase110까지 정상 동작한다.
- `public/data/realtime-diagnosis-demo.json`, `public/data/realtime-playback-demo.json`이 존재한다.
- `/`의 실시간 진단 모드와 `/realtime` 페이지에서 기존 기능이 모두 노출된다.

---

```text
CAMPUS-RE100의 실시간 진단 화면을 시연용 관제 대시보드 톤으로 리디자인한다.
데이터 로직, 함수명, props, 상태 흐름, 데이터 파일 구조는 절대 바꾸지 않는다.
Tailwind 클래스와 컴포넌트 레이아웃만 갱신한다.

공통 시각 규칙:
- 배경: 단조한 slate-* 일색을 피하고 slate-950/85 + border-white/5 + ring-inset white/[0.04] + backdrop-blur-md 글래스 톤을 사용한다.
- 색상 의미를 통일한다:
  - lime-300: 라이브/현재값/핵심 KPI
  - sky/cyan: 정상·예측 기준
  - amber-300: 높음·주의
  - red-400/500: 점검 필요
  - 계절 액센트: spring=emerald, summer=amber/orange, autumn=orange/rose, winter=sky/indigo
- 숫자는 font-mono tabular-nums를 적용한다.
- 영문 마이크로 라벨은 uppercase tracking-[0.22em]을 적용한다.
- "LIVE" 또는 "Live demo" 배지는 lime 펄스 dot과 함께 표시한다.

대상 컴포넌트와 변경 내용:

1. components/realtime/RealtimePlaybackControls.tsx
   - 좌측에 size-11 원형 PLAY 버튼. 재생 중에는 animate-ping ring을 덧붙인다.
   - 컨테이너 상단에 계절별 가로 strip(3px, spring=emerald, summer=amber/orange, autumn=orange/rose, winter=sky/indigo)을 둔다.
   - 가운데 영역에 LIVE 펄스 배지 + 운영 태그(아래 규칙) + KST 타임스탬프 + 범위 이탈 N건을 한 줄, 그 아래 frame.label + 계절·시간대 보조 라벨 한 줄로 압축한다.
     - outOfRangeCount >= 10: "이상 다발" red 톤
     - >= 5: "변동 구간" amber 톤
     - >= 2: "관찰 구간" sky 톤
     - 그 외: "안정 구간" emerald 톤
   - 우측에 prev/next IconButton + 03/12 카운터(sm 이상에서만) + 컨트롤 펼침/접힘 chevron.
   - 시나리오 chip, 슬라이더와 속도 chip(1.8초/1.2초/0.7초/0.35초)은 chevron으로 토글 가능한 두 번째 줄에 배치한다(기본 펼침).
   - 기상 6개 strip은 제거한다. 같은 정보가 좌하단 HUD 범례에 이미 노출되어 있다. /realtime 페이지의 weather strip 섹션과도 중복되지 않게 한다.

2. components/realtime/PredictionTrail.tsx
   - 리스트가 아닌 시간순 column chart로 보여준다.
   - 각 column의 색은 outOfRangeCount 구간에 따라 emerald→sky→amber→red 그라데이션.
   - 차트 아래에 "피크 시각 / 피크 이탈 / 누적 심각" 3 stat 행을 둔다.
   - 비었을 때는 점선 placeholder 한 줄.

3. components/map/CampusMap.tsx (HUD JSX만)
   - 진단 모드에서 건물이 선택된 경우에만 선택건물 배지를 표시한다. 배지는 상단 severity 색 strip 3px + 현재/예측 stat 2칸 + "유사조건 대비 ±%" 한 줄로 구성한다.
   - 좌하단 범례는 LIVE pulse + 1H/KST 시각 + 범위 이탈 배지 + 합성 기상 기준 안내문 + severity 2x2 grid로 구성한다.
   - `CampusMap`은 frame 전체를 props로 받지 않으므로 `frame.label`과 상세 기상 strip은 지도 HUD가 아니라 RealtimePlaybackControls 및 `/realtime` weather strip에서 표시한다.
   - Phase115에서는 GeoJSON/스타일/Mapbox 레이어 계약을 바꾸지 않는다.

4. app/page.tsx의 RealtimeMapSummary
   - 4단 위계를 갖는다:
     1) Hero KPI: 현재 1시간 사용량 큰 mono 숫자 + 유사조건 ±% 배지 + 좌측 lime strip + 작은 LIVE label.
     2) 상태 분포: critical/high/normal/low를 4색 stacked bar 한 줄 + 4 grid 라벨.
     3) 우선 점검 후보 TOP 5: 순위 chip, 건물명, ±%, "여름 오후 평균 대비 뚜렷한 초과" 형식의 이유 한 줄, 현재 vs 예측을 보여주는 mini RangeBar.
     4) PredictionTrail.
   - 상단 모드 토글은 진단 우선 위계로 정리한다. `mapMode` 초기값은 `"diagnosis"`로 두고, 헤더 토글은 두 그룹으로 나눈다.
     - 주(primary): `실시간 진단` 버튼. 활성 시 lime-300 펄스 dot + glow + ring-1 ring-lime-300/50 + bg-lime-300/15.
     - 세로 디바이더(`h-4 w-px bg-white/5`) + 마이크로 라벨 `분석`(font-mono text-[9px] tracking-[0.08em] text-slate-500, sm 이상에서만 노출).
     - 부(secondary): `연간 사용량` / `옥상 잠재량` 버튼은 한 단계 축소(`h-7`, `font-medium`, `px-1.5 sm:px-2`)하고 비활성 색은 slate-400, 활성은 기존 sky/amber 칩 톤을 그대로 사용한다.
     - 칩 배경은 모드별 색을 10% 채도로 사용한다.
   - RealtimePlaybackControls는 별도 띠로 지도 위를 차지하지 않고, 지도 영역 안에 `absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[min(680px,calc(100%-1.5rem))]` overlay로 띄운다. 부모는 `pointer-events-none`이고 컨트롤 자체에 `pointer-events-auto`를 둬서 지도 인터랙션을 가리지 않게 한다.
   - 진단 모드에서 선택건물 배지는 overlay와 겹치지 않게 `top-[148px] sm:top-[140px]`로 내린다(다른 모드에서는 기존 `top-4` 유지).

5. app/realtime/page.tsx
   - 표 레이아웃에서 워크벤치 레이아웃으로 바꾼다:
     - 페이지 헤더: Diagnosis Workbench 마이크로 라벨 + 제목 + 합성 데이터 배지 + KST 타임스탬프.
     - RealtimePlaybackControls를 그대로 재사용한다. 이를 위해 isPlaying, speedMs 로컬 state + setInterval 자동재생 효과만 추가한다(기존 함수명/계약 유지).
     - Hero metric 4개: 현재 캠퍼스 사용량(lime), 유사 조건 평균(slate), 점검 후보 수(amber), 합성 기상(sky).
     - Weather strip: 강수/풍속/일사/구름 4칸 + 기온/습도 2칸.
     - 2-column 본문: 좌 360px = 검색 + severity chip toggle + 건물 리스트, 우 = 선택 건물 상세.
     - severity 필터는 `<select>` 대신 chip toggle 버튼(전체/점검/높음/정상/낮음, dot+텍스트).
     - 건물 리스트 항목: 좌 severity strip + 건물명 + ±% + mini RangeBar.
     - 상세 카드:
       - 상단에 severity 색 strip.
       - "유사 조건 평균 대비 (급격한/뚜렷한/완만한) (초과/부족)" 자동 문구.
       - 큰 RangeBar(현재 fill + 예측 tick).
       - 3 stat tile: 현재 / 예측 평균 / 차이.
       - 유사 샘플 scatter: 시간축 위에 dot, 위치는 kWh 상대값. 아래에 상위 3개 카드.

검증:
- 한글 모지바케 없음.
- 버튼 안 텍스트 잘림 없음.
- 데이터 로직과 데이터 파일 구조 변경 없음.
- npm run lint 통과.
- npx tsc --noEmit 통과.
- npm run build 통과.
- `/` 진단 모드에서 재생/이전/다음/속도/슬라이더 정상.
- `/realtime`에서 재생 컨트롤, 필터, 리스트, 상세 카드 정상.
- `/realtime` 검색이 한글 건물명/번호/구역/용도에 모두 적용된다.
```

---

## 발표 멘트

> "기능은 Phase110에서 다 들어갔고, 이번에는 시설팀이 실제로 모니터링할 때 한 화면에서 '캠퍼스 상태 → 이상 건물 수 → 점검 후보 → 예측 이력'을 순서대로 읽을 수 있도록 시각 위계를 다시 잡았습니다. 색·태그·예측 범위 막대 같은 시각 신호가 추가되어 합성 데이터라도 실 운영 콘솔의 디테일이 그대로 보입니다."

---

## 비상 대응

- 모지바케가 발견되면 해당 파일을 UTF-8(No BOM)로 다시 저장한다.
- 슬라이더 진행률 그라데이션이 안 보이면 슬라이더 트랙 위에 absolute로 배치된 그라데이션 div의 z-index가 input 아래에 있는지 확인한다.
- `/realtime` 자동 재생이 동작하지 않으면 `isPlaying && playbackData?.frames.length` 의존성과 setInterval cleanup을 점검한다.
- 모드 토글이 너무 옅게 보이면 active 상태의 ring-1 ring-*-300/50을 ring-2로 올린다.
- overlay 컨트롤이 지도 클릭을 가로채면 부모 wrapper의 `pointer-events-none`과 컨트롤 자체의 `pointer-events-auto` 설정을 확인한다.
- 좁은 화면에서 선택건물 배지가 overlay와 겹치면 `top-[148px]` 값을 키운다.
- 시연 발표 직전에 디자인이 깨지면 이 Phase의 변경분만 git revert해도 Phase110 기능은 그대로 유지된다.

수정 이력: 2026-05-17 — 해커톤 시연용 진단 콘솔 UI 리디자인 Phase 추가.
수정 이력: 2026-05-17 — 재생 컨트롤을 지도 위 floating overlay + 2행 컴팩트(접기 토글) 구조로 변경. 기상 6열 strip 제거.
수정 이력: 2026-05-18 — `mapMode` 초기값을 `"diagnosis"`로 변경하고, 헤더 토글을 `실시간 진단`(primary) + `분석` 그룹(`연간 사용량`/`옥상 잠재량` secondary)으로 위계화.
수정 이력: 2026-05-20 — 실제 구현 결과에 맞춰 RealtimePlaybackControls의 시나리오 chip, CampusMap HUD의 props 경계, `/realtime` weather strip 항목, TypeScript 검증 항목을 명시.
