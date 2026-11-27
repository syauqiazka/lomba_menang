import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Check what the count response actually contains
print("=== Raw Count Response (Layer 12) ===")
url = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12/query?where=1%3D1&returnCountOnly=true&f=json'
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30, context=ctx) as response:
        data = response.read().decode('utf-8')
        parsed = json.loads(data[:1000])  # Just read first 1000 chars
        print(json.dumps(parsed, indent=2))
except Exception as e:
    print(f"Error: {e}")

print("\n=== Raw GeoJSON Sample (Layer 12, 3 features) ===")
url2 = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12/query?where=1%3D1&resultRecordCount=3&outFields=*&returnGeometry=true&outSR=4326&f=geojson'
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(url2, timeout=30, context=ctx) as response:
        data = response.read().decode('utf-8')[:2000]
        print(data)
except Exception as e:
    print(f"Error: {e}")