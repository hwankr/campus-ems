import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBuildingInsightEvidence,
  getBuildingInsightPriority,
} from "../lib/ai/building-insight-evidence";
import { buildCampusRe100Context } from "../lib/ai/re100-context";
import {
  CO2_FACTOR,
  ELECTRICITY_RATE_KRW,
  ROOF_COVERAGE_RATIO,
  SOLAR_INSTALL_COST_KRW_PER_M2,
  SOLAR_PANEL_KWH_PER_M2_YEAR,
} from "../lib/constants";
import {
  ANNUAL_KWH_PER_SQUARE_METER,
  CO2_KG_PER_KWH,
  ELECTRICITY_RATE_KRW as RE100_ELECTRICITY_RATE_KRW,
  INSTALLABLE_ROOF_RATIO,
  INSTALL_COST_KRW_PER_M2,
  calculateAnnualSolarKwh,
  calculatePaybackYears,
} from "../lib/solar-calculations";
import type { BuildingProperties, MonthlyElectricity } from "../types/building";

const buildings: BuildingProperties[] = [
  {
    bNo: "A01",
    bName: "고사용량관",
    bUse: "강의실",
    district: "A구역",
    floor_count: 5,
    bArea_m2: 1000,
    bTotalFloorArea_m2: 3000,
    polygon_source: "name_exact",
  },
  {
    bNo: "A02",
    bName: "대형옥상관",
    bUse: "연구실",
    district: "A구역",
    floor_count: 3,
    bArea_m2: 3000,
    bTotalFloorArea_m2: 6000,
    polygon_source: "name_exact",
  },
];

const electricityRows: MonthlyElectricity[] = [
  { bNo: "A01", year_month: "2024-01", kwh: 100, cost_krw: 0, co2_kg: 0 },
  { bNo: "A02", year_month: "2024-01", kwh: 50, cost_krw: 0, co2_kg: 0 },
];

test("calculateAnnualSolarKwh applies installable roof area and generation constant", () => {
  assert.equal(
    calculateAnnualSolarKwh(1000),
    1000 * INSTALLABLE_ROOF_RATIO * ANNUAL_KWH_PER_SQUARE_METER,
  );
});

test("calculatePaybackYears returns null when annual savings are unavailable", () => {
  assert.equal(calculatePaybackYears(1000, 0), null);
});

test("shared UI constants mirror Phase 90 RE100 calculation constants", () => {
  assert.equal(ROOF_COVERAGE_RATIO, INSTALLABLE_ROOF_RATIO);
  assert.equal(SOLAR_PANEL_KWH_PER_M2_YEAR, ANNUAL_KWH_PER_SQUARE_METER);
  assert.equal(CO2_FACTOR, CO2_KG_PER_KWH);
  assert.equal(ELECTRICITY_RATE_KRW, RE100_ELECTRICITY_RATE_KRW);
  assert.equal(SOLAR_INSTALL_COST_KRW_PER_M2, INSTALL_COST_KRW_PER_M2);
});

test("buildCampusRe100Context precomputes display values and sorted scores", () => {
  const context = buildCampusRe100Context(buildings, electricityRows);

  assert.equal(context.campus.buildingCount, 2);
  assert.equal(context.campus.display.annualUsage, "150kWh");
  assert.equal(context.buildings.length, 2);
  assert.ok(context.buildings[0].score >= context.buildings[1].score);
  assert.match(context.buildings[0].display.installCost, /억원|만원/);
  assert.match(context.buildings[0].display.paybackYears, /년/);
});

test("building insight evidence is deterministic app-calculated data", () => {
  const context = buildCampusRe100Context(buildings, electricityRows);
  const evidence = buildBuildingInsightEvidence(context.buildings[0]);

  assert.deepEqual(
    evidence.map((item) => item.label),
    ["연간 사용량", "태양광 잠재량", "전력 자립률"],
  );
  assert.equal(evidence[0].value, context.buildings[0].display.annualUsage);
  assert.equal(evidence[1].value, context.buildings[0].display.annualSolarPotential);
  assert.equal(evidence[2].value, context.buildings[0].display.selfSufficiencyRate);
  assert.equal(getBuildingInsightPriority(1), "상");
  assert.equal(getBuildingInsightPriority(8), "중");
  assert.equal(getBuildingInsightPriority(13), "하");
});
