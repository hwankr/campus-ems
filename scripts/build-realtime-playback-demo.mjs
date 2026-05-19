import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const OUTPUT_PATH = path.join(process.cwd(), "public/data/realtime-playback-demo.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

if (!fs.existsSync(OUTPUT_PATH)) {
  throw new Error(
    "Missing public/data/realtime-playback-demo.json. Run the full hourly playback generator in the source data workspace first.",
  );
}

const data = readJson(OUTPUT_PATH);

if (!data.metadata?.synthetic || !Array.isArray(data.frames) || data.frames.length === 0) {
  throw new Error(`${OUTPUT_PATH} is not a valid realtime playback artifact.`);
}

const scenarioIds = new Set(data.frames.map((frame) => frame.scenarioId));
const rowsMissingPredictionRange = data.frames.some((frame) =>
  frame.rows.some(
    (row) =>
      typeof row.expectedLowKwh !== "number" ||
      typeof row.expectedHighKwh !== "number" ||
      typeof row.anomalyReason !== "string",
  ),
);

if (rowsMissingPredictionRange) {
  throw new Error(`${OUTPUT_PATH} is missing prediction range fields on one or more rows.`);
}

console.log(
  `Validated realtime playback artifact: ${data.frames.length} frames, ${scenarioIds.size} scenarios.`,
);
