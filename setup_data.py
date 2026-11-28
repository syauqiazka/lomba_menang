#!/usr/bin/env python3
"""Download and connect the Hugging Face dataset for this project."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from huggingface_hub import snapshot_download
from huggingface_hub.utils import HfHubHTTPError

DATASET_REPO_ID = "syauqisadsaa/lomba"
DATASET_SUBDIR = "big-administrative-boundaries"

TRACKED_OVERLAP_PATTERNS = [
    f"{DATASET_SUBDIR}/extract_big_admin.py",
    f"{DATASET_SUBDIR}/extract_big_admin_v2.py",
    f"{DATASET_SUBDIR}/extract_big_admin_v3.py",
    f"{DATASET_SUBDIR}/extract_complete.py",
    f"{DATASET_SUBDIR}/province-attributes.json",
    f"{DATASET_SUBDIR}/extraction-report.json",
    f"{DATASET_SUBDIR}/regency-city-attributes.json",
    f"{DATASET_SUBDIR}/all-admin-boundaries-attributes.json",
]

RAW_BATCH_PATTERNS = [
    f"{DATASET_SUBDIR}/kabkota-geom-batch-*.json",
    f"{DATASET_SUBDIR}/recovered/*",
    f"{DATASET_SUBDIR}/*sample*.json",
    f"{DATASET_SUBDIR}/geometry-test-batch.json",
]

CONSOLIDATED_GEOM_PATTERN = f"{DATASET_SUBDIR}/regency-city-geometries-514.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download the syauqisadsaa/lomba dataset from Hugging Face into ./data/raw."
    )
    parser.add_argument(
        "--mode",
        choices=("minimal", "consolidated", "full"),
        default="minimal",
        help=(
            "Download profile: 'minimal' (~0.8 MB attributes/metadata/scripts, default), "
            "'consolidated' (+2.0 GB regency-city-geometries-514.json), or "
            "'full' (all ~4.0 GB including raw batches)."
        ),
    )
    parser.add_argument(
        "--overwrite-tracked",
        action="store_true",
        help="Also download files that already exist in Git under data/raw/big-administrative-boundaries/.",
    )
    return parser.parse_args()


def summarize_directory(target_dir: Path) -> tuple[int, int]:
    """Return (file_count, total_bytes) for all files under target_dir."""
    file_count = 0
    total_bytes = 0
    if not target_dir.exists():
        return 0, 0
    for path in target_dir.rglob("*"):
        if path.is_file():
            file_count += 1
            total_bytes += path.stat().st_size
    return file_count, total_bytes


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parent
    local_raw_dir = repo_root / "data" / "raw"
    dataset_dir = local_raw_dir / DATASET_SUBDIR
    local_raw_dir.mkdir(parents=True, exist_ok=True)

    ignore_patterns = [".gitattributes"]
    if not args.overwrite_tracked:
        ignore_patterns.extend(TRACKED_OVERLAP_PATTERNS)

    if args.mode == "minimal":
        ignore_patterns.extend(RAW_BATCH_PATTERNS)
        ignore_patterns.append(CONSOLIDATED_GEOM_PATTERN)
    elif args.mode == "consolidated":
        ignore_patterns.extend(RAW_BATCH_PATTERNS)

    print(f"Downloading Hugging Face dataset '{DATASET_REPO_ID}' (mode={args.mode})...")
    print(f"Target directory: {dataset_dir}")

    try:
        snapshot_download(
            repo_id=DATASET_REPO_ID,
            repo_type="dataset",
            local_dir=str(local_raw_dir),
            ignore_patterns=ignore_patterns,
        )
    except HfHubHTTPError as exc:
        status_code = getattr(exc.response, "status_code", None)
        if status_code in (401, 403):
            print(
                "\nAuthentication required: this dataset is private or gated.\n"
                "Please log in first with:\n"
                "  huggingface-cli login   (or: hf auth login)\n"
                "Then re-run: python setup_data.py",
                file=sys.stderr,
            )
            return 1
        print(f"\nFailed to download dataset from Hugging Face: {exc}", file=sys.stderr)
        return 1

    file_count, total_bytes = summarize_directory(dataset_dir)
    size_mb = total_bytes / (1024 * 1024)
    size_gb = total_bytes / (1024 * 1024 * 1024)
    print("\nDataset setup complete!")
    print(f"  Mode       : {args.mode}")
    print(f"  Path       : {dataset_dir}")
    print(f"  Files      : {file_count}")
    print(f"  Total size : {size_mb:.2f} MB ({size_gb:.2f} GB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
