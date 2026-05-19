# Phase 110 — 시간별 전력 진단 대시보드

> 월별 총량 보존 시간별 합성 데이터를 이용해 현재 사용량이 과거 유사 기상·시간 조건 대비 정상인지 보여주는 진단 화면을 만든다.

---

## 사전 준비

- 기본 입력 경로는 루트의 `campus_re100_hourly_demo/campus_re100_hourly_demo/` 폴더다.
- 원본 폴더가 다른 위치에 있으면 `REALTIME_DEMO_SOURCE_DIR` 환경변수로 `public/data` 경로를 직접 지정할 수 있다.
- 해당 폴더에는 다음 파일이 있어야 한다.
  - `public/data/hourly-electricity/index.json`
  - `public/data/hourly-electricity/YYYY-MM.json`
  - `public/data/weather-hourly/index.json`
  - `public/data/weather-hourly/YYYY-MM.json`
  - `public/data/hourly_generation_metadata.json`

이 원본 시간별 JSON은 크기 때문에 브라우저에서 직접 모두 읽지 않는다. 앱에는 진단에 필요한 작은 요약 파일만 생성해 사용한다.
원본 폴더가 없더라도 이미 생성된 `public/data/realtime-diagnosis-demo.json`이 있으면 `build:realtime-demo`는 산출물 유효성만 검증하고 통과할 수 있다.

---

