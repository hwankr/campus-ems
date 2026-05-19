"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppNav } from "@/components/AppNav";
import { PredictionTrail } from "@/components/realtime/PredictionTrail";
import { RealtimePlaybackControls } from "@/components/realtime/RealtimePlaybackControls";
import {
  filterRealtimeDiagnosisRows,
  findRealtimeRow,
  getRealtimePlaybackScenarios,
  getRealtimePriorityRows,
  getRealtimeSeverityLabel,
  type RealtimeStatusFilter,
} from "@/lib/realtime-diagnosis";
import type {
  RealtimeDiagnosisDataset,
  RealtimeDiagnosisRow,
  RealtimePlaybackDataset,
  RealtimePlaybackFrame,
  RealtimeSeverity,
} from "@/types/realtime";

const PLAYBACK_PATH = "/data/realtime-playback-demo.json";
const FALLBACK_PATH = "/data/realtime-diagnosis-demo.json";

const statusOptions: Array<{
  value: RealtimeStatusFilter;
  label: string;
  dot: string;
  activeClass: string;
}> = [
  { value: "all", label: "전체", dot: "bg-lime-300", activeClass: "border-lime-300/50 bg-lime-300/15 text-lime-100" },
  { value: "critical", label: "점검", dot: "bg-red-500", activeClass: "border-red-400/50 bg-red-500/15 text-red-100" },
  { value: "high", label: "높음", dot: "bg-amber-300", activeClass: "border-amber-300/50 bg-amber-300/15 text-amber-100" },
  { value: "normal", label: "정상", dot: "bg-cyan-300", activeClass: "border-cyan-300/50 bg-cyan-300/15 text-cyan-100" },
  { value: "low", label: "낮음", dot: "bg-slate-500", activeClass: "border-slate-500/50 bg-slate-500/15 text-slate-200" },
];

const severityMeta: Record<
  RealtimeSeverity,
  { strip: string; dot: string; badge: string; text: string }
