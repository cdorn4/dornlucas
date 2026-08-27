#!/usr/bin/env python3
"""Resize and recompress images in a directory while preserving paths and names."""

from __future__ import annotations

import argparse
import os
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}


def optimize_image(path: Path, max_size: int, quality: int) -> tuple[int, int, bool]:
    original_size = path.stat().st_size
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image)
        source_dimensions = image.size
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        suffix = path.suffix.lower()
        save_kwargs: dict[str, object]
        if suffix in {".jpg", ".jpeg"}:
            if image.mode not in {"RGB", "L"}:
                image = image.convert("RGB")
            save_kwargs = {"format": "JPEG", "quality": quality, "optimize": True, "progressive": True}
        elif suffix == ".webp":
            save_kwargs = {"format": "WEBP", "quality": quality, "method": 6}
        else:
            save_kwargs = {"format": "PNG", "optimize": True}
        handle, temporary_name = tempfile.mkstemp(dir=path.parent, suffix=path.suffix)
        os.close(handle)
        temporary_path = Path(temporary_name)
        image.save(temporary_path, **save_kwargs)
        optimized_size = temporary_path.stat().st_size
        did_resize = source_dimensions != image.size
    try:
        if optimized_size < original_size:
            temporary_path.replace(path)
            return original_size, optimized_size, did_resize
    finally:
        temporary_path.unlink(missing_ok=True)
    return original_size, original_size, False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, nargs="?", default=Path("files/photos"))
    parser.add_argument("--max-size", type=int, default=2000)
    parser.add_argument("--quality", type=int, default=84)
    args = parser.parse_args()
    files = [path for path in args.directory.rglob("*") if path.is_file() and path.suffix.lower() in SUPPORTED]
    before = after = resized = reduced = 0
    for index, path in enumerate(files, 1):
        old_size, new_size, did_resize = optimize_image(path, args.max_size, args.quality)
        before += old_size
        after += new_size
        resized += int(did_resize)
        reduced += int(new_size < old_size)
        if index % 100 == 0 or index == len(files):
            print(f"Processed {index}/{len(files)} images")
    print(f"Images: {len(files)}")
    print(f"Resized: {resized}")
    print(f"Reduced: {reduced}")
    print(f"Before: {before / 1024 / 1024:.1f} MB")
    print(f"After: {after / 1024 / 1024:.1f} MB")
    print(f"Saved: {(before - after) / 1024 / 1024:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
