import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Simple query for Layer 12 metadata
url = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12?f=json'
print('Fetching layer metadata for Layer 12...')
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f'Layer name: {data.get("name")}')
        print(f'Layer id: {data.get("id")}')
        print(f'Geometry type: {data.get("geometryType")}')
        print(f'Spatial reference: {data.get("spatialReference", {}).get("wkid")}')
        fields = data.get('fields', [])
        print(f'Fields count: {len(fields)}')
        print(f'Fields: {[f["name"] for f in fields[:15]]}')
except Exception as e:
    print(f'Error: {e}')

print()
print('Fetching layer metadata for Layer 13...')
url2 = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/13?f=json'
try:
    req = urllib.request.Request(url2)
    with urllib.request.urlopen(req, timeout=30, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f'Layer name: {data.get("name")}')
        print(f'Layer id: {data.get("id")}')
        print(f'Geometry type: {data.get("geometryType")}')
        print(f'Spatial reference: {data.get("spatialReference", {}).get("wkid")}')
        fields = data.get('fields', [])
        print(f'Fields count: {len(fields)}')
        print(f'Fields: {[f["name"] for f in fields[:15]]}')
except Exception as e:
    print(f'Error: {e}')