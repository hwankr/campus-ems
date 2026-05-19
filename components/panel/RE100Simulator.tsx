"use client";

import {
  BatteryCharging,
  Banknote,
  CloudSun,
  Leaf,
  type LucideIcon,
  SolarPanel,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  CO2_FACTOR,
  ELECTRICITY_RATE_KRW,
  ROOF_COVERAGE_RATIO,
  SOLAR_INSTALL_COST_KRW_PER_M2,
  SOLAR_PANEL_KWH_PER_M2_YEAR,
} from "@/lib/constants";
import { getBuildingAnnualUsage } from "@/lib/load-data";
import { loadGyeongsanBuildings } from "@/lib/load-geojson";

interface CampusBaseline {
  annualUsageKwh: number;
  roofAreaM2: number;
}

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  accentClass: string;
  icon: LucideIcon;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatTons(valueKg: number): string {
  return `${formatNumber(valueKg / 1000)}톤`;
}

function formatEok(valueKrw: number): string {
  return `${(valueKrw / 100000000).toFixed(1)}억 원`;
}

function formatYears(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${value.toFixed(1)}년`;
}

function getSelfSufficiencyClass(percent: number): string {
  if (percent >= 70) return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  if (percent >= 40) return "border-amber-300/40 bg-amber-300/10 text-amber-100";
  return "border-sky-400/40 bg-sky-400/10 text-sky-100";
}

function MetricCard({
  label,
  value,
  detail,
  accentClass,
  icon: Icon,
}: MetricCardProps) {
  return (
    <article className={`border p-4 ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-75">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-current">{value}</p>
          <p className="mt-2 text-xs leading-5 opacity-70">{detail}</p>
        </div>
        <Icon className="h-5 w-5 shrink-0 opacity-75" aria-hidden />
      </div>
    </article>
  );
}

export function RE100Simulator() {
  const [coverage, setCoverage] = useState(50);
  const [baseline, setBaseline] = useState<CampusBaseline | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    Promise.all([loadGyeongsanBuildings(), getBuildingAnnualUsage()])
      .then(([buildings, annualUsageByBuilding]) => {
        if (disposed) return;

        const annualUsageKwh = Object.values(annualUsageByBuilding).reduce(
          (total, value) => total + value,
          0,
        );
        const buildingAreaM2 = buildings.reduce(
          (total, building) => total + (building.bArea_m2 ?? 0),
          0,
        );

        setBaseline({
          annualUsageKwh,
          roofAreaM2: buildingAreaM2 * ROOF_COVERAGE_RATIO,
        });
        setErrorMessage(null);
      })
      .catch((error) => {
        if (!disposed) {
          setBaseline(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "캠퍼스 시뮬레이터 데이터를 불러오지 못했습니다.",
          );
        }
      });

    return () => {
      disposed = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const annualUsageKwh = baseline?.annualUsageKwh ?? 0;
    const roofAreaM2 = baseline?.roofAreaM2 ?? 0;
    const installedAreaM2 = roofAreaM2 * (coverage / 100);
    const annualGenerationKwh = installedAreaM2 * SOLAR_PANEL_KWH_PER_M2_YEAR;
    const selfSufficiencyPercent =
      annualUsageKwh > 0 ? (annualGenerationKwh / annualUsageKwh) * 100 : 0;
    const co2ReductionKg = annualGenerationKwh * CO2_FACTOR;
    const annualSavingsKrw = annualGenerationKwh * ELECTRICITY_RATE_KRW;
    const estimatedInstallCostKrw = installedAreaM2 * SOLAR_INSTALL_COST_KRW_PER_M2;
    const paybackYears =
      annualSavingsKrw > 0 ? estimatedInstallCostKrw / annualSavingsKrw : Number.POSITIVE_INFINITY;

    return {
      annualUsageKwh,
      installedAreaM2,
      annualGenerationKwh,
      selfSufficiencyPercent,
      co2ReductionKg,
      annualSavingsKrw,
      paybackYears,
    };
  }, [baseline, coverage]);

  const handleCoverageChange = (value: string) => {
    setCoverage(Number(value));
  };

  return (
    <section className="h-full min-h-0 overflow-y-auto px-5 py-5 text-slate-100">
      <div className="space-y-5">
        <header className="border border-slate-800 bg-slate-900/55 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Campus RE100 Simulator
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">
                옥상 태양광 설치 시나리오
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                캠퍼스 전체 옥상의 {coverage}%에 태양광을 설치했을 때의 연간 효과입니다.
              </p>
            </div>
            <SolarPanel className="h-6 w-6 shrink-0 text-amber-300" aria-hidden />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="coverage-slider" className="text-sm font-medium text-slate-200">
                설치 비율
              </label>
              <span className="text-2xl font-semibold text-amber-300">{coverage}%</span>
            </div>
            <input
              id="coverage-slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={coverage}
              onChange={(event) => handleCoverageChange(event.currentTarget.value)}
              onInput={(event) => handleCoverageChange(event.currentTarget.value)}
              className="mt-3 h-2 w-full cursor-pointer accent-amber-300"
              aria-valuetext={`${coverage}%`}
            />
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-3">
          <MetricCard
            label="자급률"
            value={formatPercent(metrics.selfSufficiencyPercent)}
            detail={`연간 발전량 ${formatNumber(metrics.annualGenerationKwh)} kWh`}
            accentClass={getSelfSufficiencyClass(metrics.selfSufficiencyPercent)}
            icon={BatteryCharging}
          />
          <MetricCard
            label="연간 CO2 저감"
            value={formatTons(metrics.co2ReductionKg)}
            detail={`배출계수 ${CO2_FACTOR} kgCO2/kWh 기준`}
            accentClass="border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
            icon={Leaf}
          />
          <MetricCard
            label="연간 비용 절감"
            value={formatEok(metrics.annualSavingsKrw)}
            detail={`${ELECTRICITY_RATE_KRW.toLocaleString("ko-KR")}원/kWh 기준`}
            accentClass="border-sky-400/30 bg-sky-400/10 text-sky-100"
            icon={Banknote}
          />
          <MetricCard
            label="예상 회수 기간"
            value={formatYears(metrics.paybackYears)}
            detail={`설치 면적 ${formatNumber(metrics.installedAreaM2)} m² 기준`}
            accentClass="border-violet-300/30 bg-violet-300/10 text-violet-100"
            icon={CloudSun}
          />
        </div>

        <footer className="border border-slate-800 bg-slate-900/45 p-4 text-xs leading-5 text-slate-500">
          연간 사용량 {formatNumber(metrics.annualUsageKwh)} kWh, 옥상 적용률{" "}
          {ROOF_COVERAGE_RATIO * 100}%, 단위 발전량 {SOLAR_PANEL_KWH_PER_M2_YEAR} kWh/m²·년,
          설치비 {SOLAR_INSTALL_COST_KRW_PER_M2.toLocaleString("ko-KR")}원/m² 기준
        </footer>
      </div>
    </section>
  );
}
