# Phase 70 — 사용량 모드 색상을 실제 데이터로 교체

> 임시값(floor_count)에서 합성 전력 데이터 기반으로 사용량 모드의 색·높이 매핑 교체.

---

```
사용량 모드의 건물 색을 합성 전력 데이터 기반으로 교체한다.
지금까지는 floor_count 임시값이었는데, 이제 진짜 합성 사용량으로 교체한다.

작업:
1. lib/load-data.ts에 함수 추가
   - getBuildingAnnualUsage(): bNo → 최근 12개월 kwh 합계 매핑
   - 결과 타입: Record<string, number>
   - 36개월 데이터에서 최근 12개월(2025-05 ~ 2026-04) 합산

2. CampusMap.tsx 수정
   - 컴포넌트 초기화 시 getBuildingAnnualUsage() 호출
   - GeoJSON Feature properties에 annual_kwh 필드 주입
     features.forEach(f => {
       f.properties.annual_kwh = usageMap[f.properties.bNo] ?? 0;
     });
   - 이 강화된 GeoJSON으로 addSource

3. 사용량 모드 색 표현식 변경
   사용량 모드일 때:
   'fill-extrusion-color': [
     'interpolate', ['linear'],
     ['coalesce', ['to-number', ['get', 'annual_kwh']], 0],
     0,       '#334155',
     50000,   '#64748b',
     200000,  '#7c9eb8',
     600000,  '#c89b6b',
     1000000, '#e07b3f',
     2500000, '#c0392b'
   ]

4. 사용량 모드 높이도 사용량 기반으로
   'fill-extrusion-height': [
     '+', 12,
     ['/',
       ['coalesce', ['to-number', ['get', 'annual_kwh']], 0],
       80000
     ]
   ]
   → 80,000 kWh당 1m 높이. 도서관급은 50m+, 작은 건물은 12~15m

5. 헤더의 mode 토글 라벨 변경 (필요 시)
   - "옥상 잠재량" → "잠재량 (옥상)"
   - "사용량" → "사용량 (연간)"

검증:
- 사용량 모드 전환 시 도서관·본부본관 등 학사 핵심이 빨갛게/높게 솟음
- 잠재량 모드 전환 시 체육관·기숙사 등 옥상 큰 곳이 부각
- 두 모드의 시각적 차이가 명확
- 0.8초 부드러운 전환
```

---

## 완료 후 본인이 할 것

- [x] `monthly_electricity.json`을 `public/data/`에 배치
- [x] 96개 GeoJSON feature와 96개 전력 데이터 bNo 매칭 확인
- [x] 사용량 모드 색상 기준을 최근 12개월 `annual_kwh`로 교체
- [x] 사용량 모드 높이 기준을 최근 12개월 `annual_kwh`로 교체
- [x] 상세 패널 월별 차트를 mock에서 최근 12개월 실제 데이터로 교체
- [x] 브라우저에서 사용량 모드: 중앙도서관·과학도서관·상경관 등 최근 12개월 사용량 상위 건물이 붉고 높게 솟는지 확인
- [x] 브라우저에서 잠재량 모드: 창업보육센터·천마아트센터·상경관 등 옥상 면적이 큰 건물이 부각되는지 확인
- [x] 모드 전환 시 시각적 "역전"이 명확한지 확인 (발표 핵심 메시지)

---

## 비상 대응

```
사용량 모드가 floor_count처럼 보이거나 모든 건물이 같은 색으로 보인다.

다음을 순서대로 확인한다:
1. 브라우저 Network 탭에서 /data/monthly_electricity.json이 200인지 확인한다.
2. 콘솔에서 window.__map.getSource('buildings')._data.features[0].properties.annual_kwh 값을 확인한다.
   - 값이 없거나 0이면 CampusMap.tsx에서 getBuildingAnnualUsage() 호출과 withAnnualUsage() 주입을 확인한다.
3. bNo 매칭 확인:
   node -e "const fs=require('fs'); const geo=JSON.parse(fs.readFileSync('public/data/yu_buildings.geojson','utf8')); const rows=JSON.parse(fs.readFileSync('public/data/monthly_electricity.json','utf8')); const gb=new Set(geo.features.map(f=>String(f.properties.bNo))); const mb=new Set(rows.map(r=>r.bNo)); console.log([...gb].filter(x=>!mb.has(x)))"
4. paint expression이 annual_kwh를 읽는지 확인한다:
   - fill-extrusion-color: ['get', 'annual_kwh']
   - fill-extrusion-height: ['get', 'annual_kwh']
5. 상세 패널 차트가 비어 있으면 BuildingPanel.tsx가 getBuildingElectricity(building.bNo)를 호출하는지 확인한다.

annual_kwh가 정상인데 색 차이가 약하면 Phase70의 임계값(50000, 200000, 600000, 1000000, 2500000)을 실제 데이터 분포에 맞춰 조정한다.
```

수정 이력: 2026-05-15 — 실제 monthly_electricity.json 적용, annual_kwh 기반 지도 표현식, 상세 패널 최근 12개월 차트 반영.

수정 이력: 2026-05-15 — 중간 삽입이 쉬운 10단위 Phase 번호 체계로 변경.

수정 이력: 2026-05-16 — 영남대학교 공개 공시 기반 보정 후 최근 12개월 사용량 분포에 맞춰 사용량 모드 색상 임계값을 재조정.

수정 이력: 2026-05-19 — 브라우저에서 사용량/잠재량 모드 전환을 확인하고, 실제 데이터 상위 건물 기준으로 검증 체크리스트를 정정.
