import { z } from "zod";
import { getAllProvinceCodes } from "./indonesian-admin-codes";

export const BPSProvinceCodeSchema = z.string().regex(/^[0-9]{2}$/, "BPS province code must be 2 digits");

export const BPSRegencyCodeSchema = z.string().regex(/^[0-9]{4}$/, "BPS regency/city code must be 4 digits");

export const RegionLevelSchema = z.enum(["PROVINCE", "REGENCY_CITY", "DISTRICT", "VILLAGE"]);

export const GeoJSONGeometrySchema = z.object({
  type: z.enum(["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"]),
  coordinates: z.unknown(),
});

export const GeoJSONFeatureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.object({
    code: z.string(),
    name: z.string(),
    level: RegionLevelSchema,
    parentCode: z.string().optional(),
  }),
  geometry: GeoJSONGeometrySchema.nullable(),
});

export const GeoJSONFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(GeoJSONFeatureSchema),
});

export type BPSProvinceCode = z.infer<typeof BPSProvinceCodeSchema>;
export type BPSRegencyCode = z.infer<typeof BPSRegencyCodeSchema>;
export type RegionLevel = z.infer<typeof RegionLevelSchema>;
export type GeoJSONFeature = z.infer<typeof GeoJSONFeatureSchema>;
export type GeoJSONFeatureCollection = z.infer<typeof GeoJSONFeatureCollectionSchema>;

const PROVINCE_CODE_SET = new Set(getAllProvinceCodes());

export function validateProvinceCode(code: string): { valid: boolean; error?: string } {
  const result = BPSProvinceCodeSchema.safeParse(code);
  if (!result.success) {
    return { valid: false, error: result.error.issues[0].message };
  }
  if (!PROVINCE_CODE_SET.has(code)) {
    return { valid: false, error: `Province code ${code} is not in the official BPS list` };
  }
  return { valid: true };
}

export function validateRegencyCode(code: string): { valid: boolean; error?: string } {
  const result = BPSRegencyCodeSchema.safeParse(code);
  if (!result.success) {
    return { valid: false, error: result.error.issues[0].message };
  }
  return { valid: true };
}

export function validateRegionCode(code: string, level: RegionLevel): { valid: boolean; error?: string } {
  if (level === "PROVINCE") return validateProvinceCode(code);
  if (level === "REGENCY_CITY") return validateRegencyCode(code);
  return { valid: true };
}

export function validateGeoJSONFeatureCollection(data: unknown): { valid: boolean; errors: string[]; data?: GeoJSONFeatureCollection } {
  const result = GeoJSONFeatureCollectionSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
    };
  }
  return { valid: true, errors: [], data: result.data };
}

export function validateRegionHierarchy(features: GeoJSONFeature[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const codes = new Set<string>();
  const provinceCodes = new Set<string>();

  for (const feature of features) {
    const { code, level, name } = feature.properties;

    if (codes.has(code)) {
      errors.push(`Duplicate code: ${code} (${name})`);
    }
    codes.add(code);

    const codeValidation = validateRegionCode(code, level);
    if (!codeValidation.valid) {
      errors.push(`Invalid code for ${name} (${level}): ${codeValidation.error}`);
    }

    if (level === "PROVINCE") {
      provinceCodes.add(code);
    } else if (level === "REGENCY_CITY") {
      const parentCode = code.substring(0, 2);
      if (!provinceCodes.has(parentCode)) {
        errors.push(`Regency ${code} (${name}) references missing province ${parentCode}`);
      }
    }
  }

  const expectedProvinceCount = 38;
  const expectedRegencyCount = 514;

  const actualProvinces = features.filter((f) => f.properties.level === "PROVINCE").length;
  const actualRegencies = features.filter((f) => f.properties.level === "REGENCY_CITY").length;

  if (actualProvinces !== expectedProvinceCount) {
    errors.push(`Province count mismatch: expected ${expectedProvinceCount}, got ${actualProvinces}`);
  }
  if (actualRegencies !== expectedRegencyCount) {
    errors.push(`Regency/city count mismatch: expected ${expectedRegencyCount}, got ${actualRegencies}`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateGeometry(feature: GeoJSONFeature): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!feature.geometry) {
    errors.push(`Feature ${feature.properties.code} (${feature.properties.name}) has null geometry`);
    return { valid: false, errors };
  }

  const { type, coordinates } = feature.geometry;

  if (!coordinates || (Array.isArray(coordinates) && coordinates.length === 0)) {
    errors.push(`Feature ${feature.properties.code} has empty coordinates`);
    return { valid: false, errors };
  }

  if (type === "Polygon" || type === "MultiPolygon") {
    const coords = coordinates as number[][][] | number[][][][];
    const rings = type === "Polygon" ? (coords as number[][][]) : (coords as number[][][][]).flat();
    for (const ring of rings as number[][][]) {
      if (ring.length < 4) {
        errors.push(`Feature ${feature.properties.code} has invalid ring (less than 4 points)`);
      }
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        errors.push(`Feature ${feature.properties.code} has unclosed ring`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function loadAndValidateGeoJSON(filePath: string): Promise<{ valid: boolean; errors: string[]; data?: GeoJSONFeatureCollection }> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      return { valid: false, errors: [`Failed to load ${filePath}: ${response.statusText}`] };
    }
    const data = await response.json();
    const schemaValidation = validateGeoJSONFeatureCollection(data);
    if (!schemaValidation.valid) {
      return { valid: false, errors: schemaValidation.errors };
    }
    const hierarchyValidation = validateRegionHierarchy(schemaValidation.data!.features);
    if (!hierarchyValidation.valid) {
      return { valid: false, errors: hierarchyValidation.errors };
    }
    const geometryErrors: string[] = [];
    for (const feature of schemaValidation.data!.features) {
      const geomValidation = validateGeometry(feature);
      if (!geomValidation.valid) {
        geometryErrors.push(...geomValidation.errors);
      }
    }
    if (geometryErrors.length > 0) {
      return { valid: false, errors: geometryErrors };
    }
    return { valid: true, errors: [], data: schemaValidation.data };
  } catch (error) {
    return { valid: false, errors: [`Error loading/validating ${filePath}: ${error}`] };
  }
}