import {
  createAnnualUsageMap,
  toMonthlyUsageChartRows,
  type MonthlyUsageChartRow,
} from "@/lib/electricity-calculations";
import type { MonthlyElectricity } from "@/types/building";

const MONTHLY_ELECTRICITY_PATH = "/data/monthly_electricity.json";

let monthlyElectricityPromise: Promise<MonthlyElectricity[]> | null = null;

export async function loadMonthlyElectricity(): Promise<MonthlyElectricity[]> {
  monthlyElectricityPromise ??= fetch(MONTHLY_ELECTRICITY_PATH).then(
    (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load ${MONTHLY_ELECTRICITY_PATH}: ${response.status} ${response.statusText}`,
        );
      }

      return response.json() as Promise<MonthlyElectricity[]>;
    },
  );

  return monthlyElectricityPromise;
}

export async function getBuildingAnnualUsage(): Promise<Map<string, number>> {
  const rows = await loadMonthlyElectricity();
  return createAnnualUsageMap(rows);
}

export async function getBuildingElectricity(
  bNo: string,
): Promise<MonthlyUsageChartRow[]> {
  const rows = await loadMonthlyElectricity();
  return toMonthlyUsageChartRows(rows, bNo, 36);
}

export async function getCampusTotal(year_month: string): Promise<number> {
  const rows = await loadMonthlyElectricity();

  return rows
    .filter((row) => row.year_month === year_month)
    .reduce((total, row) => total + row.kwh, 0);
}
