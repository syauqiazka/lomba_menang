#!/usr/bin/env python3
import requests
import json
import time
import hashlib
from urllib.parse import urlencode

BASE_URL = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0"
PROVINCE_URL = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12"

def make_request(url, params, timeout=60, retries=3):
    for attempt in range(retries):
        try:
            response = requests.get(url, params=params, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, requests.Timeout) as e:
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
        'returnGeometry': 'true',
        'outSR': 4326,
        'f': 'geojson',
        'resultOffset': 0,
        'resultRecordCount': 50
    }
    
    url = f"{BASE_URL}/query?{urlencode(params)}"
    data = make_request(BASE_URL, params)
    if not data:
        return None
    
    count_query = params.copy()
    count_query['returnCountOnly'] = 'true'
    del count_query['resultOffset']
    del count_query['resultRecordCount']
    
    count_data = make_request(BASE_URL, count_query)
    if not count_data:
        return None
    total_count = count_data.get('count', 0)
    print(f"Total regency/city features: {total_count}")
    
    all_features = []
    offset = 0
    batch_size = 50
    
    while offset < total_count:
        params['resultOffset'] = offset
        params['resultRecordCount'] = batch_size
        
        result = make_request(BASE_URL, params)
        if not result or 'features' not in result:
            print(f"Failed at offset {offset}")
            break
        
        features = result['features']
        if not features:
            print(f"No features at offset {offset}, stopping")
            break
        
        all_features.extend(features)
        print(f"Retrieved {len(features)} features at offset {offset}, total: {len(all_features)}")
        
        offset += batch_size
        time.sleep(0.5)
    
    geojson = {
        "type": "FeatureCollection",
        "features": all_features
    }
    return geojson

def extract_provinces():
    params = {
        'where': "TIPADM = 6",
        'outFields': 'OBJECTID,KDPPR,NAMOBJ,WADMPR',
        'returnGeometry': 'true',
        'outSR': 4326,
        'f': 'geojson',
        'resultRecordCount': 100
    }
    
    url = f"{PROVINCE_URL}/query?{urlencode(params)}"
    print(f"Extracting provinces from: {url}")
    
    count_query = params.copy()
    count_query['returnCountOnly'] = 'true'
    del count_query['resultRecordCount']
    
    count_data = make_request(PROVINCE_URL, count_query)
    if not count_data:
        return None
    total_count = count_data.get('count', 0)
    print(f"Total province features: {total_count}")
    
    all_features = []
    offset = 0
    batch_size = 50
    
    while offset < total_count:
        params['resultOffset'] = offset
        params['resultRecordCount'] = batch_size
        
        result = make_request(PROVINCE_URL, params)
        if not result or 'features' not in result:
            print(f"Failed at offset {offset}")
            break
        
        features = result['features']
        if not features:
            print(f"No features at offset {offset}, stopping")
            break
        
        all_features.extend(features)
        print(f"Retrieved {len(features)} features at offset {offset}, total: {len(all_features)}")
        
        offset += batch_size
        time.sleep(0.5)
    
    geojson = {
        "type": "FeatureCollection",
        "features": all_features
    }
    return geojson

def main():
    import os
    
    output_dir = r"D:\bismillah_menang\data\raw\big-administrative-boundaries"
    os.makedirs(output_dir, exist_ok=True)
    
    print("=" * 60)
    print("Extracting Regency/City Boundaries (Kabupaten/Kota)")
    print("=" * 60)
    
    regency_data = extract_regency_city()
    if regency_data:
        filepath = os.path.join(output_dir, 'regency-city-raw.geojson')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(regency_data, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(regency_data['features'])} features to {filepath}")
    
    time.sleep(2)
    
    print("\n" + "=" * 60)
    print("Extracting Province Boundaries")
    print("=" * 60)
    
    province_data = extract_provinces()
    if province_data:
        filepath = os.path.join(output_dir, 'province-raw.geojson')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(province_data, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(province_data['features'])} features to {filepath}")
    
    print("\nExtraction complete!")

if __name__ == "__main__":
    main()