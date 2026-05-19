"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { loadGyeongsanBuildings } from "@/lib/load-geojson";
import type { BuildingProperties } from "@/types/building";

export type CampusMapMode = "usage" | "potential";

interface CampusHeaderProps {
  selectedBuilding: BuildingProperties | null;
  mode: CampusMapMode;
  onBuildingSelect: (building: BuildingProperties) => void;
  onModeChange: (mode: CampusMapMode) => void;
}

const modeOptions: Array<{ value: CampusMapMode; label: string }> = [
  { value: "potential", label: "옥상 잠재량" },
  { value: "usage", label: "사용량" },
];

export function CampusHeader({
  selectedBuilding,
  mode,
  onBuildingSelect,
  onModeChange,
}: CampusHeaderProps) {
  const [buildings, setBuildings] = useState<BuildingProperties[]>([]);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    let disposed = false;

    loadGyeongsanBuildings()
      .then((items) => {
        if (!disposed) setBuildings(items);
      })
      .catch(() => {
        if (!disposed) setBuildings([]);
      });

    return () => {
      disposed = true;
    };
  }, []);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];

    return buildings
      .filter((building) =>
        [building.bName, building.bNo, building.district, building.bUse]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 8);
  }, [buildings, query]);

  const showResults = isFocused && results.length > 0;
  const inputPlaceholder = selectedBuilding
    ? `${selectedBuilding.bName || selectedBuilding.bNo} 선택됨`
    : "건물명 또는 건물번호 검색";

  const handleSelect = (building: BuildingProperties) => {
    onBuildingSelect(building);
    setQuery(building.bName || building.bNo);
    setIsFocused(false);
  };

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-4 border-b border-slate-700/70 bg-slate-800/80 px-4 backdrop-blur">
      <div className="flex min-w-[220px] items-baseline gap-3">
        <span className="text-sm font-semibold tracking-wide text-white">CAMPUS-RE100</span>
        <span className="hidden text-xs text-slate-400 sm:inline">영남대 경산캠퍼스 · 96개 건물</span>
      </div>

      <div className="relative mx-auto w-full max-w-xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          placeholder={inputPlaceholder}
          aria-label="건물명 또는 건물번호 검색"
          className="h-9 w-full border border-slate-700 bg-slate-950/70 pl-9 pr-9 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-sky-400"
        />
        {query ? (
          <button
            type="button"
            aria-label="검색어 지우기"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-500 transition-colors hover:text-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        {showResults ? (
          <div className="absolute left-0 right-0 top-[42px] z-40 overflow-hidden border border-slate-700 bg-slate-950/95 shadow-2xl">
            {results.map((building) => (
              <button
                key={building.bNo}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(building)}
                className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm text-slate-100 transition-colors hover:bg-slate-800 focus:bg-slate-800 focus:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{building.bName || building.bNo}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {building.bNo} · {building.district} · {building.bUse || "용도 미분류"}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {Math.round(building.bArea_m2 ?? 0).toLocaleString()}㎡
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1 border border-slate-700 bg-slate-950/60 p-1">
        {modeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onModeChange(option.value)}
            className={[
              "h-8 px-3 text-xs font-medium transition-colors",
              mode === option.value
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200",
            ].join(" ")}
            aria-pressed={mode === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </header>
  );
}
