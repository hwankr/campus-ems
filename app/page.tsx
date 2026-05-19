"use client";

import { useState } from "react";

import { CampusHeader, type CampusMapMode } from "@/components/header/CampusHeader";
import { CampusMap } from "@/components/map/CampusMap";
import type { BuildingProperties } from "@/types/building";

export default function Home() {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingProperties | null>(null);
  const [mode, setMode] = useState<CampusMapMode>("potential");

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950">
      <CampusHeader
        selectedBuilding={selectedBuilding}
        mode={mode}
        onBuildingSelect={setSelectedBuilding}
        onModeChange={setMode}
      />

      <div className="flex min-h-0 flex-1">
        <section className="min-w-0 basis-[70%]">
          <CampusMap
            selectedBuilding={selectedBuilding}
            mode={mode}
            onBuildingSelect={setSelectedBuilding}
          />
        </section>

        <aside className="flex basis-[30%] flex-col border-l border-slate-800 bg-slate-950/95 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Building Panel
          </p>
          {selectedBuilding ? (
            <div className="mt-4 space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  {selectedBuilding.bName || selectedBuilding.bNo}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedBuilding.bNo} · {selectedBuilding.district} ·{" "}
                  {selectedBuilding.bUse || "용도 미분류"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs text-slate-500">모드</p>
                  <p className="mt-1 font-medium text-slate-100">
                    {mode === "potential" ? "옥상 잠재량" : "사용량"}
                  </p>
                </div>
                <div className="border border-slate-800 bg-slate-900/70 p-3">
                  <p className="text-xs text-slate-500">연면적</p>
                  <p className="mt-1 font-medium text-slate-100">
                    {Math.round(selectedBuilding.bTotalFloorArea_m2 ?? 0).toLocaleString()}㎡
                  </p>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-500">
                상세 사용량과 월별 차트는 다음 Phase에서 이 영역에 연결합니다.
              </p>
            </div>
          ) : (
            <div className="mt-10 flex flex-1 items-center justify-center text-center text-sm leading-6 text-slate-500">
              건물을 검색하거나 지도에서 선택하면 이 영역에 선택 정보가 표시됩니다.
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
