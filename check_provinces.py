import json
from pathlib import Path

with open(Path(__file__).resolve().parent / 'public' / 'geo' / 'provinces.geojson', encoding='utf-8') as f:
    data = json.load(f)

print(f'Total features: {len(data["features"])}')
for feat in data['features']:
    code = feat['properties']['code']
    name = feat['properties']['name']
    print(f'  {code}: {name}')

# Check Papua codes specifically
print("\nPapua codes:")
for feat in data['features']:
    code = feat['properties']['code']
    if code in ['91','92','93','94','95','96']:
        print(f'  {code}: {feat["properties"]["name"]}')