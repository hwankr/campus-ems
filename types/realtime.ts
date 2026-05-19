export type RealtimeSeverity = "critical" | "high" | "normal" | "low";

export interface RealtimeWeather {
  timestamp: string;
  temperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  windSpeedMs?: number;
  windDirectionDeg?: number;
  solarRadiationWm2?: number;
  cloudCoverPct?: number;
  weatherType: string;
  source: string;
}

export interface RealtimeSimilarSample {
  timestamp: string;
  kwh: number;
  temperatureC: number;
  humidityPct: number;
  precipitationMm: number;
}

export interface RealtimeDiagnosisRow {
  bNo: string;
  bName: string;
  district: string;
  bUse: string;
  timestamp: string;
  currentKwh: number;
  expectedKwh: number;
  deltaKwh: number;
  deltaPct: number;
  demandKw: number;
  severity: RealtimeSeverity;
  quality: string;
  sampleCount: number;
  similarSamples: RealtimeSimilarSample[];
  predictedKwh?: number;
  expectedLowKwh?: number;
  expectedHighKwh?: number;
  anomalyReason?: string;
}

export interface RealtimeCampusSummary {
  buildingCount: number;
  currentKwh: number;
  expectedKwh: number;
  deltaKwh: number;
  deltaPct: number;
  severity: RealtimeSeverity;
  criticalCount: number;
  highCount: number;
  normalCount: number;
  lowCount: number;
  outOfRangeCount?: number;
}

export interface RealtimeDiagnosisMetadata {
  datasetId: string;
  synthetic: boolean;
  prototype: boolean;
  generatedFrom: string;
  generatedAt: string;
  timestamp: string;
  timezone: string;
  intervalMinutes: number;
  disclaimerKo: string;
  playbackIntervalLabel?: string;
  frameCount?: number;
  scenarioCount?: number;
  defaultScenarioId?: string;
  kmaReplacementReady?: boolean;
  sourceMetadata?: Record<string, unknown>;
}

export interface RealtimeDiagnosisDataset {
  metadata: RealtimeDiagnosisMetadata;
  weather: RealtimeWeather;
  campus: RealtimeCampusSummary;
  rows: RealtimeDiagnosisRow[];
}

export interface RealtimePlaybackFrame extends RealtimeDiagnosisDataset {
  frameId: string;
  timestamp: string;
  scenarioId: string;
  scenarioLabel: string;
  label: string;
  season: string;
  timeOfDay: string;
}

export interface RealtimePlaybackDataset {
  metadata: RealtimeDiagnosisMetadata;
  frames: RealtimePlaybackFrame[];
}
