import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_json(url, timeout=60):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return {'error': str(e)}

# Layer 12 - Province Polygons - Get count
print("=== BIG Layer 12: Province Polygons ===")
url12_count = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12/query?where=1%3D1&returnCountOnly=true&f=json'
result12_count = fetch_json(url12_count, 30)
print(f"Count: {result12_count.get('count', 'N/A')}")
print(f"Exceeded limit: {result12_count.get('exceededTransferLimit', False)}")

# Sample GeoJSON features from Layer 12
print("\n--- Sample GeoJSON (Layer 12) ---")
url12_sample = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12/query?where=1%3D1&resultRecordCount=3&outFields=*&returnGeometry=true&outSR=4326&f=geojson'
result12_sample = fetch_json(url12_sample, 30)
if 'error' not in result12_sample:
    features = result12_sample.get('features', [])
    print(f"Features returned: {len(features)}")
    if features:
        props = list(features[0].get('properties', {}).keys())
        print(f"Properties: {props}")
        for f in features:
            print(f"  kdbbps={f['properties'].get('kdbbps')}, namobj={f['properties'].get('namobj')}")

print()

# Layer 13 - Regency/City Polygons - Get count
print("=== BIG Layer 13: Regency/City Polygons ===")
url13_count = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/13/query?where=1%3D1&returnCountOnly=true&f=json'
result13_count = fetch_json(url13_count, 30)
print(f"Count: {result13_count.get('count', 'N/A')}")
print(f"Exceeded limit: {result13_count.get('exceededTransferLimit', False)}")

# Sample GeoJSON features from Layer 13
print("\n--- Sample GeoJSON (Layer 13) ---")
url13_sample = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/13/query?where=1%3D1&resultRecordCount=5&outFields=*&returnGeometry=true&outSR=4326&f=geojson'
result13_sample = fetch_json(url13_sample, 30)
if 'error' not in result13_sample:
    features = result13_sample.get('features', [])
    print(f"Features returned: {len(features)}")
    if features:
        props = list(features[0].get('properties', {}).keys())
        print(f"Properties: {props}")
        for f in features[:5]:
            print(f"  kdbbps={f['properties'].get('kdbbps')}, kdpkab={f['properties'].get('kdpkab')}, namobj={f['properties'].get('namobj')}")

# Check specific provinces - verify 38 provinces
print("\n=== Province Code Verification ===")
# Known province codes (BPS 2025): 11-18, 21-24, 31-38, 51-53, 61-65, 71-76, 81-82, 91-96
expected_prov_codes = ['11','12','13','14','15','16','17','18','21','31','32','33','34','35','36','51','52','53','61','62','63','64','65','71','72','73','74','75','76','81','82','91','92','93','94','95','96']
for code in expected_prov_codes:
    url = f'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12/query?where=kdbbps%3D%27{code}%27&outFields=*&returnGeometry=true&outSR=4326&f=json'
    result = fetch_json(url, 10)
    if 'error' in result:
        print(f"  Code {code}: ERROR - {result['error']}")
    elif result.get('count', 0) > 0:
        print(f"  Code {code}: FOUND")
    else:
        print(f"  Code {code}: NOT FOUND")

print("\nDone!")