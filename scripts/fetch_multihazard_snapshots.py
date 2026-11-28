"""Fetch baseline offline fallback snapshots for BMKG Nowcast CAP, PVMBG MAGMA Volcanoes, and GDACS Indonesia."""

from __future__ import annotations

import json
import re
import ssl
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

SNAPSHOT_DIR = Path(__file__).resolve().parent.parent / "data" / "snapshots" / "bnpb-2026-11-28"
USER_AGENT = "SATGAS-PetaBencana/1.0 (+https://satgas-app)"
TIMEOUT_SEC = 25

SSL_CTX = ssl.create_default_context()


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_SEC, context=SSL_CTX) as resp:
        raw = resp.read()
        charset = resp.headers.get_content_charset() or "utf-8"
        return raw.decode(charset, errors="replace")


def parse_bmkg_nowcast() -> dict:
    rss_url = "https://www.bmkg.go.id/alerts/nowcast/id"
    rss_xml = fetch_text(rss_url)
    root = ET.fromstring(rss_xml)
    alerts = []

    for item in root.findall("./channel/item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        description = (item.findtext("description") or "").strip()

        cap_data = None
        if link.startswith("http"):
            try:
                cap_xml = fetch_text(link)
                cap_root = ET.fromstring(cap_xml)
                ns = {"cap": "urn:oasis:names:tc:emergency:cap:1.2"}
                info = cap_root.find("cap:info", ns)
                if info is None:
                    info = cap_root.find("info")
                if info is not None:
                    def get_tag(parent: ET.Element, tag: str) -> str:
                        el = parent.find(f"cap:{tag}", ns)
                        if el is None:
                            el = parent.find(tag)
                        return (el.text or "").strip() if el is not None else ""

                    areas = []
                    area_els = info.findall("cap:area", ns) or info.findall("area")
                    for area_el in area_els:
                        area_desc = get_tag(area_el, "areaDesc")
                        poly_els = area_el.findall("cap:polygon", ns) or area_el.findall("polygon")
                        polygons = []
                        for poly_el in poly_els:
                            pts_raw = (poly_el.text or "").strip()
                            if pts_raw:
                                polygons.append(pts_raw)
                        areas.append({"areaDesc": area_desc, "polygons": polygons})

                    cap_data = {
                        "event": get_tag(info, "event"),
                        "severity": get_tag(info, "severity"),
                        "urgency": get_tag(info, "urgency"),
                        "effective": get_tag(info, "effective"),
                        "expires": get_tag(info, "expires"),
                        "headline": get_tag(info, "headline"),
                        "description": get_tag(info, "description"),
                        "instruction": get_tag(info, "instruction"),
                        "senderName": get_tag(info, "senderName"),
                        "areas": areas,
                    }
            except Exception as exc:
                print(f"[WARN] Failed to fetch CAP XML {link}: {exc}")

        alerts.append(
            {
                "title": title,
                "link": link,
                "pubDate": pub_date,
                "description": description,
                "cap": cap_data,
            }
        )

    return {
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "sourceUrl": rss_url,
        "count": len(alerts),
        "alerts": alerts,
    }


def parse_magma_volcanoes() -> dict:
    url = "https://magma.esdm.go.id/v1"
    html = fetch_text(url)
    marker_idx = html.find("markersGunungApi")
    if marker_idx == -1:
        raise ValueError("markersGunungApi not found in MAGMA v1 HTML")
    bracket_start = html.find("[", marker_idx)
    if bracket_start == -1:
        raise ValueError("JSON array start not found after markersGunungApi")

    decoder = json.JSONDecoder()
    volcanoes, _ = decoder.raw_decode(html, bracket_start)
    if not isinstance(volcanoes, list):
        raise ValueError("markersGunungApi did not decode to a list")

    return {
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "sourceUrl": url,
        "total": len(volcanoes),
        "volcanoes": volcanoes,
    }


def parse_gdacs_indonesia() -> dict:
    url = "https://www.gdacs.org/xml/rss.xml"
    rss_xml = fetch_text(url)
    root = ET.fromstring(rss_xml)
    ns = {
        "gdacs": "http://www.gdacs.org",
        "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
    }
    items = []
    for item in root.findall("./channel/item"):
        country = (item.findtext("gdacs:country", "", ns) or "").strip()
        iso3 = (item.findtext("gdacs:iso3", "", ns) or "").strip()
        title = (item.findtext("title") or "").strip()
        if "indonesia" not in country.lower() and iso3.upper() != "IDN" and "indonesia" not in title.lower():
            continue

        lat_str = (item.findtext("geo:lat", "", ns) or "").strip()
        lon_str = (item.findtext("geo:long", "", ns) or "").strip()
        if not lat_str or not lon_str:
            point = (item.findtext("georss:point", "", {"georss": "http://www.georss.org/georss"}) or "").strip()
            parts = re.split(r"\s+", point)
            if len(parts) >= 2:
                lat_str, lon_str = parts[0], parts[1]

        items.append(
            {
                "title": title,
                "link": (item.findtext("link") or "").strip(),
                "description": (item.findtext("description") or "").strip(),
                "pubDate": (item.findtext("pubDate") or "").strip(),
                "eventType": (item.findtext("gdacs:eventtype", "", ns) or "").strip(),
                "alertLevel": (item.findtext("gdacs:alertlevel", "", ns) or "").strip(),
                "eventId": (item.findtext("gdacs:eventid", "", ns) or "").strip(),
                "country": country,
                "iso3": iso3,
                "fromDate": (item.findtext("gdacs:fromdate", "", ns) or "").strip(),
                "toDate": (item.findtext("gdacs:todate", "", ns) or "").strip(),
                "lat": float(lat_str) if lat_str else None,
                "lng": float(lon_str) if lon_str else None,
            }
        )

    return {
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "sourceUrl": url,
        "count": len(items),
        "items": items,
    }


def main() -> None:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

    bmkg_data = parse_bmkg_nowcast()
    bmkg_path = SNAPSHOT_DIR / "bmkg_nowcast_snapshot.json"
    bmkg_path.write_text(json.dumps(bmkg_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {bmkg_path.name}: {bmkg_data['count']} alerts")

    magma_data = parse_magma_volcanoes()
    magma_path = SNAPSHOT_DIR / "magma_volcanoes.json"
    magma_path.write_text(json.dumps(magma_data, ensure_ascii=False, indent=2), encoding="utf-8")
    elevated = [v for v in magma_data["volcanoes"] if str(v.get("ga_status", "")) in {"2", "3", "4"}]
    print(f"Saved {magma_path.name}: {magma_data['total']} total volcanoes ({len(elevated)} elevated)")

    gdacs_data = parse_gdacs_indonesia()
    gdacs_path = SNAPSHOT_DIR / "gdacs_idn_snapshot.json"
    gdacs_path.write_text(json.dumps(gdacs_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {gdacs_path.name}: {gdacs_data['count']} Indonesia items")


if __name__ == "__main__":
    main()
