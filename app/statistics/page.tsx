"use client";

import {
  Banknote,
  ChartColumn,
  ListFilter,
  Search,
  SolarPanel,
  Zap,
  type LucideIcon,
} from "lucide-react";
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

import { AppNav } from "@/components/AppNav";
import { loadMonthlyElectricity } from "@/lib/load-electricity";
import { loadGyeongsanBuildings } from "@/lib/load-geojson";
import {
  createBuildingStatisticsRows,
  sortStatisticsRows,
  type BuildingStatisticsRow,
  type StatisticsSortKey,
} from "@/lib/statistics";

type TabKey = "usage" | "solar" | "investment";
type ViewMode = "top10" | "all";

interface TabConfig {
  key: TabKey;
  label: string;
  icon: LucideIcon;
  sortKey: StatisticsSortKey;
  chartKey: keyof Pick<
    BuildingStatisticsRow,
    "annualUsageKwh" | "annualSolarPotentialKwh" | "investmentScore"
  >;
  chartLabel: string;
  barFill: string;
}

const tabs: TabConfig[] = [
  {
    key: "usage",
    label: "전력 사용량",
    icon: Zap,
    sortKey: "usage",
    chartKey: "annualUsageKwh",
    chartLabel: "최근 12개월 사용량",
    barFill: "#38bdf8",
  },
  {
    key: "solar",
    label: "태양광 잠재량",
    icon: SolarPanel,
    sortKey: "solar",
    chartKey: "annualSolarPotentialKwh",
    chartLabel: "예상 발전량",
    barFill: "#f59e0b",
  },
  {
    key: "investment",
    label: "투자 판단",
    icon: Banknote,
    sortKey: "investment",
    chartKey: "investmentScore",
    chartLabel: "우선 검토 순위",
    barFill: "#34d399",
  },
];

const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatInteger(value: number): string {
  return numberFormatter.format(Math.round(value));
}

function formatEnergy(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(2)} GWh`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)} MWh`;
  return `${formatInteger(value)} kWh`;
}

