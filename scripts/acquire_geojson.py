#!/usr/bin/env python3
"""
Acquisition script for Indonesian administrative boundaries from
mashadinoor/Indonesia-Geojson-2026

Creates merged GeoJSON files for provinces and regencies.
"""

import json
import os
import hashlib
import shutil
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = Path(os.environ['TEMP']) / 'Indonesia-Geojson-2026'
TARGET_DIR = PROJECT_ROOT / 'public' / 'geo'
MANIFEST_PATH = PROJECT_ROOT / 'GEOJSON_DATASET_MANIFEST.json'

# Province name mapping (source folder name -> official name)
PROVINCE_NAME_MAP = {
    'Aceh': 'Aceh',
    'Bali': 'Bali',
    'Banten': 'Banten',
    'Bengkulu': 'Bengkulu',
    'DKI_Jakarta': 'DKI Jakarta',
    'Daerah_Istimewa_Yogyakarta': 'DI Yogyakarta',
    'Gorontalo': 'Gorontalo',
    'Jambi': 'Jambi',
    'Jawa_Barat': 'Jawa Barat',
    'Jawa_Tengah': 'Jawa Tengah',
    'Jawa_Timur': 'Jawa Timur',
    'Kalimantan_Barat': 'Kalimantan Barat',
    'Kalimantan_Selatan': 'Kalimantan Selatan',
    'Kalimantan_Tengah': 'Kalimantan Tengah',
    'Kalimantan_Timur': 'Kalimantan Timur',
    'Kalimantan_Utara': 'Kalimantan Utara',
    'Kepulauan_Bangka_Belitung': 'Kepulauan Bangka Belitung',
    'Kepulauan_Riau': 'Kepulauan Riau',
    'Lampung': 'Lampung',
    'Maluku': 'Maluku',
    'Maluku_Utara': 'Maluku Utara',
    'Nusa_Tenggara_Barat': 'Nusa Tenggara Barat',
    'Nusa_Tenggara_Timur': 'Nusa Tenggara Timur',
    'Papua': 'Papua',
    'Papua_Barat': 'Papua Barat',
    'Papua_Barat_Daya': 'Papua Barat Daya',
    'Papua_Pegunungan': 'Papua Pegunungan',
    'Papua_Selatan': 'Papua Selatan',
    'Papua_Tengah': 'Papua Tengah',
    'Riau': 'Riau',
    'Sulawesi_Barat': 'Sulawesi Barat',
    'Sulawesi_Selatan': 'Sulawesi Selatan',
    'Sulawesi_Tengah': 'Sulawesi Tengah',
    'Sulawesi_Tenggara': 'Sulawesi Tenggara',
    'Sulawesi_Utara': 'Sulawesi Utara',
    'Sumatera_Barat': 'Sumatera Barat',
    'Sumatera_Selatan': 'Sumatera Selatan',
    'Sumatera_Utara': 'Sumatera Utara',
}

# Province code mapping
PROVINCE_CODE_MAP = {
    'Aceh': '11',
    'Bali': '51',
    'Banten': '36',
    'Bengkulu': '17',
    'DKI_Jakarta': '31',
    'Daerah_Istimewa_Yogyakarta': '34',
    'Gorontalo': '75',
    'Jambi': '15',
    'Jawa_Barat': '32',
    'Jawa_Tengah': '33',
    'Jawa_Timur': '35',
    'Kalimantan_Barat': '61',
    'Kalimantan_Selatan': '63',
    'Kalimantan_Tengah': '62',
    'Kalimantan_Timur': '64',
    'Kalimantan_Utara': '65',
    'Kepulauan_Bangka_Belitung': '19',
    'Kepulauan_Riau': '21',
    'Lampung': '18',
    'Maluku': '81',
    'Maluku_Utara': '82',
    'Nusa_Tenggara_Barat': '52',
    'Nusa_Tenggara_Timur': '53',
    'Papua': '91',
    'Papua_Barat': '92',
    'Papua_Barat_Daya': '96',
    'Papua_Pegunungan': '94',
    'Papua_Selatan': '93',
    'Papua_Tengah': '95',
    'Riau': '14',
    'Sulawesi_Barat': '76',
    'Sulawesi_Selatan': '73',
    'Sulawesi_Tengah': '72',
    'Sulawesi_Tenggara': '74',
    'Sulawesi_Utara': '71',
    'Sumatera_Barat': '13',
    'Sumatera_Selatan': '16',
    'Sumatera_Utara': '12',
}

