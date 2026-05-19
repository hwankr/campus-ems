import { getRecentYearMonths } from "@/lib/electricity-calculations";
import {
  calculateAnnualSavingsKrw,
  calculateAnnualSolarKwh,
  calculateInstallCostKrw,
  calculatePaybackYears,
  calculateSelfSufficiencyRate,
} from "@/lib/solar-calculations";
import type { BuildingProperties, MonthlyElectricity } from "@/types/building";

export type StatisticsSortKey = "usage" | "solar" | "investment";

export interface BuildingStatisticsRow {
  bNo: string;
  bName: string;
  bUse: string;
  district: string;
  buildingAreaM2: number;
  annualUsageKwh: number;
  annualCostKrw: number;
  annualCo2Kg: number;
  annualSolarPotentialKwh: number;
  selfSufficiencyRate: number;
  annualSavingsKrw: number;
  installCostKrw: number;
  paybackYears: number | null;
  investmentScore: number;
}

interface ElectricityAggregate {
  annualUsageKwh: number;
  annualCostKrw: number;
  annualCo2Kg: number;
}

function addAggregate(
  aggregate: ElectricityAggregate,
  row: MonthlyElectricity,
): ElectricityAggregate {
  return {
    annualUsageKwh: aggregate.annualUsageKwh + row.kwh,
    annualCostKrw: aggregate.annualCostKrw + row.cost_krw,
    annualCo2Kg: aggregate.annualCo2Kg + row.co2_kg,
  };
}

function createElectricityAggregateMap(
  rows: MonthlyElectricity[],
  monthCount: number,
): Map<string, ElectricityAggregate> {
  const recentMonths = new Set(getRecentYearMonths(rows, monthCount));
  const byBuilding = new Map<string, ElectricityAggregate>();

  for (const row of rows) {
    if (!recentMonths.has(row.year_month)) continue;

    const current = byBuilding.get(row.bNo) ?? {
      annualUsageKwh: 0,
      annualCostKrw: 0,
      annualCo2Kg: 0,
    };
    byBuilding.set(row.bNo, addAggregate(current, row));
  }

  return byBuilding;
}

function normalize(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, value / max);
}

function harmonicMean(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0;
  return (2 * a * b) / (a + b);
}

function roundTo(value: number, fractionDigits: number): number {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}

function withInvestmentScores(
  rows: Omit<BuildingStatisticsRow, "investmentScore">[],
): BuildingStatisticsRow[] {
  const maxUsage = Math.max(0, ...rows.map((row) => row.annualUsageKwh));
  const maxSolar = Math.max(0, ...rows.map((row) => row.annualSolarPotentialKwh));

  return rows.map((row) => {
    const usageScore = normalize(row.annualUsageKwh, maxUsage);
    const solarScore = normalize(row.annualSolarPotentialKwh, maxSolar);

    return {
      ...row,
      investmentScore: Math.round(harmonicMean(usageScore, solarScore) * 1000) / 10,
    };
  });
}

export function createBuildingStatisticsRows(
  buildings: BuildingProperties[],
  electricityRows: MonthlyElectricity[],
  monthCount = 12,
): BuildingStatisticsRow[] {
  const electricityByBuilding = createElectricityAggregateMap(electricityRows, monthCount);
  const rows = buildings.map((building) => {
    const buildingAreaM2 = building.bArea_m2 ?? 0;
    const electricity = electricityByBuilding.get(building.bNo) ?? {
      annualUsageKwh: 0,
      annualCostKrw: 0,
      annualCo2Kg: 0,
    };
    const annualSolarPotentialKwh = calculateAnnualSolarKwh(buildingAreaM2);
    const annualSavingsKrw = calculateAnnualSavingsKrw(annualSolarPotentialKwh);
    const installCostKrw = calculateInstallCostKrw(buildingAreaM2);

    return {
      bNo: building.bNo,
      bName: building.bName,
      bUse: building.bUse,
      district: building.district,
      buildingAreaM2,
      annualUsageKwh: electricity.annualUsageKwh,
      annualCostKrw: electricity.annualCostKrw,
      annualCo2Kg: roundTo(electricity.annualCo2Kg, 2),
      annualSolarPotentialKwh,
      selfSufficiencyRate: calculateSelfSufficiencyRate(
        annualSolarPotentialKwh,
        electricity.annualUsageKwh,
      ),
      annualSavingsKrw,
      installCostKrw,
      paybackYears: calculatePaybackYears(installCostKrw, annualSavingsKrw),
    };
  });

  return withInvestmentScores(rows);
}

export function sortStatisticsRows(
  rows: BuildingStatisticsRow[],
  sortKey: StatisticsSortKey,
): BuildingStatisticsRow[] {
  return [...rows].sort((a, b) => {
    if (sortKey === "usage") {
      return b.annualUsageKwh - a.annualUsageKwh;
    }

    if (sortKey === "solar") {
      return b.annualSolarPotentialKwh - a.annualSolarPotentialKwh;
    }

    return (
      b.investmentScore - a.investmentScore ||
      b.annualSavingsKrw - a.annualSavingsKrw ||
      b.annualUsageKwh - a.annualUsageKwh
    );
  });
}
