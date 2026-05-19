import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const TARGET_TIMESTAMP = "2026-04-30T14:00:00+09:00";
const OUTPUT_PATH = path.join(process.cwd(), "public/data/realtime-diagnosis-demo.json");
const LOCAL_SOURCE_DIR = path.join(
  process.cwd(),
  "campus_re100_hourly_demo/campus_re100_hourly_demo/public/data",
);
const LEGACY_SOURCE_DIR = path.join(
  process.cwd(),
  "../projects/campus-re100/campus_re100_hourly_demo/campus_re100_hourly_demo/public/data",
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getSeverity(deltaPct) {
  if (deltaPct >= 25) return "critical";
  if (deltaPct >= 12) return "high";
  if (deltaPct <= -15) return "low";
  return "normal";
}

function resolveSourceDir() {
  const candidates = [
    process.env.REALTIME_DEMO_SOURCE_DIR,
    LOCAL_SOURCE_DIR,
    LEGACY_SOURCE_DIR,
  ].filter(Boolean);

  return candidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "hourly-electricity/index.json")) &&
    fs.existsSync(path.join(candidate, "weather-hourly/index.json")),
  );
}

function validateExistingOutput() {
  if (!fs.existsSync(OUTPUT_PATH)) {
    throw new Error(
      `Missing source demo folder and ${OUTPUT_PATH}. Put campus_re100_hourly_demo/campus_re100_hourly_demo/public/data under the project root or set REALTIME_DEMO_SOURCE_DIR.`,
    );
  }

  const data = readJson(OUTPUT_PATH);
  if (!data.metadata?.synthetic || !Array.isArray(data.rows) || data.rows.length === 0) {
    throw new Error(`${OUTPUT_PATH} is not a valid realtime diagnosis artifact.`);
  }

  console.log(
    `Validated existing realtime diagnosis artifact: ${data.rows.length} buildings at ${data.metadata.timestamp}`,
  );
}

function getHour(timestamp) {
  return Number(timestamp.slice(11, 13));
}

