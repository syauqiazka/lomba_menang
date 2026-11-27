import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Check Layer 12 capabilities and extent
print("=== Layer 12 Full Metadata ===")
url = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12?f=json'
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        fields = data.get('fields', [])
        print(f"Total fields: {len(fields)}")
        
        # Look for administrative code fields
        for f in fields:
            fname = f.get('name', '')
            if 'kd' in fname.lower() or 'kode' in fname.lower() or 'obj' in fname.lower() or 'objid' in fname.lower():
                print(f"  {fname}: {f.get('type', 'N/A')} - {f.get('alias', '')}")
        
        # Check if there's an extent
        if 'extent' in data:
            print(f"\nExtent: {data['extent']}")
        
except Exception as e:
    print(f"Error: {e}")

# Check what the features actually look like with minimal query
print("\n=== Query with minimal fields ===")
# Using a subset of fields and no geometry to speed up
url2 = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12/query?where=1%3D1&outFields=kdbbps,kdpkab,namobj,fcode&resultRecordCount=10&f=json'
try:
    req = urllib.request.Request(url2)
    with urllib.request.urlopen(req, timeout=30, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        features = data.get('features', [])
        print(f"Features returned: {len(features)}")
        for f in features:
            props = f.get('properties', {})
            print(f"  kdbbps={props.get('kdbbps')}, kdpkab={props.get('kdpkab')}, namobj={props.get('namobj')}, fcode={props.get('fcode')}")
except Exception as e:
    print(f"Error: {e}")

# Check if it's actually returning polygon features
print("\n=== Check if features have geometry ===")
url3 = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12/query?where=1%3D1&outFields=kdbbps,namobj&resultRecordCount=3&f=json'
try:
    req = urllib.request.Request(url3)
    with urllib.request.urlopen(req, timeout=30, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        features = data.get('features', [])
        if features:
            geom = features[0].get('geometry', {})
            print(f"Geometry type: {geom.get('type', 'N/A')}")
            if 'coordinates' in geom:
                coords = geom.get('coordinates', [])
                print(f"Coordinate array length: {len(coords) if isinstance(coords, list) else 'N/A'}")
except Exception as e:
    print(f"Error: {e}")