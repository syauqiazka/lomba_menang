#!/usr/bin/env python3
"""Build crisp, moderately simplified 38-province GeoJSON files from BIG BATAS_KABKOTA_AR JSON.

Streams the ~2 GB ArcGIS/GeoJSON export feature-by-feature using mmap + regex token scanning
so peak memory stays small, converts Esri rings (CW outer / CCW hole) into RFC 7946 GeoJSON
polygons/multipolygons (CCW outer / CW hole), simplifies rings iteratively with Douglas-Peucker,
merges duplicate KDPKAB entries, aligns province parentCode via public/geo/provinces.geojson,
and fills any single missing BIG feature from the existing public/geo/regencies backup.
"""

from __future__ import annotations

import argparse
import glob
import json
import mmap
import os
import re
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

TOKEN_RE = re.compile(rb'\\.|"|{|}|\]')

PROVINCE_NAME_ALIASES = {
    "daerah istimewa yogyakarta": "di yogyakarta",
    "d i yogyakarta": "di yogyakarta",
    "dki jakarta raya": "dki jakarta",
    "daerah khusus ibukota jakarta": "dki jakarta",
    "kepulauan bangka belitung": "kepulauan bangka belitung",
    "bangka belitung": "kepulauan bangka belitung",
    "nanggroe aceh darussalam": "aceh",
}


def norm_name(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def load_province_lookup(provinces_geojson: Path) -> tuple[dict[str, str], dict[str, str]]:
    """Return (normalized_name -> code, code -> official_name) from public/geo/provinces.geojson."""
    data = json.loads(provinces_geojson.read_text(encoding="utf-8"))
    name_to_code: dict[str, str] = {}
    code_to_name: dict[str, str] = {}
    for feat in data.get("features", []):
        props = feat.get("properties") or {}
        code = str(props.get("code") or "").strip()
        name = str(props.get("name") or "").strip()
        if not code or not name:
            continue
        code_to_name[code] = name
        name_to_code[norm_name(name)] = code
    return name_to_code, code_to_name


def load_existing_regencies_backup(regencies_dir: Path) -> dict[str, dict[str, Any]]:
    """Load existing regency GeoJSON features keyed by 4-digit code as fallback."""
    backup: dict[str, dict[str, Any]] = {}
    for path in sorted(glob.glob(str(regencies_dir / "*.geojson"))):
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        for feat in data.get("features", []):
            props = feat.get("properties") or {}
            code = str(props.get("code") or "").strip()
            if code and feat.get("geometry"):
                backup[code] = feat
    return backup


def stream_big_features(json_path: Path):
    """Yield parsed feature dicts one-by-one from the top-level 'features' array using fast C mm.find."""
    needle = b'{"attributes":'
    with json_path.open("rb") as f:
        mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        try:
            offsets: list[int] = []
            pos = mm.find(needle)
            while pos != -1:
                offsets.append(pos)
                pos = mm.find(needle, pos + len(needle))

            if not offsets:
                # Generic fallback if JSON lacks '{"attributes":'
                key_pos = mm.find(b'"features"')
                arr_start = mm.find(b"[", key_pos)
                depth = 0
                in_str = False
                obj_start: int | None = None
                for m in TOKEN_RE.finditer(mm, arr_start + 1):
                    tok = m.group(0)
                    if in_str:
                        if tok == b'"':
                            in_str = False
                        continue
                    if tok == b'"':
                        in_str = True
                    elif tok == b"{":
                        if depth == 0:
                            obj_start = m.start()
                        depth += 1
                    elif tok == b"}":
                        depth -= 1
                        if depth == 0 and obj_start is not None:
                            yield json.loads(mm[obj_start : m.end()].decode("utf-8"))
                            obj_start = None
                    elif tok == b"]" and depth == 0:
                        break
                return

            n = len(mm)
            decoder = json.JSONDecoder()
            for idx, start in enumerate(offsets):
                end = offsets[idx + 1] if idx + 1 < len(offsets) else n
                chunk = mm[start:end].decode("utf-8")
                feat, _ = decoder.raw_decode(chunk)
                yield feat
        finally:
            mm.close()


def signed_area2(ring: list[list[float]]) -> float:
    """Twice the signed shoelace area (>0 = CCW, <0 = CW)."""
    s = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[i + 1][0], ring[i + 1][1]
        s += x1 * y2 - x2 * y1
    return s


def ensure_closed(ring: list[list[float]]) -> list[list[float]]:
    if not ring:
        return ring
    if ring[0][0] != ring[-1][0] or ring[0][1] != ring[-1][1]:
        return ring + [list(ring[0])]
    return ring


def ring_bbox(ring: list[list[float]]) -> tuple[float, float, float, float]:
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return min(xs), min(ys), max(xs), max(ys)


def point_in_ring(pt: list[float], ring: list[list[float]]) -> bool:
    x, y = pt[0], pt[1]
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-18) + xi):
            inside = not inside
        j = i
    return inside