> = {
  critical: {
    strip: "bg-red-500",
    dot: "bg-red-500",
    badge: "border-red-400/40 bg-red-500/15 text-red-100",
    text: "text-red-100",
  },
  high: {
    strip: "bg-amber-300",
    dot: "bg-amber-300",
    badge: "border-amber-300/40 bg-amber-300/15 text-amber-100",
    text: "text-amber-100",
  },
  normal: {
    strip: "bg-cyan-300",
    dot: "bg-cyan-300",
    badge: "border-cyan-300/40 bg-cyan-300/15 text-cyan-100",
    text: "text-cyan-100",
  },
  low: {
    strip: "bg-slate-500",
    dot: "bg-slate-500",
    badge: "border-slate-500/40 bg-slate-500/15 text-slate-200",
    text: "text-slate-200",
  },
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

function formatKwh(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")} kWh`;
}

function formatPct(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDateTime(timestamp: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
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

async function loadRealtimeFrames(): Promise<{
  metadata: RealtimePlaybackDataset["metadata"];
  frames: RealtimePlaybackFrame[];
}> {
  const playbackResponse = await fetch(PLAYBACK_PATH);

  if (playbackResponse.ok) {
    const playback = (await playbackResponse.json()) as RealtimePlaybackDataset;
    if (Array.isArray(playback.frames) && playback.frames.length > 0) {
      return { metadata: playback.metadata, frames: playback.frames };
    }
  }

  const fallbackResponse = await fetch(FALLBACK_PATH);
  if (!fallbackResponse.ok) {
    throw new Error("실시간 진단 요약 데이터를 불러오지 못했습니다.");
  }

  const fallback = (await fallbackResponse.json()) as RealtimeDiagnosisDataset;
  return { metadata: fallback.metadata, frames: [createFallbackFrame(fallback)] };
}

function getDetailSentence(row: RealtimeDiagnosisRow): string {
  const intensity =
    Math.abs(row.deltaPct) >= 25 ? "급격한" : Math.abs(row.deltaPct) >= 12 ? "뚜렷한" : "완만한";
  const direction = row.deltaPct >= 0 ? "초과" : "부족";
  return `유사 조건 평균 대비 ${intensity} ${direction}`;
}

function RangeBar({ row, large = false }: { row: RealtimeDiagnosisRow; large?: boolean }) {
  const low = row.expectedLowKwh ?? Math.min(row.expectedKwh, row.currentKwh) * 0.72;
  const high = row.expectedHighKwh ?? Math.max(row.expectedKwh, row.currentKwh) * 1.18;
  const max = Math.max(high, row.currentKwh, row.expectedKwh, 1);
  const currentPct = Math.min(100, (row.currentKwh / max) * 100);
  const expectedPct = Math.min(100, (row.expectedKwh / max) * 100);
  const lowPct = Math.min(100, (low / max) * 100);
  const highPct = Math.min(100, (high / max) * 100);

  return (
    <div className={large ? "mt-5" : "mt-2"}>
      <div className={`relative rounded-full bg-slate-800 ${large ? "h-4" : "h-2.5"}`}>
        <div
          className="absolute top-0 h-full rounded-full bg-cyan-300/20"
          style={{ left: `${lowPct}%`, width: `${Math.max(4, highPct - lowPct)}%` }}
        />
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-lime-300 via-amber-300 to-red-400"
          style={{ width: `${currentPct}%` }}
        />
        <div
          className="absolute top-1/2 h-6 w-px -translate-y-1/2 bg-cyan-100 shadow-[0_0_10px_rgba(103,232,249,0.9)]"
          style={{ left: `${expectedPct}%` }}
        />
      </div>
      {large ? (
        <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-500 tabular-nums">
          <span>현재 {formatKwh(row.currentKwh)}</span>
          <span>예측 평균 {formatKwh(row.expectedKwh)}</span>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-slate-950/85 p-4 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function SimilarSampleScatter({ row }: { row: RealtimeDiagnosisRow }) {
  if (row.similarSamples.length === 0) {
    return <p className="text-xs text-slate-500">유사 샘플이 없습니다.</p>;
  }

  const values = row.similarSamples.map((sample) => sample.kwh);
  const min = Math.min(...values);
  const max = Math.max(...values, row.currentKwh, row.expectedKwh);
  const range = Math.max(1, max - min);

  return (
    <div>
      <div className="relative mt-3 h-24 rounded-lg border border-white/5 bg-white/[0.03]">
        <div className="absolute left-3 right-3 top-1/2 h-px bg-white/10" />
        {row.similarSamples.map((sample, index) => {
          const left = row.similarSamples.length === 1 ? 50 : (index / (row.similarSamples.length - 1)) * 100;
          const bottom = ((sample.kwh - min) / range) * 76 + 10;
          return (
            <span
              key={sample.timestamp}
              title={`${formatDateTime(sample.timestamp)} · ${formatKwh(sample.kwh)}`}
              className="absolute size-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.7)]"
              style={{ left: `calc(${left}% - 5px)`, bottom: `${bottom}%` }}
            />
          );
        })}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {row.similarSamples.slice(0, 3).map((sample) => (
          <div key={sample.timestamp} className="rounded-md border border-white/5 bg-white/[0.03] p-2">
            <p className="truncate text-[10px] text-slate-500">{formatDateTime(sample.timestamp)}</p>
            <p className="mt-1 font-mono text-xs text-slate-100 tabular-nums">{formatKwh(sample.kwh)}</p>
            <p className="mt-1 text-[10px] text-slate-500">
              {sample.temperatureC.toFixed(1)}°C · 습도 {sample.humidityPct}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RealtimePage() {
  const [frames, setFrames] = useState<RealtimePlaybackFrame[]>([]);
  const [metadata, setMetadata] = useState<RealtimePlaybackDataset["metadata"] | null>(null);
  const [scenarioId, setScenarioId] = useState("");
  const [frameIndex, setFrameIndex] = useState(0);
  const [selectedBNo, setSelectedBNo] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RealtimeStatusFilter>("all");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(1200);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    loadRealtimeFrames()
      .then((result) => {
        if (disposed) return;
        const defaultScenarioId =
          result.metadata.defaultScenarioId ?? result.frames[0]?.scenarioId ?? "";
        setMetadata(result.metadata);
        setFrames(result.frames);
        setScenarioId(defaultScenarioId);
        setSelectedBNo(result.frames.find((frame) => frame.scenarioId === defaultScenarioId)?.rows[0]?.bNo ?? null);
      })
      .catch((error) => {
        if (!disposed) {
          setErrorMessage(error instanceof Error ? error.message : "진단 데이터를 불러오지 못했습니다.");
        }
      });

    return () => {
      disposed = true;
    };
  }, []);

  const scenarioDataset = useMemo(
    () => ({ metadata: metadata ?? frames[0]?.metadata, frames }),
    [frames, metadata],
  );
  const scenarios = useMemo(
    () =>
      metadata
        ? getRealtimePlaybackScenarios(scenarioDataset as RealtimePlaybackDataset)
        : [],
    [metadata, scenarioDataset],
  );
  const scenarioFrames = useMemo(
    () => frames.filter((frame) => frame.scenarioId === scenarioId),
    [frames, scenarioId],
  );
  const frame = scenarioFrames[Math.min(frameIndex, Math.max(0, scenarioFrames.length - 1))];
  const filteredRows = useMemo(
    () => filterRealtimeDiagnosisRows(frame?.rows ?? [], query, status),
    [frame?.rows, query, status],
  );
  const priorityRows = useMemo(
    () => getRealtimePriorityRows(frame?.rows ?? [], 8),
    [frame?.rows],
  );
  const selectedRow = findRealtimeRow(frame?.rows ?? [], selectedBNo) ?? filteredRows[0] ?? null;

  useEffect(() => {
    if (!isPlaying || scenarioFrames.length <= 1) return;

    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % scenarioFrames.length);
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, scenarioFrames.length, speedMs]);

  const handleScenarioChange = (nextScenarioId: string) => {
    setScenarioId(nextScenarioId);
    setFrameIndex(0);
    setIsPlaying(false);
    const nextFrame = frames.find((item) => item.scenarioId === nextScenarioId);
    setSelectedBNo(nextFrame?.rows[0]?.bNo ?? null);
  };

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <AppNav />
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-6 text-center">
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-200">
            {errorMessage}
          </p>
        </div>
      </main>
    );
  }

  if (!frame) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <AppNav />
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-400">
          실시간 진단 데이터를 불러오는 중입니다.
        </div>
      </main>
    );
  }

  const candidateCount = frame.campus.criticalCount + frame.campus.highCount;
  const weatherSummary = `${frame.weather.temperatureC.toFixed(1)}°C · 습도 ${frame.weather.humidityPct}%`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(132,204,22,0.12),transparent_32rem),linear-gradient(135deg,#020617,#0f172a_45%,#020617)] text-slate-100">
      <AppNav />
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5">
        <header className="rounded-lg border border-white/5 bg-slate-950/85 p-5 shadow-2xl shadow-slate-950/30 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-lime-200">
                CampusEMS Diagnosis Workbench
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                실시간 전력 진단 관제 콘솔
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                CampusEMS는 캠퍼스 건물 전력 사용량을 예측하고 이상 사용을 진단하는 AI 에너지 관리 시스템입니다.
                현재 진단 데이터는 공공·공개 데이터 기반 가공 시연 데이터이며, 실제 운영 시 BEMS/AMI와 기상청 ASOS/AWS로 교체할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-amber-100">
                synthetic/prototype 데이터
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-slate-300 tabular-nums">
                KST {formatDateTime(frame.timestamp)}
              </span>
            </div>
          </div>
        </header>

        <RealtimePlaybackControls
          frame={frame}
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

        <section className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Campus Now" value={formatKwh(frame.campus.currentKwh)} tone="text-lime-200" />
          <MetricCard
            label="Similar Baseline"
            value={formatKwh(frame.campus.expectedKwh)}
            tone="text-slate-100"
            sub={`차이 ${formatPct(frame.campus.deltaPct)}`}
          />
          <MetricCard
            label="Inspection Queue"
            value={`${candidateCount}건`}
            tone="text-amber-100"
            sub={`점검 ${frame.campus.criticalCount} · 높음 ${frame.campus.highCount}`}
          />
          <MetricCard
            label="Synthetic Weather"
            value={weatherSummary}
            tone="text-cyan-100"
            sub={frame.weather.source}
          />
        </section>

        <section className="grid gap-2 rounded-lg border border-white/5 bg-slate-950/85 p-3 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md sm:grid-cols-6">
          {[
            ["강수", `${frame.weather.precipitationMm}mm`],
            ["풍속", `${(frame.weather.windSpeedMs ?? 0).toFixed(1)}m/s`],
            ["일사", `${Math.round(frame.weather.solarRadiationWm2 ?? 0)}W/m²`],
            ["구름", `${Math.round(frame.weather.cloudCoverPct ?? 0)}%`],
            ["기온", `${frame.weather.temperatureC.toFixed(1)}°C`],
            ["습도", `${frame.weather.humidityPct}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-white/5 bg-white/[0.03] px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
              <p className="mt-1 font-mono text-sm text-cyan-100 tabular-nums">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-lg border border-white/5 bg-slate-950/85 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
            <div className="space-y-3 border-b border-white/5 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="건물명, 번호, 구역, 용도 검색"
                  className="h-10 w-full rounded-md border border-white/10 bg-slate-950/70 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-lime-300/60"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={[
                      "flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition",
                      status === option.value
                        ? option.activeClass
                        : "border-white/10 bg-slate-950/50 text-slate-400 hover:text-slate-200",
                    ].join(" ")}
                  >
                    <span className={`size-2 rounded-full ${option.dot}`} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[680px] overflow-y-auto p-2">
              {filteredRows.map((row) => (
                <button
                  key={row.bNo}
                  type="button"
                  onClick={() => setSelectedBNo(row.bNo)}
                  className={[
                    "relative w-full overflow-hidden rounded-lg border p-3 text-left transition",
                    selectedRow?.bNo === row.bNo
                      ? "border-lime-300/40 bg-lime-300/10"
                      : "border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  <span className={`absolute bottom-0 left-0 top-0 w-[3px] ${severityMeta[row.severity].strip}`} />
                  <div className="flex items-start justify-between gap-3 pl-1">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{row.bName || row.bNo}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {row.bNo} · {row.district} · {row.bUse || "용도 미분류"}
                      </p>
                    </div>
                    <span className={`shrink-0 font-mono text-xs tabular-nums ${severityMeta[row.severity].text}`}>
                      {formatPct(row.deltaPct)}
                    </span>
                  </div>
                  <RangeBar row={row} />
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            {selectedRow ? (
              <section className="overflow-hidden rounded-lg border border-white/5 bg-slate-950/85 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
                <div className={`h-[3px] ${severityMeta[selectedRow.severity].strip}`} />
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        Selected Building
                      </p>
                      <h2 className="mt-1 truncate text-2xl font-semibold text-white">
                        {selectedRow.bName || selectedRow.bNo}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {selectedRow.bNo} · {selectedRow.district} · {selectedRow.bUse || "용도 미분류"}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${severityMeta[selectedRow.severity].badge}`}>
                      {getRealtimeSeverityLabel(selectedRow.severity)}
                    </span>
                  </div>

                  <p className="mt-5 text-lg font-medium text-slate-100">{getDetailSentence(selectedRow)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {seasonLabel[frame.season] ?? frame.season} · {timeOfDayLabel[frame.timeOfDay] ?? frame.timeOfDay} · 샘플 {selectedRow.sampleCount}건
                  </p>

                  <RangeBar row={selectedRow} large />

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      ["현재", formatKwh(selectedRow.currentKwh), "text-lime-200"],
                      ["예측 평균", formatKwh(selectedRow.expectedKwh), "text-cyan-100"],
                      ["차이", formatPct(selectedRow.deltaPct), selectedRow.deltaPct >= 0 ? "text-amber-100" : "text-sky-100"],
                    ].map(([label, value, tone]) => (
                      <div key={label} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                          {label}
                        </p>
                        <p className={`mt-2 font-mono text-xl font-semibold tabular-nums ${tone}`}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                      Similar Samples
                    </p>
                    <SimilarSampleScatter row={selectedRow} />
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-white/5 bg-slate-950/85 p-4 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    Priority Queue
                  </p>
                  <p className="mt-1 text-sm text-slate-300">점검 우선순위 {priorityRows.length}건</p>
                </div>
                <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
                  {frame.scenarioLabel}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {priorityRows.slice(0, 6).map((row, index) => (
                  <button
                    key={row.bNo}
                    type="button"
                    onClick={() => setSelectedBNo(row.bNo)}
                    className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-medium text-white">
                        <span className="mr-2 font-mono text-[10px] text-lime-200">#{index + 1}</span>
                        {row.bName}
                      </span>
                      <span className="font-mono text-xs text-red-100 tabular-nums">{formatPct(row.deltaPct)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <PredictionTrail frames={scenarioFrames} currentIndex={scenarioFrames.findIndex((item) => item.frameId === frame.frameId)} />
          </div>
        </section>
      </div>
    </main>
  );
}
