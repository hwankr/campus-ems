import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type PolygonSource =
  | "name_exact"
  | "name_partial"
  | "spatial"
  | "fallback_square";

export interface BuildingProperties {
  bNo: string;
  bName: string;
  bUse: string;
  district: string;
  bDate?: string;
  bArea_m2: number | null;
  bTotalFloorArea_m2: number | null;
  floor_count: number;
  annual_kwh?: number;
  diagnosis_severity?: string;
  current_kwh?: number;
  expected_kwh?: number;
  delta_pct?: number;
  polygon_source: PolygonSource;
  centerLat?: number;
  centerLng?: number;
  osm_id?: number;
  osm_area_m2?: number;
}

export interface MonthlyElectricity {
  bNo: string;
  year_month: string;
  kwh: number;
  cost_krw: number;
  co2_kg: number;
}

export type CampusBuildingFeature = Feature<Polygon | MultiPolygon, BuildingProperties>;

export type CampusBuildingFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  BuildingProperties
>;
