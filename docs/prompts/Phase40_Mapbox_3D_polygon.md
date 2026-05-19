# Phase 40 — Mapbox 3D 지도 + 진짜 polygon extrusion

> 영남대 경산캠퍼스 지도를 띄우고 96개 건물을 OSM polygon으로 3D extrusion. 차분한 톤 + vertical-gradient + setLight 적용.

---

## 사전 준비

- `.env.local`의 `NEXT_PUBLIC_MAPBOX_TOKEN`에 본인 토큰 입력
- dev 서버 재시작 (`npm run dev`)

---

```
영남대 경산캠퍼스 3D 지도를 띄우고 건물을 진짜 polygon으로 extrusion한다.

사전 작업:
.env.local의 NEXT_PUBLIC_MAPBOX_TOKEN에 본인 토큰 입력 후 dev 서버 재시작.

작업:
1. components/map/CampusMap.tsx 생성
   - "use client" 컴포넌트
   - mapbox-gl은 클라이언트에서만 로드
     - `type MapboxMap = import("mapbox-gl").Map`처럼 타입은 type import로 사용
     - 실제 JS는 `useEffect` 내부에서 `const mapboxgl = (await import("mapbox-gl")).default`로 동적 import
     - 이유: Mapbox GL 번들을 초기 client chunk에 직접 싣지 않아 dev/build 부담을 줄임
   - useEffect로 지도 초기화
   - 옵션:
     style: 'mapbox://styles/mapbox/dark-v11'
     center: [YU_CENTER.lng, YU_CENTER.lat]
     zoom: YU_DEFAULT_ZOOM
     minZoom: 15.3
     pitch: YU_DEFAULT_PITCH
     bearing: YU_DEFAULT_BEARING
     antialias: true
   - cleanup으로 map.remove() 처리
   - 디버깅용: 생성 직후 (window as any).__map = map 노출 (시연 전 제거 주석 표기)

2. map.on('load') 안에서:
   a. Mapbox 기본 building 레이어 숨기기
      ['building', 'building-outline', 'building-extrusion'].forEach(id => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
      });

   b. setLight로 분위기 조정
      map.setLight({
        anchor: 'viewport',
        color: '#ffffff',
        intensity: 0.35,
        position: [1.5, 210, 30]
      });

   c. loadCampusGeoJSON() 호출 → addSource + addLayer
      map.addSource('buildings', { type: 'geojson', data: geojson });

      주의:
      - Mapbox GL은 `fill-extrusion-opacity`에서 feature data expression을 지원하지 않는다.
      - 아래처럼 fallback square 전용 레이어와 실제 polygon 전용 레이어를 분리한다.
      - 하나의 레이어에서 opacity를 `['case', ...]`로 바꾸면 브라우저 콘솔에
        `data expressions not supported`가 뜨고 extrusion 레이어 추가가 실패한다.

      map.addLayer({
        id: 'buildings-3d-fallback',
        type: 'fill-extrusion',
        source: 'buildings',
        filter: ['==', ['get', 'polygon_source'], 'fallback_square'],
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'],
            ['coalesce', ['to-number', ['get', 'bArea_m2']], 0],
            0,     '#334155',
            500,   '#475569',
            1500,  '#7c9eb8',
            3500,  '#c89b6b',
            7000,  '#e07b3f',
            12000, '#c0392b'
          ],
          'fill-extrusion-height': [
            '+', 12,
            ['*',
              ['coalesce', ['to-number', ['get', 'floor_count']], 0],
              3.5
            ]
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.45,
          'fill-extrusion-vertical-gradient': true,
          'fill-extrusion-height-transition': { duration: 800, delay: 0 }
        }
      });

      map.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'buildings',
        filter: ['!=', ['get', 'polygon_source'], 'fallback_square'],
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'],
            ['coalesce', ['to-number', ['get', 'bArea_m2']], 0],
            0,     '#334155',
            500,   '#475569',
            1500,  '#7c9eb8',
            3500,  '#c89b6b',
            7000,  '#e07b3f',
            12000, '#c0392b'
          ],
          'fill-extrusion-height': [
            '+', 12,
            ['*',
              ['coalesce', ['to-number', ['get', 'floor_count']], 0],
              3.5
            ]
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.88,
          'fill-extrusion-vertical-gradient': true,
          'fill-extrusion-height-transition': { duration: 800, delay: 0 }
        }
      });

   d. 호버 시 커서 변경
      map.on('mouseenter', 'buildings-3d', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'buildings-3d', () => map.getCanvas().style.cursor = '');
      map.on('mouseenter', 'buildings-3d-fallback', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'buildings-3d-fallback', () => map.getCanvas().style.cursor = '');

   e. 지도 시점 초기화 버튼
      - lucide-react의 RotateCcw 아이콘 버튼을 지도 우측 상단 Mapbox 컨트롤 아래에 배치
      - aria-label/title: "지도 시점 초기화"
      - 클릭 시 선택 건물 상태는 유지하고 카메라만 기본값으로 복귀

      const resetMapView = () => {
        const map = mapRef.current;
        if (!map) return;

        map.stop();
        map.easeTo({
          center: [YU_CENTER.lng, YU_CENTER.lat],
          zoom: YU_DEFAULT_ZOOM,
          pitch: YU_DEFAULT_PITCH,
          bearing: YU_DEFAULT_BEARING,
          duration: 800
        });
      };

   f. 건물 이름 라벨 레이어 (클릭 없이도 식별 가능)
      한글 글리프는 mapboxgl.Map 옵션에 추가:
        localIdeographFontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif"

      map.addLayer({
        id: 'buildings-label',
        type: 'symbol',
        source: 'buildings',
        minzoom: 15,
        layout: {
          'text-field': ['coalesce', ['get', 'bName'], ''],
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            15, 9,
            16.5, 11,
            18, 13
          ],
          'text-anchor': 'center',
          'text-justify': 'center',
          'text-padding': 2,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'symbol-sort-key': [
            '-', 0,
            ['coalesce', ['to-number', ['get', 'bArea_m2']], 0]
          ]
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': 'rgba(2, 6, 23, 0.85)',
          'text-halo-width': 1.4,
          'text-halo-blur': 0.4
        }
      });

      의도: bArea_m2가 큰 건물이 우선 배치되고 (symbol-sort-key 음수화),
      Mapbox의 충돌 컬링(text-allow-overlap: false)이 자동으로 라벨을 솎아냄.
      줌인할수록 공간이 생겨 더 많은 건물 이름이 노출된다.

3. app/page.tsx 수정
   - CampusMap을 전체 화면 배치
   - 상단 헤더는 다음 Phase에서 추가

검증:
- localhost:3000에서 경산캠 지도 3D로 뜸
- 96개 건물이 진짜 polygon 형태로 extrusion
- 마우스로 회전·기울임 시 입체감 유지
- 콘솔에 에러 없음
- F12 콘솔에서 window.__map.getStyle().layers 확인 시 buildings-3d, buildings-3d-fallback, buildings-label 존재
- `fill-extrusion-opacity: data expressions not supported` 에러가 없어야 함
```

