#!/usr/bin/env python3
"""勘察源 PDF：页数、有无文本层、文本层是否可信。

派工前先跑这个，避免把「文本层是广告水印」这类文件当成正常文本层派下去。

用法:
    uv run --with pymupdf python tools/survey_sources.py              # 勘察 题目/ 全部（含子目录）
    uv run --with pymupdf python tools/survey_sources.py 题目/csp-j   # 只勘察指定目录
"""
import argparse
import pathlib

import pymupdf

ROOT = pathlib.Path(__file__).resolve().parent.parent

# 出现这些词说明文本层很可能是推广页 / 页眉页脚，不是题目正文
JUNK_MARKERS = ("微信公众号", "咨询热线", "官方网站", "自主选拔", "微信客服", "zizzsw")

ap = argparse.ArgumentParser()
ap.add_argument("dir", nargs="?", default="题目", help="要勘察的目录（默认 题目）")
args = ap.parse_args()

SRC = pathlib.Path(args.dir)
if not SRC.is_absolute():
    SRC = ROOT / SRC

print(f"{'文件':<30} {'页数':>4}  {'文本层':<10} {'可信':<6} 首行摘录")
print("-" * 108)

for pdf in sorted(SRC.rglob("*.pdf")):
    try:
        doc = pymupdf.open(pdf)
    except Exception as e:
        print(f"{pdf.name:<18} 打不开: {e}")
        continue

    pages = doc.page_count
    chars = 0
    sample = ""
    junk = 0

    for page in doc:
        t = page.get_text().strip()
        chars += len(t)
        if not sample and t:
            sample = t.splitlines()[0][:34]
        if any(m in t for m in JUNK_MARKERS):
            junk += 1

    has_text = chars > pages * 30          # 平均每页 30 字符以上才算有文本层
    kind = "有" if has_text else "无(图像)"
    trust = "—"
    if has_text:
        trust = "否(广告)" if junk >= pages * 0.6 else "是"

    rel = pdf.relative_to(SRC) if SRC in pdf.parents else pdf.name
    print(f"{str(rel):<30} {pages:>4}  {kind:<10} {trust:<6} {sample}")

print("\n提示：「可信=否」的文件文本层是推广页，必须按扫描件流程处理。")
