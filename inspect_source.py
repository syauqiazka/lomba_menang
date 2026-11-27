import json
import os

# Check province structure
with open(os.path.join(os.environ['TEMP'], 'Indonesia-Geojson-2026', 'Provinsi', 'Papua.json')) as f:
    data = json.load(f)
print("=== Papua Province ===")
print(f"Type: {data.get('type')}")
print(f"Features: {len(data.get('features', []))}")
if data.get('features'):
    feat = data['features'][0]
    print(f"Properties: {json.dumps(feat.get('properties', {}), indent=2)}")
    geom = feat.get('geometry', {})
    print(f"Geometry type: {geom.get('type')}")
    coords = geom.get('coordinates', [])
    print(f"Coord depth: {len(str(coords))} chars")

# Check a regency
with open(os.path.join(os.environ['TEMP'], 'Indonesia-Geojson-2026', 'Kabupaten', 'Papua', 'Kabupaten_Asmat.json')) as f:
    data = json.load(f)
print("\n=== Asmat Regency (Papua) ===")
print(f"Type: {data.get('type')}")
print(f"Features: {len(data.get('features', []))}")
if data.get('features'):
    feat = data['features'][0]
    print(f"Properties: {json.dumps(feat.get('properties', {}), indent=2)}")
    geom = feat.get('geometry', {})
    print(f"Geometry type: {geom.get('type')}")

# Check another province
with open(os.path.join(os.environ['TEMP'], 'Indonesia-Geojson-2026', 'Provinsi', 'Aceh.json')) as f:
    data = json.load(f)
print("\n=== Aceh Province ===")
if data.get('features'):
    feat = data['features'][0]
    print(f"Properties: {json.dumps(feat.get('properties', {}), indent=2)}")

# Check a regency in Aceh
with open(os.path.join(os.environ['TEMP'], 'Indonesia-Geojson-2026', 'Kabupaten', 'Aceh', 'Kabupaten_Aceh_Barat.json')) as f:
    data = json.load(f)
print("\n=== Aceh Barat Regency ===")
if data.get('features'):
    feat = data['features'][0]
    print(f"Properties: {json.dumps(feat.get('properties', {}), indent=2)}")