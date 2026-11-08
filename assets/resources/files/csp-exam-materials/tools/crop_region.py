#!/usr/bin/env python3
"""从页面 PNG 中裁切指定矩形区域，用于把扫描件里的插图单独提取成 assets 图片。

坐标以「原图像素」为单位，原点在左上角。

用法:
    uv run --with pillow python tools/crop_region.py <src.png> <dst.png> ^
        --box left,top,right,bottom [--mask x1,y1,x2,y2]... [--trim] [--pad 8]

    --mask  在裁切结果上涂白一块区域（坐标相对裁切框左上角），可重复。
            用于去掉窜入图框的上一行残字、页码、水印等。
    --trim  自动裁掉四周纯白边距，适合手工框得偏大的情况。
"""
import argparse
import pathlib
import sys

from PIL import Image, ImageDraw, ImageOps


def trim_white(im: Image.Image, tolerance: int = 245) -> Image.Image:
    """裁掉四周接近纯白的边距。"""
    gray = im.convert("L")
    mask = gray.point(lambda v: 0 if v >= tolerance else 255)
    bbox = mask.getbbox()
    return im.crop(bbox) if bbox else im


def parse_quad(raw: str, what: str) -> tuple[int, int, int, int]:
    parts = raw.split(",")
    if len(parts) != 4:
        raise argparse.ArgumentTypeError(f"{what} 需要四个整数，收到: {raw}")
    try:
        return tuple(int(p) for p in parts)  # type: ignore[return-value]
    except ValueError:
        raise argparse.ArgumentTypeError(f"{what} 必须是整数，收到: {raw}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--box", required=True, type=lambda s: parse_quad(s, "--box"))
    ap.add_argument("--mask", action="append", default=[],
                    type=lambda s: parse_quad(s, "--mask"),
                    help="裁切后涂白的区域 x1,y1,x2,y2（可重复）")
    ap.add_argument("--pad", type=int, default=0, help="裁切后向外补的白边像素")
    ap.add_argument("--trim", action="store_true", help="自动收紧白边")
    args = ap.parse_args()

    src = pathlib.Path(args.src)
    if not src.is_file():
        print(f"找不到文件: {src}", file=sys.stderr)
        return 1

    im = Image.open(src).convert("RGB")
    w, h = im.size
    l, t, r, b = args.box
    if not (0 <= l < r <= w and 0 <= t < b <= h):
        print(f"box {args.box} 超出图像范围 {w}x{h}", file=sys.stderr)
        return 1

    out = im.crop(args.box)

    for mask in args.mask:
        ImageDraw.Draw(out).rectangle(mask, fill="white")

    if args.trim:
        out = trim_white(out)
    if args.pad:
        out = ImageOps.expand(out, border=args.pad, fill="white")

    dst = pathlib.Path(args.dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst)
    print(f"{dst}  {out.width}x{out.height}  {dst.stat().st_size // 1024}KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
