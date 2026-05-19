"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { YU_CENTER, YU_DEFAULT_BEARING, YU_DEFAULT_PITCH, YU_DEFAULT_ZOOM } from "@/lib/constants";
import { loadCampusGeoJSON } from "@/lib/load-geojson";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const RESET_VIEW_LABEL = "\uC9C0\uB3C4 \uC2DC\uC810 \uCD08\uAE30\uD654";
type MapboxMap = import("mapbox-gl").Map;

export function CampusMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!MAPBOX_TOKEN) {
      setErrorMessage("Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local, then restart the dev server.");
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
        // Debug only: remove before the final presentation.
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

            const geojson = await loadCampusGeoJSON();
            if (disposed) return;

            map.addSource("buildings", {
              type: "geojson",
              data: geojson,
            });

            map.addLayer({
              id: "buildings-3d-fallback",
              type: "fill-extrusion",
              source: "buildings",
              filter: ["==", ["get", "polygon_source"], "fallback_square"],
              paint: {
                "fill-extrusion-color": [
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
                ],
                "fill-extrusion-height": [
                  "+",
                  12,
                  ["*", ["coalesce", ["to-number", ["get", "floor_count"]], 0], 3.5],
                ],
                "fill-extrusion-base": 0,
                "fill-extrusion-opacity": 0.45,
                "fill-extrusion-vertical-gradient": true,
                "fill-extrusion-height-transition": { duration: 800, delay: 0 },
              },
            });

            map.addLayer({
              id: "buildings-3d",
              type: "fill-extrusion",
              source: "buildings",
              filter: ["!=", ["get", "polygon_source"], "fallback_square"],
              paint: {
                "fill-extrusion-color": [
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
                ],
                "fill-extrusion-height": [
                  "+",
                  12,
                  ["*", ["coalesce", ["to-number", ["get", "floor_count"]], 0], 3.5],
                ],
                "fill-extrusion-base": 0,
                "fill-extrusion-opacity": 0.88,
                "fill-extrusion-vertical-gradient": true,
                "fill-extrusion-height-transition": { duration: 800, delay: 0 },
              },
            });

            map.addLayer({
              id: "buildings-label",
              type: "symbol",
              source: "buildings",
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

            map.on("mouseenter", "buildings-3d", () => {
              map.getCanvas().style.cursor = "pointer";
            });

            map.on("mouseenter", "buildings-3d-fallback", () => {
              map.getCanvas().style.cursor = "pointer";
            });

            map.on("mouseleave", "buildings-3d", () => {
              map.getCanvas().style.cursor = "";
            });

            map.on("mouseleave", "buildings-3d-fallback", () => {
              map.getCanvas().style.cursor = "";
            });
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to load campus map data.");
          }
        });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load campus map data.");
      }
    }

    void initializeMap();

    return () => {
      disposed = true;
      delete (window as Window & { __map?: MapboxMap }).__map;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

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
    <section className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <div ref={containerRef} className="h-full w-full" />

      <button
        type="button"
        aria-label={RESET_VIEW_LABEL}
        title={RESET_VIEW_LABEL}
        onClick={resetMapView}
        className="absolute right-2 top-[100px] z-10 flex h-[29px] w-[29px] items-center justify-center border border-slate-700 bg-slate-950/90 text-slate-100 shadow-lg transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </button>

      {errorMessage ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/92 px-6 text-center">
          <p className="max-w-md text-sm font-medium leading-6 text-slate-200">{errorMessage}</p>
        </div>
      ) : null}
    </section>
  );
}
