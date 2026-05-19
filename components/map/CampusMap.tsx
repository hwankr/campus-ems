"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { CampusMapMode } from "@/components/header/CampusHeader";
import { YU_CENTER, YU_DEFAULT_BEARING, YU_DEFAULT_PITCH, YU_DEFAULT_ZOOM } from "@/lib/constants";
import { getBuildingAnnualUsage } from "@/lib/load-data";
import { loadCampusGeoJSON } from "@/lib/load-geojson";
import type { BuildingProperties } from "@/types/building";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const BUILDING_SOURCE_ID = "buildings";
const BUILDING_LAYER_IDS = ["buildings-3d-fallback", "buildings-3d"] as const;
const SELECTED_BUILDING_LINE_ID = "selected-building-outline";

type MapboxMap = import("mapbox-gl").Map;
type MapLayerMouseEvent = import("mapbox-gl").MapLayerMouseEvent;
type DataDrivenPropertyValueSpecification<T> =
  import("mapbox-gl").DataDrivenPropertyValueSpecification<T>;

interface CampusMapProps {
  selectedBuilding: BuildingProperties | null;
  mode: CampusMapMode;
  onBuildingSelect: (building: BuildingProperties) => void;
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

function getPaintExpressions(mode: CampusMapMode) {
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

export function CampusMap({ selectedBuilding, mode, onBuildingSelect }: CampusMapProps) {
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
              feature.properties.annual_kwh = usageMap[feature.properties.bNo] ?? 0;
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

      {errorMessage ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 px-6 text-center">
          <p className="max-w-md text-sm font-medium leading-6 text-slate-200">{errorMessage}</p>
        </div>
      ) : null}
    </section>
  );
}
