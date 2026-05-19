"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { CampusMapMode } from "@/components/header/CampusHeader";
import { YU_CENTER, YU_DEFAULT_BEARING, YU_DEFAULT_PITCH, YU_DEFAULT_ZOOM } from "@/lib/constants";
import { getBuildingAnnualUsage } from "@/lib/load-data";
import { loadCampusGeoJSON } from "@/lib/load-geojson";
import type { BuildingProperties } from "@/types/building";
import type { RealtimeDiagnosisRow } from "@/types/realtime";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const BUILDING_SOURCE_ID = "buildings";
const BUILDING_LAYER_IDS = ["buildings-3d-fallback", "buildings-3d"] as const;
const AI_RECOMMENDED_LINE_ID = "buildings-ai-recommended";
const SELECTED_BUILDING_LINE_ID = "selected-building-outline";

type MapboxMap = import("mapbox-gl").Map;
type MapLayerMouseEvent = import("mapbox-gl").MapLayerMouseEvent;
type DataDrivenPropertyValueSpecification<T> =
  import("mapbox-gl").DataDrivenPropertyValueSpecification<T>;

interface CampusMapProps {
  selectedBuilding: BuildingProperties | null;
  mode: CampusMapMode;
  onBuildingSelect: (building: BuildingProperties) => void;
  recommendedBuildingNos?: string[];
  realtimeDiagnosisRows?: RealtimeDiagnosisRow[];
}

const potentialColorExpression: DataDrivenPropertyValueSpecification<string> = [
  "interpolate",
  ["linear"],
  ["coalesce", ["to-number", ["get", "bArea_m2"]], 0],
  0,
  "#334155",
  500,
  "#475569",
  1500,
  "#7c9eb8",
  3500,
  "#c89b6b",
  7000,
  "#e07b3f",
  12000,
  "#c0392b",
];

const potentialHeightExpression: DataDrivenPropertyValueSpecification<number> = [
  "interpolate",
  ["linear"],
  ["coalesce", ["to-number", ["get", "bArea_m2"]], 0],
  100,
  8,
  5000,
  50,
  15000,
  60,
];

const usageColorExpression: DataDrivenPropertyValueSpecification<string> = [
  "interpolate",
  ["linear"],
  ["coalesce", ["to-number", ["get", "annual_kwh"]], 0],
  0,
  "#334155",
  50000,
  "#64748b",
  200000,
  "#7c9eb8",
  600000,
  "#c89b6b",
  1000000,
  "#e07b3f",
  2500000,
  "#c0392b",
];

const usageHeightExpression: DataDrivenPropertyValueSpecification<number> = [
  "+",
  12,
  ["/", ["coalesce", ["to-number", ["get", "annual_kwh"]], 0], 80000],
];

const diagnosisColorExpression: DataDrivenPropertyValueSpecification<string> = [
  "match",
  ["get", "diagnosis_severity"],
  "critical",
  "#ef4444",
  "high",
  "#f97316",
  "normal",
  "#38bdf8",
  "low",
  "#64748b",
  "#334155",
];

const diagnosisHeightExpression: DataDrivenPropertyValueSpecification<number> = [
  "+",
  18,
  ["*", ["max", 0, ["coalesce", ["to-number", ["get", "current_kwh"]], 0]], 0.65],
];

function getPaintExpressions(mode: CampusMapMode) {
  if (mode === "diagnosis") {
    return {
      color: diagnosisColorExpression,
      height: diagnosisHeightExpression,
    };
  }

  if (mode === "usage") {
    return {
      color: usageColorExpression,
      height: usageHeightExpression,
    };
  }

  return {
    color: potentialColorExpression,
    height: potentialHeightExpression,
  };
}

const severityMeta: Record<
  RealtimeDiagnosisRow["severity"],
  { label: string; dot: string; strip: string; badge: string }
> = {
  critical: {
    label: "점검 필요",
    dot: "bg-red-500",
    strip: "bg-red-500",
    badge: "border-red-400/40 bg-red-500/15 text-red-100",
  },
  high: {
    label: "높음",
    dot: "bg-amber-300",
    strip: "bg-amber-300",
    badge: "border-amber-300/40 bg-amber-300/15 text-amber-100",
  },
  normal: {
    label: "정상",
    dot: "bg-sky-400",
    strip: "bg-sky-400",
    badge: "border-sky-300/40 bg-sky-300/15 text-sky-100",
  },
  low: {
    label: "낮음",
    dot: "bg-slate-500",
    strip: "bg-slate-500",
    badge: "border-slate-500/40 bg-slate-500/15 text-slate-200",
  },
};

