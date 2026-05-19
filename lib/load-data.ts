import { createAnnualUsageMap } from "@/lib/electricity-calculations";
import { loadMonthlyElectricity } from "@/lib/load-electricity";

export async function getBuildingAnnualUsage(): Promise<Record<string, number>> {
  const rows = await loadMonthlyElectricity();
  return Object.fromEntries(createAnnualUsageMap(rows));
}
