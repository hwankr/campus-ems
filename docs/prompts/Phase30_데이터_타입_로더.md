# Phase 30 — 데이터 파일 배치 + 타입 + 로더

> 건물 polygon GeoJSON과 공시 보정 전력 데이터를 프로젝트에 통합. TS 타입과 로더 함수 정의.

---

## 사전 준비

다음 파일들을 `public/data/` 경로에 미리 복사해둬야 한다:
- `yu_buildings.geojson` (96개 건물 polygon, OSM 매칭본)
- `monthly_electricity.json` (96 건물 × 36개월 = 3,456행 공시 보정 전력 데이터)
- `generation_metadata.json` (데이터 보정 가정값 명세, 발표용)

---

```
영남대 건물 데이터와 공시 보정 전력 데이터를 프로젝트에 통합한다.

사전 작업:
다음 파일들을 public/data/ 경로에 복사한다:
- yu_buildings.geojson (96개 건물 polygon, OSM 매칭본)
- monthly_electricity.json (96 건물 × 36개월 = 3,456행 공시 보정 전력 데이터)
- generation_metadata.json (데이터 보정 가정값 명세)

yu_buildings.geojson 구조:
- FeatureCollection
- 각 Feature의 properties:
  - bNo, bName, bUse, district
  - bDate, bArea_m2, bTotalFloorArea_m2, floor_count
  - polygon_source: "name_exact" | "name_partial" | "spatial" | "fallback_square"
  - osm_id, osm_area_m2 (해당 시)

monthly_electricity.json 구조:
- 배열
- 각 원소: { bNo, year_month("YYYY-MM"), kwh, cost_krw, co2_kg }

작업:
1. types/building.ts 생성
   export interface BuildingProperties {
     bNo: string;
     bName: string;
     bUse: string;
     district: string;
     bDate: string;
     bArea_m2: number | null;
     bTotalFloorArea_m2: number | null;
     floor_count: number;
     polygon_source: 'name_exact' | 'name_partial' | 'spatial' | 'fallback_square';
     osm_id?: number;
     osm_area_m2?: number;
   }

   export interface MonthlyElectricity {
     bNo: string;
     year_month: string;
     kwh: number;
     cost_krw: number;
     co2_kg: number;
   }

2. lib/load-geojson.ts 생성
   - loadCampusGeoJSON(): /data/yu_buildings.geojson fetch
   - 실패 시 status를 포함한 Error throw

3. lib/electricity-calculations.ts 생성
   - getRecentYearMonths(rows, monthCount = 12): 최신 distinct month를 오름차순 반환
   - createAnnualUsageMap(rows, monthCount = 12): bNo → 최신 12개월 kwh 합계
   - toMonthlyUsageChartRows(rows, bNo, monthCount = 12): 패널 차트용 최근 12개월 배열 반환

4. lib/load-electricity.ts 생성
   - loadMonthlyElectricity(): /data/monthly_electricity.json fetch, Promise 캐시 적용
   - getBuildingAnnualUsage(): bNo → 최신 12개월 kwh 합계 매핑
   - getBuildingElectricity(bNo): 특정 건물의 최근 12개월 시계열 반환
   - getCampusTotal(year_month): 그 달 캠퍼스 전체 사용량 합계
   - 모두 async, Promise 반환

5. lib/constants.ts 생성
   export const YU_CENTER = { lat: 35.832, lng: 128.756 };
   export const YU_DEFAULT_ZOOM = 16.3;
   export const YU_DEFAULT_PITCH = 50;
   export const YU_DEFAULT_BEARING = -17;
   export const CO2_FACTOR = 0.4567;
   export const ELECTRICITY_RATE_KRW = 143;
   export const SOLAR_PANEL_KWH_PER_M2_YEAR = 150;
   export const ROOF_COVERAGE_RATIO = 0.6;

검증:
- 브라우저에서 localhost:3000/data/yu_buildings.geojson 직접 접근 시 JSON 응답
- localhost:3000/data/monthly_electricity.json 도 동일
- `node -e "const geo=require('./public/data/yu_buildings.geojson'); const rows=require('./public/data/monthly_electricity.json'); console.log(geo.features.length, new Set(rows.map(r=>r.bNo)).size, rows.length)"` → `96 96 3456`
- app/page.tsx에서 임시로 loadCampusGeoJSON() 호출 후 console.log → features 96개 확인
- 확인 후 console.log 제거
```

---

## 완료 후 본인이 할 것

- [x] 세 데이터 파일이 `public/data/`에 있는지 확인
- [ ] 브라우저에서 데이터 URL 직접 접근으로 정상 응답 확인
- [ ] 콘솔에 features 96개 출력 확인 후 임시 로그 제거

---

## 현재 구현 메모

- `public/data/monthly_electricity.json`: 3,456행, 96개 건물 x 36개월(2023-05~2026-04), 2024년 합계 29.34GWh 기준 보정
- `public/data/generation_metadata.json`: 데이터 보정 방식과 가정값 메타데이터
- `docs/electricity-data-calibration.md`: 공개 공시 기반 보정 근거와 한계
- 전력 데이터 로더는 현재 `lib/load-electricity.ts`에 분리되어 있고, 계산 순수 함수는 `lib/electricity-calculations.ts`에 있다.
- 건물 GeoJSON 로더는 기존 `lib/load-geojson.ts`를 유지한다.

---

## 비상 대응

```
데이터 로드가 실패한다.

다음을 순서대로 확인한다:
1. public/data/monthly_electricity.json 파일이 존재하는지 확인한다.
2. node에서 JSON 파싱 확인:
   node -e "JSON.parse(require('fs').readFileSync('public/data/monthly_electricity.json','utf8')); console.log('ok')"
3. GeoJSON과 전력 데이터 bNo 매칭 확인:
   node -e "const fs=require('fs'); const geo=JSON.parse(fs.readFileSync('public/data/yu_buildings.geojson','utf8')); const rows=JSON.parse(fs.readFileSync('public/data/monthly_electricity.json','utf8')); const gb=new Set(geo.features.map(f=>String(f.properties.bNo))); const mb=new Set(rows.map(r=>r.bNo)); console.log([...mb].filter(x=>!gb.has(x)), [...gb].filter(x=>!mb.has(x)))"
4. 브라우저 Network 탭에서 /data/monthly_electricity.json 응답이 200인지 확인한다.

위 결과를 보고 정확한 파일 경로 또는 JSON 구조를 수정한다.
```

수정 이력: 2026-05-15 — 전력 로더를 load-electricity.ts와 electricity-calculations.ts로 분리한 현재 구조를 반영.

수정 이력: 2026-05-15 — 중간 삽입이 쉬운 10단위 Phase 번호 체계로 변경.

수정 이력: 2026-05-16 — 임의 합성 전력량을 영남대학교 공개 온실가스 공시 기반 보정 추정치로 교체하고 교육용 평균 단가 143원/kWh를 반영.

