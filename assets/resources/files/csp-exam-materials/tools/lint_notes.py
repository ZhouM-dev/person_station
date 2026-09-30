#!/usr/bin/env python3
"""解释与争议的写作规范检查器（题解写作规范见协作/手册/11-题解写作.md）。

`tools/tag_questions.py` 管「题解块与 meta.json 是否一致」，`tools/validate.py`
管「结构是否合规范」。这个脚本管的是**文字本身**：长度、标点、有没有混进
内部协作的黑话。它是给写题解的人（以及后续各卷的对话）自检用的。

检查项（逐条都能真报错，不是空转）：

| # | 检查 | 适用 |
|---|---|---|
| 1 | 非空；有 `answer` 的题**必须**有 `answer_note`（v1.5 起每题都要解释） | 解释 / 争议 / 程序说明 |
| 2 | 首尾无空白（不许有前导/尾随空格或换行） | 同上 |
| 3 | 长度：解释、争议 20~800 字；程序说明 60~500 字 | 按字符计 |
| 4 | 不得含围栏代码块 ``` | 同上 |
| 5 | 不得出现内部协作用语（本库 / 我的处理 / 待决 / R0 / 本任务 / 协作/ / 核验报告 / §+数字） | 同上 |
| 6 | `$` 必须成对出现（行内公式要闭合） | 同上 |
| 7 | 句末必须是中文句末标点（。！？） | 同上 |

输出的 ✓ / ✗ 行带计数（`解释 N / 争议 M / 程序说明 K`）——一条题解都没写的卷也会是 ✓，
看计数才知道那一卷干了多少活。

用法（与 tag_questions.py 一致，可传卷目录或整个题库）:

    uv run python tools/lint_notes.py 题库/csp-j1/2019
    uv run python tools/lint_notes.py 题库            # 全库

有违例则退出码 1。
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

# 内部协作用语：学员在题解里看到这些会莫名其妙（它们只在本库的协作流程里有意义）
JARGON = ["本库", "我的处理", "待决", "R0", "本任务", "协作/", "核验报告"]
JARGON_RE = re.compile(r"§\s*\d")

FENCE_RE = re.compile(r"```")
SECTION_END = "。！？"

LIMITS = {"answer_note": (20, 800), "dispute_note": (20, 800),
          "program_note": (60, 500)}
LABEL = {"answer_note": "解释", "dispute_note": "争议", "program_note": "程序说明"}


def check_text(kind: str, text, where: str, problems: list[str]) -> None:
    """按上表逐条检查一段题解文字。"""
    label = LABEL[kind]
    if text is None or text == "":
        problems.append(f"{where} | {label} | 为空 |")
        return
    if not isinstance(text, str):
        problems.append(f"{where} | {label} | 不是字符串 | {text!r}")
        return

    if text != text.strip():
        problems.append(f"{where} | {label} | 首尾有空白（前导/尾随空格或换行） "
                        f"| {text[:20]!r}…{text[-10:]!r}")

    lo, hi = LIMITS[kind]
    n = len(text)
    if n < lo:
        problems.append(f"{where} | {label} | 太短（{n} 字，下限 {lo}） | {text}")
    elif n > hi:
        problems.append(f"{where} | {label} | 太长（{n} 字，上限 {hi}） | {text[:40]}…")

    if FENCE_RE.search(text):
        problems.append(f"{where} | {label} | 含围栏代码块，请改用行内代码 "
                        f"| {text[:40]}…")

    for word in JARGON:
        if word in text:
            i = text.index(word)
            problems.append(f"{where} | {label} | 出现内部协作用语「{word}」 "
                            f"| …{text[max(0, i - 12):i + 12]}…")
    m = JARGON_RE.search(text)
    if m:
        i = m.start()
        problems.append(f"{where} | {label} | 出现章节号「{m.group(0)}」（学员看不懂） "
                        f"| …{text[max(0, i - 12):i + 12]}…")

    if text.count("$") % 2:
        problems.append(f"{where} | {label} | `$` 不成对（出现 {text.count('$')} 次） "
                        f"| {text[:40]}…")

    if text[-1] not in SECTION_END:
        problems.append(f"{where} | {label} | 句末不是中文句末标点（。！？） "
                        f"| …{text[-16:]!r}")


def lint_paper(paper_dir: pathlib.Path) -> tuple[list[str], dict[str, int]]:
    """返回 (违例列表, 计数)。计数用于打印「解释 N / 争议 M / 程序说明 K」——

    没有它的话，一个字都没写的卷也会显示 ✓，看的人会误以为那一卷已经完工。
    """
    meta_path = paper_dir / "meta.json"
    if not meta_path.is_file():
        return ([f"{paper_dir} | - | 缺少 meta.json |"], {})
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    problems: list[str] = []
    counts = {"answer_note": 0, "dispute_note": 0, "program_note": 0}

    for q in meta.get("questions", []):
        qid = q.get("qid") or "?"
        answer = q.get("answer") or None
        note = q.get("answer_note") or ""
        dispute = q.get("dispute_note") or ""

        if answer is None:
            # 没答案的题三样都不许有（validate.py 也查，这里再挡一道，口径一致）
            if note:
                problems.append(f"{qid} | 解释 | 没有 answer 却写了 answer_note | {note[:30]}")
            if dispute:
                problems.append(f"{qid} | 争议 | 没有 answer 却写了 dispute_note | {dispute[:30]}")
            continue

        if not note:
            problems.append(f"{qid} | 解释 | 有 answer 却没有 answer_note（每题都要解释） |")
        else:
            check_text("answer_note", note, qid, problems)
            counts["answer_note"] += 1
        if dispute:
            check_text("dispute_note", dispute, qid, problems)
            counts["dispute_note"] += 1

    for g in meta.get("groups") or []:
        name = g.get("name") or "?"
        note = g.get("program_note") or ""
        if not note:
            problems.append(f"{name} | 程序说明 | 为空 |")
            continue
        check_text("program_note", note, name, problems)
        counts["program_note"] += 1

    return problems, counts


def summary(counts: dict[str, int]) -> str:
    if not counts:
        return ""
    return (f"（解释 {counts.get('answer_note', 0)} / 争议 {counts.get('dispute_note', 0)}"
            f" / 程序说明 {counts.get('program_note', 0)}）")


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1

    dirs: list[pathlib.Path] = []
    for a in args:
        p = pathlib.Path(a)
        if (p / "meta.json").is_file():
            dirs.append(p)
        elif p.is_dir():
            found = [
                x.parent for x in p.rglob("meta.json")
                if not any(part.startswith(("_", ".")) for part in x.parts)
            ]
            dirs.extend(sorted(set(found)))
        else:
            print(f"跳过（不是试卷目录）: {a}", file=sys.stderr)

    if not dirs:
        print("没有找到任何试卷目录", file=sys.stderr)
        return 1

    total = 0
    bad = 0
    for d in sorted(dirs):
        problems, counts = lint_paper(d)
        label = d.as_posix() + summary(counts)
        if problems:
            bad += 1
            print(f"✗ {label}: {len(problems)} 条违例")
            for p in problems:
                print(f"    {p}")
        else:
            print(f"✓ {label}")
        total += len(problems)

    print()
    if total:
        print(f"共 {len(dirs)} 份，{bad} 份有违例，合计 {total} 条")
        return 1
    print(f"共 {len(dirs)} 份，题解文字全部符合写作规范")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