PAPUA_CODES = {'91', '92', '93', '94', '95', '96'}

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def load_json(path: Path) -> dict:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def merge_provinces():
    """Merge all province GeoJSON files into a single FeatureCollection."""
    prov_dir = SOURCE_DIR / 'Provinsi'
    features = []
    manifest_files = []
    
    for fname in sorted(prov_dir.glob('*.json')):
        folder_name = fname.stem
        official_name = PROVINCE_NAME_MAP.get(folder_name, folder_name.replace('_', ' '))
        code = PROVINCE_CODE_MAP.get(folder_name)
        
        data = load_json(fname)
        if not data.get('features'):
            print(f"WARNING: {fname} has no features")
            continue
        
        feat = data['features'][0]
        # Preserve original properties, add normalized ones
        props = feat.get('properties', {})
        new_props = {
            'code': code,
            'name': official_name,
            'level': 'province',
            'status': None,
            # Preserve original
            'KODE_PROV': props.get('KODE_PROV'),
            'PROVINSI': props.get('PROVINSI'),
        }
        
        # Verify code matches
        if props.get('KODE_PROV') != code:
            print(f"WARNING: Code mismatch for {folder_name}: source={props.get('KODE_PROV')}, expected={code}")
        
        features.append({
            'type': 'Feature',
            'properties': new_props,
            'geometry': feat.get('geometry'),
            'id': code,
        })
        
        # Manifest entry
        stat = fname.stat()
        manifest_files.append({
            'path': f'Provinsi/{fname.name}',
            'size_bytes': stat.st_size,
            'sha256': sha256_file(fname),
            'province_code': code,
            'province_name': official_name,
        })
    
    # Sort by code
    features.sort(key=lambda f: f['properties']['code'])
    
    fc = {
        'type': 'FeatureCollection',
        'name': 'Indonesia Provinces',
        'crs': {
            'type': 'name',
            'properties': {
                'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'
            }
        },
        'features': features
    }
    
    # Write merged file
    out_path = TARGET_DIR / 'provinces.geojson'
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(fc, f, ensure_ascii=False, separators=(',', ':'))
    
    print(f"Merged {len(features)} provinces to {out_path}")
    return features, manifest_files

