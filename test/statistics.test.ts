import assert from "node:assert/strict";
import test from "node:test";

import {
  createBuildingStatisticsRows,
  sortStatisticsRows,
} from "../lib/statistics";
import type { BuildingProperties, MonthlyElectricity } from "../types/building";

const baseBuilding: BuildingProperties = {
  bNo: "BASE",
  bName: "Base",
  bUse: "Education",
  district: "A",
  bArea_m2: 100,
  bTotalFloorArea_m2: 1000,
  floor_count: 1,
  polygon_source: "name_exact",
};

function building(
  overrides: Partial<BuildingProperties>,
): BuildingProperties {
  return { ...baseBuilding, ...overrides };
}

function electricity(
  bNo: string,
  year_month: string,
  kwh: number,
): MonthlyElectricity {
  return {
    bNo,
    year_month,
    kwh,
    cost_krw: kwh * 150,
    co2_kg: kwh * 0.424,
  };
}

test("createBuildingStatisticsRows aggregates each building over the latest 12 months", () => {
  const rows = createBuildingStatisticsRows(
    [
      building({ bNo: "A", bName: "A Hall", bArea_m2: 100 }),
      building({ bNo: "B", bName: "B Hall", bArea_m2: 50 }),
    ],
    [
      electricity("A", "2024-01", 999),
      ...Array.from({ length: 12 }, (_, index) =>
        electricity("A", `2024-${String(index + 2).padStart(2, "0")}`, 10),
      ),
      ...Array.from({ length: 12 }, (_, index) =>
        electricity("B", `2024-${String(index + 2).padStart(2, "0")}`, 5),
      ),
    ],
  );

  const a = rows.find((row) => row.bNo === "A");
  const b = rows.find((row) => row.bNo === "B");

  assert.equal(a?.annualUsageKwh, 120);
  assert.equal(a?.annualCostKrw, 18000);
  assert.equal(a?.annualCo2Kg, 50.88);
  assert.equal(a?.annualSolarPotentialKwh, 9000);
  assert.equal(b?.annualUsageKwh, 60);
});

test("createBuildingStatisticsRows returns null payback when solar savings cannot be calculated", () => {
  const [row] = createBuildingStatisticsRows(
    [building({ bNo: "NO_ROOF", bArea_m2: 0 })],
    [electricity("NO_ROOF", "2024-12", 100)],
  );

  assert.equal(row.annualSolarPotentialKwh, 0);
  assert.equal(row.annualSavingsKrw, 0);
  assert.equal(row.installCostKrw, 0);
  assert.equal(row.paybackYears, null);
});

test("sortStatisticsRows orders investment rows by high usage and high solar potential", () => {
  const rows = createBuildingStatisticsRows(
    [
      building({ bNo: "BALANCED", bName: "Balanced", bArea_m2: 100 }),
      building({ bNo: "USAGE_ONLY", bName: "Usage Only", bArea_m2: 10 }),
      building({ bNo: "SOLAR_ONLY", bName: "Solar Only", bArea_m2: 200 }),
    ],
    [
      electricity("BALANCED", "2024-12", 1000),
      electricity("USAGE_ONLY", "2024-12", 2000),
      electricity("SOLAR_ONLY", "2024-12", 100),
    ],
  );

  const sorted = sortStatisticsRows(rows, "investment");

  assert.equal(sorted[0].bNo, "BALANCED");
  assert.ok(sorted[0].investmentScore > sorted[1].investmentScore);
});