function formatKrw(value: number): string {
  if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(1)}억원`;
  if (Math.abs(value) >= 10000) return `${formatInteger(value / 10000)}만원`;
  return `${formatInteger(value)}원`;
}

function formatCo2Tons(valueKg: number): string {
  return `${numberFormatter.format(Math.round(valueKg / 100) / 10)} tCO2`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatPayback(value: number | null): string {
  if (value === null) return "-";
  return `${value.toFixed(1)}년`;
}

function formatChartValue(value: number, tab: TabKey): string {
  if (tab === "usage" || tab === "solar") return formatEnergy(value);
  return `${value.toFixed(1)}점`;
}

function StatSummary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="border border-slate-800 bg-slate-900/65 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-xl font-semibold text-slate-50">{value}</p>
        </div>
        <Icon className="h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const [rows, setRows] = useState<BuildingStatisticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("usage");
  const [district, setDistrict] = useState("all");
  const [buildingQuery, setBuildingQuery] = useState("");
  const [useQuery, setUseQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("top10");

  useEffect(() => {
    let disposed = false;

    Promise.all([loadGyeongsanBuildings(), loadMonthlyElectricity()])
      .then(([buildings, electricity]) => {
        if (disposed) return;

        setRows(createBuildingStatisticsRows(buildings, electricity));
        setErrorMessage(null);
      })
      .catch((error) => {
        if (disposed) return;

        setRows([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "통계 데이터를 불러오지 못했습니다.",
        );
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, []);

  const activeConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  const districts = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.district).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "ko-KR"),
      ),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedBuilding = buildingQuery.trim().toLocaleLowerCase();
    const normalizedUse = useQuery.trim().toLocaleLowerCase();

    return rows.filter((row) => {
      const districtMatches = district === "all" || row.district === district;
      const buildingMatches =
        !normalizedBuilding ||
        [row.bName, row.bNo]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(normalizedBuilding));
      const useMatches =
        !normalizedUse || row.bUse.toLocaleLowerCase().includes(normalizedUse);

      return districtMatches && buildingMatches && useMatches;
    });
  }, [buildingQuery, district, rows, useQuery]);

  const sortedRows = useMemo(
    () => sortStatisticsRows(filteredRows, activeConfig.sortKey),
    [activeConfig.sortKey, filteredRows],
  );

  const visibleRows = viewMode === "top10" ? sortedRows.slice(0, 10) : sortedRows;
  const chartWidth = Math.max(720, visibleRows.length * 68);

  const summary = useMemo(() => {
    const totalUsage = filteredRows.reduce((total, row) => total + row.annualUsageKwh, 0);
    const totalSolar = filteredRows.reduce(
      (total, row) => total + row.annualSolarPotentialKwh,
      0,
    );
    const paybackRows = filteredRows.filter((row) => row.paybackYears !== null);
    const averagePayback =
      paybackRows.length > 0
        ? paybackRows.reduce((total, row) => total + (row.paybackYears ?? 0), 0) /
          paybackRows.length
        : null;

    return {
      totalUsage,
      totalSolar,
      averagePayback,
      count: filteredRows.length,
    };
  }, [filteredRows]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <AppNav />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 lg:px-6">
        <header className="flex flex-col gap-3 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">
              CampusEMS Building Analytics
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
              캠퍼스 에너지 관리 통계 대시보드
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              CampusEMS는 캠퍼스 건물 전력 사용량을 예측하고 이상 사용을 진단하는 AI 에너지 관리 시스템입니다.
              지도에 표시되는 경산캠퍼스 96개 건물을 기준으로 전력 사용량, 태양광 잠재량, 투자 우선순위를 비교합니다.
              RE100은 제품명이 아니라 CampusEMS가 지원하는 에너지 절감·RE100 전환 의사결정 목표입니다.
            </p>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
              통계 데이터는 공공·공개 데이터 기반 가공 시연 데이터이며 synthetic/prototype 성격을 갖습니다.
              실제 운영 시 BEMS/AMI와 기상청 ASOS/AWS 데이터로 교체할 수 있습니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:min-w-[540px]">
            <StatSummary label="필터 결과" value={`${summary.count}개`} icon={ListFilter} />
            <StatSummary label="연간 사용량" value={formatEnergy(summary.totalUsage)} icon={Zap} />
            <StatSummary label="예상 발전량" value={formatEnergy(summary.totalSolar)} icon={SolarPanel} />
            <StatSummary
              label="평균 회수기간"
              value={formatPayback(summary.averagePayback)}
              icon={Banknote}
            />
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="h-fit border border-slate-800 bg-slate-900/55 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <ListFilter className="h-4 w-4 text-sky-300" aria-hidden="true" />
              필터
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">구역</span>
                <select
                  value={district}
                  onChange={(event) => setDistrict(event.currentTarget.value)}
                  className="h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-sky-400"
                >
                  <option value="all">전체 구역</option>
                  {districts.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">
                  건물명 검색
                </span>
                <span className="relative block">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={buildingQuery}
                    onChange={(event) => setBuildingQuery(event.currentTarget.value)}
                    placeholder="건물명 또는 번호"
                    className="h-10 w-full border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
                  />
                </span>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-medium text-slate-400">
                  용도 텍스트 검색
                </span>
                <input
                  type="search"
                  value={useQuery}
                  onChange={(event) => setUseQuery(event.currentTarget.value)}
                  placeholder="예: 강의, 연구, 복지"
                  className="h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
                />
              </label>

              <fieldset>
                <legend className="mb-1.5 text-xs font-medium text-slate-400">표시 범위</legend>
                <div className="grid grid-cols-2 border border-slate-700 bg-slate-950 p-1">
                  {[
                    { value: "top10", label: "상위 10개" },
                    { value: "all", label: "전체" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setViewMode(option.value as ViewMode)}
                      className={[
                        "h-9 px-2 text-xs font-medium transition-colors",
                        viewMode === option.value
                          ? "bg-sky-500 text-slate-950"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-2">
              {tabs.map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    aria-pressed={isActive}
                    className={[
                      "flex h-10 shrink-0 items-center gap-2 border px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "border-sky-400 bg-sky-500 text-slate-950"
                        : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="border border-slate-800 bg-slate-900/55 p-8 text-sm text-slate-300">
                통계 데이터를 불러오는 중입니다.
              </div>
            ) : errorMessage ? (
              <div className="border border-red-400/40 bg-red-500/10 p-8 text-sm leading-6 text-red-100">
                {errorMessage}
              </div>
            ) : rows.length === 0 ? (
              <div className="border border-slate-800 bg-slate-900/55 p-8 text-sm text-slate-300">
                표시할 통계 데이터가 없습니다.
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="border border-slate-800 bg-slate-900/55 p-8 text-sm text-slate-300">
                조건에 맞는 건물이 없습니다.
              </div>
            ) : (
              <>
                <div className="border border-slate-800 bg-slate-900/55 p-4">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <ChartColumn className="h-4 w-4 text-sky-300" aria-hidden="true" />
                        {activeConfig.chartLabel}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {viewMode === "top10" ? "필터 결과의 상위 10개" : "필터 결과 전체"}를{" "}
                        {activeConfig.label} 기준으로 정렬했습니다.
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{visibleRows.length}개 건물</span>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="h-80" style={{ width: chartWidth }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={visibleRows}
                          margin={{ top: 10, right: 20, left: 8, bottom: 72 }}
                        >
                          <CartesianGrid stroke="#1e293b" vertical={false} />
                          <XAxis
                            dataKey="bName"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            angle={-36}
                            textAnchor="end"
                            height={72}
                            interval={0}
                          />
                          <YAxis
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            tickFormatter={(value) =>
                              formatChartValue(Number(value), activeTab)
                            }
                            width={82}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                            contentStyle={{
                              background: "#020617",
                              border: "1px solid #334155",
                              color: "#e2e8f0",
                            }}
                            formatter={(value) => [
                              formatChartValue(Number(value), activeTab),
                              activeConfig.chartLabel,
                            ]}
                            labelFormatter={(label) => `${label}`}
                          />
                          <Bar
                            dataKey={activeConfig.chartKey}
                            fill={activeConfig.barFill}
                            radius={[3, 3, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden border border-slate-800 bg-slate-900/55">
                  <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full table-fixed text-left text-sm">
                      <thead className="border-b border-slate-800 bg-slate-950/70 text-xs text-slate-400">
                        <tr>
                          <th className="w-[24%] px-4 py-3 font-medium">건물명</th>
                          <th className="w-[12%] px-4 py-3 font-medium">구역</th>
                          {activeTab === "usage" ? (
                            <>
                              <th className="px-4 py-3 font-medium">사용량</th>
                              <th className="px-4 py-3 font-medium">전기료</th>
                              <th className="px-4 py-3 font-medium">CO2</th>
                            </>
                          ) : null}
                          {activeTab === "solar" ? (
                            <>
                              <th className="px-4 py-3 font-medium">예상 발전량</th>
                              <th className="px-4 py-3 font-medium">자급률</th>
                              <th className="px-4 py-3 font-medium">절감액</th>
                            </>
                          ) : null}
                          {activeTab === "investment" ? (
                            <>
                              <th className="px-4 py-3 font-medium">우선 검토 순위</th>
                              <th className="px-4 py-3 font-medium">회수기간</th>
                              <th className="px-4 py-3 font-medium">절감액</th>
                              <th className="px-4 py-3 font-medium">자급률</th>
                            </>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {visibleRows.map((row) => (
                          <tr key={row.bNo} className="text-slate-200">
                            <td className="px-4 py-3 align-top">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-50" title={row.bName}>
                                  {row.bName || row.bNo}
                                </p>
                                <p className="mt-1 truncate text-xs text-slate-500" title={row.bUse}>
                                  {row.bNo} · {row.bUse || "용도 미분류"}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-slate-400">{row.district}</td>
                            {activeTab === "usage" ? (
                              <>
                                <td className="px-4 py-3 align-top">{formatEnergy(row.annualUsageKwh)}</td>
                                <td className="px-4 py-3 align-top">{formatKrw(row.annualCostKrw)}</td>
                                <td className="px-4 py-3 align-top">{formatCo2Tons(row.annualCo2Kg)}</td>
                              </>
                            ) : null}
                            {activeTab === "solar" ? (
                              <>
                                <td className="px-4 py-3 align-top">
                                  {formatEnergy(row.annualSolarPotentialKwh)}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  {formatPercent(row.selfSufficiencyRate)}
                                </td>
                                <td className="px-4 py-3 align-top">{formatKrw(row.annualSavingsKrw)}</td>
                              </>
                            ) : null}
                            {activeTab === "investment" ? (
                              <>
                                <td className="px-4 py-3 align-top">
                                  {row.investmentScore.toFixed(1)}점
                                </td>
                                <td className="px-4 py-3 align-top">
                                  {formatPayback(row.paybackYears)}
                                </td>
                                <td className="px-4 py-3 align-top">{formatKrw(row.annualSavingsKrw)}</td>
                                <td className="px-4 py-3 align-top">
                                  {formatPercent(row.selfSufficiencyRate)}
                                </td>
                              </>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
