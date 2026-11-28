#!/usr/bin/env python3
"""Fetch official disaster, infrastructure-access, and impact snapshots from BNPB Geoportal.

Saves reviewed JSON snapshots under data/snapshots/bnpb-2026-11-28/ along with a SHA-256 manifest
so application runtime and database imports remain reproducible and never scrape at request time.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import ssl
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SNAPSHOT_DIR = Path(__file__).resolve().parent.parent / "data" / "snapshots" / "bnpb-2026-11-28"
IDN_BBOX = (-11.5, 6.5, 94.5, 141.5)  # min_lat, max_lat, min_lon, max_lon

ENDPOINTS = [
    {
        "key": "mv_gempa_ntt_2026_v2",
        "filename": "mv_gempa_ntt_2026_v2.json",
        "kind": "json",
        "title": "BNPB Geoportal — Data Dampak Gempabumi NTT Agustus 2026 (mv_gempa_ntt_2026_v2)",
        "url": "https://gis.bnpb.go.id/server/rest/services/2026_gempabumi_ntt/mv_gempa_ntt_2026_v2/MapServer/40/query?where=1%3D1&outFields=*&returnGeometry=false&f=pjson",
    },
    {
        "key": "mv_bansor_sumatera_v4",
        "filename": "mv_bansor_sumatera_v4.json",
        "kind": "json",
        "title": "BNPB Geoportal — Data Banjir dan Longsor Sumatera (MV_Bansor_Sumatera_v4)",
        "url": "https://gis.bnpb.go.id/server/rest/services/MV_Bansor_Sumatera_v4/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&f=pjson",
    },
    {
        "key": "kejadian_bencana_mingguan",
        "filename": "kejadian_bencana_mingguan.json",
        "kind": "json",
        "title": "BNPB Geoportal — Kejadian Bencana Mingguan Nasional (Kejadian_Bencana_Mingguan)",
        "url": "https://gis.bnpb.go.id/server/rest/services/Kejadian_Bencana_Mingguan/MapServer/25/query?where=1%3D1&outFields=*&returnGeometry=false&f=pjson",
    },
    {
        "key": "data_jalan_jembatan_putus_akses_pu",
        "filename": "data_jalan_jembatan_putus_akses_pu.json",
        "kind": "json",
        "title": "SITABA Kementerian PU & BNPB — Data Jalan dan Jembatan Putus Akses",
        "url": "https://gis.bnpb.go.id/server/rest/services/Data_Jalan_Jembatan_Putus_Akses_PU/MapServer/13/query?where=1%3D1&outFields=*&returnGeometry=false&f=pjson",
    },
    {
        "key": "bmkg_gempaterkini",
        "filename": "bmkg_gempaterkini.json",
        "kind": "json",
        "title": "BMKG TEWS — Gempa Bumi Terkini (M >= 5.0)",
        "url": "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json",
    },
    {
        "key": "bmkg_gempadirasakan",
        "filename": "bmkg_gempadirasakan.json",
        "kind": "json",
        "title": "BMKG TEWS — Gempa Bumi Dirasakan",
        "url": "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json",
    },
    {
        "key": "nasa_firms_noaa20_24h",
        "filename": "nasa_firms_noaa20_24h.csv",
        "kind": "csv",
        "title": "NASA EOSDIS FIRMS — VIIRS NOAA-20 24h (Indonesia)",
        "url": "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_24h.csv",
    },
    {
        "key": "nasa_firms_modis_24h",
        "filename": "nasa_firms_modis_24h.csv",
        "kind": "csv",
        "title": "NASA EOSDIS FIRMS — MODIS C6.1 24h (Indonesia)",
        "url": "https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_SouthEast_Asia_24h.csv",
    },
    {
        "key": "usgs_earthquakes_idn",
        "filename": "usgs_earthquakes_idn.json",
        "kind": "json",
        "title": "USGS Earthquake Hazards Program — Indonesia M >= 4.0",
        "url": "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=-11.5&maxlatitude=6.5&minlongitude=94.5&maxlongitude=141.5&minmagnitude=4.0&limit=25",
    },
    {
        "key": "bnpb_karhutla_2026",
        "filename": "bnpb_karhutla_2026.json",
        "kind": "json",
        "title": "BNPB Geoportal — Situasi Penanganan Karhutla Provinsi 2026",
        "url": "https://gis.bnpb.go.id/server/rest/services/2026_karhutla/mv_prov_karhutla_2026/MapServer/3/query?where=1%3D1&outFields=*&returnGeometry=false&f=pjson",
    },
]


def fetch_with_retry(url: str, ctx: ssl.SSLContext, retries: int = 6) -> bytes:
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
                    "Connection": "close",
                },
            )
            with urllib.request.urlopen(req, timeout=35, context=ctx) as resp:
                return resp.read()
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            if attempt < retries - 1:
                time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"Failed fetching {url}: {last_err}")


def main() -> int:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    manifest: dict[str, Any] = {
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "sourcePortal": "https://gis.bnpb.go.id/server/rest/services",
        "datasets": [],
    }

    for idx, ep in enumerate(ENDPOINTS):
        if idx > 0:
            time.sleep(2.0)
        raw_bytes = fetch_with_retry(ep["url"], ctx)
        out_path = SNAPSHOT_DIR / ep["filename"]

        if ep.get("kind") == "csv":
            txt = raw_bytes.decode("utf-8")
            reader = csv.DictReader(io.StringIO(txt))
            fieldnames = reader.fieldnames or []
            filtered_rows = []
            for row in reader:
                try:
                    lat = float(row["latitude"])
                    lon = float(row["longitude"])
                except (KeyError, ValueError):
                    continue
                if IDN_BBOX[0] <= lat <= IDN_BBOX[1] and IDN_BBOX[2] <= lon <= IDN_BBOX[3]:
                    filtered_rows.append(row)
            buf = io.StringIO()
            writer = csv.DictWriter(buf, fieldnames=fieldnames, lineterminator="\n")
            writer.writeheader()
            writer.writerows(filtered_rows)
            formatted = buf.getvalue().encode("utf-8")
            feature_count = len(filtered_rows)
        else:
            parsed = json.loads(raw_bytes.decode("utf-8"))
            features = parsed.get("features") or parsed.get("Infogempa", {}).get("gempa") or []
            if not features:
                raise RuntimeError(f"Endpoint {ep['key']} returned 0 features")
            formatted = json.dumps(parsed, ensure_ascii=False, indent=2).encode("utf-8")
            feature_count = len(features)

        out_path.write_bytes(formatted)
        sha256 = hashlib.sha256(formatted).hexdigest()

        manifest["datasets"].append(
            {
                "key": ep["key"],
                "title": ep["title"],
                "filename": ep["filename"],
                "url": ep["url"],
                "featureCount": feature_count,
                "bytes": len(formatted),
                "sha256": sha256,
            }
        )
        print(f"[{ep['key']}] saved {feature_count} features -> {out_path.name} ({len(formatted)} bytes)")

    manifest_path = SNAPSHOT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifest saved -> {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
