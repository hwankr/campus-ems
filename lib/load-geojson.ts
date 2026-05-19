import type { BuildingProperties, CampusBuildingFeatureCollection } from "@/types/building";

const CAMPUS_GEOJSON_PATH = "/data/yu_buildings.geojson";
let buildingsPromise: Promise<BuildingProperties[]> | null = null;

export async function loadCampusGeoJSON(): Promise<CampusBuildingFeatureCollection> {
  const response = await fetch(CAMPUS_GEOJSON_PATH);

  if (!response.ok) {
    throw new Error(
      `Failed to load ${CAMPUS_GEOJSON_PATH}: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<CampusBuildingFeatureCollection>;
}

export async function loadGyeongsanBuildings(): Promise<BuildingProperties[]> {
  buildingsPromise ??= loadCampusGeoJSON().then((geojson) =>
    geojson.features.map((feature) => feature.properties),
  );

  return buildingsPromise;
}
