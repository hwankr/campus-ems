# Phase 50 — 상태 관리 + 헤더 + 모드 토글

> 헤더 추가, 선택된 건물 상태 관리, 사용량/잠재량 모드 토글 구현.

---

```
지도 위에 헤더와 모드 토글을 추가하고 선택된 건물 상태를 관리한다.

작업:
1. app/page.tsx에 상태 추가
   "use client"
   const [selectedBuilding, setSelectedBuilding] = useState<BuildingProperties | null>(null);
   const [mode, setMode] = useState<'usage' | 'potential'>('potential');

2. lib/load-geojson.ts에 건물 목록 로더 추가
   - `loadCampusGeoJSON()`를 재사용해 GeoJSON features의 properties만 추출한다.
   - 함수명은 `loadGyeongsanBuildings()`로 둔다.
   - 반환 타입은 `Promise<BuildingProperties[]>`이다.

3. components/header/CampusHeader.tsx 생성
   - 높이 h-14, bg-slate-800/80 backdrop-blur
   - 좌측: "CAMPUS-RE100" (font-semibold) + "영남대 경산캠퍼스 · 96개 건물" (text-xs text-slate-400)
   - 중앙/우측: 건물명 또는 건물번호 검색 입력
     - `loadGyeongsanBuildings()`로 96개 건물 목록 로드
     - 입력값은 건물명, bNo, 구역, 용도에 대해 부분 일치 검색
     - 결과는 최대 8개까지 드롭다운으로 표시
     - 결과 클릭 시 selectedBuilding 갱신
     - 선택 후 입력창 placeholder는 선택된 건물 상태를 반영한다.
     - 검색어 지우기 버튼을 제공한다.
   - 우측: 모드 토글 2개 버튼
     [옥상 잠재량] [사용량]
     active 버튼은 bg-slate-700 text-white
     비활성은 text-slate-400
     클릭 시 mode 상태 변경

4. components/map/CampusMap.tsx 수정
   - props로 selectedBuilding, mode, onBuildingSelect 받기
   - 클릭 이벤트 등록:
     map.on('click', 'buildings-3d', (e) => {
       const feature = e.features?.[0];
       if (feature) onBuildingSelect(feature.properties as BuildingProperties);
     });
   - fallback polygon도 선택 가능해야 하므로 `buildings-3d-fallback`에도 동일한 클릭/커서 이벤트를 등록한다.
   - mode 변경 시 useEffect로 색·높이 갱신:
     usage 모드일 때:
       - 색은 floor_count 기반 (임시, 데이터 도착 시 사용량 기반으로 교체)
       - 높이는 floor_count × 3.5 + 12
     potential 모드일 때:
       - 색은 bArea_m2 기반 (현재 식 그대로)
       - 높이는 bArea_m2 기반:
         ['interpolate', ['linear'], ['coalesce', ['to-number', ['get', 'bArea_m2']], 0],
           100, 8, 5000, 50, 15000, 60]
   - selectedBuilding이 검색 또는 지도 클릭으로 변경되면 `centerLng`/`centerLat` 중심으로 지도 카메라 이동
   - 선택된 건물은 별도 line 레이어로 강조 표시
   - 선택 line 레이어 id는 `selected-building-outline`로 둔다.

5. 레이아웃 변경 (app/page.tsx)
   - 화면 상단 헤더 + 본문 영역
   - 본문은 flex: 좌측 70% 지도 + 우측 30% 패널 (다음 Phase)
   - 다음 Phase 전까지 우측 패널에는 선택 건물명, bNo, 구역, 용도, 현재 mode, 연면적을 표시하는 최소 placeholder를 둔다.

검증:
- 헤더가 상단에 깔끔하게 뜬다
- 건물명/번호 검색 시 드롭다운 결과가 표시된다
- 검색어 지우기 버튼으로 입력값이 비워진다
- 검색 결과 클릭 시 패널이 열리고 지도가 해당 건물로 이동한다
- 토글 클릭 시 active 시각 표시 + 지도 색·높이가 0.8초 부드럽게 전환
- 건물 클릭 시 우측 패널의 selectedBuilding 정보가 갱신되고 선택 outline이 이동한다
- 임시 console.log는 남기지 않는다
```

---

## 완료 후 본인이 할 것

- [ ] 헤더가 화면 상단에 표시되는지 확인
- [ ] 검색어 입력, 결과 선택, 검색어 지우기 확인
- [ ] 토글 클릭 시 시각·메인 영역 모두 반응 확인
- [ ] 건물 클릭 시 패널 정보와 선택 outline이 갱신되는지 확인
- [ ] 모드 전환 시 부드러운 transition 확인

수정 이력: 2026-05-15 — 건물 검색 UI와 검색 선택 시 지도 이동/선택 강조 재현 절차를 추가.

수정 이력: 2026-05-15 — 중간 삽입이 쉬운 10단위 Phase 번호 체계로 변경.

수정 이력: 2026-05-19 — 실제 구현에 맞춰 `loadGyeongsanBuildings()` 로더 추가, `centerLng`/`centerLat` 카메라 이동, fallback polygon 클릭, 우측 placeholder 패널, console.log 없는 검증 절차를 반영.