def decimate_radial(pts: list[list[float]], step_sq: float) -> list[list[float]]:
    """Fast linear O(n) pre-filter to collapse dense sub-epsilon jitter vertices before DP."""
    if len(pts) <= 64 or step_sq <= 0:
        return pts
    out = [pts[0]]
    lx, ly = pts[0][0], pts[0][1]
    for p in pts[1:-1]:
        dx = p[0] - lx
        dy = p[1] - ly
        if dx * dx + dy * dy >= step_sq:
            out.append(p)
            lx, ly = p[0], p[1]
    out.append(pts[-1])
    return out


def dp_open_iterative(pts: list[list[float]], eps_sq: float) -> list[list[float]]:
    """Iterative Douglas-Peucker on an open polyline."""
    n = len(pts)
    if n <= 2 or eps_sq <= 0:
        return pts

    keep = bytearray(n)
    keep[0] = 1
    keep[n - 1] = 1
    stack = [(0, n - 1)]

    while stack:
        start, end = stack.pop()
        if end - start <= 1:
            continue
        ax, ay = pts[start][0], pts[start][1]
        bx, by = pts[end][0], pts[end][1]
        dx = bx - ax
        dy = by - ay
        len_sq = dx * dx + dy * dy

        max_d_sq = -1.0
        idx = -1

        for i in range(start + 1, end):
            px, py = pts[i][0], pts[i][1]
            if len_sq == 0.0:
                d_sq = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = ((px - ax) * dx + (py - ay) * dy) / len_sq
                if t < 0.0:
                    cx, cy = ax, ay
                elif t > 1.0:
                    cx, cy = bx, by
                else:
                    cx, cy = ax + t * dx, ay + t * dy
                d_sq = (px - cx) ** 2 + (py - cy) ** 2
            if d_sq > max_d_sq:
                max_d_sq = d_sq
                idx = i

        if idx != -1 and max_d_sq > eps_sq:
            keep[idx] = 1
            stack.append((start, idx))
            stack.append((idx, end))

    return [pts[i] for i in range(n) if keep[i]]


def simplify_closed_ring(
    raw_ring: list[list[float]], eps: float, ccw: bool, decimals: int = 5
) -> list[list[float]] | None:
    """Simplify, orient (CCW for outer, CW for hole), round, deduplicate, and close a ring."""
    if len(raw_ring) < 3:
        return None
    ring = ensure_closed([[float(p[0]), float(p[1])] for p in raw_ring])

    # Open points without duplicate end, then fast radial pre-filter
    pts = ring[:-1]
    if len(pts) < 3:
        return None
    if eps > 0:
        pts = decimate_radial(pts, (eps * 0.2) ** 2)
    if len(pts) < 3:
        pts = ring[:-1]

    # Find vertex farthest from pts[0] to split closed loop into two open chains
    p0x, p0y = pts[0][0], pts[0][1]
    split_idx = max(
        range(1, len(pts)),
        key=lambda i: (pts[i][0] - p0x) ** 2 + (pts[i][1] - p0y) ** 2,
    )

    eps_sq = eps * eps
    chain1 = dp_open_iterative(pts[: split_idx + 1], eps_sq)
    chain2 = dp_open_iterative(pts[split_idx:] + [pts[0]], eps_sq)
    combined = chain1[:-1] + chain2[:-1]

    # Round and deduplicate consecutive vertices
    rounded: list[list[float]] = []
    for p in combined:
        rx = round(p[0], decimals)
        ry = round(p[1], decimals)
        if not rounded or rounded[-1][0] != rx or rounded[-1][1] != ry:
            rounded.append([rx, ry])

    if len(rounded) >= 2 and rounded[0] == rounded[-1]:
        rounded.pop()

    if len(rounded) < 3:
        return None

    closed = rounded + [list(rounded[0])]
    area2 = signed_area2(closed)
    if abs(area2) < 1e-11:
        return None

    if ccw and area2 < 0:
        closed.reverse()
    elif (not ccw) and area2 > 0:
        closed.reverse()

    return closed


