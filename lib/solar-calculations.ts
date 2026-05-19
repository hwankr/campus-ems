export const INSTALLABLE_ROOF_RATIO = 0.6;
export const ANNUAL_KWH_PER_SQUARE_METER = 150;
export const CO2_KG_PER_KWH = 0.424;
export const ELECTRICITY_RATE_KRW = 150;
export const INSTALL_COST_KRW_PER_M2 = 700000;

export function calculateAnnualSolarKwh(buildingAreaM2: number): number {
  if (!Number.isFinite(buildingAreaM2) || buildingAreaM2 <= 0) return 0;
  return buildingAreaM2 * INSTALLABLE_ROOF_RATIO * ANNUAL_KWH_PER_SQUARE_METER;
}

export function calculateSelfSufficiencyRate(
  annualSolarKwh: number,
  annualUsageKwh: number,
): number {
  if (!Number.isFinite(annualUsageKwh) || annualUsageKwh <= 0) return 0;
  return (annualSolarKwh / annualUsageKwh) * 100;
}

export function calculateCo2ReductionKg(annualSolarKwh: number): number {
  if (!Number.isFinite(annualSolarKwh) || annualSolarKwh <= 0) return 0;
  return annualSolarKwh * CO2_KG_PER_KWH;
}

export function calculateAnnualSavingsKrw(annualSolarKwh: number): number {
  if (!Number.isFinite(annualSolarKwh) || annualSolarKwh <= 0) return 0;
  return annualSolarKwh * ELECTRICITY_RATE_KRW;
}

export function calculateInstallCostKrw(buildingAreaM2: number): number {
  if (!Number.isFinite(buildingAreaM2) || buildingAreaM2 <= 0) return 0;
  return buildingAreaM2 * INSTALLABLE_ROOF_RATIO * INSTALL_COST_KRW_PER_M2;
}

export function calculatePaybackYears(
  installCostKrw: number,
  annualSavingsKrw: number,
): number | null {
  if (!Number.isFinite(annualSavingsKrw) || annualSavingsKrw <= 0) return null;
  if (!Number.isFinite(installCostKrw) || installCostKrw <= 0) return null;
  return installCostKrw / annualSavingsKrw;
}
