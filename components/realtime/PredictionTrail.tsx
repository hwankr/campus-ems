"use client";

import type { RealtimePlaybackFrame } from "@/types/realtime";

interface PredictionTrailProps {
  frames: RealtimePlaybackFrame[];
  currentIndex?: number;
}

function getOutOfRangeCount(frame: RealtimePlaybackFrame): number {
  return frame.campus.outOfRangeCount ?? frame.campus.criticalCount + frame.campus.highCount;
}

function getColumnClass(outOfRangeCount: number): string {
  if (outOfRangeCount >= 10) return "from-red-500 to-red-300 shadow-red-950/50";
  if (outOfRangeCount >= 5) return "from-amber-400 to-orange-300 shadow-amber-950/50";
  if (outOfRangeCount >= 2) return "from-sky-400 to-cyan-300 shadow-sky-950/50";
  return "from-emerald-400 to-lime-300 shadow-emerald-950/50";
}

function formatHour(timestamp: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function PredictionTrail({ frames, currentIndex = -1 }: PredictionTrailProps) {
  if (frames.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-white/10 bg-slate-950/40 p-4 text-xs text-slate-500">
        예측 이력이 아직 없습니다.
      </section>
    );
  }

  const counts = frames.map(getOutOfRangeCount);
  const maxCount = Math.max(1, ...counts);
  const peakIndex = counts.indexOf(maxCount);
  const cumulativeSeverity = frames.reduce(
    (total, frame) =>
      total + frame.campus.criticalCount * 2 + frame.campus.highCount + Math.max(0, frame.campus.deltaPct),
    0,
  );

  return (
    <section className="rounded-lg border border-white/5 bg-slate-950/85 p-4 ring-1 ring-inset ring-white/[0.04] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Prediction Trail
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-100">시간순 예측 이력</h3>
        </div>
        <span className="font-mono text-xs text-slate-400 tabular-nums">{frames.length} frames</span>
      </div>

      <div className="mt-4 flex h-32 items-end gap-1.5 border-b border-white/10 pb-2">
        {frames.map((frame, index) => {
          const outOfRangeCount = counts[index];
          const heightPct = 18 + (outOfRangeCount / maxCount) * 82;
          return (
            <div key={frame.frameId} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end">
                <div
                  title={`${formatHour(frame.timestamp)} · 범위 이탈 ${outOfRangeCount}건`}
                  className={[
                    "w-full rounded-t-sm bg-gradient-to-t shadow-lg transition",
                    getColumnClass(outOfRangeCount),
                    currentIndex === index ? "ring-2 ring-lime-300/80" : "ring-1 ring-white/10",
                  ].join(" ")}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              {index === 0 || index === peakIndex || index === frames.length - 1 ? (
                <span className="max-w-full truncate font-mono text-[9px] text-slate-500 tabular-nums">
                  {formatHour(frame.timestamp)}
                </span>
              ) : (
                <span className="h-3" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-md border border-white/5 bg-white/[0.03] px-3 py-2">
          <p className="font-mono uppercase tracking-[0.22em] text-slate-500">Peak Time</p>
          <p className="mt-1 font-mono text-slate-100 tabular-nums">
            {formatHour(frames[peakIndex]?.timestamp ?? frames[0].timestamp)}
          </p>
        </div>
        <div className="rounded-md border border-white/5 bg-white/[0.03] px-3 py-2">
          <p className="font-mono uppercase tracking-[0.22em] text-slate-500">Peak Outlier</p>
          <p className="mt-1 font-mono text-amber-100 tabular-nums">{maxCount}건</p>
        </div>
        <div className="rounded-md border border-white/5 bg-white/[0.03] px-3 py-2">
          <p className="font-mono uppercase tracking-[0.22em] text-slate-500">Severity Sum</p>
          <p className="mt-1 font-mono text-red-100 tabular-nums">
            {Math.round(cumulativeSeverity).toLocaleString("ko-KR")}
          </p>
        </div>
      </div>
    </section>
  );
}