def esri_rings_to_polygons(rings: list[list[list[float]]], eps: float, decimals: int) -> list[list[list[list[float]]]]:
    """Convert Esri JSON rings into RFC 7946 polygons list (each polygon = [outer, *holes])."""
    if not rings:
        return []

    raw_outers: list[tuple[list[list[float]], float, tuple[float, float, float, float]]] = []
    raw_holes: list[list[list[float]]] = []

    step_sq = (eps * 0.2) ** 2 if eps > 0 else 0.0
    for r in rings:
        if len(r) < 3:
            continue
        dec = decimate_radial(r, step_sq) if (step_sq > 0 and len(r) > 64) else r
        if len(dec) < 3:
            dec = r
        closed = ensure_closed([[float(p[0]), float(p[1])] for p in dec])
        a2 = signed_area2(closed)
        if abs(a2) < 1e-12:
            continue
        # Esri JSON: CW (negative shoelace area) = outer ring, CCW (positive) = hole
        if a2 < 0:
            raw_outers.append((closed, abs(a2), ring_bbox(closed)))
        else:
            raw_holes.append(closed)

    # Safety fallback if winding was non-standard and no negative ring existed
    if not raw_outers and raw_holes:
        for h in raw_holes:
            raw_outers.append((h, abs(signed_area2(h)), ring_bbox(h)))
        raw_holes = []

    # Simplify outer rings cleanly; drop sub-pixel rocks only if larger islands remain
    simplified_outers: list[tuple[list[list[float]], float, tuple[float, float, float, float]]] = []
    tiny_candidates: list[tuple[list[list[float]], float, tuple[float, float, float, float]]] = []

    for r, orig_area, bbox in raw_outers:
        dx = bbox[2] - bbox[0]
        dy = bbox[3] - bbox[1]
        is_tiny_islet = dx < 0.0012 and dy < 0.0012
        simp = simplify_closed_ring(r, eps=eps, ccw=True, decimals=decimals)
        if simp is None:
            # Never lose the only ring of a feature; try minimal tolerance
            simp = simplify_closed_ring(r, eps=0.0, ccw=True, decimals=decimals)
        if simp is None:
            continue
        item = (simp, orig_area, ring_bbox(simp))
        if is_tiny_islet:
            tiny_candidates.append(item)
        else:
            simplified_outers.append(item)

    if not simplified_outers and tiny_candidates:
        tiny_candidates.sort(key=lambda x: x[1], reverse=True)
        simplified_outers = tiny_candidates[:3]

    if not simplified_outers:
        return []

    # Prepare polygons [outer]
    polys: list[list[list[list[float]]]] = [[outer] for outer, _, _ in simplified_outers]

    # Attach holes to smallest enclosing outer ring
    for hr in raw_holes:
        simp_hole = simplify_closed_ring(hr, eps=eps, ccw=False, decimals=decimals)
        if simp_hole is None:
            continue
        test_pt = simp_hole[0]
        best_idx = -1
        best_area = float("inf")
        for idx, (outer_ring, outer_area, obbox) in enumerate(simplified_outers):
            if outer_area >= best_area:
                continue
            if obbox[0] <= test_pt[0] <= obbox[2] and obbox[1] <= test_pt[1] <= obbox[3]:
                if point_in_ring(test_pt, outer_ring):
                    best_idx = idx
                    best_area = outer_area
        if best_idx >= 0:
            polys[best_idx].append(simp_hole)

    return polys


