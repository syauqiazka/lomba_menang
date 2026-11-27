import json
import os

base = os.path.join(os.environ['TEMP'], 'Indonesia-Geojson-2026')

# Check a regency
with open(os.path.join(base, 'Kabupaten', 'Papua', 'Kabupaten_Jayapura.json')) as f:
    data = json.load(f)
print("=== Jayapura Regency (Papua) ===")
print(f"Type: {data.get('type')}")
print(f"Features: {len(data.get('features', []))}")
if data.get('features'):
    feat = data['features'][0]
    print(f"Properties: {json.dumps(feat.get('properties', {}), indent=2)}")
    geom = feat.get('geometry', {})
    print(f"Geometry type: {geom.get('type')}")

# Count regencies per province
print("\n=== Regency counts per province ===")
kab_dir = os.path.join(base, 'Kabupaten')
total = 0
for prov in sorted(os.listdir(kab_dir)):
    prov_path = os.path.join(kab_dir, prov)
    if os.path.isdir(prov_path):
        files = [f for f in os.listdir(prov_path) if f.endswith('.json')]
        print(f"  {prov}: {len(files)}")
        total += len(files)
print(f"\nTotal regencies: {total}")

# Check all province codes
print("\n=== All Province Codes ===")
prov_dir = os.path.join(base, 'Provinsi')
for f in sorted(os.listdir(prov_dir)):
    if f.endswith('.json'):
        with open(os.path.join(prov_dir, f)) as fp:
            data = json.load(fp)
            if data.get('features'):
                props = data['features'][0].get('properties', {})
                print(f"  {props.get('KODE_PROV')}: {props.get('PROVINSI')}")