def merge_regencies():
    """Merge all regency GeoJSON files into a single FeatureCollection."""
    kab_dir = SOURCE_DIR / 'Kabupaten'
    features = []
    manifest_files = []
    regency_count = 0
    
    for prov_folder in sorted(kab_dir.iterdir()):
        if not prov_folder.is_dir():
            continue
        
        province_name = PROVINCE_NAME_MAP.get(prov_folder.name, prov_folder.name.replace('_', ' '))
        province_code = PROVINCE_CODE_MAP.get(prov_folder.name)
        
        if not province_code:
            print(f"WARNING: Unknown province folder: {prov_folder.name}")
            continue
        
        for fname in sorted(prov_folder.glob('*.json')):
            data = load_json(fname)
            if not data.get('features'):
                print(f"WARNING: {fname} has no features")
                continue
            
            feat = data['features'][0]
            props = feat.get('properties', {})
            
            # Extract codes from properties
            kdpkab = props.get('KDPKAB')  # e.g., "91.03"
            kdppum = props.get('KDPPUM')  # e.g., "91"
            wadmkk = props.get('WADMKK')  # regency name
            wadmpr = props.get('WADMPR')  # province name
            kode_prov = props.get('KODE_PROV')
            
            # Verify province code matches
            if kdppum and kdppum != province_code:
                print(f"WARNING: Province code mismatch in {fname}: KDPKAB={kdpkab}, KDPPUM={kdppum}, expected={province_code}")
            
            # Use KDPKAB as the regency code (e.g., "91.03")
            regency_code = kdpkab
            if not regency_code:
                print(f"WARNING: No KDPKAB in {fname}")
                continue
            
            # Determine if it's a Kota (city) or Kabupaten
            is_kota = 'Kota_' in fname.name
            level = 'regency'  # both kabupaten and kota are "regency" level
            
            new_props = {
                'code': regency_code,
                'name': wadmkk,
                'level': level,
                'parentCode': province_code,
                'status': None,
                # Preserve original properties
                'OBJECTID': props.get('OBJECTID'),
                'NAMOBJ': props.get('NAMOBJ'),
                'FCODE': props.get('FCODE'),
                'REMARK': props.get('REMARK'),
                'METADATA': props.get('METADATA'),
                'SRS_ID': props.get('SRS_ID'),
                'KDBBPS': props.get('KDBBPS'),
                'KDCBPS': props.get('KDCBPS'),
                'KDCPUM': props.get('KDCPUM'),
                'KDEBPS': props.get('KDEBPS'),
                'KDEPUM': props.get('KDEPUM'),
                'KDPBPS': props.get('KDPBPS'),
                'KDPKAB': props.get('KDPKAB'),
                'KDPPUM': props.get('KDPPUM'),
                'LUASWH': props.get('LUASWH'),
                'TIPADM': props.get('TIPADM'),
                'WADMKC': props.get('WADMKC'),
                'WADMKD': props.get('WADMKD'),
                'WADMKK': props.get('WADMKK'),
                'WADMPR': props.get('WADMPR'),
                'WIADKC': props.get('WIADKC'),
                'WIADKK': props.get('WIADKK'),
                'WIADPR': props.get('WIADPR'),
                'WIADKD': props.get('WIADKD'),
                'UUPP': props.get('UUPP'),
                'LUAS': props.get('LUAS'),
                'KODE_PROV': props.get('KODE_PROV'),
            }
            
            features.append({
                'type': 'Feature',
                'properties': new_props,
                'geometry': feat.get('geometry'),
                'id': regency_code,
            })
            
            stat = fname.stat()
            manifest_files.append({
                'path': f'Kabupaten/{prov_folder.name}/{fname.name}',
                'size_bytes': stat.st_size,
                'sha256': sha256_file(fname),
                'regency_code': regency_code,
                'regency_name': wadmkk,
                'province_code': province_code,
                'province_name': province_name,
                'is_kota': is_kota,
            })
            
            regency_count += 1
    
    # Sort by code
    features.sort(key=lambda f: f['properties']['code'])
    
    fc = {
        'type': 'FeatureCollection',
        'name': 'Indonesia Regencies/Cities',
        'crs': {
            'type': 'name',
            'properties': {
                'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'
            }
        },
        'features': features
    }
    
    # Write merged file
    out_path = TARGET_DIR / 'regencies.geojson'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(fc, f, ensure_ascii=False, separators=(',', ':'))
    
    print(f"Merged {regency_count} regencies/cities to {out_path}")
    return features, manifest_files

def create_manifest(prov_features, prov_manifest, reg_features, reg_manifest):
    """Create the dataset manifest."""
    # Get git commit hash
    import subprocess
    result = subprocess.run(
        ['git', 'rev-parse', 'HEAD'],
        cwd=SOURCE_DIR,
        capture_output=True,
        text=True
    )
    commit_hash = result.stdout.strip()
    
    manifest = {
        'repository': {
            'url': 'https://github.com/mashadinoor/Indonesia-Geojson-2026',
            'commit_hash': commit_hash,
            'license': 'MIT',
            'license_file': 'LICENSE',
            'retrieved_at': datetime.utcnow().isoformat() + 'Z',
        },
        'provinces': {
            'expected_count': 38,
            'actual_count': len(prov_features),
            'files': prov_manifest,
            'papua_codes_verified': all(
                any(f['properties']['code'] == c for f in prov_features)
                for c in PAPUA_CODES
            ),
        },
        'regencies': {
            'expected_count': 514,
            'actual_count': len(reg_features),
            'files': reg_manifest,
        },
        'merged_files': {
            'provinces_geojson': 'public/geo/provinces.geojson',
            'regencies_geojson': 'public/geo/regencies.geojson',
        }
    }
    
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    
    print(f"Manifest written to {MANIFEST_PATH}")

def main():
    print("=== Step 1: Merging Provinces ===")
    prov_features, prov_manifest = merge_provinces()
    
    print("\n=== Step 2: Merging Regencies ===")
    reg_features, reg_manifest = merge_regencies()
    
    print("\n=== Step 3: Creating Manifest ===")
    create_manifest(prov_features, prov_manifest, reg_features, reg_manifest)
    
    print("\n=== Done ===")

if __name__ == '__main__':
    main()