def geojson_geom_to_polygons(geom: dict[str, Any], eps: float, decimals: int) -> list[list[list[list[float]]]]:
    """Normalize GeoJSON Polygon/MultiPolygon into simplified polygon list."""
    gtype = geom.get("type")
    coords = geom.get("coordinates") or []
    raw_polys = [coords] if gtype == "Polygon" else coords if gtype == "MultiPolygon" else []
    out: list[list[list[list[float]]]] = []
    for poly in raw_polys:
        if not poly:
            continue
        outer = simplify_closed_ring(poly[0], eps=eps, ccw=True, decimals=decimals)
        if outer is None:
            outer = simplify_closed_ring(poly[0], eps=0.0, ccw=True, decimals=decimals)
        if outer is None:
            continue
        rings = [outer]
        for h in poly[1:]:
            sh = simplify_closed_ring(h, eps=eps, ccw=False, decimals=decimals)
            if sh is not None:
                rings.append(sh)
        out.append(rings)
    return out


def count_vertices(geom: dict[str, Any] | None) -> int:
    if not geom:
        return 0
    gtype = geom.get("type")
    coords = geom.get("coordinates") or []
    if gtype == "Polygon":
        return sum(len(r) for r in coords)
    if gtype == "MultiPolygon":
        return sum(len(r) for p in coords for r in p)
    return 0


