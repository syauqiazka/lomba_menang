import urllib.request
import json
import time
import sys

def query_big_layer(layer_id, name, where_clause="1=1", return_count_only=False):
    """Query a BIG ArcGIS layer"""
    base_url = f'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/{layer_id}/query'
    
    params = {
        'where': where_clause,
        'outFields': '*',
        'returnGeometry': 'true',
        'outSR': '4326',
        'f': 'json'
    }
    
    if return_count_only:
        params['returnCountOnly'] = 'true'
    
    query_string = '&'.join([f'{k}={v}' for k, v in params.items()])
    url = f'{base_url}?{query_string}'
    
    print(f'\n=== BIG Layer {layer_id}: {name} ===')
    print(f'Query URL: {url[:150]}...')
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode('utf-8'))
            count = data.get('count', 'N/A')
            exceeded = data.get('exceededTransferLimit', False)
            features = data.get('features', [])
            print(f'Count: {count}')
            print(f'Exceeded transfer limit: {exceeded}')
            print(f'Features in response: {len(features)}')
            return data
    except Exception as e:
        print(f'Error: {e}')
        return None

def get_sample_features(layer_id, name, max_features=5):
    """Get a small sample of features with geometry"""
    base_url = f'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/{layer_id}/query'
    
    params = {
        'where': '1=1',
        'outFields': '*',
        'returnGeometry': 'true',
        'outSR': '4326',
        'f': 'geojson',
        'resultRecordCount': str(max_features)
    }
    
    query_string = '&'.join([f'{k}={v}' for k, v in params.items()])
    url = f'{base_url}?{query_string}'
    
    print(f'\n--- Sample {name} (GeoJSON) ---')
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode('utf-8'))
            if 'features' in data and len(data['features']) > 0:
                print(f'Sample features: {len(data["features"])}')
                props = list(data['features'][0].get('properties', {}).keys())
                print(f'Properties: {props[:10]}...')
                return data
            return data
    except Exception as e:
        print(f'Error: {e}')
        return None

# MAIN
print("=== BIG ArcGIS REST Service Verification ===\n")

# Layer 12 - Province Polygons
layer12 = query_big_layer(12, 'Area Batas Wilayah Administrasi Provinsi (Polygon)', return_count_only=True)
if layer12:
    print(f"  Geometry type: {layer12.get('geometryType', 'N/A')}")
    
    # Test GeoJSON output
    sample12 = get_sample_features(12, 'Province Polygons')
    if sample12 and 'features' in sample12:
        prop_keys = list(sample12['features'][0]['properties'].keys()) if sample12['features'] else []
        print(f'  Sample properties: {prop_keys}')

# Layer 13 - Regency/City Polygons
layer13 = query_big_layer(13, 'Area Batas Wilayah Administrasi Kabupaten/Kota (Polygon)', return_count_only=True)
if layer13:
    print(f"  Geometry type: {layer13.get('geometryType', 'N/A')}")
    
    # Test GeoJSON output
    sample13 = get_sample_features(13, 'Regency/City Polygons', max_features=3)
    if sample13 and 'features' in sample13:
        prop_keys = list(sample13['features'][0]['properties'].keys()) if sample13['features'] else []
        print(f'  Sample properties: {prop_keys}')

# Layer 9 - Polyline (for comparison - DO NOT USE for polygon)
layer9 = query_big_layer(9, 'Batas Wilayah Kabupaten/Kota (Polyline)', return_count_only=True)

print('\n=== Verification Complete ===')