function isWeekend(timestamp) {
  const date = new Date(timestamp);
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isRainy(weather) {
  return (weather?.precipitationMm ?? 0) > 0;
}

function getSimilarityScore(row, targetWeather, targetTimestamp) {
  const weather = row.weather;
  const hourScore = Math.abs(getHour(row.timestamp) - getHour(targetTimestamp)) * 6;
  const tempScore = Math.abs((weather?.temperatureC ?? 0) - targetWeather.temperatureC) * 2;
  const humidityScore = Math.abs((weather?.humidityPct ?? 0) - targetWeather.humidityPct) * 0.4;
  const rainScore = isRainy(weather) === isRainy(targetWeather) ? 0 : 24;
  const weekendScore = isWeekend(row.timestamp) === isWeekend(targetTimestamp) ? 0 : 18;

  return hourScore + tempScore + humidityScore + rainScore + weekendScore;
}

function isSimilar(row, targetWeather, targetTimestamp) {
  const weather = row.weather;
  if (!weather) return false;
  if (Math.abs(getHour(row.timestamp) - getHour(targetTimestamp)) > 1) return false;
  if (isWeekend(row.timestamp) !== isWeekend(targetTimestamp)) return false;
  if (isRainy(weather) !== isRainy(targetWeather)) return false;
  if (Math.abs(weather.temperatureC - targetWeather.temperatureC) > 4) return false;
  if (Math.abs(weather.humidityPct - targetWeather.humidityPct) > 15) return false;
  return true;
}

function createCampusSummary(rows) {
  const currentKwh = round(rows.reduce((sum, row) => sum + row.currentKwh, 0));
  const expectedKwh = round(rows.reduce((sum, row) => sum + row.expectedKwh, 0));
  const deltaKwh = round(currentKwh - expectedKwh);
  const deltaPct = expectedKwh > 0 ? round((deltaKwh / expectedKwh) * 100) : 0;

  return {
    buildingCount: rows.length,
    currentKwh,
    expectedKwh,
    deltaKwh,
    deltaPct,
    severity: getSeverity(deltaPct),
    criticalCount: rows.filter((row) => row.severity === "critical").length,
    highCount: rows.filter((row) => row.severity === "high").length,
    normalCount: rows.filter((row) => row.severity === "normal").length,
    lowCount: rows.filter((row) => row.severity === "low").length,
  };
}

function buildDataset(sourceDir) {
  const electricityIndex = readJson(path.join(sourceDir, "hourly-electricity/index.json"));
  const weatherIndex = readJson(path.join(sourceDir, "weather-hourly/index.json"));
  const sourceMetadataPath = path.join(sourceDir, "hourly_generation_metadata.json");
  const sourceMetadata = fs.existsSync(sourceMetadataPath) ? readJson(sourceMetadataPath) : {};
  const months = electricityIndex.summary?.months ?? electricityIndex.files.map((file) => file.yearMonth);
  const weatherByTimestamp = new Map();

  for (const file of weatherIndex.files) {
    const weatherMonth = readJson(path.join(sourceDir, "weather-hourly", `${file.yearMonth}.json`));
    for (const row of weatherMonth.rows) {
      weatherByTimestamp.set(row.timestamp, row);
    }
  }

  const targetWeather = weatherByTimestamp.get(TARGET_TIMESTAMP);
  if (!targetWeather) {
    throw new Error(`Target weather row not found: ${TARGET_TIMESTAMP}`);
  }

  const byBuilding = new Map();
  const targetRows = new Map();

  for (const yearMonth of months) {
    const monthData = readJson(path.join(sourceDir, "hourly-electricity", `${yearMonth}.json`));
    for (const row of monthData.rows) {
      const weather = weatherByTimestamp.get(row.weatherKey ?? row.timestamp);
      const item = {
        ...row,
        weather,
      };

      if (row.timestamp === TARGET_TIMESTAMP) {
        targetRows.set(row.bNo, item);
        continue;
      }

      const bucket = byBuilding.get(row.bNo) ?? [];
      bucket.push(item);
      byBuilding.set(row.bNo, bucket);
    }
  }

  const rows = [...targetRows.values()].map((target) => {
    const historicalRows = byBuilding.get(target.bNo) ?? [];
    let samples = historicalRows.filter((row) => isSimilar(row, targetWeather, TARGET_TIMESTAMP));

    if (samples.length < 8) {
      samples = historicalRows.filter(
        (row) =>
          getHour(row.timestamp) === getHour(TARGET_TIMESTAMP) &&
          isWeekend(row.timestamp) === isWeekend(TARGET_TIMESTAMP),
      );
    }

    if (samples.length === 0) {
      samples = historicalRows;
    }

    const scoredSamples = samples
      .map((row) => ({ row, score: getSimilarityScore(row, targetWeather, TARGET_TIMESTAMP) }))
      .sort((a, b) => a.score - b.score);
    const expectedKwh = scoredSamples.length
      ? scoredSamples.reduce((sum, item) => sum + item.row.kwh, 0) / scoredSamples.length
      : target.kwh;
    const currentKwh = round(target.kwh);
    const roundedExpected = round(expectedKwh);
    const deltaKwh = round(currentKwh - roundedExpected);
    const deltaPct = roundedExpected > 0 ? round((deltaKwh / roundedExpected) * 100) : 0;

    return {
      bNo: target.bNo,
      bName: target.bName,
      district: target.district,
      bUse: target.bUse,
      timestamp: TARGET_TIMESTAMP,
      currentKwh,
      expectedKwh: roundedExpected,
      deltaKwh,
      deltaPct,
      demandKw: round(target.demandKw),
      severity: getSeverity(deltaPct),
      quality: target.quality,
      sampleCount: scoredSamples.length,
      similarSamples: scoredSamples.slice(0, 3).map(({ row }) => ({
        timestamp: row.timestamp,
        kwh: round(row.kwh),
        temperatureC: row.weather?.temperatureC ?? 0,
        humidityPct: row.weather?.humidityPct ?? 0,
        precipitationMm: row.weather?.precipitationMm ?? 0,
      })),
    };
  });

  rows.sort((a, b) => {
    const order = { critical: 0, high: 1, normal: 2, low: 3 };
    return order[a.severity] - order[b.severity] || b.deltaPct - a.deltaPct;
  });

  return {
    metadata: {
      datasetId: "campus-re100-realtime-diagnosis-demo",
      synthetic: true,
      prototype: true,
      generatedFrom: "campus_re100_hourly_demo",
      generatedAt: electricityIndex.metadata?.generatedAt ?? new Date().toISOString(),
      timestamp: TARGET_TIMESTAMP,
      timezone: "Asia/Seoul",
      intervalMinutes: 60,
      disclaimerKo:
        "실제 계량값이 아니라 월별 총량 보존 시간별 합성 데이터에서 추출한 실시간 진단 데모입니다.",
      sourceMetadata: {
        datasetId: sourceMetadata.metadata?.datasetId ?? electricityIndex.metadata?.datasetId,
        randomSeed: electricityIndex.metadata?.randomSeed,
        method: electricityIndex.metadata?.source,
      },
    },
    weather: targetWeather,
    campus: createCampusSummary(rows),
    rows,
  };
}

const sourceDir = resolveSourceDir();

if (!sourceDir) {
  validateExistingOutput();
  process.exit(0);
}

const dataset = buildDataset(sourceDir);
writeJson(OUTPUT_PATH, dataset);
console.log(
  `Wrote ${OUTPUT_PATH} from ${sourceDir}: ${dataset.rows.length} buildings at ${dataset.metadata.timestamp}`,
);
