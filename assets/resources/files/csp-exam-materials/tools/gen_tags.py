#!/usr/bin/env python3
"""从 TAGS.md 生成标签词表，同步到 tags.json 与 viewer.html。

**TAGS.md 是标签的唯一权威来源。** 加一个标签只需改 TAGS.md 里 VOCAB 标记之间的
表格，然后跑本脚本；两处产物会一起更新，不会再出现「规范改了、校验器没改、
页面显示还是英文」这种三边不同步。

用法:
    uv run python tools/gen_tags.py           # 生成
    uv run python tools/gen_tags.py --check   # 只检查是否已同步（校验器会调用）
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TAGS_MD = ROOT / "TAGS.md"
TAGS_JSON = ROOT / "tags.json"
VIEWER = ROOT / "viewer.html"

MD_BEGIN, MD_END = "<!-- VOCAB:BEGIN -->", "<!-- VOCAB:END -->"
JS_BEGIN, JS_END = "/* TAG_LABELS:BEGIN", "/* TAG_LABELS:END */"

ROW = re.compile(r"^\|\s*`((?:feat|topic):[a-z0-9_]+)`\s*\|\s*([^|]+?)\s*\|")


def parse_vocab(md: str) -> dict[str, str]:
    """抽取 VOCAB 标记之间的表格行 -> {标签: 中文名}。"""
    out: dict[str, str] = {}
    blocks = re.findall(re.escape(MD_BEGIN) + r"(.*?)" + re.escape(MD_END), md, re.S)
    if not blocks:
        raise SystemExit(f"TAGS.md 里找不到 {MD_BEGIN} / {MD_END} 标记")
    for block in blocks:
        for line in block.splitlines():
            m = ROW.match(line.strip())
            if not m:
                continue
            code, name = m.group(1), m.group(2).strip()
            if code in out:
                raise SystemExit(f"TAGS.md 中标签重复定义: {code}")
            out[code] = name
    if not out:
        raise SystemExit("VOCAB 标记之间没有解析到任何标签")
    return out


def render_json(vocab: dict[str, str]) -> str:
    return json.dumps(
        {"generated_from": "TAGS.md", "note": "由 tools/gen_tags.py 生成，请勿手改",
         "tags": dict(sorted(vocab.items()))},
        ensure_ascii=False, indent=2,
    ) + "\n"


def render_js(vocab: dict[str, str]) -> str:
    body = "\n".join(
        f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},"
        for k, v in sorted(vocab.items())
    )
    return "const TAG_LABEL = {\n" + body + "\n};"


def splice(text: str, begin: str, end: str, body: str, name: str) -> str:
    """替换 begin 行之后、end 行之前的全部内容。"""
    i, j = text.find(begin), text.find(end)
    if i < 0 or j < 0 or j < i:
        raise SystemExit(f"{name} 里找不到 {begin} / {end} 标记")
    head = text.index("\n", i) + 1
    return text[:head] + body + "\n" + text[j:]


def build() -> tuple[str, str]:
    md = TAGS_MD.read_text(encoding="utf-8")
    vocab = parse_vocab(md)
    return render_json(vocab), render_js(vocab)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="只检查是否已同步")
    args = ap.parse_args()

    want_json, want_js = build()

    cur_json = TAGS_JSON.read_text(encoding="utf-8") if TAGS_JSON.is_file() else ""
    html = VIEWER.read_text(encoding="utf-8")
    i, j = html.find(JS_BEGIN), html.find(JS_END)
    if i < 0 or j < 0:
        print(f"viewer.html 里找不到 {JS_BEGIN} / {JS_END} 标记", file=sys.stderr)
        return 1
    cur_js = html[html.index("\n", i) + 1:j].rstrip("\n")

    stale = []
    if cur_json != want_json:
        stale.append("tags.json")
    if cur_js != want_js:
        stale.append("viewer.html 的 TAG_LABEL")

    if args.check:
        if stale:
            print(f"✗ 标签词表未同步: {'、'.join(stale)}", file=sys.stderr)
            print("  跑 uv run python tools/gen_tags.py 重新生成", file=sys.stderr)
            return 1
        print("✓ 标签词表已同步")
        return 0

    TAGS_JSON.write_text(want_json, encoding="utf-8")
    VIEWER.write_text(splice(html, JS_BEGIN, JS_END, want_js, "viewer.html"), encoding="utf-8")
    n = len(json.loads(want_json)["tags"])
    print(f"✓ 已生成 {n} 个标签 -> tags.json、viewer.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
