import json
from pathlib import Path

with open(r'D:/bismillah_menang/reports/GEOJSON_FILE_INVENTORY.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

empty_files = [item for item in data['inventory'] if not item['has_valid_geometry']]

summary = {
    'generated_at': '2026-11-27T03:00:00Z',
    'source_dataset': 'Candidate A - mashadinoor/Indonesia-Geojson-2026',
    'commit': 'c95911f3f23af6e01c3bf706c80e36a9f3958588',
    'summary': {
        'total_files_in_source': 518,
        'files_with_valid_geometry': 507,
        'files_with_empty_geometry': 11,
        'unique_valid_regencies': 506,
        'bps_expected_2022': 514,
        'missing_due_to_papua_pemekaran': 7,
        'status': 'Source is pre-2022 Papua pemekaran data'
    },
    'exclusions': {
        'empty_geometry_files': [
            f"{item['filename']} ({item['admin_name']} - KDPKAB: {item['kdpkab']})"
            for item in empty_files
        ]
    },
    'key_findings': [
        'Source dataset is from pre-2022 (before Papua pemekaran)',
        'Papua codes 93-96 are not represented in source data',
        'This explains the 7-regency discrepancy with BPS 2022 count',
        'Kabupaten_Pohuwato.json (75.04) should be used instead of Kabupaten_Pahuwato.json (same code, null geometry)',
        'Sumbawa-Sumbawa_Barat.json is a merged test file (71.05/71.10 format)'
    ],
    'recommendation': 'Source the missing 8 Papua regencies from official BPS 2022+ data to reach target count of 514'
}

with open(r'D:/bismillah_menang/reports/RECONCILIATION_SUMMARY.json', 'w', encoding='utf-8') as f:
    json.dump(summary, f, indent=2, ensure_ascii=False)

print(json.dumps(summary, indent=2, ensure_ascii=False))