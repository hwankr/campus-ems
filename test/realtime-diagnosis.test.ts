import assert from "node:assert/strict";
import test from "node:test";

import {
  filterRealtimeDiagnosisRows,
  getRealtimeSeverity,
  getRealtimeSeverityLabel,
  sortRealtimeDiagnosisRows,
} from "../lib/realtime-diagnosis";
import type { RealtimeDiagnosisRow } from "../types/realtime";

function row(overrides: Partial<RealtimeDiagnosisRow>): RealtimeDiagnosisRow {
  return {
    bNo: "A01",
    bName: "천마지문",
    district: "A구역",
    bUse: "정문",
    timestamp: "2026-04-30T14:00:00+09:00",
    currentKwh: 10,
    expectedKwh: 10,
    deltaKwh: 0,
    deltaPct: 0,
    demandKw: 10,
    severity: "normal",
    quality: "normal",
    sampleCount: 12,
    similarSamples: [],
    ...overrides,
  };
}

test("getRealtimeSeverity applies the Phase110 thresholds", () => {
  assert.equal(getRealtimeSeverity(25), "critical");
  assert.equal(getRealtimeSeverity(12), "high");
  assert.equal(getRealtimeSeverity(11.9), "normal");
  assert.equal(getRealtimeSeverity(-15), "low");
});

test("getRealtimeSeverityLabel returns facility-facing Korean labels", () => {
  assert.equal(getRealtimeSeverityLabel("critical"), "점검 필요");
  assert.equal(getRealtimeSeverityLabel("high"), "높음");
  assert.equal(getRealtimeSeverityLabel("normal"), "정상");
  assert.equal(getRealtimeSeverityLabel("low"), "낮음");
});

test("sortRealtimeDiagnosisRows prioritizes critical and high deltas first", () => {
  const sorted = sortRealtimeDiagnosisRows([
    row({ bNo: "N", severity: "normal", deltaPct: 2 }),
    row({ bNo: "H", severity: "high", deltaPct: 13 }),
    row({ bNo: "C", severity: "critical", deltaPct: 28 }),
    row({ bNo: "L", severity: "low", deltaPct: -20 }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.bNo),
    ["C", "H", "N", "L"],
  );
});

test("filterRealtimeDiagnosisRows matches search fields and status", () => {
  const rows = [
    row({ bNo: "A01", bName: "본부", district: "A구역", bUse: "행정", severity: "normal" }),
    row({ bNo: "B04", bName: "중앙도서관", district: "B구역", bUse: "도서관", severity: "high" }),
    row({ bNo: "G14", bName: "중앙기기센터", district: "G구역", bUse: "연구실", severity: "critical" }),
  ];

  assert.deepEqual(
    filterRealtimeDiagnosisRows(rows, "중앙", "all").map((item) => item.bNo),
    ["G14", "B04"],
  );
  assert.deepEqual(
    filterRealtimeDiagnosisRows(rows, "중앙", "high").map((item) => item.bNo),
    ["B04"],
  );
  assert.deepEqual(
    filterRealtimeDiagnosisRows(rows, "행정", "critical").map((item) => item.bNo),
    [],
  );
});
