#!/usr/bin/env python3
"""从各年份的 meta.json 重建 题库/index.json（全库总索引）。

index.json 是**派生文件**：权威数据在各年的 meta.json 里，本脚本只做汇总。
每交付一份新试卷（或改动 paper_id / 答案状态）后，重跑一次即可。

用法:
    uv run python tools/gen_index.py
    uv run python tools/gen_index.py --check    # 只检查是否已同步，不写入
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LIB = ROOT / "题库"
OUT = LIB / "index.json"

# 组别元信息。新增组别（如 csp-j2）时在此登记。
EXAM_META = {
    "csp-s1": {"exam": "CSP-S1", "name": "CCF CSP 提高级第一轮", "level": "提高级"},
    "csp-j1": {"exam": "CSP-J1", "name": "CCF CSP 入门级第一轮", "level": "入门级"},
}
EXAM_ORDER = ["csp-s1", "csp-j1"]


def rel(p: pathlib.Path) -> str:
    """相对仓库根的 POSIX 风格路径。"""
    return p.relative_to(ROOT).as_posix()


def collect() -> list[dict]:
    exams = []
    for dirname in EXAM_ORDER:
        d = LIB / dirname
        if not d.is_dir():
            continue
        meta_info = EXAM_META.get(dirname)
        if meta_info is None:
            print(f"⚠ {dirname}: 未在 EXAM_META 登记，已跳过", file=sys.stderr)
            continue

        papers = []
        for meta_path in sorted(d.glob("*/meta.json")):
            if any(part.startswith(("_", ".")) for part in meta_path.parts):
                continue
            m = json.loads(meta_path.read_text(encoding="utf-8"))
            qs = m.get("questions", [])
            papers.append({
                "paper_id": m["paper_id"],
                "year": m["year"],
                "title": m["title"],
                "question_count": m.get("question_count", len(qs)),
                "total_score": m.get("total_score"),
                "path": rel(meta_path.parent),
                "source_file": (m.get("source") or {}).get("file"),
                "source_kind": (m.get("source") or {}).get("kind"),
                # 有答案的题数 > 0 即视为「有答案」，避免 2025 这种部分有答案的卷判错
                "has_answers": sum(1 for q in qs if q.get("answer")) > 0,
                "answered_count": sum(1 for q in qs if q.get("answer")),
                "answer_source": (m.get("answer_source") or {}).get("kind"),
            })

        papers.sort(key=lambda x: (x["year"], x["paper_id"]))
        exams.append({"exam": meta_info["exam"], "dir": dirname,
                      "name": meta_info["name"], "level": meta_info["level"],
                      "papers": papers})
    return exams


def build() -> dict:
    spec_version = "1.0"
    spec = ROOT / "SPEC.md"
    if spec.is_file():
        for line in spec.read_text(encoding="utf-8").splitlines():
            if line.startswith("# 试题库格式规范"):
                spec_version = line.rsplit("v", 1)[-1].strip()
                break
    return {"spec_version": spec_version, "exams": collect()}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="只检查，不写入")
    args = ap.parse_args()

    new = build()
    text = json.dumps(new, ensure_ascii=False, indent=2) + "\n"

    if args.check:
        if not OUT.is_file():
            print("✗ index.json 不存在")
            return 1
        old = json.loads(OUT.read_text(encoding="utf-8"))
        if old != new:
            n_old = sum(len(e["papers"]) for e in old.get("exams", []))
            n_new = sum(len(e["papers"]) for e in new["exams"])
            print(f"✗ index.json 未同步（现 {n_old} 份，应为 {n_new} 份）")
            return 1
        print("✓ index.json 已同步")
        return 0

    OUT.write_text(text, encoding="utf-8")
    total = sum(len(e["papers"]) for e in new["exams"])
    print(f"✓ 已重建 {rel(OUT)}：{len(new['exams'])} 个组别，{total} 份试卷")
    for e in new["exams"]:
        print(f"    {e['exam']}  {len(e['papers'])} 份")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
