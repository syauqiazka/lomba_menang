"""Fetch baseline offline fallback snapshots for 2-year multi-hazard trends and 7-day NASA FIRMS."""

from __future__ import annotations

import csv
import io
import json
import ssl
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

SNAPSHOT_DIR = Path(__file__).resolve().parent.parent / "data" / "snapshots" / "bnpb-2026-11-28"
USER_AGENT = "SATGAS-TrenBencana/1.0 (+https://satgas-app)"
TIMEOUT_SEC = 30
SSL_CTX = ssl.create_default_context()


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_SEC, context=SSL_CTX) as resp:
        return resp.read().decode("utf-8", errors="replace")


def fetch_usgs_2y(now_utc: datetime) -> dict:
    start_iso = (now_utc - timedelta(days=730)).strftime("%Y-%m-%d")
    end_iso = now_utc.strftime("%Y-%m-%d")
    # Fetch in two 1-year chunks to stay well under USGS 20,000 limit
    mid_iso = (now_utc - timedelta(days=365)).strftime("%Y-%m-%d")
    events = []
    seen = set()

    for s, e in [(start_iso, mid_iso), (mid_iso, end_iso)]:
        url = (
            "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson"
            "&minlatitude=-11.5&maxlatitude=6.5&minlongitude=94.5&maxlongitude=141.5"
            f"&minmagnitude=4.0&starttime={s}&endtime={e}&limit=10000"
        )
        data = json.loads(fetch_text(url))
        for ft in data.get("features", []):
            props = ft.get("properties") or {}
            coords = (ft.get("geometry") or {}).get("coordinates") or []
            t = props.get("time")
            mag = props.get("mag")
            if not isinstance(t, (int, float)) or len(coords) < 2:
                continue
            key = (int(t), round(coords[0], 3), round(coords[1], 3))
            if key in seen:
                continue
            seen.add(key)
            events.append(
                {
                    "t": int(t),
                    "lng": round(float(coords[0]), 4),
                    "lat": round(float(coords[1]), 4),
                    "mag": round(float(mag), 1) if isinstance(mag, (int, float)) else None,
                }
            )

    return {"fetchedAt": now_utc.isoformat(), "count": len(events), "events": events}


def fetch_eonet_2y(now_utc: datetime) -> dict:
    url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=730&bbox=94.5,6.5,141.5,-11.5&limit=500"
    data = json.loads(fetch_text(url))
    return {
        "fetchedAt": now_utc.isoformat(),
        "count": len(data.get("events", [])),
        "events": data.get("events", []),
    }


def fetch_gdacs_2y(now_utc: datetime) -> dict:
    from_iso = (now_utc - timedelta(days=730)).strftime("%Y-%m-%d")
    to_iso = now_utc.strftime("%Y-%m-%d")
    merged = {}

    for ev_type in ["FL", "TC", "VO", "WF", "DR"]:
        url = (
            "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH"
            f"?fromDate={from_iso}&toDate={to_iso}&alertlevel=Green;Orange;Red"
            f"&country=Indonesia&eventlist={ev_type}&limit=500"
        )
        try:
            body = fetch_text(url)
            if not body.strip().startswith("{"):
                continue
            data = json.loads(body)
            for ft in data.get("features", []):
                props = ft.get("properties") or {}
                key = f"{props.get('eventtype','')}-{props.get('eventid','')}"
                if key not in merged:
                    merged[key] = ft
        except Exception as exc:
            print(f"[WARN] GDACS {ev_type} fetch failed: {exc}")

    features = list(merged.values())
    return {"fetchedAt": now_utc.isoformat(), "count": len(features), "features": features}


def filter_firms_csv(csv_text: str) -> tuple[str, int]:
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    if not rows:
        return "", 0
    header = rows[0]
    try:
        lat_idx = header.index("latitude")
        lng_idx = header.index("longitude")
    except ValueError:
        return csv_text, len(rows) - 1

    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(header)
    kept = 0
    for r in rows[1:]:
        if len(r) <= max(lat_idx, lng_idx):
            continue
        try:
            lat = float(r[lat_idx])
            lng = float(r[lng_idx])
        except ValueError:
            continue
        if -11.5 <= lat <= 6.5 and 94.5 <= lng <= 141.5:
            writer.writerow(r)
            kept += 1
    return out.getvalue(), kept


def main() -> None:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    now_utc = datetime.now(timezone.utc)

    usgs = fetch_usgs_2y(now_utc)
    (SNAPSHOT_DIR / "usgs_2y_idn.json").write_text(
        json.dumps(usgs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"Saved usgs_2y_idn.json: {usgs['count']} events")

    eonet = fetch_eonet_2y(now_utc)
    (SNAPSHOT_DIR / "eonet_2y_idn.json").write_text(
        json.dumps(eonet, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"Saved eonet_2y_idn.json: {eonet['count']} events")

    gdacs = fetch_gdacs_2y(now_utc)
    (SNAPSHOT_DIR / "gdacs_2y_idn.json").write_text(
        json.dumps(gdacs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(f"Saved gdacs_2y_idn.json: {gdacs['count']} events")

    for fname, url in [
        (
            "nasa_firms_noaa20_7d.csv",
            "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_7d.csv",
        ),
        (
            "nasa_firms_modis_7d.csv",
            "https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_SouthEast_Asia_7d.csv",
        ),
    ]:
        filtered_csv, kept = filter_firms_csv(fetch_text(url))
        (SNAPSHOT_DIR / fname).write_text(filtered_csv, encoding="utf-8")
        print(f"Saved {fname}: {kept} Indonesia bbox rows")


if __name__ == "__main__":
    main()
