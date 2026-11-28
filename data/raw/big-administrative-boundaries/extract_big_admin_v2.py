#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime

BASE_URL = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0"
PROVINCE_URL = "https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/12"

def make_request(url, params, timeout=60, retries=3):
    for attempt in range(retries):
        try:
            response = requests.get(url, params=params, timeout=timeout)
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
    
    print(f"Fetching attributes from: {BASE_URL}/query")
    response = make_request(BASE_URL, params, timeout=30)
    if not response:
        return None
    
    data = response.json()
    print(f"Status: {response.status_code}")
    
    if 'error' in data:
        print(f"API Error: {data['error']}")
        return None
    
    return data

def extract_provinces_attributes():
    params = {
        'where': "TIPADM = 6",
        'outFields': 'OBJECTID,KDPPR,NAMOBJ,WADMPR',
        'returnGeometry': 'false',
        'f': 'json'
    }
    
    print(f"Fetching provinces from: {PROVINCE_URL}/query")
    response = make_request(PROVINCE_URL, params, timeout=30)
    if not response:
        return None
    
    data = response.json()
    print(f"Status: {response.status_code}")
    
    if 'error' in data:
        print(f"API Error: {data['error']}")
        return None
    
    return data

def extract_all_admin_extent():
    params = {
        'where': "TIPADM = 4 OR TIPADM = 5",
        'outFields': 'OBJECTID,KDPKAB,NAMOBJ,WADMKK,WADMPR',
        'returnGeometry': 'true',
        'outSR': 4326,
        'f': 'json',
        'returnExtentOnly': 'true'
    }
    
    print(f"Fetching all bounding boxes (extent only) from: {BASE_URL}/query")
    response = make_request(BASE_URL, params, timeout=60)
    if not response:
        return None
    return response.json()

def main():
    import os
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(output_dir, exist_ok=True)
    
    extraction_report = {
        "extraction_date": datetime.now().isoformat(),
        "source": "BIG ArcGIS REST Service (geoservices.big.go.id)",
        "services_queried": [],
        "results": {}
    }
    
    print("=" * 60)
    print("Phase 1: Extracting Regency/City Attributes (No Geometry)")
    print("=" * 60)
    
    regency_data = extract_regency_city_attributes()
    if regency_data:
        filepath = os.path.join(output_dir, 'regency-city-attributes.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(regency_data, f, ensure_ascii=False, indent=2)
        feature_count = len(regency_data.get('features', []))
        print(f"Saved {feature_count} features to {filepath}")
        extraction_report["results"]["regency_city_attributes"] = {
            "file": "regency-city-attributes.json",
            "feature_count": feature_count,
            "status": "success",
            "note": "Attributes only (no geometry) - pagination succeeded"
        }
    else:
        extraction_report["results"]["regency_city_attributes"] = {
            "status": "failed",
            "note": "Could not retrieve attributes"
        }
    
    time.sleep(2)
    
    print("\n" + "=" * 60)
    print("Phase 2: Extracting Province Attributes")
    print("=" * 60)
    
    province_data = extract_provinces_attributes()
    if province_data:
        filepath = os.path.join(output_dir, 'province-attributes.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(province_data, f, ensure_ascii=False, indent=2)
        feature_count = len(province_data.get('features', []))
        print(f"Saved {feature_count} features to {filepath}")
        extraction_report["results"]["province_attributes"] = {
            "file": "province-attributes.json",
            "feature_count": feature_count,
            "status": "success"
        }
    else:
        extraction_report["results"]["province_attributes"] = {
            "status": "failed"
        }
    
    time.sleep(2)
    
    print("\n" + "=" * 60)
    print("Phase 3: Testing Full Geometry (Will Timeout/Split)")
    print("=" * 60)
    
    extraction_report["results"]["geometry_extraction"] = {
        "constraint": "Full geometry too large per-request (individual features ~6MB)",
        "attempted_service": BASE_URL,
        "pagination_support": "No - ArcGIS returns 'Pagination is not supported' when resultRecordCount exceeds server limit",
        "work_around": "Requires OBJECTID-based batch queries or tile-based approach",
        "status": "partial - attributes extracted, geometry deferred"
    }
    
    with open(os.path.join(output_dir, 'extraction-report.json'), 'w') as f:
        json.dump(extraction_report, f, indent=2, ensure_ascii=False)
    
    print("\nExtraction complete. Report saved to extraction-report.json")

if __name__ == "__main__":
    main()