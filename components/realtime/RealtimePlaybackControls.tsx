"use client";

import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { RealtimePlaybackFrame } from "@/types/realtime";

interface RealtimeScenarioOption {
  id: string;
  label: string;
  frameCount: number;
}

interface RealtimePlaybackControlsProps {
  frame: RealtimePlaybackFrame;
  frames: RealtimePlaybackFrame[];
  frameIndex: number;
  isPlaying: boolean;
  speedMs: number;
  scenarios?: RealtimeScenarioOption[];
  scenarioId?: string;
  onFrameIndexChange: (index: number) => void;
  onPlayToggle: () => void;
  onSpeedMsChange: (speedMs: number) => void;
  onScenarioChange?: (scenarioId: string) => void;
}

const speedOptions = [
  { value: 1800, label: "1.8초" },
  { value: 1200, label: "1.2초" },
  { value: 700, label: "0.7초" },
  { value: 350, label: "0.35초" },
];

const seasonStripClass: Record<string, string> = {
  spring: "from-emerald-300 via-emerald-400 to-teal-500",
  summer: "from-amber-300 via-orange-400 to-orange-600",
  autumn: "from-orange-300 via-rose-400 to-rose-600",
  winter: "from-sky-300 via-indigo-400 to-indigo-600",
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

function formatKst(timestamp: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getOperationTag(outOfRangeCount: number) {
  if (outOfRangeCount >= 10) {
    return {
      label: "이상 다발",
      className: "border-red-400/40 bg-red-500/15 text-red-200",
    };
  }
  if (outOfRangeCount >= 5) {
    return {
      label: "변동 구간",
      className: "border-amber-300/40 bg-amber-300/15 text-amber-100",
    };
  }
  if (outOfRangeCount >= 2) {
    return {
      label: "관찰 구간",
      className: "border-sky-300/40 bg-sky-300/15 text-sky-100",
    };
  }
  return {
    label: "안정 구간",
    className: "border-emerald-300/40 bg-emerald-300/15 text-emerald-100",
  };
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-slate-200 shadow-inner shadow-white/[0.03] transition hover:border-white/20 hover:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-lime-300/60"
    >
      {children}
    </button>
  );
}

export function RealtimePlaybackControls({
  frame,
  frames,
  frameIndex,
  isPlaying,
  speedMs,
  scenarios = [],
  scenarioId,
  onFrameIndexChange,
  onPlayToggle,
  onSpeedMsChange,
  onScenarioChange,
}: RealtimePlaybackControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const maxIndex = Math.max(0, frames.length - 1);
  const safeIndex = Math.min(frameIndex, maxIndex);
  const outOfRangeCount =
    frame.campus.outOfRangeCount ?? frame.campus.criticalCount + frame.campus.highCount;
  const operationTag = getOperationTag(outOfRangeCount);
  const progressPct = maxIndex > 0 ? (safeIndex / maxIndex) * 100 : 0;
  const stripClass = seasonStripClass[frame.season] ?? seasonStripClass.spring;
  const subLabel = useMemo(
    () =>
      [
        frame.label,
        seasonLabel[frame.season] ?? frame.season,
        timeOfDayLabel[frame.timeOfDay] ?? frame.timeOfDay,
      ]
        .filter(Boolean)
        .join(" · "),
    [frame.label, frame.season, frame.timeOfDay],
  );

  return (
    <section className="relative overflow-hidden rounded-lg border border-white/5 bg-slate-950/85 p-3 text-slate-100 shadow-2xl shadow-slate-950/40 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${stripClass}`} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPlayToggle}
          aria-label={isPlaying ? "재생 일시정지" : "재생 시작"}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-lime-300/50 bg-lime-300/15 text-lime-200 shadow-lg shadow-lime-950/40 transition hover:bg-lime-300/25 focus:outline-none focus:ring-2 focus:ring-lime-300/70"
        >
          {isPlaying ? (
            <span className="absolute inset-0 rounded-full border border-lime-300/40 animate-ping" />
          ) : null}
          {isPlaying ? (
            <Pause className="relative h-5 w-5" aria-hidden="true" />
          ) : (
            <Play className="relative h-5 w-5 translate-x-0.5" aria-hidden="true" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/30 bg-lime-300/10 px-2 py-1 font-mono uppercase tracking-[0.22em] text-lime-200">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-lime-300 opacity-70 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-lime-300" />
              </span>
              LIVE
            </span>
            <span className={`rounded-full border px-2 py-1 font-medium ${operationTag.className}`}>
              {operationTag.label}
            </span>
            <span className="font-mono uppercase tracking-[0.22em] text-slate-400">
              KST {formatKst(frame.timestamp)}
            </span>
            <span className="font-mono text-red-200 tabular-nums">
              범위 이탈 {outOfRangeCount}건
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-slate-300">{subLabel}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton
            label="이전 프레임"
            onClick={() => onFrameIndexChange(Math.max(0, safeIndex - 1))}
          >
            <SkipBack className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <span className="hidden min-w-12 text-center font-mono text-xs text-slate-300 tabular-nums sm:block">
            {String(safeIndex + 1).padStart(2, "0")}/{String(frames.length).padStart(2, "0")}
          </span>
          <IconButton
            label="다음 프레임"
            onClick={() => onFrameIndexChange(Math.min(maxIndex, safeIndex + 1))}
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            label={isExpanded ? "컨트롤 접기" : "컨트롤 펼치기"}
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-3 grid gap-3 border-t border-white/5 pt-3">
          {scenarios.length > 1 && onScenarioChange ? (
            <div className="flex flex-wrap gap-1.5">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onScenarioChange(scenario.id)}
                  className={[
                    "h-7 rounded-full border px-2.5 text-[11px] font-medium transition",
                    scenarioId === scenario.id
                      ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-slate-950/50 text-slate-400 hover:text-slate-200",
                  ].join(" ")}
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="relative h-7">
              <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-800" />
              <div
                className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-lime-300 via-cyan-300 to-amber-300"
                style={{ width: `${progressPct}%` }}
              />
              <input
                type="range"
                min={0}
                max={maxIndex}
                value={safeIndex}
                onChange={(event) => onFrameIndexChange(Number(event.target.value))}
                aria-label="진단 프레임"
                className="absolute inset-0 z-10 h-7 w-full cursor-pointer appearance-none bg-transparent accent-lime-300"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {speedOptions.map((speed) => (
                <button
                  key={speed.value}
                  type="button"
                  onClick={() => onSpeedMsChange(speed.value)}
                  className={[
                    "h-7 rounded-full border px-2.5 font-mono text-[11px] tabular-nums transition",
                    speedMs === speed.value
                      ? "border-lime-300/50 bg-lime-300/15 text-lime-100"
                      : "border-white/10 bg-slate-950/50 text-slate-400 hover:text-slate-200",
                  ].join(" ")}
                >
                  {speed.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
