import type {
  RealtimeDiagnosisRow,
  RealtimePlaybackDataset,
  RealtimePlaybackFrame,
  RealtimeSeverity,
} from "@/types/realtime";

export type RealtimeStatusFilter = "all" | RealtimeSeverity;

export const REALTIME_SEVERITY_ORDER: Record<RealtimeSeverity, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const REALTIME_SEVERITY_LABELS: Record<RealtimeSeverity, string> = {
  critical: "점검 필요",
  high: "높음",
  normal: "정상",
  low: "낮음",
};

export const REALTIME_SEVERITY_DESCRIPTIONS: Record<RealtimeSeverity, string> = {
  critical: "유사 조건 평균보다 25% 이상 높습니다.",
  high: "유사 조건 평균보다 12% 이상 높습니다.",
  normal: "유사 조건 범위 안에 있습니다.",
  low: "유사 조건 평균보다 15% 이상 낮습니다.",
};

export function getRealtimeSeverity(deltaPct: number): RealtimeSeverity {
  if (deltaPct >= 25) return "critical";
  if (deltaPct >= 12) return "high";
  if (deltaPct <= -15) return "low";
  return "normal";
}

export function getRealtimeSeverityLabel(severity: RealtimeSeverity): string {
  return REALTIME_SEVERITY_LABELS[severity];
}

export function sortRealtimeDiagnosisRows(
  rows: RealtimeDiagnosisRow[],
): RealtimeDiagnosisRow[] {
  return [...rows].sort(
    (a, b) =>
      REALTIME_SEVERITY_ORDER[a.severity] - REALTIME_SEVERITY_ORDER[b.severity] ||
      b.deltaPct - a.deltaPct ||
      b.currentKwh - a.currentKwh,
  );
}

export function filterRealtimeDiagnosisRows(
  rows: RealtimeDiagnosisRow[],
  query: string,
  status: RealtimeStatusFilter,
): RealtimeDiagnosisRow[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

  return sortRealtimeDiagnosisRows(rows).filter((row) => {
    if (status !== "all" && row.severity !== status) return false;
    if (!normalizedQuery) return true;

    return [row.bNo, row.bName, row.district, row.bUse]
      .filter(Boolean)
      .some((value) => value.toLocaleLowerCase("ko-KR").includes(normalizedQuery));
  });
}

export function getRealtimePriorityRows(
  rows: RealtimeDiagnosisRow[],
  limit = 5,
): RealtimeDiagnosisRow[] {
  return sortRealtimeDiagnosisRows(rows)
    .filter((row) => row.severity === "critical" || row.severity === "high")
    .slice(0, limit);
}

export function getRealtimePlaybackScenarios(dataset: RealtimePlaybackDataset) {
  const seen = new Set<string>();

  return dataset.frames
    .filter((frame) => {
      if (seen.has(frame.scenarioId)) return false;
      seen.add(frame.scenarioId);
      return true;
    })
    .map((frame) => ({
      id: frame.scenarioId,
      label: frame.scenarioLabel,
      frameCount: dataset.frames.filter((item) => item.scenarioId === frame.scenarioId).length,
    }));
}

export function filterRealtimePlaybackFrames(
  frames: RealtimePlaybackFrame[],
  scenarioId: string,
): RealtimePlaybackFrame[] {
  return frames.filter((frame) => frame.scenarioId === scenarioId);
}

export function findRealtimeRow(
  rows: RealtimeDiagnosisRow[],
  bNo?: string | null,
): RealtimeDiagnosisRow | null {
  if (!bNo) return null;
  return rows.find((row) => row.bNo === bNo) ?? null;
}
