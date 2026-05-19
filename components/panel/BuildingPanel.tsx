"use client";

import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CampusMapMode } from "@/components/header/CampusHeader";
import { BuildingAIInsight } from "@/components/panel/BuildingAIInsight";
import {
  ROOF_COVERAGE_RATIO,
  SOLAR_PANEL_KWH_PER_M2_YEAR,
} from "@/lib/constants";
import { getBuildingElectricity } from "@/lib/load-electricity";
import type { MonthlyUsageChartRow } from "@/lib/electricity-calculations";
import { getRealtimeSeverityLabel } from "@/lib/realtime-diagnosis";
import type { BuildingProperties } from "@/types/building";
import type { RealtimeDiagnosisRow } from "@/types/realtime";

interface BuildingPanelProps {
  selectedBuilding: BuildingProperties | null;
  mode: CampusMapMode;
  diagnosisRow?: RealtimeDiagnosisRow | null;
}

interface MetaRow {
  label: string;
  value: string;
}

const SELF_SUFFICIENCY_CLASSES = {
  red: "border-red-500/30 bg-red-500/10 text-red-300",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  yellow: "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
};

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatArea(value: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return `${formatNumber(value)}㎡`;
}

function formatMonth(yearMonth: string): string {
  const month = Number(yearMonth.slice(5, 7));
  return Number.isFinite(month) ? `${month}월` : yearMonth;
}

function formatCompactKwh(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return formatNumber(value);
}

function getSelfSufficiencyClass(percent: number): string {
  if (percent >= 100) return SELF_SUFFICIENCY_CLASSES.green;
  if (percent >= 50) return SELF_SUFFICIENCY_CLASSES.yellow;
  if (percent >= 20) return SELF_SUFFICIENCY_CLASSES.orange;
  return SELF_SUFFICIENCY_CLASSES.red;
}

function getDisplaySelfSufficiencyPercent(rawPercent: number): number {
  if (!Number.isFinite(rawPercent)) return 0;
  return Math.ceil(rawPercent / 5) * 5;
}

