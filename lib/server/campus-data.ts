import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  BuildingProperties,
  CampusBuildingFeatureCollection,
  MonthlyElectricity,
} from "@/types/building";

interface RawBuilding extends BuildingProperties {
  campus?: string;
}

async function readPublicJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(process.cwd(), "public", "data", fileName);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

export async function loadServerCampusData(): Promise<{
  buildings: BuildingProperties[];
  geojson: CampusBuildingFeatureCollection;
  monthlyElectricity: MonthlyElectricity[];
}> {
  const [rawBuildings, geojson, monthlyElectricity] = await Promise.all([
    readPublicJson<RawBuilding[]>("yu_buildings.json"),
    readPublicJson<CampusBuildingFeatureCollection>("yu_buildings.geojson"),
    readPublicJson<MonthlyElectricity[]>("monthly_electricity.json"),
  ]);

  const visibleBuildingNos = new Set(
    geojson.features.map((feature) => feature.properties.bNo),
  );
  const geojsonProperties = new Map(
    geojson.features.map((feature) => [feature.properties.bNo, feature.properties]),
  );
  const buildingsByNo = new Map(
    rawBuildings
      .filter((building) => building.campus === "경산캠퍼스")
      .map((building) => [building.bNo, building]),
  );

  const buildings = Array.from(visibleBuildingNos)
    .map((bNo) => ({
      ...(buildingsByNo.get(bNo) ?? {}),
      ...(geojsonProperties.get(bNo) ?? {}),
    }))
    .filter((building): building is BuildingProperties => Boolean(building.bNo));

  const visibleMonthlyElectricity = monthlyElectricity.filter((row) =>
    visibleBuildingNos.has(row.bNo),
  );

  return {
    buildings,
    geojson,
    monthlyElectricity: visibleMonthlyElectricity,
  };
}
