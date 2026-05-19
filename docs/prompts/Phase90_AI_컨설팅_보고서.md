# Phase 90 — OpenAI RE100 전략 코파일럿

> 해커톤 주제인 "AX 보편화 시대"를 직접 보여주는 핵심 기능. AI가 단순 보고서를 쓰는 것이 아니라, 캠퍼스 전체 RE100 전환 전략과 우선 투자 건물을 제안한다.

---

## 사전 준비

`OPENAI_MODEL`은 없으면 서버 코드에서 `gpt-5.5`를 기본값으로 사용한다. 비용과 응답 속도가 중요하면 `gpt-5.4-mini`로 낮춘다.

---

```
OpenAI API를 사용해 CampusEMS의 AI RE100 전략 코파일럿을 구현한다.

목표:
- 단순한 AI 보고서 생성 버튼이 아니라, 캠퍼스 전체 에너지 전환 의사결정을 돕는 AX 기능으로 만든다.
- AI가 숫자를 새로 계산하지 않게 한다. 숫자 계산은 앱 코드가 담당하고, OpenAI는 해석·우선순위·로드맵 문장화만 담당한다.
- 결과는 긴 마크다운이 아니라 카드, TOP 5 리스트, 3단계 로드맵으로 읽기 쉽게 보여준다.
- 추천 TOP 5 카드는 지도 선택과 연결하고, "왜 이 건물부터?" 근거를 사용량·면적·회수기간으로 보여준다.

작업:
1. 패키지 변경
   - `openai` 패키지를 설치한다.
   - 서버 전용 모듈 보호를 위해 `server-only` 패키지를 설치한다.
   - `tsx`가 없으면 개발 의존성으로 설치하고 `npm test` 스크립트를 추가한다.
   - 기존 `@anthropic-ai/sdk`가 더 이상 쓰이지 않으면 제거한다.
   - `.env.local` 예시는 `ANTHROPIC_API_KEY`가 아니라 `OPENAI_API_KEY`, `OPENAI_MODEL` 기준으로 갱신한다.

2. 공통 계산 유틸 생성
   - `lib/solar-calculations.ts` 생성
   - 기존 `lib/constants.ts`의 RE100 관련 상수도 이 유틸의 값을 재사용하게 해 UI와 AI 입력 계산 기준을 통일한다.
   - 다음 상수를 둔다.
     - `INSTALLABLE_ROOF_RATIO = 0.6`
     - `ANNUAL_KWH_PER_SQUARE_METER = 150`
     - `CO2_KG_PER_KWH = 0.424`
     - `ELECTRICITY_RATE_KRW = 150`
     - `INSTALL_COST_KRW_PER_M2 = 700000`
   - 다음 함수를 만든다.
     - `calculateAnnualSolarKwh(buildingAreaM2: number): number`
     - `calculateSelfSufficiencyRate(annualSolarKwh: number, annualUsageKwh: number): number`
     - `calculateCo2ReductionKg(annualSolarKwh: number): number`
     - `calculateAnnualSavingsKrw(annualSolarKwh: number): number`
     - `calculateInstallCostKrw(buildingAreaM2: number): number`
     - `calculatePaybackYears(installCostKrw: number, annualSavingsKrw: number): number | null`

3. AI 입력 데이터 빌더 생성
   - `lib/ai/re100-context.ts` 생성
   - `Building`, `MonthlyElectricity`를 받아 AI 입력용 요약 객체를 만든다.
   - `lib/korean-unit-format.ts`를 만들어 AI가 읽을 표시용 단위를 미리 만든다.
     - 금액: `1,350만원`, `20.3억원`
     - 전력량: `1,355만kWh`, `1.3억kWh`
     - CO₂: `5,746톤`
     - 비율: `10.8%`
   - 캠퍼스 전체용 객체:
     {
       campus: {
         buildingCount,
         annualUsageKwh,
         annualSolarPotentialKwh,
         selfSufficiencyRate,
         co2ReductionKg,
         annualSavingsKrw,
         display: {
           annualUsage,
           annualSolarPotential,
           selfSufficiencyRate,
           co2Reduction,
           annualSavings
         }
       },
       buildings: [
         {
           bNo,
           bName,
           bUse,
           district,
           annualUsageKwh,
           annualSolarPotentialKwh,
           selfSufficiencyRate,
           co2ReductionKg,
           annualSavingsKrw,
           installCostKrw,
           paybackYears,
           score,
           display: {
             annualUsage,
             annualSolarPotential,
             selfSufficiencyRate,
             co2Reduction,
             annualSavings,
             installCost,
             paybackYears
           }
         }
       ]
     }
   - `score`는 앱 코드에서 계산한다.
     - 사용량 순위, 태양광 잠재량, 자급률 개선 효과를 섞는다.
     - AI가 TOP 5를 완전히 새로 계산하지 않도록, 점수 상위 12개만 OpenAI에 보낸다.

4. OpenAI 서버 클라이언트 생성
   - `lib/ai/openai-client.ts` 생성
   - 서버에서만 import되도록 한다.
   - `process.env.OPENAI_API_KEY`가 없으면 명확한 에러를 던진다.
   - 모델은 `process.env.OPENAI_MODEL ?? "gpt-5.5"`로 읽는다.

5. 캠퍼스 전략 API 생성
   - `app/api/ai/campus-strategy/route.ts` 생성
   - POST 메서드
   - 서버에서 `public/data/yu_buildings.json`, `public/data/yu_buildings.geojson`, `public/data/monthly_electricity.json`을 읽는다.
   - 배포 함수에서도 위 파일들이 포함되도록 `next.config.mjs`의 `experimental.outputFileTracingIncludes`에 `/api/ai/*` → `./public/data/*`를 추가한다.
   - 지도에 실제 표시되는 96개 GeoJSON 건물 번호만 AI 후보로 사용한다.
   - 경산캠퍼스 건물과 최근 12개월 전력 데이터만 사용한다.
   - `buildCampusRe100Context()`로 계산된 입력을 만든다.
   - OpenAI Responses API를 호출한다.
   - Structured Outputs(JSON schema)를 사용한다.
   - 응답 schema:
     {
       campusSummary: string,
       bottlenecks: string[],
       recommendedBuildings: [
         {
           bNo: string,
           bName: string,
           priority: "상" | "중" | "하",
           reason: string,
           expectedImpact: string
         }
       ],
       roadmap: [
         {
           phase: string,
           title: string,
           actions: string[]
         }
       ]
     }
   - recommendedBuildings는 정확히 5개, roadmap은 정확히 3단계로 제한한다.
   - OpenAI schema에는 AI가 작성할 문장 필드만 둔다.
   - API 최종 응답에서는 앱 계산값으로 recommendedBuildings 각 항목에 evidence를 추가한다.
     - annualUsage: `context.buildings[].display.annualUsage`
     - buildingArea: 원본 Building의 `bArea_m2`를 `Intl.NumberFormat("ko-KR")`로 표시
     - paybackYears: `context.buildings[].display.paybackYears`
   - AI가 추천한 bNo가 앱 데이터와 매칭되지 않으면 evidence는 null로 두고 UI에서 "추가 검증 필요"를 표시한다.
   - 시스템 지시:
     - 한국어로 짧고 명확하게 작성
     - 수치는 입력 데이터에 있는 값만 사용
     - 금액, 전력량, CO₂, 비율은 반드시 `display` 필드의 문자열만 사용
     - `2032786950원`, `5746011kg`처럼 긴 raw 숫자는 출력하지 않음
     - 없는 수치는 추정하지 말고 "추가 검증 필요"라고 표현
     - 각 문장은 발표 화면에서 읽기 좋게 40자 안팎으로 유지

6. 선택 건물 인사이트 API 생성
   - `app/api/ai/building-insight/route.ts` 생성
   - POST body:
     {
       bNo: string
     }
   - 서버에서 해당 건물과 최근 12개월 전력 데이터를 찾아 계산값을 만든다.
   - OpenAI Responses API + Structured Outputs 사용
   - 응답 schema:
     {
       summary: string,
       recommendations: string[],
       caution: string
     }
   - OpenAI schema에는 AI가 작성할 문장 필드만 둔다.
   - priority와 evidence는 앱 계산값으로 API 최종 응답에 붙인다.
     - priority: 계산된 점수 순위 기준 `상`/`중`/`하`
     - evidence: 연간 사용량, 태양광 잠재량, 전력 자립률 3개
   - AI가 evidence 숫자 문장을 다시 쓰지 않도록 한다.
   - recommendations는 3개로 제한한다.
   - 시스템 지시에는 다음 금지 규칙을 포함한다.
     - `랭크`, `랭킹`, `rank`, `순위` 표현 금지
     - 같은 음절이나 단어 반복 금지
     - 근거 수치, 우선순위, 랭킹은 앱이 계산하므로 직접 작성하지 않음

7. 캠퍼스 AI 전략 패널 생성
   - `components/panel/AIStrategyPanel.tsx` 생성
   - selectedBuilding이 없을 때 우측 패널에 표시한다.
   - UI 구성:
     - 상단: "AI RE100 전략 코파일럿"
     - 캠퍼스 진단 카드
     - 우선 투자 건물 TOP 5 리스트
       - 각 추천 항목은 클릭 가능한 카드로 만든다.
       - 카드 안에는 "왜 이 건물부터?" 영역을 두고 사용량, 면적, 회수기간을 표시한다.
     - 3단계 실행 로드맵
     - "AI 전략 생성" 또는 "다시 생성" 버튼
   - 로딩 상태:
     - "캠퍼스 데이터를 분석하는 중..."
   - 에러 상태:
     - API 키 누락, OpenAI 호출 실패, 데이터 로드 실패를 구분해 짧게 표시한다.

8. 지도 하이라이트 연결
   - `CampusMap`이 AI 추천 건물 번호 배열을 받을 수 있게 props를 확장한다.
     - `recommendedBuildingNos?: string[]`
   - 지도에 `buildings-ai-recommended` line layer를 추가한다.
   - TOP 5 건물은 보라색 또는 연두색 외곽선으로 강조한다.
   - 기존 선택 건물 highlight와 충돌하지 않게 선택 건물 layer가 더 위에 오게 한다.
   - 추천 카드 클릭으로 selectedBuilding이 바뀌면 기존 선택 건물 이동 로직이 해당 건물로 지도 카메라를 이동시킨다.

9. Home 상태 연결
   - `app/page.tsx`에서 `recommendedBuildingNos` 상태를 둔다.
   - 추천 카드 클릭 핸들러를 만들어 bNo로 실제 `Building`을 찾아 `selectedBuilding`에 넣는다.
   - selectedBuilding이 없으면 `AIStrategyPanel`을 보여준다.
   - `AIStrategyPanel`에서 TOP 5가 생성되면 `recommendedBuildingNos`를 업데이트한다.
   - selectedBuilding이 있으면 기존 `BuildingPanel`을 보여준다.
   - 데스크톱에서는 추천 카드 클릭 후에도 AI 전략 패널 상태가 사라지지 않도록 패널을 unmount하지 않고 숨김 처리한다.
   - 건물 선택을 해제하면 AI 전략 패널로 돌아온다.

10. 선택 건물 AI 인사이트 카드 추가
   - `components/panel/BuildingAIInsight.tsx` 생성
   - `BuildingPanel` 내부, 태양광 잠재량 카드 아래에 표시한다.
   - 버튼: "AI 인사이트 보기"
   - 결과:
     - 우선순위 배지
     - 한 줄 결론
     - 앱 계산값 기반 근거 3개
     - 권고 3개
     - 주의사항 1줄
   - 근거 영역은 AI가 생성한 문장이 아니라 API의 `evidence` 객체를 카드형으로 렌더링한다.
   - 긴 마크다운 렌더링은 하지 않는다.

11. 가독성 규칙
   - AI 출력은 줄글 보고서가 아니라 짧은 카드형 UI로 렌더링한다.
   - 한 카드 안에 문장 3개를 넘기지 않는다.
   - TOP 5 항목은 건물명, 우선순위, 이유 1줄만 먼저 보여준다.
   - 세부 설명은 펼치기 없이도 읽을 수 있게 짧게 유지한다.
   - 숫자는 `Intl.NumberFormat("ko-KR")`로 포맷한다.
   - AI 응답에는 `만원`, `억원`, `만kWh`, `억kWh`, `톤`, `%` 같은 읽기 쉬운 단위를 사용한다.

검증:
- `npm test`
- `npm run lint`
- `npm run build`
- `.env.local`에 `OPENAI_API_KEY`가 없을 때 앱이 깨지지 않고 에러 메시지가 표시되는지 확인
- selectedBuilding이 없을 때 AI 전략 패널이 보이는지 확인
- "AI 전략 생성" 클릭 후 TOP 5와 3단계 로드맵이 표시되는지 확인
- TOP 5 건물이 지도에서 강조되는지 확인
- TOP 5 카드에 사용량, 면적, 회수기간 근거가 표시되는지 확인
- 추천 카드 클릭 시 해당 건물이 선택되고 지도 카메라가 이동하는지 확인
- 건물 클릭 후 "AI 인사이트 보기"가 작동하는지 확인
- 건물 인사이트의 근거 3개가 AI 문장이 아니라 앱 계산 evidence로 표시되는지 확인
- 건물 인사이트 응답에 `랭크`, `랭킹`, `rank`, `순위` 같은 표현이 없는지 확인
- AI 응답의 수치가 앱 계산값과 충돌하지 않는지 확인
- 선택 건물 패널과 RE100 시뮬레이터의 태양광 잠재량도 `lib/solar-calculations.ts` 기준 상수와 일치하는지 확인
```

---

## 완료 후 본인이 할 것

- [ ] TOP 5 추천 건물이 실제로 사용량·옥상 잠재량이 큰 건물인지 확인
- [ ] 지도 하이라이트가 발표 화면에서 바로 보이는지 확인
- [ ] 한 화면에 글이 너무 많지 않은지 확인
- [ ] API 키를 빼고 실행했을 때 에러 안내가 자연스러운지 확인
- [ ] 발표자가 30초 안에 AI 결과를 설명할 수 있는지 리허설

## 발표 멘트

> "이 기능은 단순히 보고서를 생성하는 AI가 아닙니다. 캠퍼스 전체 건물의 전력 사용량과 태양광 잠재량을 먼저 계산하고, OpenAI가 그 결과를 바탕으로 우선 투자 건물 TOP 5와 3단계 전환 로드맵을 제안합니다. 즉, 사람이 건물을 하나씩 비교하던 과정을 AI가 의사결정 흐름으로 바꿔주는 AX 기능입니다."

## 비상 대응

API 에러 시:
- 401: `OPENAI_API_KEY` 값이 잘못됐거나 누락됨
- 429: 레이트 리밋 또는 크레딧 문제
- 500: 서버 라우트에서 데이터 로드 또는 JSON schema 파싱 실패
- 500 + `ENOENT: no such file or directory, open '/var/task/public/data/...'`: Vercel 함수 trace에 `public/data` 파일이 포함됐는지 `next.config.mjs`의 `experimental.outputFileTracingIncludes`를 확인
- 응답이 너무 길면 schema 필드 수와 문장 길이 제한을 더 줄인다.
- 시간이 부족하면 캠퍼스 전략 API만 남기고 선택 건물 인사이트 API는 제외한다.

수정 이력: 2026-05-15 — Claude 단일 보고서 생성 기능을 OpenAI 기반 캠퍼스 RE100 전략 코파일럿으로 확장.
수정 이력: 2026-05-15 — 해커톤 시연 품질 우선 방향에 맞춰 기본 모델을 gpt-5.5로 변경.
수정 이력: 2026-05-15 — AI 후보를 지도에 표시되는 96개 GeoJSON 건물로 제한하고 npm test 검증을 추가.
수정 이력: 2026-05-15 — AI 응답 수치 가독성을 위해 한국어 단위 표시값과 raw 숫자 출력 금지 규칙을 추가.

수정 이력: 2026-05-15 — 중간 삽입이 쉬운 10단위 Phase 번호 체계로 변경.
수정 이력: 2026-05-15 — AI 추천 TOP 5 카드와 지도 선택 연결, 사용량·면적·회수기간 근거 표시 흐름을 추가.
수정 이력: 2026-05-16 — Vercel 서버 함수에서 AI 데이터 파일을 찾지 못하는 ENOENT 방지를 위해 output file tracing 설정을 추가.
수정 이력: 2026-05-20 — 실제 구현 기준으로 CampusEMS 명칭, `server-only` 의존성, UI/AI 계산 상수 통일 요구를 반영.
수정 이력: 2026-05-20 — 선택 건물 인사이트의 근거·우선순위를 앱 계산값으로 고정하고 AI는 요약·권고·주의사항만 작성하도록 축소.
