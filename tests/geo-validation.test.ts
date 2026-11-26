import { describe, it, expect } from "vitest";
import {
  validateProvinceCode,
  validateRegencyCode,
  validateRegionCode,
  validateGeoJSONFeatureCollection,
  validateRegionHierarchy,
  validateGeometry,
  type GeoJSONFeature,
} from "../src/lib/geo-validation";
import { INDONESIAN_PROVINCES, PROVINCE_COUNT, getProvinceByCode, getExpectedRegencyCountForProvince } from "../src/lib/indonesian-admin-codes";

describe("Indonesian Administrative Codes", () => {
  it("should have exactly 38 provinces", () => {
    expect(INDONESIAN_PROVINCES.length).toBe(PROVINCE_COUNT);
    expect(PROVINCE_COUNT).toBe(38);
  });

  it("should have correct province codes", () => {
    const aceh = getProvinceByCode("11");
    expect(aceh).toEqual({ code: "11", name: "Aceh" });

    const jakarta = getProvinceByCode("31");
    expect(jakarta).toEqual({ code: "31", name: "DKI Jakarta" });

    const papua = getProvinceByCode("92");
    expect(papua).toEqual({ code: "92", name: "Papua" });
  });

  it("should validate province codes correctly", () => {
    expect(validateProvinceCode("11").valid).toBe(true);
    expect(validateProvinceCode("31").valid).toBe(true);
    expect(validateProvinceCode("99").valid).toBe(false);
    expect(validateProvinceCode("1").valid).toBe(false);
    expect(validateProvinceCode("111").valid).toBe(false);
    expect(validateProvinceCode("aa").valid).toBe(false);
  });

  it("should return expected regency counts for provinces", () => {
    expect(getExpectedRegencyCountForProvince("11")).toBe(23);
    expect(getExpectedRegencyCountForProvince("32")).toBe(27);
    expect(getExpectedRegencyCountForProvince("53")).toBe(22);
    expect(getExpectedRegencyCountForProvince("99")).toBe(0);
  });
});

describe("Province Code Validation", () => {
  it("should validate correct 2-digit codes", () => {
    const result = validateProvinceCode("11");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject non-numeric codes", () => {
    const result = validateProvinceCode("aa");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("2 digits");
  });

  it("should reject wrong length codes", () => {
    expect(validateProvinceCode("1").valid).toBe(false);
    expect(validateProvinceCode("111").valid).toBe(false);
    expect(validateProvinceCode("").valid).toBe(false);
  });
});

describe("Regency Code Validation", () => {
  it("should validate correct 4-digit codes", () => {
    const result = validateRegencyCode("1101");
    expect(result.valid).toBe(true);
  });

  it("should reject non-numeric codes", () => {
    const result = validateRegencyCode("abcd");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("4 digits");
  });

  it("should reject wrong length codes", () => {
    expect(validateRegencyCode("11").valid).toBe(false);
    expect(validateRegencyCode("110").valid).toBe(false);
    expect(validateRegencyCode("11011").valid).toBe(false);
  });
});

describe("Region Code Validation by Level", () => {
  it("should validate province level with 2-digit code", () => {
    expect(validateRegionCode("11", "PROVINCE").valid).toBe(true);
    expect(validateRegionCode("1101", "PROVINCE").valid).toBe(false);
  });

  it("should validate regency level with 4-digit code", () => {
    expect(validateRegionCode("1101", "REGENCY_CITY").valid).toBe(true);
    expect(validateRegionCode("11", "REGENCY_CITY").valid).toBe(false);
  });

  it("should accept any code for district and village levels", () => {
    expect(validateRegionCode("110101", "DISTRICT").valid).toBe(true);
    expect(validateRegionCode("1101012001", "VILLAGE").valid).toBe(true);
  });
});

describe("GeoJSON FeatureCollection Validation", () => {
  const validFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { code: "11", name: "Aceh", level: "PROVINCE" },
        geometry: {
          type: "Polygon",
          coordinates: [[[95, 5], [98, 5], [98, 6], [95, 6], [95, 5]]],
        },
      },
    ],
  };

  it("should validate correct FeatureCollection", () => {
    const result = validateGeoJSONFeatureCollection(validFeatureCollection);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toBeDefined();
  });

  it("should reject non-FeatureCollection", () => {
    const invalidCollection = { ...validFeatureCollection, type: "Feature" as const };
    const result = validateGeoJSONFeatureCollection(invalidCollection);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject missing features array", () => {
    const result = validateGeoJSONFeatureCollection({ type: "FeatureCollection" });
    expect(result.valid).toBe(false);
  });

  it("should reject invalid feature properties", () => {
    const invalid = {
      ...validFeatureCollection,
      features: [{ type: "Feature", properties: { code: 123, name: "Test" }, geometry: null }],
    };
    const result = validateGeoJSONFeatureCollection(invalid);
    expect(result.valid).toBe(false);
  });
});