---

## 완료 후 본인이 할 것

- [ ] 캠퍼스가 3D로 솟아 보이는지 확인
- [ ] 마우스 드래그로 회전·기울임 가능 확인
- [ ] 빨간 건물 1-2개 (중앙도서관, 기숙사G동) 식별 가능 확인
- [ ] 클릭 없이도 주요 건물 이름이 라벨로 보이는지 확인 (줌인 시 더 많이 노출)
- [ ] 과하게 축소해도 건물 윤곽과 라벨이 식별 가능한 수준에서 멈추는지 확인
- [ ] 지도 시점 초기화 버튼을 누르면 기본 중심/줌/기울기/회전으로 돌아오는지 확인
- [ ] 콘솔에 에러 없음

## 비상 대응

만약 평평하거나 안 보이면:
1. F12 콘솔에 `window.__map.getPitch()` 입력 → 0이 아니어야 함
2. `window.__map.getStyle().layers.filter(l => l.id.includes('building'))` → buildings-3d, buildings-3d-fallback, buildings-label 보여야 함
3. 네트워크 탭에서 yu_buildings.geojson이 200으로 로드됐는지 확인
4. 라벨 한글이 깨지면 mapboxgl.Map의 `localIdeographFontFamily` 누락 확인
5. 콘솔에 `fill-extrusion-opacity: data expressions not supported`가 뜨면
   fallback opacity를 한 레이어의 `case` expression으로 처리한 것이 원인이다.
   `buildings-3d-fallback`과 `buildings-3d` 두 레이어로 분리한다.
6. `npm run dev`가 `Starting...`에서 멈추면 설치 문제인지 먼저 단정하지 말고:
   - `npm ls --depth=0`
   - `npm ci --dry-run`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   를 확인한다.
   설치가 정상이고 build가 통과하면 임시 검증은 아래 production 경로로 진행한다.

   ```powershell
   npm run build
   npm run start -- --hostname 127.0.0.1 --port 3000
   ```

수정 이력: 2026-05-15 — buildings-label 심볼 레이어 추가 (클릭 없이 건물 식별), localIdeographFontFamily 옵션 추가

수정 이력: 2026-05-15 — 중간 삽입이 쉬운 10단위 Phase 번호 체계로 변경.

수정 이력: 2026-05-15 — 지도 축소 하한(minZoom 15.3)을 추가해 건물 식별성을 유지.

수정 이력: 2026-05-15 — 지도 시점 초기화 버튼을 추가해 발표 중 카메라를 기본 시점으로 복귀 가능하게 함.

수정 이력: 2026-05-19 — Mapbox GL의 fill-extrusion-opacity data expression 미지원 문제를 반영해 fallback square와 실제 polygon extrusion 레이어를 분리. dev 서버가 Starting에서 멈출 때 설치 문제와 런타임 문제를 구분하는 검증 절차 및 production 실행 우회 경로 추가.