```text
CAMPUS-RE100에 시간별 전력 진단 데모를 추가한다.

목표:
- 실제 시설팀 계량값이 아니라 월별 총량을 보존한 시간별 합성 데이터임을 명확히 표시한다.
- demo 폴더의 1시간 단위 전력/기상 데이터를 읽어 기준 시각의 건물별 현재 사용량과 과거 유사 조건 평균을 계산한다.
- 브라우저가 대용량 월별 시간별 JSON을 직접 fetch하지 않게 한다.
- /realtime 페이지에서 시설팀 관점의 "어떤 건물을 먼저 점검해야 하는가"를 보여준다.

작업:
1. 진단 요약 생성 스크립트 추가
   - `scripts/build-realtime-diagnosis-demo.mjs` 생성
   - 입력:
     - `campus_re100_hourly_demo/campus_re100_hourly_demo/public/data/hourly-electricity/*.json`
     - `campus_re100_hourly_demo/campus_re100_hourly_demo/public/data/weather-hourly/*.json`
     - `campus_re100_hourly_demo/campus_re100_hourly_demo/public/data/hourly_generation_metadata.json`
     - 또는 `REALTIME_DEMO_SOURCE_DIR`로 지정한 `public/data` 경로
   - 출력:
     - `public/data/realtime-diagnosis-demo.json`
   - 기준 시각은 발표에 적합한 낮 시간으로 둔다.
   - 같은 건물의 과거 시간 중 시간대, 평일/주말, 강수 여부, 기온, 습도가 유사한 샘플을 찾아 평균을 계산한다.
   - 샘플이 부족하면 같은 시간대/요일 조건으로 fallback한다.
   - 원본 경로가 없고 기존 `public/data/realtime-diagnosis-demo.json`이 있으면 재생성 대신 compact 산출물 스키마를 검증한다.

2. package.json 스크립트 추가
   - `build:realtime-demo`
   - 실행 명령: `node scripts/build-realtime-diagnosis-demo.mjs`

3. 타입과 유틸 추가
   - `types/realtime.ts`
   - `lib/realtime-diagnosis.ts`
   - severity:
     - `critical`: 유사 조건 평균 대비 +25% 이상
     - `high`: +12% 이상
     - `normal`: -15% ~ +12%
     - `low`: -15% 이하

4. /realtime 페이지 추가
   - `app/realtime/page.tsx`
   - 상단 요약 카드:
     - 현재 캠퍼스 사용량
     - 유사 조건 평균
     - 기상 조건
     - 점검 후보 수
   - 필터:
     - 건물명/번호/구역/용도 검색
     - 상태 필터
   - 상태별 우선 점검 후보 목록
   - 선택 건물의 현재 사용량, 유사 조건 평균, 차이, 과거 샘플 상세
   - 합성 데이터 안내 문구를 화면 상단에 명확히 표시한다.

5. 지도 화면 진단 모드 추가
   - `app/page.tsx`의 지도 표시 모드에 `실시간 진단` 버튼을 추가한다.
   - `components/map/CampusMap.tsx`가 `realtimeDiagnosisRows`를 받아 GeoJSON feature에 `diagnosis_severity`, `current_kwh`, `expected_kwh`, `delta_pct`를 붙인다.
   - 진단 모드에서 건물 색상은 상태별로 표시한다.
     - 점검 필요: 빨강
     - 높음: 주황
     - 정상: 파랑
     - 낮음: 회색
   - 지도 위에는 `LIVE DEMO · 1시간 진단` 범례와 합성 데이터 안내를 표시한다.
   - 우측 패널에는 기준시각, 현재 사용량, 기상 상태, 높음/점검 후보 TOP 5를 표시한다.
   - 건물 선택 시 상세 패널 상단에 현재 1시간 사용량, 유사 조건 평균, 차이율을 표시한다.
   - 현재 기상값은 합성이며, 운영 전환 시 기상청 ASOS/AWS 필드로 교체 가능하다는 문구를 표시한다.

6. navbar 갱신
   - `components/AppNav.tsx`에 `진단` 링크 추가

7. 테스트 추가
   - `test/realtime-diagnosis.test.ts`
   - severity label, 정렬, 필터 동작 검증

검증:
- npm run build:realtime-demo
- npm test
- npm run lint
- npm run build
- /realtime 페이지에서 합성 데이터 안내 문구가 보이는지 확인
- /realtime 페이지에서 점검 후보와 유사 조건 평균이 표시되는지 확인
- / 지도 화면에서 `실시간 진단` 버튼을 누르면 건물 색상이 상태별로 바뀌는지 확인
- 진단 모드에서 우측 패널과 선택 건물 상세 패널에 합성 데이터/기상청 전환 안내가 보이는지 확인
```

---

## 발표 멘트

> "실제 시설팀 계량 데이터가 아직 없기 때문에, 기존 월별 총량을 보존한 1시간 단위 합성 데이터를 만들었습니다. 이 데이터를 기상 조건과 결합해 현재 건물별 사용량이 과거 유사 조건 대비 정상인지 판단합니다. 단순 실시간 모니터링이 아니라 시설팀이 어떤 건물부터 점검해야 하는지 판단하는 진단 기능입니다."

## 비상 대응

- `build:realtime-demo`가 실패하면 `campus_re100_hourly_demo/campus_re100_hourly_demo/public/data` 경로가 존재하는지 확인한다. 원본이 다른 위치에 있으면 `REALTIME_DEMO_SOURCE_DIR`에 해당 `public/data` 경로를 넣는다.
- `/realtime`에서 데이터 로드가 실패하면 `public/data/realtime-diagnosis-demo.json`이 생성됐는지 확인한다.
- 화면이 느리면 원본 시간별 JSON을 직접 fetch하고 있지 않은지 확인한다.
- 점검 후보가 전혀 없으면 기준 시각을 냉방/시험기간/이벤트가 있는 낮 시간으로 바꿔 다시 생성한다.
- `npm run dev`가 포트는 열지만 `Starting...`에서 멈추면 `.next` 내부에 잠긴 headless Chrome profile이 있는지 확인한다. 해당 Chrome 프로세스를 종료하고 `.next`를 삭제한 뒤 dev 서버를 다시 실행한다.

수정 이력: 2026-05-16 — 시간별 합성 데이터 기반 실시간 전력 진단 데모 Phase 추가.
수정 이력: 2026-05-16 — 지도 진단 모드, 상태별 색상, 우측 점검 후보 패널, 기상청 전환 안내를 추가.

## 시간 재생 확장

이번 확장은 단일 진단 시점만 보여주는 구조를 해커톤 시연용 시간 재생 구조로 확장한다.

- `scripts/build-realtime-playback-demo.mjs`는 `public/data/realtime-playback-demo.json`의 프레임/예측범위/이상 사유 필드가 시연 가능한 스키마인지 검증한다.
- playback JSON 자체를 새로 만드는 전체 생성기는 원본 시간별 데이터 워크스페이스에서 먼저 실행해 둔다.
- 재생 데이터는 계절별 시나리오를 가진다.
  - 여름 폭염: 2025-07-28 06:00~21:00, 1시간 간격
  - 가을 시험기간: 2025-10-23 08:00~20:00, 1시간 간격
  - 겨울 한파: 2026-01-15 07:00~16:00, 1시간 간격
  - 봄 평시: 2026-04-30 08:00~17:00, 1시간 간격
- 지도 진단 모드와 `/realtime` 페이지 모두 계절/시나리오 선택 버튼을 제공한다.
- 시나리오를 바꾸면 재생은 일시정지되고 첫 프레임부터 다시 시작한다.
- 각 프레임은 현재 사용량, 예측 사용량, 예측 하한, 예측 상한, 상태, 이상 사유, 유사 조건 샘플을 가진다.
- 지도 진단 모드에서는 재생/일시정지/이전/다음/속도/슬라이더 컨트롤로 프레임을 이동한다.
- 방문한 프레임은 `campus-re100-prediction-trail` localStorage 키에 누적되어 예측 이력 패널에 표시된다.
- `/realtime` 페이지도 같은 재생 프레임을 불러오며, 재생 데이터가 없으면 `realtime-diagnosis-demo.json` 단일 시점으로 fallback한다.

검증:

```bash
npm run build:realtime-demo
npm run build:realtime-playback
npm test
npx tsc --noEmit
npm run lint
npm run build
```

시연 멘트:

> 현재는 시설팀 계측 API가 없기 때문에 월별 총량을 보존한 1시간 단위 합성 데이터를 사용했습니다. 다만 데이터 구조는 실제 BEMS/AMI 계측값과 기상청 ASOS/AWS 값을 같은 필드로 넣으면 그대로 교체할 수 있게 설계했습니다. 재생을 누르면 시간과 계절이 바뀌고, 그 조건에서 예측 범위를 벗어난 건물을 우선 점검 후보로 보여줍니다.

## Phase180과의 역할 분리

Phase110은 시나리오별 시간 재생과 진단 목록을 만든다. 사용자가 직접 기온, 습도, 강수량, 일사량, 학사 조건을 조정해 건물별 예측 사용량 변화를 보는 기능은 `Phase180_조건입력형_예측모델_데모.md`에서 추가한다.

발표에서는 두 기능을 다음처럼 구분한다.

- Phase110 화면: "정해진 계절별 시나리오를 재생하며 예측 범위 이탈 건물을 찾는다."
- Phase180 화면: "프리셋에서 출발해 직접 조건을 바꾸며 예측 모델의 입력-출력 구조를 보여준다."

수정 이력: 2026-05-16 — 해커톤 시연용 시간 재생, 예측 범위, 예측 이력 누적, `/realtime` 프레임 탐색 기능을 추가.
수정 이력: 2026-05-17 — 계절별 시나리오 선택형 실시간 진단 재생 계획을 반영.
수정 이력: 2026-05-17 — .next 잠금으로 npm run dev가 Starting에서 멈추는 경우의 복구 절차를 추가.
수정 이력: 2026-05-18 — Phase180 조건 입력형 예측 모델 데모와의 역할 분리 설명을 추가.
수정 이력: 2026-05-20 — 구현 결과에 맞춰 `REALTIME_DEMO_SOURCE_DIR`, 기존 compact 산출물 검증 fallback, playback 산출물 검증 스크립트 설명을 반영.
