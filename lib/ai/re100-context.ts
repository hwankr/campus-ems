import { createAnnualUsageMap } from "@/lib/electricity-calculations";
import {
  formatCo2Kg,
  formatKrw,
  formatKwh,
  formatPaybackYears,
  formatPercent,
} from "@/lib/korean-unit-format";
import {
  calculateAnnualSavingsKrw,
  calculateAnnualSolarKwh,
  calculateCo2ReductionKg,
  calculateInstallCostKrw,
  calculatePaybackYears,
  calculateSelfSufficiencyRate,
} from "@/lib/solar-calculations";
import type { BuildingProperties, MonthlyElectricity } from "@/types/building";

export interface Re100DisplayValues {
  annualUsage: string;
  annualSolarPotential: string;
  selfSufficiencyRate: string;
  co2Reduction: string;
  annualSavings: string;
  installCost?: string;
  paybackYears?: string;
}

export interface Re100BuildingContext {
  bNo: string;
  bName: string;
  bUse: string;
  district: string;
  annualUsageKwh: number;
  annualSolarPotentialKwh: number;
  selfSufficiencyRate: number;
  co2ReductionKg: number;
  annualSavingsKrw: number;
  installCostKrw: number;
  paybackYears: number | null;
  score: number;
  display: Required<Re100DisplayValues>;
}

export interface CampusRe100Context {
  campus: {
    buildingCount: number;
    annualUsageKwh: number;
    annualSolarPotentialKwh: number;
    selfSufficiencyRate: number;
    co2ReductionKg: number;
    annualSavingsKrw: number;
    display: Re100DisplayValues;
  };
  buildings: Re100BuildingContext[];
}

function normalize(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return value / max;
}

function addScore(buildings: Omit<Re100BuildingContext, "score">[]): Re100BuildingContext[] {
  const maxUsage = Math.max(...buildings.map((building) => building.annualUsageKwh), 0);
  const maxSolar = Math.max(...buildings.map((building) => building.annualSolarPotentialKwh), 0);
  const maxSelfSufficiency = Math.max(
    ...buildings.map((building) => building.selfSufficiencyRate),
    0,
  );

  return buildings
    .map((building) => ({
      ...building,
      score:
        normalize(building.annualUsageKwh, maxUsage) * 0.45 +
        normalize(building.annualSolarPotentialKwh, maxSolar) * 0.35 +
        normalize(building.selfSufficiencyRate, maxSelfSufficiency) * 0.2,
    }))
    .sort((a, b) => b.score - a.score);
}

export function buildCampusRe100Context(
  buildings: BuildingProperties[],
  monthlyElectricity: MonthlyElectricity[],
): CampusRe100Context {
  const annualUsageByBuilding = createAnnualUsageMap(monthlyElectricity, 12);

  const buildingRowsWithoutScore = buildings.map((building) => {
    const buildingAreaM2 = building.bArea_m2 ?? 0;
    const annualUsageKwh = annualUsageByBuilding.get(building.bNo) ?? 0;
    const annualSolarPotentialKwh = calculateAnnualSolarKwh(buildingAreaM2);
    const selfSufficiencyRate = calculateSelfSufficiencyRate(
      annualSolarPotentialKwh,
      annualUsageKwh,
    );
    const co2ReductionKg = calculateCo2ReductionKg(annualSolarPotentialKwh);
    const annualSavingsKrw = calculateAnnualSavingsKrw(annualSolarPotentialKwh);
    const installCostKrw = calculateInstallCostKrw(buildingAreaM2);
    const paybackYears = calculatePaybackYears(installCostKrw, annualSavingsKrw);

    return {
      bNo: building.bNo,
      bName: building.bName || building.bNo,
      bUse: building.bUse || "용도 미분류",
      district: building.district || "구역 미분류",
      annualUsageKwh,
      annualSolarPotentialKwh,
      selfSufficiencyRate,
      co2ReductionKg,
      annualSavingsKrw,
      installCostKrw,
      paybackYears,
      display: {
        annualUsage: formatKwh(annualUsageKwh),
        annualSolarPotential: formatKwh(annualSolarPotentialKwh),
        selfSufficiencyRate: formatPercent(selfSufficiencyRate),
        co2Reduction: formatCo2Kg(co2ReductionKg),
        annualSavings: formatKrw(annualSavingsKrw),
        installCost: formatKrw(installCostKrw),
        paybackYears: formatPaybackYears(paybackYears),
      },
    };
  });

  const buildingRows = addScore(buildingRowsWithoutScore);
  const campusAnnualUsageKwh = buildingRows.reduce(
    (total, building) => total + building.annualUsageKwh,
    0,
  );
  const campusAnnualSolarPotentialKwh = buildingRows.reduce(
    (total, building) => total + building.annualSolarPotentialKwh,
    0,
  );
  const campusCo2ReductionKg = calculateCo2ReductionKg(campusAnnualSolarPotentialKwh);
  const campusAnnualSavingsKrw = calculateAnnualSavingsKrw(campusAnnualSolarPotentialKwh);
  const campusSelfSufficiencyRate = calculateSelfSufficiencyRate(
    campusAnnualSolarPotentialKwh,
    campusAnnualUsageKwh,
  );

  return {
    campus: {
      buildingCount: buildingRows.length,
      annualUsageKwh: campusAnnualUsageKwh,
      annualSolarPotentialKwh: campusAnnualSolarPotentialKwh,
      selfSufficiencyRate: campusSelfSufficiencyRate,
      co2ReductionKg: campusCo2ReductionKg,
      annualSavingsKrw: campusAnnualSavingsKrw,
      display: {
        annualUsage: formatKwh(campusAnnualUsageKwh),
        annualSolarPotential: formatKwh(campusAnnualSolarPotentialKwh),
        selfSufficiencyRate: formatPercent(campusSelfSufficiencyRate),
        co2Reduction: formatCo2Kg(campusCo2ReductionKg),
        annualSavings: formatKrw(campusAnnualSavingsKrw),
      },
    },
    buildings: buildingRows,
  };
}
