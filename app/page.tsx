"use client";

import { useState } from "react";

import { CampusHeader, type CampusMapMode } from "@/components/header/CampusHeader";
import { CampusMap } from "@/components/map/CampusMap";
import { BuildingPanel } from "@/components/panel/BuildingPanel";
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

        <aside className="min-h-0 basis-[30%] border-l border-slate-800 bg-slate-950/95">
          <BuildingPanel selectedBuilding={selectedBuilding} mode={mode} />
        </aside>
      </div>
    </main>
  );
}