function formatDeltaPct(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function BuildingPanel({ selectedBuilding, mode, diagnosisRow }: BuildingPanelProps) {
  const [monthlyRows, setMonthlyRows] = useState<MonthlyUsageChartRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBuilding) {
      setMonthlyRows([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    let disposed = false;
    setIsLoading(true);
    setErrorMessage(null);

    getBuildingElectricity(selectedBuilding.bNo)
      .then((rows) => {
        if (!disposed) setMonthlyRows(rows);
      })
      .catch((error) => {
        if (!disposed) {
          setMonthlyRows([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "월별 전력 데이터를 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!disposed) setIsLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [selectedBuilding]);

  const recentRows = useMemo(() => monthlyRows.slice(-12), [monthlyRows]);

  const roofPotentialKwh = useMemo(() => {
    const buildingArea = selectedBuilding?.bArea_m2 ?? 0;
    return buildingArea * ROOF_COVERAGE_RATIO * SOLAR_PANEL_KWH_PER_M2_YEAR;
  }, [selectedBuilding]);

  const annualUsageKwh = useMemo(
    () => recentRows.reduce((total, row) => total + row.kwh, 0),
    [recentRows],
  );

  const rawSelfSufficiencyPercent =
    annualUsageKwh > 0 ? (roofPotentialKwh / annualUsageKwh) * 100 : 0;
  const displaySelfSufficiencyPercent =
    getDisplaySelfSufficiencyPercent(rawSelfSufficiencyPercent);
  const selfSufficiencyClass = getSelfSufficiencyClass(
    displaySelfSufficiencyPercent,
  );

  const metaRows: MetaRow[] = selectedBuilding
    ? [
        { label: "구역", value: selectedBuilding.district || "-" },
        { label: "준공일", value: selectedBuilding.bDate || "-" },
        { label: "층수", value: `${selectedBuilding.floor_count ?? 0}층` },
        {
          label: "연면적",
          value: formatArea(selectedBuilding.bTotalFloorArea_m2),
        },
        { label: "건축면적", value: formatArea(selectedBuilding.bArea_m2) },
      ]
    : [];

  if (!selectedBuilding) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6 text-center">
        <div className="max-w-[240px]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            건물을 클릭해서 상세 정보를 확인하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="h-full min-h-0 overflow-y-auto px-5 py-5 text-slate-100">
      <div className="space-y-6">
        <header>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-slate-50">
                {selectedBuilding.bName || selectedBuilding.bNo}
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                {selectedBuilding.bNo} · {selectedBuilding.bUse || "용도 미분류"}
              </p>
            </div>
            <span className="shrink-0 border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400">
              {mode === "potential" ? "옥상 잠재량" : mode === "diagnosis" ? "실시간 진단" : "사용량"}
            </span>
          </div>
        </header>

        {mode === "diagnosis" && diagnosisRow ? (
          <section className="border border-sky-400/30 bg-sky-400/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-sky-100">현재 1시간 진단</p>
                <p className="mt-1 text-xs leading-5 text-sky-100/75">
                  현재 기상값은 합성 또는 시연용 관측값이며, 운영 전환 시 기상청 ASOS/AWS 필드로 교체 가능합니다.
                </p>
              </div>
              <span className="shrink-0 border border-sky-300/40 px-2 py-1 text-xs text-sky-100">
                {getRealtimeSeverityLabel(diagnosisRow.severity)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="border border-slate-700/70 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-400">현재</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {formatCompactKwh(diagnosisRow.currentKwh)} kWh
                </p>
              </div>
              <div className="border border-slate-700/70 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-400">유사 평균</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {formatCompactKwh(diagnosisRow.expectedKwh)} kWh
                </p>
              </div>
              <div className="border border-slate-700/70 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-400">차이율</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {formatDeltaPct(diagnosisRow.deltaPct)}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="overflow-hidden border border-slate-800 bg-slate-900/50">
          <table className="w-full text-sm">
            <tbody>
              {metaRows.map((row) => (
                <tr key={row.label} className="border-b border-slate-800 last:border-0">
                  <th className="w-24 bg-slate-900/70 px-3 py-2 text-left font-medium text-slate-500">
                    {row.label}
                  </th>
                  <td className="px-3 py-2 text-right text-slate-200">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="border border-slate-800 bg-slate-900/55 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Rooftop Solar Potential
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">
            {formatNumber(roofPotentialKwh)} kWh/년
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            건축면적 × {ROOF_COVERAGE_RATIO * 100}% ×{" "}
            {SOLAR_PANEL_KWH_PER_M2_YEAR} kWh/㎡·년 기준 추정
          </p>
        </section>

        <BuildingAIInsight bNo={selectedBuilding.bNo} />

        <section className="border border-slate-800 bg-slate-900/55 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">
                월별 전력 사용량
              </p>
              <p className="mt-1 text-xs text-slate-500">최근 12개월 kWh</p>
            </div>
            {isLoading ? (
              <span className="text-xs text-slate-500">불러오는 중</span>
            ) : null}
          </div>

          <div className="mt-4 h-[200px] w-full">
            {errorMessage ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-red-300">
                {errorMessage}
              </div>
            ) : recentRows.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentRows} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="year_month"
                    tickFormatter={formatMonth}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatCompactKwh}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                    formatter={(value) => [`${formatNumber(Number(value))} kWh`, "사용량"]}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid #334155",
                      color: "#e2e8f0",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <Bar dataKey="kwh" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                표시할 월별 데이터가 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className={`border p-4 ${selfSufficiencyClass}`}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">자급률</p>
              <p className="mt-1 text-xs opacity-80">
                연간 사용량 {formatNumber(annualUsageKwh)} kWh 기준
              </p>
            </div>
            <p className="text-2xl font-semibold">
              {displaySelfSufficiencyPercent}%
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
