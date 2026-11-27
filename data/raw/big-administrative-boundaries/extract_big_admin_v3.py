#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime
from urllib.parse import urlencode

BASE_URL = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0"
PROVINCE_URL = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12"

def make_request(url, timeout=60, retries=3):
    for attempt in range(retries):
        try:
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            if attempt < retries - 1:
                wait_time = 2 ** attempt
                print(f"Retry {attempt + 1}/{retries} after {wait_time}s: {e}")
                time.sleep(wait_time)
            else:
                print(f"Failed after {retries} attempts: {e}")
                return None

def extract_regency_city():
    params = {
        'where': "TIPADM = 4 OR TIPADM = 5",
        'outFields': 'OBJECTID,KDPKAB,NAMOBJ,WADMKK,WADMPR',
        'returnGeometry': 'false',
        'f': 'json'
    }
    
    url = f"{BASE_URL}/query?{urlencode(params)}"
    print(f"Fetching attributes from: {url[:100]}...")
    
    response = make_request(url, timeout=30)
    if not response:
        return None
    
    data = response.json()
    print(f"  HTTP Status: {response.status_code}")
    
    if 'error' in data:
        print(f"  API Error: {data['error']}")
        return None
    
    features = data.get('features', [])
    print(f"  Retrieved {len(features)} features")
    return data

def extract_provinces():
    params = {
        'where': "TIPADM = 6",
        'outFields': 'OBJECTID,KDPPR,NAMOBJ,WADMPR',
        'returnGeometry': 'false',
        'f': 'json'
    }
    
    url = f"{PROVINCE_URL}/query?{urlencode(params)}"
    print(f"Fetching provinces from: {url[:100]}...")
    
    response = make_request(url, timeout=30)
    if not response:
        return None
    
    data = response.json()
    print(f"  HTTP Status: {response.status_code}")
    
    if 'error' in data:
        print(f"  API Error: {data['error']}")
        return None
    
    features = data.get('features', [])
    print(f"  Retrieved {len(features)} features")
    return data

def extract_regency_city_geometry_batch(start_oid, batch_size=50):
    params = {
        'objectIds': ','.join(str(i) for i in range(start_oid, start_oid + batch_size)),
        'outFields': 'OBJECTID,KDPKAB,NAMOBJ,WADMKK,WADMPR',
        'returnGeometry': 'true',
        'outSR': 4326,
        'f': 'geojson'
    }
    
    url = f"{BASE_URL}/query?{urlencode(params)}"
    print(f"Fetching geometry batch {start_oid}-{start_oid + batch_size - 1}...")
    
    response = make_request(url, timeout=120)
    if not response:
        return None
    
    try:
        data = response.json()
    except json.JSONDecodeError:
        print(f"  Failed to decode JSON, response length: {len(response.content)}")
        return None
    
    if 'error' in data:
        print(f"  API Error: {data['error']}")
        return None
    
    features = data.get('features', [])
    print(f"  Retrieved {len(features)} geometries")
    return data

def main():
    import os
    
    output_dir = r"D:\bismillah_menang\data\raw\big-administrative-boundaries"
    os.makedirs(output_dir, exist_ok=True)
    
    extraction_report = {
        "extraction_date": datetime.now().isoformat(),
        "source": "BIG ArcGIS REST Service (geoservices.big.go.id)",
        "results": {}
    }
    
    print("=" * 60)
    print("Phase 1: Extracting Regency/City Attributes (No Geometry)")
    print("=" * 60)
    
    regency_data = extract_regency_city()
    if regency_data:
        filepath = os.path.join(output_dir, 'regency-city-attributes.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(regency_data, f, ensure_ascii=False, indent=2)
        feature_count = len(regency_data.get('features', []))
        extraction_report["results"]["regency_city_attributes"] = {
            "file": "regency-city-attributes.json",
            "feature_count": feature_count,
            "status": "success",
            "note": "Attributes only (no geometry)"
        }
    else:
        extraction_report["results"]["regency_city_attributes"] = {"status": "failed"}
    
    time.sleep(2)
    
    print("\n" + "=" * 60)
    print("Phase 2: Extracting Province Attributes")
    print("=" * 60)
    
    province_data = extract_provinces()
    if province_data:
        filepath = os.path.join(output_dir, 'province-attributes.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(province_data, f, ensure_ascii=False, indent=2)
        feature_count = len(province_data.get('features', []))
        extraction_report["results"]["province_attributes"] = {
            "file": "province-attributes.json",
            "feature_count": feature_count,
            "status": "success"
        }
    else:
        extraction_report["results"]["province_attributes"] = {"status": "failed"}
    
    with open(os.path.join(output_dir, 'extraction-report.json'), 'w') as f:
        json.dump(extraction_report, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print("Reports saved. Ready for geometry extraction.")
    print("=" * 60)

if __name__ == "__main__":
    main()