import json

with open('D:/bismillah_menang/public/geo/provinces.geojson') as f:
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