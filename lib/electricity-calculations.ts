import type { MonthlyElectricity } from "@/types/building";

export interface MonthlyUsageChartRow {
  year_month: string;
  kwh: number;
  cost_krw: number;
  co2_kg: number;
}

export function getRecentYearMonths(
  rows: MonthlyElectricity[],
  monthCount = 12,
): string[] {
  return Array.from(new Set(rows.map((row) => row.year_month)))
    .sort()
    .slice(-monthCount);
}

export function createAnnualUsageMap(
  rows: MonthlyElectricity[],
  monthCount = 12,
): Map<string, number> {
  const recentMonths = new Set(getRecentYearMonths(rows, monthCount));
  const usageByBuilding = new Map<string, number>();

  for (const row of rows) {
    if (!recentMonths.has(row.year_month)) {
      continue;
    }

    usageByBuilding.set(row.bNo, (usageByBuilding.get(row.bNo) ?? 0) + row.kwh);
  }

  return usageByBuilding;
}

export function toMonthlyUsageChartRows(
  rows: MonthlyElectricity[],
  bNo: string,
  monthCount = 12,
): MonthlyUsageChartRow[] {
  const recentMonths = new Set(getRecentYearMonths(rows, monthCount));

  return rows
    .filter((row) => row.bNo === bNo && recentMonths.has(row.year_month))
    .sort((a, b) => a.year_month.localeCompare(b.year_month))
    .map(({ year_month, kwh, cost_krw, co2_kg }) => ({
      year_month,
      kwh,
      cost_krw,
      co2_kg,
    }));
}
