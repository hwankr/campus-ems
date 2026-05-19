"use client";

import { useEffect, useMemo, useState } from "react";

import { AppNav } from "@/components/AppNav";
import { CampusHeader, type CampusMapMode } from "@/components/header/CampusHeader";
import { CampusMap } from "@/components/map/CampusMap";
import { AIStrategyPanel } from "@/components/panel/AIStrategyPanel";
import { BuildingPanel } from "@/components/panel/BuildingPanel";
import { PredictionTrail } from "@/components/realtime/PredictionTrail";
import { RealtimePlaybackControls } from "@/components/realtime/RealtimePlaybackControls";
import { loadGyeongsanBuildings } from "@/lib/load-geojson";
import {
  findRealtimeRow,
  getRealtimePlaybackScenarios,
  getRealtimePriorityRows,
} from "@/lib/realtime-diagnosis";
import type { BuildingProperties } from "@/types/building";
import type {
  RealtimeDiagnosisDataset,
  RealtimeDiagnosisRow,
  RealtimePlaybackDataset,
  RealtimePlaybackFrame,
} from "@/types/realtime";

function formatKwh(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")} kWh`;
}

function formatPct(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function createFallbackFrame(data: RealtimeDiagnosisDataset): RealtimePlaybackFrame {
  return {
    ...data,
    frameId: "single-diagnosis",
    timestamp: data.metadata.timestamp,
    scenarioId: "single",
    scenarioLabel: "단일 진단",
    label: "단일 진단 시점",
    season: "spring",
    timeOfDay: "afternoon",
  };
}

async function loadRealtimeFrames(): Promise<RealtimePlaybackDataset> {
  const playbackResponse = await fetch("/data/realtime-playback-demo.json");
  if (playbackResponse.ok) {
    const playback = (await playbackResponse.json()) as RealtimePlaybackDataset;
    if (Array.isArray(playback.frames) && playback.frames.length > 0) {
      return playback;
    }
  }

  const fallbackResponse = await fetch("/data/realtime-diagnosis-demo.json");
  if (!fallbackResponse.ok) {
    throw new Error("실시간 진단 데이터를 불러오지 못했습니다.");
  }
  const fallback = (await fallbackResponse.json()) as RealtimeDiagnosisDataset;
  return {
    metadata: fallback.metadata,
    frames: [createFallbackFrame(fallback)],
  };
}

const severityMeta: Record<
  RealtimeDiagnosisRow["severity"],
  { label: string; className: string; bar: string }
> = {
  critical: { label: "점검", className: "text-red-200", bar: "bg-red-500" },
  high: { label: "높음", className: "text-amber-200", bar: "bg-amber-300" },
  normal: { label: "정상", className: "text-cyan-200", bar: "bg-cyan-300" },
  low: { label: "낮음", className: "text-slate-300", bar: "bg-slate-500" },
};

const seasonLabel: Record<string, string> = {
  spring: "봄",
  summer: "여름",
  autumn: "가을",
  winter: "겨울",
};

const timeOfDayLabel: Record<string, string> = {
  dawn: "새벽",
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
  night: "야간",
};

function getReason(frame: RealtimePlaybackFrame, row: RealtimeDiagnosisRow): string {
  const intensity =
    Math.abs(row.deltaPct) >= 25 ? "급격한" : Math.abs(row.deltaPct) >= 12 ? "뚜렷한" : "완만한";
  const direction = row.deltaPct >= 0 ? "초과" : "부족";
  return `${seasonLabel[frame.season] ?? frame.season} ${
    timeOfDayLabel[frame.timeOfDay] ?? frame.timeOfDay
  } 평균 대비 ${intensity} ${direction}`;
}

function RangeBar({ row, compact = false }: { row: RealtimeDiagnosisRow; compact?: boolean }) {
  const low = row.expectedLowKwh ?? Math.min(row.expectedKwh, row.currentKwh) * 0.72;
  const high = row.expectedHighKwh ?? Math.max(row.expectedKwh, row.currentKwh) * 1.18;
  const max = Math.max(high, row.currentKwh, row.expectedKwh, 1);
  const currentPct = Math.min(100, (row.currentKwh / max) * 100);
  const expectedPct = Math.min(100, (row.expectedKwh / max) * 100);
  const lowPct = Math.min(100, (low / max) * 100);
  const highPct = Math.min(100, (high / max) * 100);

  return (
    <div className={compact ? "mt-2" : "mt-4"}>
      <div className="relative h-2.5 rounded-full bg-slate-800">
        <div
          className="absolute top-0 h-2.5 rounded-full bg-cyan-300/20"
          style={{ left: `${lowPct}%`, width: `${Math.max(4, highPct - lowPct)}%` }}
        />
        <div
          className="absolute left-0 top-0 h-2.5 rounded-full bg-gradient-to-r from-lime-300 to-amber-300"
          style={{ width: `${currentPct}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-cyan-100 shadow-[0_0_8px_rgba(103,232,249,0.8)]"
          style={{ left: `${expectedPct}%` }}
        />
      </div>
      {!compact ? (
        <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-500 tabular-nums">
          <span>현재 {formatKwh(row.currentKwh)}</span>
          <span>예측 {formatKwh(row.expectedKwh)}</span>
        </div>
      ) : null}
    </div>
  );
}

function RealtimeMapSummary({
  frame,
  frames,
  priorityRows,
  buildings,
  onSelectBuilding,
}: {
  frame: RealtimePlaybackFrame;
  frames: RealtimePlaybackFrame[];
  priorityRows: RealtimeDiagnosisRow[];
  buildings: BuildingProperties[];
  onSelectBuilding: (building: BuildingProperties) => void;
}) {
  const total = Math.max(1, frame.campus.buildingCount);
  const counts = {
    critical: frame.campus.criticalCount,
    high: frame.campus.highCount,
    normal: frame.campus.normalCount,
    low: frame.campus.lowCount,
  };

  return (
    <section className="h-full min-h-0 overflow-y-auto px-5 py-5 text-slate-100">
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-lg border border-white/5 bg-slate-950/85 p-4 shadow-2xl shadow-slate-950/30 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
          <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-lime-300" />
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-lime-200">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-lime-300 opacity-70 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-lime-300" />
            </span>
            LIVE KPI
          </div>
          <p className="mt-3 text-xs text-slate-400">현재 1시간 캠퍼스 사용량</p>
          <p className="mt-1 font-mono text-4xl font-semibold text-lime-200 tabular-nums">
            {formatKwh(frame.campus.currentKwh)}
          </p>
          <div className="mt-3 inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 font-mono text-xs text-amber-100 tabular-nums">
            유사 조건 {formatPct(frame.campus.deltaPct)}
          </div>
        </section>

        <section className="rounded-lg border border-white/5 bg-slate-950/85 p-4 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Status Mix
          </p>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-800">
            {(Object.keys(counts) as Array<keyof typeof counts>).map((severity) => (
              <div
                key={severity}
                className={severityMeta[severity].bar}
                style={{ width: `${(counts[severity] / total) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(Object.keys(counts) as Array<keyof typeof counts>).map((severity) => (
              <div key={severity} className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-2">
                <p className="text-[10px] text-slate-500">{severityMeta[severity].label}</p>
                <p className={`font-mono text-sm tabular-nums ${severityMeta[severity].className}`}>
                  {counts[severity]}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/5 bg-slate-950/85 p-4 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Priority Top 5
          </p>
          <div className="mt-3 space-y-2">
            {priorityRows.map((row, index) => (
              <button
                key={row.bNo}
                type="button"
                onClick={() => {
                  const building = buildings.find((item) => item.bNo === row.bNo);
                  if (building) onSelectBuilding(building);
                }}
                className="w-full rounded-lg border border-white/5 bg-white/[0.03] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      <span className="mr-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-2 py-0.5 font-mono text-[10px] text-lime-200">
                        #{index + 1}
                      </span>
                      {row.bName}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">{getReason(frame, row)}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-red-200 tabular-nums">
                    {formatPct(row.deltaPct)}
                  </span>
                </div>
                <RangeBar row={row} compact />
              </button>
            ))}
          </div>
        </section>

        <PredictionTrail frames={frames} currentIndex={frames.findIndex((item) => item.frameId === frame.frameId)} />
      </div>
    </section>
  );
}

export default function Home() {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingProperties | null>(null);
  const [mode, setMode] = useState<CampusMapMode>("diagnosis");
  const [buildings, setBuildings] = useState<BuildingProperties[]>([]);
  const [recommendedBuildingNos, setRecommendedBuildingNos] = useState<string[]>([]);
  const [playback, setPlayback] = useState<RealtimePlaybackDataset | null>(null);
  const [scenarioId, setScenarioId] = useState("");
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(1200);

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

  useEffect(() => {
    let disposed = false;

    loadRealtimeFrames()
      .then((data) => {
        if (disposed) return;
        const defaultScenarioId = data.metadata.defaultScenarioId ?? data.frames[0]?.scenarioId ?? "";
        setPlayback(data);
        setScenarioId(defaultScenarioId);
      })
      .catch(() => {
        if (!disposed) setPlayback(null);
      });

    return () => {
      disposed = true;
    };
  }, []);

  const scenarios = useMemo(
    () => (playback ? getRealtimePlaybackScenarios(playback) : []),
    [playback],
  );
  const scenarioFrames = useMemo(
    () => playback?.frames.filter((frame) => frame.scenarioId === scenarioId) ?? [],
    [playback, scenarioId],
  );
  const realtimeFrame =
    scenarioFrames[Math.min(frameIndex, Math.max(0, scenarioFrames.length - 1))] ?? null;
  const priorityRows = useMemo(
    () => getRealtimePriorityRows(realtimeFrame?.rows ?? [], 5),
    [realtimeFrame?.rows],
  );
  const selectedDiagnosisRow = findRealtimeRow(
    realtimeFrame?.rows ?? [],
    selectedBuilding?.bNo,
  );

  useEffect(() => {
    if (!isPlaying || scenarioFrames.length <= 1) return;

    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % scenarioFrames.length);
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, scenarioFrames.length, speedMs]);

  const handleRecommendationSelect = (bNo: string) => {
    const building = buildings.find((item) => item.bNo === bNo);
    if (building) {
      setSelectedBuilding(building);
    }
  };

  const handleScenarioChange = (nextScenarioId: string) => {
    setScenarioId(nextScenarioId);
    setFrameIndex(0);
    setIsPlaying(false);
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-950">
      <AppNav />
      <CampusHeader
        selectedBuilding={selectedBuilding}
        mode={mode}
        onBuildingSelect={setSelectedBuilding}
        onBuildingClear={() => setSelectedBuilding(null)}
        onModeChange={setMode}
      />

      <div className="flex min-h-0 flex-1">
        <section className="relative min-w-0 basis-[70%]">
          <CampusMap
            selectedBuilding={selectedBuilding}
            mode={mode}
            onBuildingSelect={setSelectedBuilding}
            recommendedBuildingNos={recommendedBuildingNos}
            realtimeDiagnosisRows={realtimeFrame?.rows ?? []}
          />
          {mode === "diagnosis" && realtimeFrame ? (
            <div className="pointer-events-none absolute left-1/2 top-3 z-20 w-[min(680px,calc(100%-1.5rem))] -translate-x-1/2">
              <div className="pointer-events-auto">
                <RealtimePlaybackControls
                  frame={realtimeFrame}
                  frames={scenarioFrames}
                  frameIndex={frameIndex}
                  isPlaying={isPlaying}
                  speedMs={speedMs}
                  scenarios={scenarios}
                  scenarioId={scenarioId}
                  onFrameIndexChange={setFrameIndex}
                  onPlayToggle={() => setIsPlaying((value) => !value)}
                  onSpeedMsChange={setSpeedMs}
                  onScenarioChange={handleScenarioChange}
                />
              </div>
            </div>
          ) : null}
        </section>

        <aside className="min-h-0 basis-[30%] border-l border-white/5 bg-slate-950/95">
          <div className={selectedBuilding || mode === "diagnosis" ? "hidden h-full" : "h-full"}>
            <AIStrategyPanel
              onRecommendationGenerated={setRecommendedBuildingNos}
              onRecommendationSelect={handleRecommendationSelect}
            />
          </div>
          {!selectedBuilding && mode === "diagnosis" && realtimeFrame ? (
            <RealtimeMapSummary
              frame={realtimeFrame}
              frames={scenarioFrames}
              priorityRows={priorityRows}
              buildings={buildings}
              onSelectBuilding={setSelectedBuilding}
            />
          ) : null}
          {!selectedBuilding && mode === "diagnosis" && !realtimeFrame ? (
            <section className="p-5 text-sm text-slate-400">진단 데이터를 불러오고 있습니다.</section>
          ) : null}
          {selectedBuilding ? (
            <div className="h-full">
              <BuildingPanel
                selectedBuilding={selectedBuilding}
                mode={mode}
                diagnosisRow={selectedDiagnosisRow}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
