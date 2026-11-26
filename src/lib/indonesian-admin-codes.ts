export interface ProvinceCode {
  code: string;
  name: string;
}

export interface RegencyCode {
  code: string;
  name: string;
  provinceCode: string;
}

export const INDONESIAN_PROVINCES: ProvinceCode[] = [
  { code: "11", name: "Aceh" },
  { code: "12", name: "Sumatera Utara" },
  { code: "13", name: "Sumatera Barat" },
  { code: "14", name: "Riau" },
  { code: "15", name: "Jambi" },
  { code: "16", name: "Sumatera Selatan" },
  { code: "17", name: "Bengkulu" },
  { code: "18", name: "Lampung" },
  { code: "19", name: "Kepulauan Bangka Belitung" },
  { code: "21", name: "Kepulauan Riau" },
  { code: "31", name: "DKI Jakarta" },
  { code: "32", name: "Jawa Barat" },
  { code: "33", name: "Jawa Tengah" },
  { code: "34", name: "DI Yogyakarta" },
  { code: "35", name: "Jawa Timur" },
  { code: "36", name: "Banten" },
  { code: "51", name: "Bali" },
  { code: "52", name: "Nusa Tenggara Barat" },
  { code: "53", name: "Nusa Tenggara Timur" },
  { code: "61", name: "Kalimantan Barat" },
  { code: "62", name: "Kalimantan Tengah" },
  { code: "63", name: "Kalimantan Selatan" },
  { code: "64", name: "Kalimantan Timur" },
  { code: "65", name: "Kalimantan Utara" },
  { code: "71", name: "Sulawesi Utara" },
  { code: "72", name: "Sulawesi Tengah" },
  { code: "73", name: "Sulawesi Selatan" },
  { code: "74", name: "Sulawesi Tenggara" },
  { code: "75", name: "Gorontalo" },
  { code: "76", name: "Sulawesi Barat" },
  { code: "81", name: "Maluku" },
  { code: "82", name: "Maluku Utara" },
  { code: "91", name: "Papua Barat" },
  { code: "92", name: "Papua" },
  { code: "93", name: "Papua Tengah" },
  { code: "94", name: "Papua Pegunungan" },
  { code: "95", name: "Papua Selatan" },
  { code: "96", name: "Papua Barat Daya" },
];

export const PROVINCE_COUNT = INDONESIAN_PROVINCES.length;

export function getProvinceByCode(code: string): ProvinceCode | undefined {
  return INDONESIAN_PROVINCES.find((p) => p.code === code);
}

export function validateProvinceCode(code: string): boolean {
  return INDONESIAN_PROVINCES.some((p) => p.code === code);
}

export function getAllProvinceCodes(): string[] {
  return INDONESIAN_PROVINCES.map((p) => p.code);
}

export const REGENCY_COUNT_EXPECTED = 514;

export function getExpectedRegencyCountForProvince(provinceCode: string): number {
  const counts: Record<string, number> = {
    "11": 23, "12": 33, "13": 19, "14": 12, "15": 11, "16": 17, "17": 10, "18": 15,
    "19": 7, "21": 7, "31": 6, "32": 27, "33": 35, "34": 5, "35": 38, "36": 8,
    "51": 9, "52": 10, "53": 22, "61": 14, "62": 14, "63": 13, "64": 10, "65": 5,
    "71": 15, "72": 13, "73": 24, "74": 17, "75": 6, "76": 6,
    "81": 11, "82": 10,
    "91": 13, "92": 8, "93": 8, "94": 8, "95": 4, "96": 7,
  };
  return counts[provinceCode] ?? 0;
}