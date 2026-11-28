#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime
from urllib.parse import urlencode
import os

BASE_KABKOTA = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0"
BASE_ADMIN = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12"

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

def extract_regency_city_attributes():
    params = {
        'where': "TIPADM = 4 OR TIPADM = 5",
        'outFields': 'OBJECTID,KDPKAB,NAMOBJ,WADMKK,WADMPR',
        'returnGeometry': 'false',
        'f': 'json'
    }
    url = f"{BASE_KABKOTA}/query?{urlencode(params)}"
    print(f"Fetching attributes from: {url[:80]}...")
    
    response = make_request(url, timeout=30)
    if not response:
        return None
    
    data = response.json()
    if 'error' in data:
        print(f"API Error: {data['error']}")
        return None
    
    features = data.get('features', [])
    print(f"  Retrieved {len(features)} features")
    return data

def extract_all_admin_boundaries():
    params = {
        'where': "1=1",
        'outFields': 'OBJECTID,NAMOBJ,fcode,WADMPR',
        'returnGeometry': 'false',
        'f': 'json'
    }
    url = f"{BASE_ADMIN}/query?{urlencode(params)}"
    print(f"Fetching all administrative boundaries...")
    
    response = make_request(url, timeout=60)
    if not response:
        return None
    
    data = response.json()
    if 'error' in data:
        print(f"API Error: {data['error']}")
        return None
    
    features = data.get('features', [])
    print(f"  Retrieved {len(features)} features (all admin levels)")
    return data

def extract_provinces_only():
    params = {
        'where': "TIPADM = 6",
        'outFields': 'OBJECTID,KDPPR,NAMOBJ,WADMPR',
        'returnGeometry': 'false',
        'f': 'json'
    }
    url = f"{BASE_ADMIN}/query?{urlencode(params)}"
    print(f"Fetching provinces...")
    
    response = make_request(url, timeout=30)
    if not response:
        return None
    
    data = response.json()
    if 'error' in data:
        return None
    
    features = data.get('features', [])
    if not features:
        return None
    print(f"  Retrieved {len(features)} features")
    return data

def extract_provinces_all():
    params = {
        'where': "1=1",
        'outFields': 'OBJECTID,KDPPR,NAMOBJ,WADMPR',
        'returnGeometry': 'false',
        'f': 'json'
    }
    url = f"{BASE_ADMIN}/query?{urlencode(params)}"
    response = make_request(url, timeout=30)
    if not response:
        return None
    data = response.json()
    features = data.get('features', [])
    print(f"  Retrieved {len(features)} province features")
    return data

def extract_geometry_by_objectid_batch(start_oid, batch_size=5):
    params = {
        'objectIds': ','.join(str(i) for i in range(start_oid, start_oid + batch_size)),
        'outFields': 'OBJECTID,KDPKAB,NAMOBJ,WADMKK,WADMPR',
        'returnGeometry': 'true',
        'outSR': 4326,
        'f': 'geojson'
    }
    url = f"{BASE_KABKOTA}/query?{urlencode(params)}"
    
    response = make_request(url, timeout=60, retries=2)
    if not response:
        return None
    
    try:
        data = response.json()
        if 'error' in data:
            return None
        return data
    except:
        return None

def main():
    output_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(output_dir, exist_ok=True)
    
    report = {
        "extraction_date": datetime.now().isoformat(),
        "source": "BIG ArcGIS REST Service (geoservices.big.go.id)",
        "data_summary": {
            "regency_city_count": 0,
            "province_count": 0,
            "new_papua_count": 0,
            "kdpkab_codes": []
        },
        "files_created": []
    }
    
    print("=" * 60)
    print("Extracting Regency/City Attributes (520 features expected)")
    print("=" * 60)
    
    regency_data = extract_regency_city_attributes()
    if regency_data:
        filepath = os.path.join(output_dir, 'regency-city-attributes.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(regency_data, f, ensure_ascii=False, indent=2)
        report["files_created"].append("regency-city-attributes.json")
        
        features = regency_data.get('features', [])
        report["data_summary"]["regency_city_count"] = len(features)
        
        kdpkab_codes = set()
        for feat in features:
            attrs = feat.get('attributes', {})
            kdpkab = attrs.get('KDPKAB', '')
            if kdpkab:
                kdpkab_codes.add(kdpkab)
        
        report["data_summary"]["kdpkab_codes"] = sorted(kdpkab_codes)
        new_papua = [c for c in kdpkab_codes if c.startswith(('93', '94', '95', '96'))]
        report["data_summary"]["new_papua_count"] = len(new_papua)
        report["data_summary"]["new_papua_codes"] = sorted(new_papua)
        
        print(f"  Saved {len(features)} regency/city features with {len(kdpkab_codes)} unique KDPKAB codes")
        print(f"  New Papua codes (93+): {len(new_papua)}")
    
    time.sleep(2)
    
    print("\n" + "=" * 60)
    print("Extracting All Administrative Boundaries (539 features)")
    print("=" * 60)
    
    all_admin = extract_all_admin_boundaries()
    if all_admin:
        filepath = os.path.join(output_dir, 'all-admin-boundaries-attributes.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(all_admin, f, ensure_ascii=False, indent=2)
        report["files_created"].append("all-admin-boundaries-attributes.json")
        print(f"  Saved {len(all_admin.get('features', []))} features")
    
    time.sleep(2)
    
    print("\n" + "=" * 60)
    print("Extracting Provinces Only")
    print("=" * 60)
    
    provinces = extract_provinces_only()
    if provinces:
        filepath = os.path.join(output_dir, 'province-attributes.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(provinces, f, ensure_ascii=False, indent=2)
        report["files_created"].append("province-attributes.json")
        print(f"  Saved {len(provinces.get('features', []))} province features")
        report["data_summary"]["province_count"] = len(provinces.get('features', []))
    
    with open(os.path.join(output_dir, 'extraction-report.json'), 'w') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print("EXTRACTION SUMMARY")
    print("=" * 60)
    print(f"Regency/City count: {report['data_summary']['regency_city_count']}")
    print(f"Province count: {report['data_summary']['province_count']}")
    print(f"All admin boundaries: 539 features")
    print(f"New Papua codes (93-96): {report['data_summary']['new_papua_count']}")
    print(f"Files saved: {report['files_created']}")

if __name__ == "__main__":
    main()