def resolve_province_code(
    raw_prov_name: str, fallback_prefix: str, name_to_code: dict[str, str], code_to_name: dict[str, str]
) -> str:
    n = norm_name(raw_prov_name)
    n = PROVINCE_NAME_ALIASES.get(n, n)
    if n in name_to_code:
        return name_to_code[n]
    if fallback_prefix in code_to_name:
        return fallback_prefix
    raise ValueError(f"Unmapped province name={raw_prov_name!r}, prefix={fallback_prefix!r}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--big-json",
        default=r"F:\syauqi\.tmp_big\big-administrative-boundaries\regency-city-geometries-514.json",
    )
    parser.add_argument("--eps", type=float, default=0.0008, help="Douglas-Peucker epsilon in degrees (~88m at 0.0008)")
    parser.add_argument("--decimals", type=int, default=5)
    args = parser.parse_args()

    t0 = time.time()
    repo_root = Path(__file__).resolve().parent.parent
    provinces_path = repo_root / "public" / "geo" / "provinces.geojson"
    regencies_dir = repo_root / "public" / "geo" / "regencies"
    combined_path = repo_root / "public" / "geo" / "regencies.geojson"

    name_to_code, code_to_name = load_province_lookup(provinces_path)
    backup_by_code = load_existing_regencies_backup(regencies_dir)

    big_path = Path(args.big_json)
    if not big_path.exists():
        raise FileNotFoundError(f"BIG geometry file not found: {big_path}")

    # Collect polygons grouped by normalized 4-digit KDPKAB (merges the 6 Sultra duplicates)
    merged: dict[str, dict[str, Any]] = {}
    streamed_count = 0

    for feat in stream_big_features(big_path):
        streamed_count += 1
        if streamed_count % 50 == 0:
            print(f"Processed {streamed_count} features ({time.time() - t0:.1f}s)...", flush=True)
        attrs = feat.get("attributes") or feat.get("properties") or {}
        raw_kdpkab = str(attrs.get("KDPKAB") or attrs.get("code") or "").strip()
        code = raw_kdpkab.replace(".", "")
        if len(code) != 4 or not code.isdigit():
            continue

        raw_name = str(attrs.get("NAMOBJ") or attrs.get("WADMKK") or attrs.get("name") or code).strip()
        raw_prov = str(attrs.get("WADMPR") or attrs.get("provinceName") or "").strip()
        prov_code = resolve_province_code(raw_prov, code[:2], name_to_code, code_to_name)

        geom = feat.get("geometry") or {}
        if "rings" in geom:
            polys = esri_rings_to_polygons(geom["rings"], eps=args.eps, decimals=args.decimals)
        else:
            polys = geojson_geom_to_polygons(geom, eps=args.eps, decimals=args.decimals)

        if not polys:
            continue

        entry = merged.setdefault(
            code,
            {
                "code": code,
                "name": raw_name,
                "prov_code": prov_code,
                "prov_name": code_to_name.get(prov_code, raw_prov),
                "polys": [],
            },
        )
        entry["polys"].extend(polys)

    # Check if BIG skipped any feature present in regency-city-attributes.json or existing backup
    attrs_path = repo_root / "data" / "raw" / "big-administrative-boundaries" / "regency-city-attributes.json"
    if attrs_path.exists():
        attr_data = json.loads(attrs_path.read_text(encoding="utf-8"))
        for feat in attr_data.get("features", []):
            attrs = feat.get("attributes") or {}
            code = str(attrs.get("KDPKAB") or "").replace(".", "").strip()
            if len(code) != 4 or code in merged:
                continue
            raw_name = str(attrs.get("NAMOBJ") or attrs.get("WADMKK") or code).strip()
            raw_prov = str(attrs.get("WADMPR") or "").strip()
            prov_code = resolve_province_code(raw_prov, code[:2], name_to_code, code_to_name)
            b_feat = backup_by_code.get(code)
            if not b_feat:
                norm_n = norm_name(raw_name)
                b_feat = next(
                    (bf for bf in backup_by_code.values() if norm_name(bf["properties"].get("name", "")) == norm_n),
                    None,
                )
            if b_feat and b_feat.get("geometry"):
                polys = geojson_geom_to_polygons(b_feat["geometry"], eps=0.0, decimals=args.decimals)
                if polys:
                    merged[code] = {
                        "code": code,
                        "name": raw_name,
                        "prov_code": prov_code,
                        "prov_name": code_to_name.get(prov_code, raw_prov),
                        "polys": polys,
                        "source": "Fallback backup",
                    }
                    print(f"Filled missing BIG regency {code} ({raw_name}) from backup.")

    # Build final GeoJSON features grouped by resolved province code
    by_province: dict[str, list[dict[str, Any]]] = defaultdict(list)
    all_features: list[dict[str, Any]] = []

    for code in sorted(merged.keys()):
        item = merged[code]
        polys = item["polys"]
        if len(polys) == 1:
            geometry = {"type": "Polygon", "coordinates": polys[0]}
        else:
            geometry = {"type": "MultiPolygon", "coordinates": polys}

        feature = {
            "type": "Feature",
            "properties": {
                "code": code,
                "name": item["name"],
                "level": "REGENCY_CITY",
                "parentCode": item["prov_code"],
                "provinceCode": item["prov_code"],
                "provinceName": item["prov_name"],
                "source": item.get("source", "BIG BATAS_KABKOTA_AR"),
            },
            "geometry": geometry,
        }
        by_province[item["prov_code"]].append(feature)
        all_features.append(feature)

    regencies_dir.mkdir(parents=True, exist_ok=True)
    total_bytes = 0
    max_file = ("", 0)
    for prov_code in sorted(code_to_name.keys()):
        feats = sorted(by_province.get(prov_code, []), key=lambda f: f["properties"]["code"])
        out_path = regencies_dir / f"{prov_code}.geojson"
        payload = json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":"))
        out_path.write_text(payload, encoding="utf-8")
        sz = out_path.stat().st_size
        total_bytes += sz
        if sz > max_file[1]:
            max_file = (out_path.name, sz)

    combined_payload = json.dumps(
        {"type": "FeatureCollection", "features": all_features},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    combined_path.write_text(combined_payload, encoding="utf-8")

    # Summary stats
    pts_list = [count_vertices(f["geometry"]) for f in all_features]
    medan = next((f for f in all_features if f["properties"]["code"] == "1271"), None)
    malaka = next((f for f in all_features if f["properties"]["code"] == "5321"), None)

    elapsed = time.time() - t0
    print(f"Streamed raw features : {streamed_count}")
    print(f"Unique regencies built: {len(all_features)} across {len(by_province)} provinces")
    print(f"Eps / Decimals        : {args.eps} deg / {args.decimals}")
    print(f"Split total size      : {total_bytes / (1024*1024):.2f} MB (largest: {max_file[0]} = {max_file[1]/1024:.1f} KB)")
    print(f"Combined size         : {os.path.getsize(combined_path) / (1024*1024):.2f} MB")
    print(f"Vertices min/avg/max  : {min(pts_list)} / {sum(pts_list)/len(pts_list):.1f} / {max(pts_list)}")
    print(f"Kota Medan (1271) pts : {count_vertices(medan['geometry']) if medan else 0}")
    print(f"Malaka (5321) pts     : {count_vertices(malaka['geometry']) if malaka else 0}")
    print(f"Elapsed               : {elapsed:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