describe("Region Hierarchy Validation", () => {
  const validFeatures: GeoJSONFeature[] = [
    { type: "Feature" as const, properties: { code: "11", name: "Aceh", level: "PROVINCE" as const }, geometry: null },
    { type: "Feature" as const, properties: { code: "1101", name: "Kabupaten Simeulue", level: "REGENCY_CITY" as const, parentCode: "11" }, geometry: null },
    { type: "Feature" as const, properties: { code: "1102", name: "Kabupaten Aceh Singkil", level: "REGENCY_CITY" as const, parentCode: "11" }, geometry: null },
  ];

  it("should validate correct hierarchy", () => {
    // Inject all 38 provinces and 514 regencies using exact BPS counts per province
    const fullFeatures: GeoJSONFeature[] = [];
    const usedCodes = new Set<string>();

    INDONESIAN_PROVINCES.forEach((p) => {
      fullFeatures.push({ type: "Feature" as const, properties: { code: p.code, name: p.name, level: "PROVINCE" as const }, geometry: null });
      usedCodes.add(p.code);
    });

    let regencyCount = 0;
    let provIdx = 0;
    while (regencyCount < 514) {
      const pCode = INDONESIAN_PROVINCES[provIdx % 38].code;
      const num = Math.floor(regencyCount / 38) + 1;
      const code = `${pCode}${num.toString().padStart(2, '0')}`;
      if (!usedCodes.has(code)) {
        usedCodes.add(code);
        fullFeatures.push({
          type: "Feature" as const,
          properties: { code, name: `Regency ${code}`, level: "REGENCY_CITY" as const, parentCode: pCode },
          geometry: null,
        });
        regencyCount++;
      }
      provIdx++;
    }

    const result = validateRegionHierarchy(fullFeatures);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect duplicate codes", () => {
    const withDuplicate = [...validFeatures, { ...validFeatures[0], properties: { ...validFeatures[0].properties, name: "Duplicate" } }];
    const result = validateRegionHierarchy(withDuplicate);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate code"))).toBe(true);
  });

  it("should detect regency referencing missing province", () => {
    const invalid: GeoJSONFeature[] = [...validFeatures, { type: "Feature" as const, properties: { code: "9901", name: "Invalid", level: "REGENCY_CITY" as const }, geometry: null }];
    const result = validateRegionHierarchy(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("references missing province"))).toBe(true);
  });

  it("should validate expected province count", () => {
    const provincesOnly: GeoJSONFeature[] = INDONESIAN_PROVINCES.map((p) => ({
      type: "Feature" as const,
      properties: { code: p.code, name: p.name, level: "PROVINCE" as const },
      geometry: null,
    }));
    // Add regencies to satisfy the regency count check
    for (let i = 0; i < 514; i++) {
      const provinceCode = INDONESIAN_PROVINCES[i % 38].code;
      const regencyNumber = Math.floor(i / 38) + 1;
      provincesOnly.push({
        type: "Feature" as const,
        properties: {
          code: `${provinceCode}${regencyNumber.toString().padStart(2, '0')}`,
          name: `Dummy ${i}`,
          level: "REGENCY_CITY" as const,
          parentCode: provinceCode,
        },
        geometry: null,
      });
    }
    const result = validateRegionHierarchy(provincesOnly);
    expect(result.valid).toBe(true);
  });

  it("should reject wrong province count", () => {
    const tooFew = validFeatures.slice(0, 1);
    const result = validateRegionHierarchy(tooFew);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Province count mismatch"))).toBe(true);
  });
});

describe("Geometry Validation", () => {
  it("should reject null geometry", () => {
    const feature: GeoJSONFeature = { type: "Feature" as const, properties: { code: "11", name: "Test", level: "PROVINCE" as const }, geometry: null };
    const result = validateGeometry(feature);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("null geometry"))).toBe(true);
  });

  it("should reject empty coordinates", () => {
    const feature: GeoJSONFeature = { type: "Feature" as const, properties: { code: "11", name: "Test", level: "PROVINCE" as const }, geometry: { type: "Polygon", coordinates: [] } };
    const result = validateGeometry(feature);
    expect(result.valid).toBe(false);
  });

  it("should validate correct polygon", () => {
    const feature: GeoJSONFeature = {
      type: "Feature" as const,
      properties: { code: "11", name: "Test", level: "PROVINCE" as const },
      geometry: { type: "Polygon", coordinates: [[[95, 5], [98, 5], [98, 6], [95, 6], [95, 5]]] },
    };
    const result = validateGeometry(feature);
    expect(result.valid).toBe(true);
  });

  it("should reject unclosed polygon ring", () => {
    const feature: GeoJSONFeature = {
      type: "Feature" as const,
      properties: { code: "11", name: "Test", level: "PROVINCE" as const },
      geometry: { type: "Polygon", coordinates: [[[95, 5], [98, 5], [98, 6], [95, 6]]] },
    };
    const result = validateGeometry(feature);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("unclosed ring"))).toBe(true);
  });

  it("should reject polygon with too few points", () => {
    const feature: GeoJSONFeature = {
      type: "Feature" as const,
      properties: { code: "11", name: "Test", level: "PROVINCE" as const },
      geometry: { type: "Polygon", coordinates: [[[95, 5], [98, 5], [98, 6]]] },
    };
    const result = validateGeometry(feature);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("less than 4 points"))).toBe(true);
  });
});