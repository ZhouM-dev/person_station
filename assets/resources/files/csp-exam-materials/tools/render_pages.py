#!/usr/bin/env python3
"""把 PDF 逐页渲染成 PNG，供扫描件（无文本层）识别转写使用。

用法:
    uv run --with pymupdf python tools/render_pages.py <pdf> <outdir> [--dpi 200]
"""
import argparse
import pathlib
import sys

import pymupdf


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("outdir")
    ap.add_argument("--dpi", type=int, default=200)
    args = ap.parse_args()

    src = pathlib.Path(args.pdf)
    if not src.is_file():
        print(f"找不到文件: {src}", file=sys.stderr)
        return 1

    outdir = pathlib.Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(src)
    zoom = args.dpi / 72
    mat = pymupdf.Matrix(zoom, zoom)

    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(matrix=mat)
        dst = outdir / f"p{i:03d}.png"
        pix.save(dst)
        print(f"{dst}  {pix.width}x{pix.height}  {dst.stat().st_size // 1024}KB")

    print(f"共 {doc.page_count} 页 -> {outdir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
