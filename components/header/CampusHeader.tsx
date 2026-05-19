"use client";

import { ArrowLeft, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CO2_FACTOR, ELECTRICITY_RATE_KRW } from "@/lib/constants";
import { getBuildingAnnualUsage } from "@/lib/load-data";
import { loadGyeongsanBuildings } from "@/lib/load-geojson";
import type { BuildingProperties } from "@/types/building";

export type CampusMapMode = "usage" | "potential" | "diagnosis";

interface CampusHeaderProps {
  selectedBuilding: BuildingProperties | null;
  mode: CampusMapMode;
  onBuildingSelect: (building: BuildingProperties) => void;
  onBuildingClear: () => void;
  onModeChange: (mode: CampusMapMode) => void;
}

const analysisModeOptions: Array<{ value: CampusMapMode; label: string; activeClass: string }> = [
  { value: "usage", label: "연간 사용량", activeClass: "border-sky-300/40 bg-sky-300/10 text-sky-100" },
  {
    value: "potential",
    label: "옥상 잠재량",
    activeClass: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  },
];

function formatCampusSummary(annualKwh: number): string {
  if (annualKwh <= 0) return "연간 데이터 계산 중";

  const annualGwh = annualKwh / 1000000;
  const co2Tons = (annualKwh * CO2_FACTOR) / 1000;
  const costEok = (annualKwh * ELECTRICITY_RATE_KRW) / 100000000;

  return `연간 ${annualGwh.toFixed(2)} GWh · CO₂ ${Math.round(co2Tons).toLocaleString(
    "ko-KR",
  )}톤 · 전기료 ${costEok.toFixed(1)}억`;
}

export function CampusHeader({
  selectedBuilding,
  mode,
  onBuildingSelect,
  onBuildingClear,
  onModeChange,
}: CampusHeaderProps) {
  const [buildings, setBuildings] = useState<BuildingProperties[]>([]);
  const [annualKwh, setAnnualKwh] = useState(0);
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

    getBuildingAnnualUsage()
      .then((usageByBuilding) => {
        if (!disposed) {
          setAnnualKwh(Object.values(usageByBuilding).reduce((total, value) => total + value, 0));
        }
      })
      .catch(() => {
        if (!disposed) setAnnualKwh(0);
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

  const handleClear = () => {
    onBuildingClear();
    setQuery("");
  };

  return (
    <header className="relative z-30 flex min-h-14 shrink-0 items-center gap-3 border-b border-white/5 bg-slate-950/85 px-4 py-2 shadow-2xl shadow-slate-950/30 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
      <div className="flex min-w-[260px] flex-col gap-0.5">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold tracking-wide text-white">CampusEMS</span>
          <span className="hidden text-xs text-slate-400 sm:inline">영남대 경산캠퍼스 · 96개 건물</span>
        </div>
        <span className="text-xs font-medium text-emerald-200">{formatCampusSummary(annualKwh)}</span>
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
                  {Math.round(building.bArea_m2 ?? 0).toLocaleString("ko-KR")}m²
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {selectedBuilding ? (
        <button
          type="button"
          onClick={handleClear}
          className="flex h-9 shrink-0 items-center gap-2 border border-slate-700 bg-slate-950/60 px-3 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          캠퍼스 시뮬레이터로 돌아가기
        </button>
      ) : null}

      <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/5 bg-slate-950/70 p-1 ring-1 ring-inset ring-white/[0.04]">
        <button
          type="button"
          onClick={() => onModeChange("diagnosis")}
          className={[
            "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition sm:px-3",
            mode === "diagnosis"
              ? "bg-lime-300/15 text-lime-100 shadow-lg shadow-lime-950/30 ring-1 ring-lime-300/50"
              : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200",
          ].join(" ")}
          aria-pressed={mode === "diagnosis"}
        >
          <span className="relative flex size-2">
            {mode === "diagnosis" ? (
              <span className="absolute inline-flex h-full w-full rounded-full bg-lime-300 opacity-70 animate-ping" />
            ) : null}
            <span className="relative inline-flex size-2 rounded-full bg-lime-300" />
          </span>
          실시간 진단
        </button>
        <div className="mx-1 h-4 w-px bg-white/5" />
        <span className="hidden px-1 font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500 sm:inline">
          분석
        </span>
        {analysisModeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onModeChange(option.value)}
            className={[
              "h-7 rounded-full border px-1.5 text-[11px] font-medium transition sm:px-2",
              mode === option.value
                ? option.activeClass
                : "border-transparent text-slate-400 hover:bg-slate-800/70 hover:text-slate-200",
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
