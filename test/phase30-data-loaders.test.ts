import assert from "node:assert/strict";
import test from "node:test";

import {
  createAnnualUsageMap,
  getRecentYearMonths,
  toMonthlyUsageChartRows,
} from "../lib/electricity-calculations";
import type { MonthlyElectricity } from "../types/building";

const rows: MonthlyElectricity[] = [
  { bNo: "A01", year_month: "2024-01", kwh: 10, cost_krw: 1430, co2_kg: 4.567 },
  { bNo: "A02", year_month: "2024-01", kwh: 20, cost_krw: 2860, co2_kg: 9.134 },
  { bNo: "A01", year_month: "2024-02", kwh: 30, cost_krw: 4290, co2_kg: 13.701 },
  { bNo: "A02", year_month: "2024-02", kwh: 40, cost_krw: 5720, co2_kg: 18.268 },
  { bNo: "A01", year_month: "2024-03", kwh: 50, cost_krw: 7150, co2_kg: 22.835 },
  { bNo: "A02", year_month: "2024-03", kwh: 60, cost_krw: 8580, co2_kg: 27.402 },
];

test("getRecentYearMonths returns latest distinct months in ascending order", () => {
  assert.deepEqual(getRecentYearMonths(rows, 2), ["2024-02", "2024-03"]);
});

test("createAnnualUsageMap sums usage over the latest selected months by building", () => {
  assert.deepEqual(Object.fromEntries(createAnnualUsageMap(rows, 2)), {
    A01: 80,
    A02: 100,
  });
});

test("toMonthlyUsageChartRows returns a building time series for latest selected months", () => {
  assert.deepEqual(toMonthlyUsageChartRows(rows, "A01", 2), [
    { year_month: "2024-02", kwh: 30, cost_krw: 4290, co2_kg: 13.701 },
    { year_month: "2024-03", kwh: 50, cost_krw: 7150, co2_kg: 22.835 },
  ]);
});
