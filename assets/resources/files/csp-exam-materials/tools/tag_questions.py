#!/usr/bin/env python3
"""同步题块注释与题解块：把 meta.json 里的字段写回 paper.md。

meta.json 是权威来源，paper.md 是它的镜像。每题有两处：

    <!-- qid | type | score | answer | images | tags -->     ← 题块注释
    > **题解**
    > 答案：B                                                ← 题解块（SPEC 3.9）
    > 解释：……（有 answer 的题都写）
    > 争议：……（可选，仅争议题）

**大题组**（`阅读程序(1)`、`完善程序(2)` 这类）另有一处组级内容：

    <!-- group: 阅读程序(1) -->
    ```cpp
    （程序代码）
    ```
    > **程序说明**                                           ← 组级（SPEC 3.9）
    > ……
    #### 判断题

它长在组的 material 区（代码块之后、第一个分栏之前），不属于任何小题，
内容来自 meta.json 顶层 `groups[].program_note`。

其中只有 `feat:` 类标签是推导出来的（图、行号引用、带圈填空、公式、表格），
其余字段一律照抄 meta.json。题解里的答案由 `answer` 派生、解释由 `answer_note`
派生、争议由 `dispute_note` 派生，程序说明由 `groups[].program_note` 派生，
都不新增存储；与 meta.json 不一致时一律以 meta.json 为准。

用法:
    uv run python tools/tag_questions.py 题库/csp-s1/2019
    uv run python tools/tag_questions.py 题库 --check        # 只检查不写入

标签词表见 TAGS.md，题解格式见 SPEC.md 3.9。
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

QID_COMMENT = re.compile(r"<!--\s*(?P<body>qid:[^>]*?)\s*-->")
GROUP_COMMENT = re.compile(r"<!--\s*group:\s*(?P<name>[^>]*?)\s*-->")
HEADING_LINE = re.compile(r"^#{2,5}\s+\S", re.M)
COMMENT_START = re.compile(r"<!--")

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"

# 判断题在卷面答案卡上写 √ / ×，机器读的注释里仍是 T / F（SPEC 3.2）
TF_MARK = {"T": "√", "F": "×"}
SOLUTION_HEAD = re.compile(r"^>\s*\*\*题解\*\*\s*$")
GROUP_NOTE_HEAD = re.compile(r"^>\s*\*\*程序说明\*\*\s*$")


def derive_feat_tags(body: str) -> list[str]:
    """从题干正文推导 feat: 标签。"""
    tags = []
    if re.search(r"!\[[^\]]*\]\([^)]+\)", body):
        tags.append("feat:figure")
    if re.search(r"第\s*\d+\s*行", body):
        tags.append("feat:lineref")
    if any(c in body for c in CIRCLED):
        tags.append("feat:circnum")
    if "$" in body:
        tags.append("feat:formula")
    if re.search(r"^\s*\|.*\|\s*$", body, re.M):
        tags.append("feat:table")
    return tags


def question_bodies(text: str) -> list[tuple[str, str, tuple[int, int], tuple[int, int]]]:
    """返回 [(qid, 题干正文, 注释区间, 正文区间)]，区间都是原文下标 [start, end)。

    正文范围从注释结束到「下一个标题行」或「下一个注释」中较早者为止，
    这样第 N 题的正文不会吞掉它后面那段属于下一组的代码。
    """
    out = []
    matches = list(QID_COMMENT.finditer(text))
    for i, m in enumerate(matches):
        fields = dict(
            p.split(":", 1) for p in m.group("body").split("|") if ":" in p
        )
        qid = fields.get("qid", "").strip()

        stop = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        h = HEADING_LINE.search(text, m.end())
        if h and h.start() < stop:
            stop = h.start()
        c = COMMENT_START.search(text, m.end())
        if c and c.start() < stop:
            stop = c.start()

        out.append((qid, text[m.end():stop], (m.start(), m.end()), (m.end(), stop)))
    return out


def render_solution(qtype: str, answer, note, dispute=None) -> str:
    """题解块（SPEC 3.9 v2）。无答案返回空串——该题不写题解。

    四行顺序固定：`> **题解**` / `> 答案：` / `> 解释：` / `> 争议：`，冒号一律全角。
    `争议：` 只在 dispute 非空时出现，且必须排在 `解释：` **之后**。
    多行时续行以 `> ` 开头、不重复前缀。
    """
    if not answer:
        return ""
    val = TF_MARK.get(answer, answer) if qtype == "true_false" else answer
    lines = ["> **题解**", f"> 答案：{val}"]
    for prefix, text in (("解释：", note), ("争议：", dispute)):
        if not text:
            continue
        body = text.split("\n")
        lines.append(f"> {prefix}{body[0]}")
        lines.extend(f"> {ln}" for ln in body[1:])
    return "\n".join(lines)


def render_group_note(note) -> str:
    """组级「程序说明」块（SPEC 3.9 v2）。空串＝该组不该有这一块。"""
    if not note:
        return ""
    body = note.split("\n")
    return "\n".join(["> **程序说明**"] + [f"> {ln}" for ln in body])


def group_regions(text: str) -> list[tuple[str, tuple[int, int]]]:
    """返回 [(组名, material 区区间)]，区间是原文下标 [start, end)。

    material 区 = `<!-- group: -->` 之后，到「下一个标题行」或「下一个题块注释」
    中较早者为止。程序说明块**只能**长在这一段里——插在代码块之后、第一个
    `####`/`#####` 之前，否则就成了悬空内容，会被并进上一道题（SPEC 3.0）。
    """
    out = []
    for m in GROUP_COMMENT.finditer(text):
        stop = len(text)
        h = HEADING_LINE.search(text, m.end())
        if h:
            stop = h.start()
        c = QID_COMMENT.search(text, m.end())
        if c and c.start() < stop:
            stop = c.start()
        out.append((m.group("name").strip(), (m.end(), stop)))
    return out


def solution_range(lines: list[str]) -> tuple[int, int] | None:
    """正文行数组里旧题解块的下标区间 [i, j)；没有则 None。

    从末尾往前扫：先跳过空行，再吃掉连续的 `>` 行。这一段里**含** `> **题解**`
    才算题解块——题目正文末尾本来就可能另有引用块提示（如节的分值说明）。
    """
    j = len(lines)
    while j and not lines[j - 1].strip():
        j -= 1
    i = j
    while i and lines[i - 1].startswith(">"):
        i -= 1
    if i == j or not any(SOLUTION_HEAD.match(x) for x in lines[i:j]):
        return None
    return i, j


def solution_text(body: str) -> str:
    """正文里去掉题解块之后剩下的部分——推导 feat: 标签只能看这一段。

    ★ 题解块在正文范围内，若不剥离，解释里的 `$…$` 与「第 N 行」会被
    derive_feat_tags 当成题干特征，误加 feat:formula / feat:lineref。
    """
    lines = body.split("\n")
    rng = solution_range(lines)
    if rng is None:
        return body
    return "\n".join(lines[:rng[0]])


def sync_solution(body: str, solution: str) -> str:
    """把正文里的题解块换成 solution（空串＝删掉），返回新的正文。

    题解块永远是正文最后的内容：与上文之间、与下一个标题之间各留恰好一个空行。
    """
    lines = body.split("\n")
    rng = solution_range(lines)
    if rng is not None:
        i, j = rng
        lines = lines[:i] + lines[j:]
    elif not solution:
        # 没有旧题解块、也不该写题解：一字不动。
        # 否则会把文件末尾的空行「归一化」，让 --check 在无关的卷上报假差异。
        return body
    while lines and not lines[-1].strip():
        lines.pop()
    if not lines:                       # 空正文（异常数据），原样返回
        return body
    if solution:
        lines.append("")                # 与上文之间恰好一个空行
        lines.extend(solution.split("\n"))
    lines.append("")                    # 与下一个标题之间恰好一个空行
    return "\n".join(lines) + "\n"


def sync_group_note(body: str, note: str) -> str:
    """把组 material 区里的「程序说明」块换成 note（空串＝删掉），返回新内容。

    与 sync_solution 同一套规矩：整块替换、块后留恰好一个空行；既没有旧块
    也不该写新块时**一字不动**（否则会把无关的卷报成差异）。
    """
    lines = body.split("\n")
    k = next((i for i, l in enumerate(lines) if GROUP_NOTE_HEAD.match(l)), None)
    if k is not None:
        j = k
        while j < len(lines) and lines[j].startswith(">"):
            j += 1
        lines = lines[:k] + lines[j:]
    elif not note:
        return body
    while lines and not lines[-1].strip():
        lines.pop()
    if not lines:                       # 空 material（异常数据），原样返回
        return body
    if note:
        lines.append("")                # 与代码块之间恰好一个空行
        lines.extend(note.split("\n"))
    lines.append("")                    # 与第一个分栏标题之间恰好一个空行
    return "\n".join(lines) + "\n"


def render_comment(qid: str, qtype: str, score, answer, images: list[str],
                   tags: list[str]) -> str:
    """题块注释。字段顺序固定：qid | type | score | answer | images | tags。"""
    parts = [f"qid: {qid}", f"type: {qtype}", f"score: {score}"]
    if answer:
        parts.append(f"answer: {answer}")
    if images:
        parts.append("images: " + ",".join(images))
    if tags:
        parts.append("tags: " + ",".join(tags))
    return "<!-- " + " | ".join(parts) + " -->"


def process(paper_dir: pathlib.Path, check_only: bool) -> int:
    meta_path = paper_dir / "meta.json"
    paper_path = paper_dir / "paper.md"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    text = paper_path.read_text(encoding="utf-8")

    by_qid = {q["qid"]: q for q in meta["questions"]}
    bodies = question_bodies(text)

    if len(bodies) != len(meta["questions"]):
        print(
            f"{paper_dir}: paper.md 题块 {len(bodies)} 个，"
            f"meta.json 题目 {len(meta['questions'])} 个，无法对位",
            file=sys.stderr,
        )
        return 1

    changed = 0
    # ★ 不要就地拼接正文。现在每题是**两处**编辑（注释一处、题解块一处），
    # 题解块落在正文区间的末尾、也就是下一个标题之前——就地改会让后面的题
    # 的位置全部偏移，「从后往前」的假设随之失效。
    # 改为先收集全部编辑 (start, end, 替换文本)，最后按 start 降序一次性应用，
    # 位置永不漂移；同一题的两处区间相邻且不重叠，降序应用同样安全。
    edits: list[tuple[int, int, str]] = []
    for qid, body, cspan, bspan in bodies:
        q = by_qid.get(qid)
        if q is None:
            print(f"{paper_dir}: paper.md 中的 {qid} 在 meta.json 里不存在",
                  file=sys.stderr)
            return 1

        # 推导 feat: 标签前先剥离题解块（见 solution_text 的说明）
        topics = sorted(t for t in q.get("tags", []) if t.startswith("topic:"))
        tags = sorted(derive_feat_tags(solution_text(body))) + topics

        solution = render_solution(q["type"], q.get("answer"), q.get("answer_note"),
                                   q.get("dispute_note"))
        new_body = sync_solution(body, solution)

        # 三个文件要分别比对：只看 meta.json 会漏掉正文没同步的情况
        meta_differs = q.get("tags") != tags
        comment = render_comment(qid, q["type"], q["score"], q.get("answer"),
                                 q.get("images", []), tags)
        text_differs = (text[cspan[0]:cspan[1]] != comment
                        or text[bspan[0]:bspan[1]] != new_body)

        if meta_differs or text_differs:
            changed += 1
            if not check_only:
                if meta_differs:
                    q["tags"] = tags
                edits.append((cspan[0], cspan[1], comment))
                edits.append((bspan[0], bspan[1], new_body))

    # ★ 组级：程序说明块。必须并进**同一个** edits 列表——另开一轮就地拼接会
    # 让题解块的编辑位置漂移（本库踩过这个坑）。组 material 区与题解块区间
    # 互不重叠，降序一次性应用同样安全。
    gregions = group_regions(text)
    by_group = {g.get("name"): g for g in meta.get("groups", [])}
    for name, gspan in gregions:
        note = render_group_note((by_group.get(name) or {}).get("program_note"))
        old = text[gspan[0]:gspan[1]]
        new_mat = sync_group_note(old, note)
        if old == new_mat:
            continue
        changed += 1
        if not check_only:
            edits.append((gspan[0], gspan[1], new_mat))

    if check_only:
        if changed:
            print(f"✗ {paper_dir}: {changed} 道题/组的标签与题解、程序说明不符")
            return 1
        print(f"✓ {paper_dir}: 标签与题解已同步")
        return 0

    for start, end, repl in sorted(edits, key=lambda e: e[0], reverse=True):
        text = text[:start] + repl + text[end:]

    meta_path.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    paper_path.write_text(text, encoding="utf-8")
    print(f"✓ {paper_dir}: 已同步 {len(bodies)} 道题，更新 {changed} 道")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("dirs", nargs="+")
    ap.add_argument("--check", action="store_true", help="只检查，不写入")
    args = ap.parse_args()

    rc = 0
    for d in args.dirs:
        p = pathlib.Path(d)
        if (p / "meta.json").is_file():
            targets = [p]
        else:
            found = [
                x.parent for x in p.rglob("meta.json")
                if not any(part.startswith(("_", ".")) for part in x.parts)
            ]
            targets = sorted(set(found))
        for t in targets:
            rc |= process(t, args.check)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
