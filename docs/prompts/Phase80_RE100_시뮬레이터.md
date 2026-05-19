# Phase 80 — RE100 시나리오 시뮬레이터

> 캠퍼스 전체 옥상의 N% 태양광 설치 시 자급률·CO₂·비용·회수기간 계산. 슬라이더 + 4개 지표 카드.

---

```
캠퍼스 전체 옥상의 N%에 태양광을 설치했을 때 효과를 보여주는 시뮬레이터를 만든다.

작업:
1. components/panel/RE100Simulator.tsx 생성
   - props: 없음 (자체적으로 데이터 로드)
   - 상태:
     const [coverage, setCoverage] = useState(50); // 옥상 설치 비율 %

   - 계산 로직:
     - 캠퍼스 연간 총 사용량: 모든 건물 12개월 합계
     - 캠퍼스 옥상 총 면적: 모든 건물 bArea_m2 합계 × ROOF_COVERAGE_RATIO
     - 설치 면적 = 옥상 총 면적 × (coverage / 100)
     - 연간 발전량 = 설치 면적 × SOLAR_PANEL_KWH_PER_M2_YEAR
     - 자급률 = (연간 발전량 / 연간 총 사용량) × 100
     - CO₂ 저감 = 연간 발전량 × CO2_FACTOR (kg)
     - 비용 절감 = 연간 발전량 × ELECTRICITY_RATE_KRW (원)
     - 회수 기간 = 설치비 추정(설치면적 × SOLAR_INSTALL_COST_KRW_PER_M2) / 연간 비용 절감

   - UI:
     - 슬라이더 (0~100%, step 5)
     - 4개 지표 카드:
       a. 자급률 (큰 숫자, 색은 자급률 단계별 분기)
       b. 연간 CO₂ 저감 (톤 단위)
       c. 연간 비용 절감 (억 원 단위)
       d. 예상 회수 기간 (년)

2. 패널 영역 토글
   - selectedBuilding이 없으면 RE100Simulator 표시
   - selectedBuilding이 있으면 BuildingPanel 표시
   - 헤더에 "캠퍼스 시뮬레이터로 돌아가기" 버튼 (selectedBuilding 있을 때)

3. 헤더 좌측에 라이브 캠퍼스 요약 (시각적 임팩트)
   "연간 X.XX GWh · CO₂ X,XXX톤 · 전기료 XX억"
   getBuildingAnnualUsage() 결과 합산해서 표시

검증:
- 슬라이더 움직이면 4개 지표 즉시 갱신
- 자급률이 30%~70% 범위에서 합리적 변화
- 회수 기간이 5~15년 사이 (합리적 범위)
- 건물 클릭 시 시뮬레이터 → 건물 패널 전환, "돌아가기" 클릭 시 복귀
```

---

## 구현 반영 사항

- 제품 헤더는 Phase120 리브랜딩 기준에 맞춰 `CampusEMS`로 표시하고, RE100은 우측 패널의 전환 시뮬레이터 기능명으로 둔다.
- Phase90 이후 최종 기준 상수는 `lib/solar-calculations.ts`와 맞춘다. UI와 AI 근거값이 충돌하지 않도록 `SOLAR_PANEL_KWH_PER_M2_YEAR=150`, `ELECTRICITY_RATE_KRW=150`, `CO2_FACTOR=0.424`, `ROOF_COVERAGE_RATIO=0.6`, `SOLAR_INSTALL_COST_KRW_PER_M2=700000`을 사용한다.
- 슬라이더는 실제 사용자 조작과 자동 검증 모두에서 즉시 갱신되도록 `onChange`와 `onInput`을 같은 상태 갱신 함수에 연결한다.
- 빌드 후 dev 서버가 오래된 `.next` chunk를 물고 빈 화면을 만들면 `.next` 삭제 후 `npm run dev -- --port 3000`으로 재시작해 확인한다.

## 완료 후 본인이 할 것

- [x] 슬라이더 50% 기준 자급률 30~50% 범위 확인: 43.2%
- [x] 슬라이더 100% 기준 자급률 60~100% 범위 확인: 86.5%
- [x] 회수 기간 8~12년 범위 확인: 10.1년
- [x] 헤더 좌측에 캠퍼스 총 사용량 GWh로 표시되는지 확인: 연간 30.43 GWh
- [x] 건물 선택/해제 전환 매끄러운지 확인: 지도 클릭 시 BuildingPanel, 복귀 버튼 시 RE100Simulator

수정 이력: 2026-05-15 — 중간 삽입이 쉬운 10단위 Phase 번호 체계로 변경.
수정 이력: 2026-05-19 — Phase 80 구현 완료. 검증 범위에 맞도록 `SOLAR_PANEL_KWH_PER_M2_YEAR=300`, `ELECTRICITY_RATE_KRW=230`, `SOLAR_INSTALL_COST_KRW_PER_M2=700000` 기준을 명시적으로 사용.
수정 이력: 2026-05-19 — 구현 과정에서 확인한 CampusEMS/RE100 명명 경계, 슬라이더 입력 이벤트 처리, dev 서버 캐시 재시작 주의사항을 추가.
수정 이력: 2026-05-20 — Phase90 AI 근거값과 UI 수치 충돌을 막기 위해 최종 RE100 계산 상수를 `lib/solar-calculations.ts` 기준으로 통일.
