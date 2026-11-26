import { describe, it, expect, vi, beforeEach } from "vitest";
import { SourceInputSchema } from "../scripts/import-source";
import { RegionInputSchema } from "../scripts/import-region";
import { DisasterEventInputSchema } from "../scripts/import-disaster-event";
import { EventImpactInputSchema } from "../scripts/import-event-impact";
import { StatInputSchema } from "../scripts/import-stat";

describe("Source Input Validation", () => {
  it("should accept valid source input", () => {
    const input = {
      title: "BNPB Report 2024",
      publisher: "BNPB",
      url: "https://bnpb.go.id/report",
      category: "OFFICIAL",
      publicationDate: "2024-01-15T00:00:00.000Z",
      accessDate: "2024-11-26T00:00:00.000Z",
      description: "Annual disaster report",
      importBatchId: "batch-001",
    };
    const result = SourceInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should require title", () => {
    const input = { publisher: "BNPB", category: "OFFICIAL" };
    const result = SourceInputSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((e) => e.path.includes("title"))).toBe(true);
    }
  });

  it("should accept only valid categories", () => {
    const validCategories = ["OFFICIAL", "MEDIA", "RESEARCH", "EDITORIAL"];
    for (const cat of validCategories) {
      const result = SourceInputSchema.safeParse({ title: "Test", category: cat });
      expect(result.success).toBe(true);
    }

    const result = SourceInputSchema.safeParse({ title: "Test", category: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("should accept optional fields as undefined", () => {
    const result = SourceInputSchema.safeParse({ title: "Test", category: "OFFICIAL" });
    expect(result.success).toBe(true);
  });

  it("should reject invalid URL", () => {
    const result = SourceInputSchema.safeParse({ title: "Test", category: "OFFICIAL", url: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid datetime", () => {
    const result = SourceInputSchema.safeParse({ title: "Test", category: "OFFICIAL", publicationDate: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("Region Input Validation", () => {
  it("should accept valid province input", () => {
    const input = { code: "11", name: "Aceh", level: "PROVINCE" };
    const result = RegionInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should accept valid regency input with parentCode", () => {
    const input = { code: "1101", name: "Simeulue", level: "REGENCY_CITY", parentCode: "11" };
    const result = RegionInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should require code and name", () => {
    expect(RegionInputSchema.safeParse({ name: "Test", level: "PROVINCE" }).success).toBe(false);
    expect(RegionInputSchema.safeParse({ code: "11", level: "PROVINCE" }).success).toBe(false);
  });

  it("should accept only valid levels", () => {
    const validLevels = ["PROVINCE", "REGENCY_CITY", "DISTRICT", "VILLAGE"];
    for (const level of validLevels) {
      expect(RegionInputSchema.safeParse({ code: "11", name: "Test", level }).success).toBe(true);
    }
    expect(RegionInputSchema.safeParse({ code: "11", name: "Test", level: "INVALID" }).success).toBe(false);
  });

  it("should accept optional geometry and centroid", () => {
    const input = { code: "11", name: "Test", level: "PROVINCE", geometry: { type: "Point", coordinates: [0, 0] }, centroid: { type: "Point", coordinates: [0, 0] } };
    const result = RegionInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe("DisasterEvent Input Validation", () => {
  it("should accept valid event input", () => {
    const input = {
      name: "Flores Earthquake 2026",
      type: "EARTHQUAKE",
      nature: "GEOLOGICAL",
      occurredAt: "2026-08-15T12:30:00.000Z",
      endedAt: "2026-08-15T13:00:00.000Z",
      description: "Major earthquake in Flores",
      location: { type: "Point", coordinates: [122.5, -8.5] },
    };
    const result = DisasterEventInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should require name, type, nature, occurredAt", () => {
    expect(DisasterEventInputSchema.safeParse({ type: "EARTHQUAKE", nature: "GEOLOGICAL", occurredAt: "2026-01-01T00:00:00.000Z" }).success).toBe(false);
    expect(DisasterEventInputSchema.safeParse({ name: "Test", nature: "GEOLOGICAL", occurredAt: "2026-01-01T00:00:00.000Z" }).success).toBe(false);
    expect(DisasterEventInputSchema.safeParse({ name: "Test", type: "EARTHQUAKE", occurredAt: "2026-01-01T00:00:00.000Z" }).success).toBe(false);
    expect(DisasterEventInputSchema.safeParse({ name: "Test", type: "EARTHQUAKE", nature: "GEOLOGICAL" }).success).toBe(false);
  });

  it("should accept only valid disaster types", () => {
    const validTypes = ["EARTHQUAKE", "FLOOD", "LANDSLIDE", "COASTAL_EROSION", "TIDAL_FLOOD", "EXTREME_WEATHER", "LAND_SUBSIDENCE", "VOLCANIC_ERUPTION", "TSUNAMI", "OTHER"];
    for (const type of validTypes) {
      expect(DisasterEventInputSchema.safeParse({ name: "Test", type, nature: "GEOLOGICAL", occurredAt: "2026-01-01T00:00:00.000Z" }).success).toBe(true);
    }
    expect(DisasterEventInputSchema.safeParse({ name: "Test", type: "INVALID", nature: "GEOLOGICAL", occurredAt: "2026-01-01T00:00:00.000Z" }).success).toBe(false);
  });

  it("should accept only valid natures", () => {
    expect(DisasterEventInputSchema.safeParse({ name: "Test", type: "EARTHQUAKE", nature: "GEOLOGICAL", occurredAt: "2026-01-01T00:00:00.000Z" }).success).toBe(true);
    expect(DisasterEventInputSchema.safeParse({ name: "Test", type: "EARTHQUAKE", nature: "ENVIRONMENTAL", occurredAt: "2026-01-01T00:00:00.000Z" }).success).toBe(true);
    expect(DisasterEventInputSchema.safeParse({ name: "Test", type: "EARTHQUAKE", nature: "INVALID", occurredAt: "2026-01-01T00:00:00.000Z" }).success).toBe(false);
  });
});

describe("EventImpact Input Validation", () => {
  it("should accept valid impact input", () => {
    const input = {
      eventName: "Flores Earthquake 2026",
      eventType: "EARTHQUAKE",
      eventOccurredAt: "2026-08-15T12:30:00.000Z",
      regionCode: "5306",
      status: "DILAPORKAN_BELUM_MENERIMA_BANTUAN",
      affectedCount: 1000,
      displacedCount: 500,
      injuredCount: 50,
      fatalitiesCount: 10,
      damagedHouses: 200,
      notes: "Remote villages affected",
      sourceTitle: "BNPB Report",
      sourcePublisher: "BNPB",
    };
    const result = EventImpactInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should require eventName, eventType, eventOccurredAt, regionCode", () => {
    expect(EventImpactInputSchema.safeParse({ eventType: "EARTHQUAKE", eventOccurredAt: "2026-01-01T00:00:00.000Z", regionCode: "5306" }).success).toBe(false);
    expect(EventImpactInputSchema.safeParse({ eventName: "Test", eventOccurredAt: "2026-01-01T00:00:00.000Z", regionCode: "5306" }).success).toBe(false);
    expect(EventImpactInputSchema.safeParse({ eventName: "Test", eventType: "EARTHQUAKE", regionCode: "5306" }).success).toBe(false);
    expect(EventImpactInputSchema.safeParse({ eventName: "Test", eventType: "EARTHQUAKE", eventOccurredAt: "2026-01-01T00:00:00.000Z" }).success).toBe(false);
  });

  it("should accept only valid statuses", () => {
    const validStatuses = ["DILAPORKAN_BELUM_MENERIMA_BANTUAN", "AKSES_TERISOLIR", "BELUM_TERVERIFIKASI"];
    for (const status of validStatuses) {
      expect(EventImpactInputSchema.safeParse({ eventName: "Test", eventType: "EARTHQUAKE", eventOccurredAt: "2026-01-01T00:00:00.000Z", regionCode: "5306", status }).success).toBe(true);
    }
    expect(EventImpactInputSchema.safeParse({ eventName: "Test", eventType: "EARTHQUAKE", eventOccurredAt: "2026-01-01T00:00:00.000Z", regionCode: "5306", status: "INVALID" }).success).toBe(false);
  });

  it("should reject negative counts", () => {
    expect(EventImpactInputSchema.safeParse({ eventName: "Test", eventType: "EARTHQUAKE", eventOccurredAt: "2026-01-01T00:00:00.000Z", regionCode: "5306", affectedCount: -1 }).success).toBe(false);
    expect(EventImpactInputSchema.safeParse({ eventName: "Test", eventType: "EARTHQUAKE", eventOccurredAt: "2026-01-01T00:00:00.000Z", regionCode: "5306", displacedCount: -5 }).success).toBe(false);
  });

  it("should coerce string numbers to integers", () => {
    const result = EventImpactInputSchema.safeParse({ eventName: "Test", eventType: "EARTHQUAKE", eventOccurredAt: "2026-01-01T00:00:00.000Z", regionCode: "5306", affectedCount: "100" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.affectedCount).toBe(100);
    }
  });
});

describe("Stat Input Validation", () => {
  it("should accept valid stat input", () => {
    const input = {
      sourceTitle: "BNPB Report 2026",
      sourcePublisher: "BNPB",
      eventName: "Flores Earthquake 2026",
      eventType: "EARTHQUAKE",
      eventOccurredAt: "2026-08-15T12:30:00.000Z",
      regionCode: "5306",
      key: "affected_population",
      label: "Jumlah Penduduk Terdampak",
      value: "1000",
      unit: "jiwa",
      asOfDate: "2026-08-20T00:00:00.000Z",
    };
    const result = StatInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should require sourceTitle, key, label, value, asOfDate", () => {
    expect(StatInputSchema.safeParse({ sourceTitle: "Test", key: "k", label: "L", asOfDate: "2026-01-01T00:00:00.000Z" }).success).toBe(false);
    expect(StatInputSchema.safeParse({ sourceTitle: "Test", key: "k", value: "1", asOfDate: "2026-01-01T00:00:00.000Z" }).success).toBe(false);
    expect(StatInputSchema.safeParse({ sourceTitle: "Test", label: "L", value: "1", asOfDate: "2026-01-01T00:00:00.000Z" }).success).toBe(false);
    expect(StatInputSchema.safeParse({ key: "k", label: "L", value: "1", asOfDate: "2026-01-01T00:00:00.000Z" }).success).toBe(false);
    expect(StatInputSchema.safeParse({ sourceTitle: "Test", key: "k", label: "L", value: "1" }).success).toBe(false);
  });

  it("should accept optional event and region fields", () => {
    const result = StatInputSchema.safeParse({ sourceTitle: "Test", key: "k", label: "L", value: "1", asOfDate: "2026-01-01T00:00:00.000Z" });
    expect(result.success).toBe(true);
  });

  it("should reject invalid datetime for asOfDate", () => {
    const result = StatInputSchema.safeParse({ sourceTitle: "Test", key: "k", label: "L", value: "1", asOfDate: "invalid" });
    expect(result.success).toBe(false);
  });
});