function formatKwh(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatPct(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatKst(timestamp?: string): string {
  if (!timestamp) return "1H";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function CampusMap({
  selectedBuilding,
  mode,
  onBuildingSelect,
  recommendedBuildingNos = [],
  realtimeDiagnosisRows = [],
}: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!MAPBOX_TOKEN) {
      setErrorMessage(".env.local에 NEXT_PUBLIC_MAPBOX_TOKEN 값을 입력한 뒤 dev 서버를 다시 시작하세요.");
      return;
    }

    let disposed = false;

    async function initializeMap() {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        const container = containerRef.current;
        if (!container || disposed) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
          container,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [YU_CENTER.lng, YU_CENTER.lat],
          zoom: YU_DEFAULT_ZOOM,
          minZoom: 15.3,
          pitch: YU_DEFAULT_PITCH,
          bearing: YU_DEFAULT_BEARING,
          antialias: true,
          localIdeographFontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
        });

        mapRef.current = map;
        (window as Window & { __map?: MapboxMap }).__map = map;

        map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

        map.on("load", async () => {
          try {
            ["building", "building-outline", "building-extrusion"].forEach((id) => {
              if (map.getLayer(id)) {
                map.setLayoutProperty(id, "visibility", "none");
              }
            });

            map.setLight({
              anchor: "viewport",
              color: "#ffffff",
              intensity: 0.35,
              position: [1.5, 210, 30],
            });

            const [geojson, usageMap] = await Promise.all([
              loadCampusGeoJSON(),
              getBuildingAnnualUsage(),
            ]);
            if (disposed) return;

            geojson.features.forEach((feature) => {
              feature.properties.annual_kwh =
                usageMap[feature.properties.bNo] ?? 0;
            });

            map.addSource(BUILDING_SOURCE_ID, {
              type: "geojson",
              data: geojson,
            });

            const initialPaint = getPaintExpressions("potential");

            map.addLayer({
              id: "buildings-3d-fallback",
              type: "fill-extrusion",
              source: BUILDING_SOURCE_ID,
              filter: ["==", ["get", "polygon_source"], "fallback_square"],
              paint: {
                "fill-extrusion-color": initialPaint.color,
                "fill-extrusion-height": initialPaint.height,
                "fill-extrusion-base": 0,
                "fill-extrusion-opacity": 0.45,
                "fill-extrusion-vertical-gradient": true,
                "fill-extrusion-color-transition": { duration: 800, delay: 0 },
                "fill-extrusion-height-transition": { duration: 800, delay: 0 },
              },
            });

            map.addLayer({
              id: "buildings-3d",
              type: "fill-extrusion",
              source: BUILDING_SOURCE_ID,
              filter: ["!=", ["get", "polygon_source"], "fallback_square"],
              paint: {
                "fill-extrusion-color": initialPaint.color,
                "fill-extrusion-height": initialPaint.height,
                "fill-extrusion-base": 0,
                "fill-extrusion-opacity": 0.88,
                "fill-extrusion-vertical-gradient": true,
                "fill-extrusion-color-transition": { duration: 800, delay: 0 },
                "fill-extrusion-height-transition": { duration: 800, delay: 0 },
              },
            });

            map.addLayer({
              id: AI_RECOMMENDED_LINE_ID,
              type: "line",
              source: BUILDING_SOURCE_ID,
              filter: ["in", ["get", "bNo"], ["literal", []]],
              paint: {
                "line-color": "#a3e635",
                "line-width": ["interpolate", ["linear"], ["zoom"], 15, 2, 18, 6],
                "line-opacity": 0.9,
              },
            });

            map.addLayer({
              id: SELECTED_BUILDING_LINE_ID,
              type: "line",
              source: BUILDING_SOURCE_ID,
              filter: ["==", ["get", "bNo"], ""],
              paint: {
                "line-color": "#38bdf8",
                "line-width": ["interpolate", ["linear"], ["zoom"], 15, 2, 18, 5],
                "line-opacity": 0.95,
              },
            });

            map.addLayer({
              id: "buildings-label",
              type: "symbol",
              source: BUILDING_SOURCE_ID,
              minzoom: 15,
              layout: {
                "text-field": ["coalesce", ["get", "bName"], ""],
                "text-size": ["interpolate", ["linear"], ["zoom"], 15, 9, 16.5, 11, 18, 13],
                "text-anchor": "center",
                "text-justify": "center",
                "text-padding": 2,
                "text-allow-overlap": false,
                "text-ignore-placement": false,
                "symbol-sort-key": ["-", 0, ["coalesce", ["to-number", ["get", "bArea_m2"]], 0]],
              },
              paint: {
                "text-color": "#f8fafc",
                "text-halo-color": "rgba(2, 6, 23, 0.85)",
                "text-halo-width": 1.4,
                "text-halo-blur": 0.4,
              },
            });

            const handleBuildingClick = (event: MapLayerMouseEvent) => {
              const feature = event.features?.[0];
              if (feature?.properties) {
                onBuildingSelect(feature.properties as BuildingProperties);
              }
            };

            BUILDING_LAYER_IDS.forEach((layerId) => {
              map.on("click", layerId, handleBuildingClick);
              map.on("mouseenter", layerId, () => {
                map.getCanvas().style.cursor = "pointer";
              });
              map.on("mouseleave", layerId, () => {
                map.getCanvas().style.cursor = "";
              });
            });

            setIsMapReady(true);
          } catch (error) {
            setErrorMessage(
              error instanceof Error ? error.message : "캠퍼스 지도 데이터를 불러오지 못했습니다.",
            );
          }
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "캠퍼스 지도 데이터를 불러오지 못했습니다.",
        );
      }
    }

    void initializeMap();

    return () => {
      disposed = true;
      delete (window as Window & { __map?: MapboxMap }).__map;
      mapRef.current?.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [onBuildingSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const paint = getPaintExpressions(mode);

    BUILDING_LAYER_IDS.forEach((layerId) => {
      if (!map.getLayer(layerId)) return;

      map.setPaintProperty(layerId, "fill-extrusion-color", paint.color);
      map.setPaintProperty(layerId, "fill-extrusion-height", paint.height);
    });
  }, [isMapReady, mode]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(BUILDING_SOURCE_ID) as
      | import("mapbox-gl").GeoJSONSource
      | undefined;
    if (!map || !source || !isMapReady) return;

    void Promise.all([loadCampusGeoJSON(), getBuildingAnnualUsage()]).then(
      ([geojson, usageMap]) => {
        const diagnosisMap = new Map(
          realtimeDiagnosisRows.map((row) => [row.bNo, row]),
        );

        geojson.features.forEach((feature) => {
          const diagnosis = diagnosisMap.get(feature.properties.bNo);
          feature.properties.annual_kwh = usageMap[feature.properties.bNo] ?? 0;
          feature.properties.diagnosis_severity = diagnosis?.severity;
          feature.properties.current_kwh = diagnosis?.currentKwh;
          feature.properties.expected_kwh = diagnosis?.expectedKwh;
          feature.properties.delta_pct = diagnosis?.deltaPct;
        });

        source.setData(geojson);
      },
    );
  }, [isMapReady, realtimeDiagnosisRows]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !map.getLayer(SELECTED_BUILDING_LINE_ID)) return;

    map.setFilter(SELECTED_BUILDING_LINE_ID, [
      "==",
      ["get", "bNo"],
      selectedBuilding?.bNo ?? "",
    ]);

    const lng = selectedBuilding?.centerLng;
    const lat = selectedBuilding?.centerLat;
    if (typeof lng !== "number" || typeof lat !== "number") return;

    map.stop();
    map.easeTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 17),
      pitch: YU_DEFAULT_PITCH,
      bearing: YU_DEFAULT_BEARING,
      duration: 800,
    });
  }, [isMapReady, selectedBuilding]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !map.getLayer(AI_RECOMMENDED_LINE_ID)) return;

    map.setFilter(AI_RECOMMENDED_LINE_ID, [
      "in",
      ["get", "bNo"],
      ["literal", recommendedBuildingNos],
    ]);
  }, [isMapReady, recommendedBuildingNos]);

  const resetMapView = () => {
    const map = mapRef.current;
    if (!map) return;

    map.stop();
    map.easeTo({
      center: [YU_CENTER.lng, YU_CENTER.lat],
      zoom: YU_DEFAULT_ZOOM,
      pitch: YU_DEFAULT_PITCH,
      bearing: YU_DEFAULT_BEARING,
      duration: 800,
    });
  };

  const selectedDiagnosisRow =
    selectedBuilding && mode === "diagnosis"
      ? realtimeDiagnosisRows.find((row) => row.bNo === selectedBuilding.bNo)
      : null;
  const selectedBuildingName = selectedBuilding?.bName || selectedBuilding?.bNo || "";
  const diagnosisCounts = realtimeDiagnosisRows.reduce(
    (counts, row) => {
      counts[row.severity] += 1;
      return counts;
    },
    { critical: 0, high: 0, normal: 0, low: 0 } as Record<RealtimeDiagnosisRow["severity"], number>,
  );
  const outOfRangeCount = diagnosisCounts.critical + diagnosisCounts.high;
  const legendTimestamp = realtimeDiagnosisRows[0]?.timestamp;

  return (
    <section className="relative h-full w-full overflow-hidden bg-slate-950">
      <div ref={containerRef} className="h-full w-full" />

      <button
        type="button"
        aria-label="지도 시점 초기화"
        title="지도 시점 초기화"
        onClick={resetMapView}
        className="absolute right-2 top-[100px] z-10 flex h-[29px] w-[29px] items-center justify-center border border-slate-700 bg-slate-950/90 text-slate-100 shadow-lg transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </button>

      {mode === "diagnosis" && selectedDiagnosisRow ? (
        <div className="absolute left-4 top-[148px] z-10 w-[min(22rem,calc(100%-2rem))] overflow-hidden rounded-lg border border-white/5 bg-slate-950/85 text-xs text-slate-200 shadow-2xl shadow-slate-950/40 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md sm:top-[140px]">
          <div className={`h-[3px] ${severityMeta[selectedDiagnosisRow.severity].strip}`} />
          <div className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Selected Asset
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {selectedBuildingName}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${severityMeta[selectedDiagnosisRow.severity].badge}`}
              >
                {severityMeta[selectedDiagnosisRow.severity].label}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-white/5 bg-white/[0.03] p-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                  Current
                </p>
                <p className="mt-1 font-mono text-lg text-lime-200 tabular-nums">
                  {formatKwh(selectedDiagnosisRow.currentKwh)}
                </p>
              </div>
              <div className="rounded-md border border-white/5 bg-white/[0.03] p-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
                  Forecast
                </p>
                <p className="mt-1 font-mono text-lg text-cyan-100 tabular-nums">
                  {formatKwh(selectedDiagnosisRow.expectedKwh)}
                </p>
              </div>
            </div>
            <p className="mt-2 font-mono text-xs text-slate-300 tabular-nums">
              유사조건 대비{" "}
              <span className={selectedDiagnosisRow.deltaPct >= 0 ? "text-amber-100" : "text-sky-100"}>
                {formatPct(selectedDiagnosisRow.deltaPct)}
              </span>
            </p>
          </div>
        </div>
      ) : null}

      {mode === "diagnosis" ? (
        <div className="absolute bottom-4 left-4 z-10 w-[min(23rem,calc(100%-2rem))] rounded-lg border border-white/5 bg-slate-950/85 p-3 text-xs text-slate-200 shadow-2xl shadow-slate-950/40 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/30 bg-lime-300/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-lime-200">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-lime-300 opacity-70 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-lime-300" />
              </span>
              LIVE
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
              1H · {formatKst(legendTimestamp)}
            </span>
            <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-1 font-mono text-[10px] text-red-100 tabular-nums">
              범위 이탈 {outOfRangeCount}건
            </span>
          </div>
          <p className="mt-2 truncate text-slate-400">
            합성 기상 기준 · 유사 조건 평균 대비 실시간 진단
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(Object.keys(severityMeta) as Array<RealtimeDiagnosisRow["severity"]>).map((severity) => (
              <span
                key={severity}
                className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5"
              >
                <span className="flex items-center gap-2">
                  <i className={`size-2.5 rounded-full ${severityMeta[severity].dot}`} />
                  {severityMeta[severity].label}
                </span>
                <span className="font-mono text-slate-400 tabular-nums">{diagnosisCounts[severity]}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 px-6 text-center">
          <p className="max-w-md text-sm font-medium leading-6 text-slate-200">{errorMessage}</p>
        </div>
      ) : null}
    </section>
  );
}
