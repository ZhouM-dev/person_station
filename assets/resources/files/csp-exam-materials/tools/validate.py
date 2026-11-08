#!/usr/bin/env python3
"""校验一份标准化试卷是否符合 SPEC.md。

用法:
    uv run python tools/validate.py 题库/2019
    uv run python tools/validate.py 题库          # 校验题库下所有年份
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import re
import sys

# 题块注释: <!-- qid: xxx | type: xxx | score: 2 | images: a.png,b.png -->
QID_COMMENT = re.compile(r"<!--\s*(?P<body>qid:[^>]*?)\s*-->")
HEADING = re.compile(r"^#{3,5}\s*第\s*(\d+)\s*题\s*$", re.M)
IMG_REF = re.compile(r"!\[(?P<alt>[^\]]*)\]\((?P<path>[^)]+)\)")
FENCE = re.compile(r"^```(\w*)\s*$", re.M)
CODE_LINE = re.compile(r"^(?P<pad>\s*)(?P<num>\d+)(?:  (?P<code>.*))?$")

# 题块正文范围的边界（与 tools/tag_questions.py 的 question_bodies 同义）。
# 这里另写一份而不 import：校验器要能独立发现「同步工具的区间算错了」这类问题。
HEADING_LINE = re.compile(r"^#{2,5}\s+\S", re.M)
COMMENT_START = re.compile(r"<!--")

# 题解块（SPEC 3.9 v2）
SOLUTION_HEAD = re.compile(r"^>\s*\*\*题解\*\*\s*$")
SOLUTION_PREFIX = re.compile(r"^>\s?(?P<text>.*)$")
SOLUTION_ANSWER = re.compile(r"^答案：(?P<val>.*)$")
SOLUTION_NOTE = re.compile(r"^解释：")
SOLUTION_DISPUTE = re.compile(r"^争议：")
TF_MARK = {"T": "√", "F": "×"}

# 组级「程序说明」（SPEC 3.9 v2 的组级部分）
GROUP_COMMENT = re.compile(r"<!--\s*group:\s*(?P<name>[^>]*?)\s*-->")
GROUP_NOTE_HEAD = re.compile(r"^>\s*\*\*程序说明\*\*\s*$")

REQUIRED_META = [
    "paper_id", "title", "exam", "year", "date", "total_score",
    "question_count", "source", "sections", "questions",
]
PAPER_ID_RE = re.compile(r"^csp-[sj]1-\d{4}[ab]?$")
VALID_TYPES = {"single_choice", "true_false"}

# 内容标签受控词表来自 tags.json，而 tags.json 由 tools/gen_tags.py 从 TAGS.md 生成。
# 加标签请改 TAGS.md 再跑那个脚本——不要手改这里，也不要手改 tags.json。
def load_vocab() -> tuple[set[str], str | None]:
    p = pathlib.Path(__file__).resolve().parent.parent / "tags.json"
    if not p.is_file():
        return set(), "缺少 tags.json（跑 uv run python tools/gen_tags.py 生成）"
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return set(), f"tags.json 不是合法 JSON: {e}"
    tags = set(data.get("tags", {}))
    return (tags, None) if tags else (set(), "tags.json 里没有任何标签")


VOCAB, VOCAB_ERR = load_vocab()


def check_vocab_sync() -> list[str]:
    """确认 tags.json 与 viewer.html 跟得上 TAGS.md 的改动。"""
    try:
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
        import gen_tags
        want_json, want_js = gen_tags.build()
    except SystemExit as e:
        return [f"标签词表生成失败: {e}"]

    problems: list[str] = []
    if not gen_tags.TAGS_JSON.is_file() or \
            gen_tags.TAGS_JSON.read_text(encoding="utf-8") != want_json:
        problems.append("tags.json 与 TAGS.md 不同步")
    html = gen_tags.VIEWER.read_text(encoding="utf-8")
    i, j = html.find(gen_tags.JS_BEGIN), html.find(gen_tags.JS_END)
    if i < 0 or j < 0:
        problems.append("viewer.html 缺少 TAG_LABELS 标记")
    elif html[html.index("\n", i) + 1:j].rstrip("\n") != want_js:
        problems.append("viewer.html 的标签中文名与 TAGS.md 不同步")
    if problems:
        problems.append("跑 uv run python tools/gen_tags.py 重新生成")
    return problems


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def err(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)


def parse_front_matter(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    out: dict[str, str] = {}
    for line in text[3:end].splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            out[k.strip()] = v.strip()
    return out


def parse_qid_comments(text: str) -> list[dict[str, str]]:
    """解析每个题块注释，返回按出现顺序的字段字典。"""
    blocks = []
    for m in QID_COMMENT.finditer(text):
        fields: dict[str, str] = {}
        for part in m.group("body").split("|"):
            if ":" not in part:
                continue
            k, v = part.split(":", 1)
            fields[k.strip()] = v.strip()
        blocks.append(fields)
    return blocks


def find_repo_root(start: pathlib.Path) -> pathlib.Path | None:
    """从试卷目录往上找含 SPEC.md 的目录，作为仓库根。"""
    for p in [start.resolve(), *start.resolve().parents]:
        if (p / "SPEC.md").is_file():
            return p
    return None


def check_location(paper_dir: pathlib.Path, meta: dict, rep: Report) -> None:
    """试卷目录必须是 题库/<组别>/<年份>/，且与 meta 的 exam/year/paper_id 自洽。"""
    root = find_repo_root(paper_dir)
    if root is None:
        rep.warn("找不到仓库根（含 SPEC.md），跳过路径校验")
        return
    try:
        rel = paper_dir.resolve().relative_to(root)
    except ValueError:
        rep.warn(f"{paper_dir} 不在仓库内，跳过路径校验")
        return

    parts = rel.parts
    if len(parts) != 3 or parts[0] != "题库":
        rep.err(f"试卷目录必须是 题库/<组别>/<年份>/，实际为 {rel.as_posix()}")
        return

    _, exam_dir, year_dir = parts
    exam = str(meta.get("exam") or "").lower()
    year = str(meta.get("year") or "")

    if not exam:
        rep.err("meta.json 缺少 exam，无法核对组别目录")
    elif exam_dir != exam:
        rep.err(f"组别目录名 {exam_dir!r} 与 meta.exam {meta.get('exam')!r} 不符（应为 {exam!r}）")

    if year_dir != year:
        rep.err(f"年份目录名 {year_dir!r} 与 meta.year {year!r} 不符")

    variant = str(meta.get("paper_variant") or "").lower()
    expect = f"{exam}-{year}{variant}"
    if meta.get("paper_id") != expect:
        rep.err(
            f"paper_id {meta.get('paper_id')!r} 与 组别/年份/卷别 拼出的 {expect!r} 不符"
        )


def check_source_copy(paper_dir: pathlib.Path, meta: dict, rep: Report) -> None:
    """核对年份目录内的源 PDF 副本：存在、摘要与 meta 一致、且与题目/ 中的原件一致。"""
    src = meta.get("source", {})
    rel = src.get("copy")
    if not rel:
        return

    root = find_repo_root(paper_dir)
    if root is None:
        rep.warn("找不到仓库根，跳过副本校验")
        return
    copy_path = root / rel
    if not copy_path.is_file():
        rep.err(f"source.copy 指向的文件不存在: {rel}")
        return

    actual = hashlib.sha256(copy_path.read_bytes()).hexdigest().upper()
    recorded = (src.get("sha256") or "").upper()
    if not recorded:
        rep.err("source.copy 已声明副本，但缺少 source.sha256")
    elif actual != recorded:
        rep.err(f"源 PDF 副本摘要不符: 实际 {actual}，meta 记录 {recorded}")

    orig_rel = src.get("file")
    if orig_rel:
        orig = root / orig_rel
        if not orig.is_file():
            rep.warn(f"source.file 指向的原件不存在: {orig_rel}")
        elif hashlib.sha256(orig.read_bytes()).hexdigest().upper() != actual:
            rep.err(f"年份目录内的副本与原件 {orig_rel} 不一致")


def check_code_blocks(text: str, rep: Report) -> None:
    """检查 cpp 代码块的行号格式与连续性。"""
    lines = text.splitlines()
    i = 0
    blocks = 0
    while i < len(lines):
        if lines[i].startswith("```"):
            lang = lines[i][3:].strip()
            j = i + 1
            while j < len(lines) and not lines[j].startswith("```"):
                j += 1
            if lang == "cpp":
                blocks += 1
                body = lines[i + 1:j]
                nums: list[int] = []
                for k, raw in enumerate(body, start=1):
                    if raw.strip() == "":
                        rep.err(f"代码块第 {k} 行为空行，空行也必须带行号（见 SPEC 3.6）")
                        continue
                    m = CODE_LINE.match(raw)
                    if not m:
                        rep.err(f"代码块第 {k} 行缺少行号: {raw[:40]!r}")
                        continue
                    num = int(m.group("num"))
                    nums.append(num)
                    width = len(m.group("pad")) + len(m.group("num"))
                    if width != 3:
                        rep.err(
                            f"代码块第 {k} 行行号宽度为 {width}，应为 3: {raw[:40]!r}"
                        )
                    if m.group("code") is None and raw.rstrip() != raw:
                        rep.warn(f"代码块第 {k} 行有空行尾随空格")
                if nums and nums != list(range(1, len(nums) + 1)):
                    rep.err(
                        f"代码块行号不连续（应为 1..{len(nums)}）: "
                        f"首={nums[:3]} 尾={nums[-3:]}"
                    )
            i = j + 1
        else:
            i += 1
    if blocks == 0:
        rep.warn("未发现 cpp 代码块")


# 注意：这里不能叫 HEADING。第 18 行的模块级 HEADING 是「第 N 题」专用正则，
# 第 376 行的「题目标题编号不连续」检查依赖它。曾因这里重名覆盖，导致该检查
# 恒真空转（新正则无 re.M，^ 只在串首匹配，而 paper.md 以 --- 开头）。
HEADING_ANY = re.compile(r"^(#{1,6})\s+(.*?)\s*$")
QUESTION_TITLE = re.compile(r"^第\s*\d+\s*题$")
ALLOWED_SUB = {"判断题", "选择题", "单选题"}
GROUP_SECTIONS = ("阅读程序", "完善程序")


def check_headings(text: str, rep: Report) -> None:
    """校验标题层级：节 ##、大题组 ###、分栏 ####、题目 ###/#####（见 SPEC 3.0）。"""
    lines = text.splitlines()

    # 跳过 YAML front matter（只认开头那一对 ---）
    start = 0
    if lines and lines[0].strip() == "---":
        start = 1
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                start = i + 1
                break

    cur_section = ""
    for idx, line in enumerate(lines[start:], start=start + 1):
        m = HEADING_ANY.match(line)
        if not m:
            continue
        lv, title = len(m.group(1)), m.group(2)

        if lv == 1:
            continue                                    # 卷名
        if lv == 2:
            cur_section = title
            continue

        if QUESTION_TITLE.match(title):
            if lv not in (3, 5):
                rep.err(f"第 {idx} 行：题目标题应为 ### 或 #####，实际 {'#' * lv}　{line.strip()}")
            elif any(k in cur_section for k in GROUP_SECTIONS):
                if lv != 5:
                    rep.err(f"第 {idx} 行：第二、三节的题目应用 #####，实际 {'#' * lv}")
            elif lv != 3:
                rep.err(f"第 {idx} 行：第一节的题目应用 ###，实际 {'#' * lv}")
            continue

        if lv == 3:
            continue                                    # 大题组，如 ### (1)
        if lv == 4:
            if title not in ALLOWED_SUB:
                rep.err(
                    f"第 {idx} 行：#### 分栏标题只允许 "
                    f"{'、'.join(sorted(ALLOWED_SUB))}，实际 {title!r}"
                )
            continue
        rep.err(f"第 {idx} 行：意外的标题层级 {'#' * lv}　{line.strip()}")


def question_bodies(text: str) -> list[tuple[str, str]]:
    """返回 [(qid, 题干正文)]，正文范围与 tools/tag_questions.py 一致：
    从注释结束到「下一个标题行」或「下一个注释」中较早者为止。"""
    out = []
    matches = list(QID_COMMENT.finditer(text))
    for i, m in enumerate(matches):
        fields = dict(p.split(":", 1) for p in m.group("body").split("|") if ":" in p)
        stop = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        h = HEADING_LINE.search(text, m.end())
        if h and h.start() < stop:
            stop = h.start()
        c = COMMENT_START.search(text, m.end())
        if c and c.start() < stop:
            stop = c.start()
        out.append((fields.get("qid", "").strip(), text[m.end():stop]))
    return out


def find_solution(lines: list[str]) -> tuple[int, int] | None:
    """定位题解块，返回行下标区间 [首行, 末行)。

    首行是匹配 `^>\\s*\\*\\*题解\\*\\*\\s*$` 的那一行，自它起**连续**的全部 `>`
    行都属于题解块。整块不存在返回 None。
    """
    k = next((i for i, l in enumerate(lines) if SOLUTION_HEAD.match(l)), None)
    if k is None:
        return None
    m = k
    while m < len(lines) and lines[m].startswith(">"):
        m += 1
    return k, m


def split_note_rows(rows: list[str]) -> list[tuple[str, list[str]]]:
    """把题解块 `答案：` 之后的续行切成 [(段头, 该段所有行)]。

    段头是 `解释：` / `争议：` 其一，续行归上一段。这样「争议：排在解释：之前」
    也看得见（按行顺序切，不假设哪一段在前）。段头为空串表示这一段既不是解释
    也不是争议——比如 `答案：` 后面的杂物，或漏了前缀的行。
    """
    segs: list[tuple[str, list[str]]] = []
    for row in rows:
        if SOLUTION_NOTE.match(row):
            segs.append(("解释：", [row]))
        elif SOLUTION_DISPUTE.match(row):
            segs.append(("争议：", [row]))
        elif segs:
            segs[-1][1].append(row)
        else:
            segs.append(("", [row]))
    return segs


def check_solutions(text: str, questions: list[dict], rep: Report) -> None:
    """题解块与 meta.json 的一致性（SPEC 3.9 v2）。

    九条：① 有 answer 必须有题解、无 answer 不得有题解块，也不得写
    answer_note / dispute_note；② 首行恰好 `> **题解**`；③ `答案：` 与
    meta.answer 一致（判断题按 T→√ / F→×）；④ 有 answer 的题 **必须**有非空
    meta.answer_note，题解里的 `解释：` 与它逐字相等；⑤ 答案行之后的续行必须
    只有 `解释：`/`争议：` 两段，别的字样视为格式错；⑥ `争议：` 与
    meta.dispute_note 逐字相等、有无一致；⑦ `争议：` 必须排在 `解释：` 之后；
    ⑧ 题解块是正文最后的内容；⑨ 题解块内不得出现围栏代码块。
    """
    bodies = question_bodies(text)
    if len(bodies) != len(questions):
        return                      # 数量不符已在别处报错，这里不再重复刷屏

    for (qid, body), q in zip(bodies, questions):
        lines = body.split("\n")
        rng = find_solution(lines)
        answer = q.get("answer") or None
        note = q.get("answer_note") or ""
        dispute = q.get("dispute_note") or ""

        # ① 有答案才有题解；无答案的题三样都不许有
        if answer is None:
            if rng is not None:
                rep.err(f"{qid}: 没有 answer，不得有题解块"
                        f"（第 {rng[0] + 1} 行 `> **题解**` 应删掉）")
            if note:
                rep.err(f"{qid}: 没有 answer，不得有 meta.answer_note")
            if dispute:
                rep.err(f"{qid}: 没有 answer，不得有 meta.dispute_note")
            continue
        if rng is None:
            rep.err(f"{qid}: 有 answer={answer} 却没有题解块（见 SPEC 3.9）")
            continue

        k, m = rng
        block = lines[k:m]
        # 行首去掉 `> ` 之后的正文；未带前缀的行按原样保留，好让报错看得见
        rows = [SOLUTION_PREFIX.match(l).group("text") for l in block]

        # ② 首行必须恰好是 `> **题解**`
        if block[0] != "> **题解**":
            rep.err(f"{qid}: 题解块首行应恰好是 `> **题解**`，实际 {block[0]!r}")
        # 每一行都要带 `> ` 前缀（半角 > 加一个空格）
        for off, line in enumerate(block, start=1):
            if not line.startswith("> "):
                rep.err(f"{qid}: 题解块第 {off} 行缺少 `> ` 前缀: {line!r}")

        # ⑧ 题解块必须是正文最后的内容
        rest = [l for l in lines[m:] if l.strip()]
        if rest:
            rep.err(f"{qid}: 题解块之后还有内容，题解必须是正文最后一块: "
                    f"{rest[0].strip()[:40]!r}")

        # ⑨ 不得用围栏代码块（会干扰 check_code_blocks 的行号扫描，见 SPEC 3.9）
        for off, line in enumerate(block, start=1):
            if "```" in line:
                rep.err(f"{qid}: 题解块第 {off} 行出现围栏代码块，"
                        f"请改用行内代码: {line.strip()[:40]!r}")

        # ③ `答案：` 与 meta.answer 一致（判断题 T→√、F→×）
        want = TF_MARK.get(answer, answer) if q.get("type") == "true_false" else answer
        if len(rows) < 2:
            rep.err(f"{qid}: 题解块缺少 `> 答案：…` 行")
        else:
            am = SOLUTION_ANSWER.match(rows[1])
            if am is None:
                rep.err(f"{qid}: 题解块第二行应是 `> 答案：…`"
                        f"（冒号用全角 `：`），实际 {rows[1]!r}")
            elif am.group("val").strip() != want:
                rep.err(f"{qid}: 题解里的答案与 meta 不符: "
                        f"{am.group('val').strip()!r} vs {want!r}")

        # ④ 有 answer 的题必须有非空 answer_note（v2 起不再只给争议题写）
        if not note:
            rep.err(f"{qid}: 有 answer 的题必须有非空 meta.answer_note"
                    f"（SPEC 3.9 v2：每题都写 `解释：`）")

        # ⑤/⑥/⑦ `解释：` 与 `争议：` 两段
        segs = split_note_rows(rows[2:])
        kinds = [kind for kind, _ in segs if kind]
        for kind, seg in segs:
            if kind:
                continue
            rep.err(f"{qid}: 题解块里出现无法归段的行（应为 `解释：`/`争议：` 或"
                    f"它们的续行）: {seg[0]!r}")

        if kinds.count("解释：") > 1:
            rep.err(f"{qid}: 题解块里有 {kinds.count('解释：')} 个 `解释：` 段，只允许一个")
        if kinds.count("争议：") > 1:
            rep.err(f"{qid}: 题解块里有 {kinds.count('争议：')} 个 `争议：` 段，只允许一个")
        if note and "解释：" not in kinds:
            rep.err(f"{qid}: meta.answer_note 非空，题解块缺少 `> 解释：…` 行")
        if dispute and "争议：" not in kinds:
            rep.err(f"{qid}: meta.dispute_note 非空，题解块缺少 `> 争议：…` 行")
        if not dispute and "争议：" in kinds:
            rep.err(f"{qid}: meta.dispute_note 为空，题解块不应有 `争议：` 行")
        if "解释：" in kinds and "争议：" in kinds \
                and kinds.index("争议：") < kinds.index("解释："):
            rep.err(f"{qid}: 题解块里 `争议：` 排在 `解释：` 之前"
                    f"（SPEC 3.9 规定顺序为 答案 / 解释 / 争议）")

        # 逐段与 meta 逐字比对（按行拼接后相等）
        wants = {"解释：": note.split("\n") if note else [],
                 "争议：": dispute.split("\n") if dispute else []}
        fields = {"解释：": "answer_note", "争议：": "dispute_note"}
        for kind, seg in segs:
            want_rows = wants.get(kind, [])
            if not want_rows:
                continue
            got_rows = [seg[0][len(kind):]] + seg[1:]
            if got_rows != want_rows:
                rep.err(f"{qid}: 题解块的{kind[:-1]}与 meta.{fields[kind]} 不符: "
                        f"{got_rows!r} vs {want_rows!r}")


def group_regions(text: str) -> list[tuple[str, tuple[int, int]]]:
    """返回 paper.md 里 [(组名, material 区区间)]，区间是原文下标 [start, end)。

    与 tools/tag_questions.py 的 group_regions 同义（另写一份的理由同上）：
    material 区从 `<!-- group: -->` 之后起，到「下一个标题行」或「下一个题块
    注释」中较早者为止。程序说明块只能长在这一段里（SPEC 3.0 的悬空内容规则）。
    """
    out = []
    for m in GROUP_COMMENT.finditer(text):
        stop = len(text)
        h = HEADING_LINE.search(text, m.end())
        if h:
            stop = h.start()
        c = COMMENT_START.search(text, m.end())
        if c and c.start() < stop:
            stop = c.start()
        out.append((m.group("name").strip(), (m.end(), stop)))
    return out


def check_group_notes(text: str, meta: dict, rep: Report) -> None:
    """组级「程序说明」与 meta.groups 的一致性（SPEC 3.9 v2 的组级部分）。

    四条：① 每个出现在 questions[].group 的组名，meta.groups 必须有对应项且
    program_note 非空；② meta.groups 里不得有未被任何题目引用的 name，也不得
    有在 paper.md 里找不到 `<!-- group: -->` 标记的 name（否则说明写错了地方）；
    ③ paper.md 每个组的 material 区必须有**恰好一个** `> **程序说明**` 块，
    内容与 program_note 逐字相等；④ 没有 program_note 的组不得有该块。
    另外做一次总数比对，用来抓「长在组外、谁也没引用的孤块」。
    """
    by_name: dict[str, dict] = {}
    for g in meta.get("groups") or []:
        name = (g.get("name") or "").strip()
        if not name:
            rep.err("meta.groups 里有一项缺少 name")
            continue
        if name in by_name:
            rep.err(f"meta.groups 里 name 重复: {name!r}（组名必须唯一）")
        by_name[name] = g

    used: list[str] = []
    for q in meta.get("questions", []):
        g = q.get("group")
        if g and g not in used:
            used.append(g)
    for name in used:
        g = by_name.get(name)
        if g is None:
            rep.err(f"题目引用了大题组 {name!r}，meta.groups 里却没有对应项"
                    f"（每个组都要写 program_note）")
        elif not (g.get("program_note") or "").strip():
            rep.err(f"meta.groups 里 {name!r} 的 program_note 为空"
                    f"（每个大题组都必须有程序说明）")
    for name in by_name:
        if name not in used:
            rep.err(f"meta.groups 里的 {name!r} 没有被任何题目引用"
                    f"（questions[].group 里找不到它）")

    regions = group_regions(text)
    seen = {name for name, _ in regions}
    for name in by_name:
        if name not in seen:
            rep.err(f"meta.groups 里的 {name!r} 在 paper.md 里找不到 "
                    f"`<!-- group: {name} -->` 标记")

    for name, (a, b) in regions:
        material = text[a:b]
        lines = material.split("\n")
        heads = [i for i, l in enumerate(lines) if GROUP_NOTE_HEAD.match(l)]
        note = (by_name.get(name) or {}).get("program_note") or ""
        if len(heads) > 1:
            rep.err(f"大题组 {name!r} 的题面区有 {len(heads)} 个 `> **程序说明**` "
                    f"块，只允许一个")
            continue
        if not note:
            if heads:
                rep.err(f"大题组 {name!r} 在 meta.groups 里没有 program_note，"
                        f"题面区不应有 `> **程序说明**` 块")
            continue
        if not heads:
            rep.err(f"大题组 {name!r} 的题面区缺少 `> **程序说明**` 块"
                    f"（meta.groups 里有 program_note）")
            continue
        k = heads[0]
        j = k
        while j < len(lines) and lines[j].startswith(">"):
            j += 1
        got = [SOLUTION_PREFIX.match(x).group("text") for x in lines[k:j]]
        want = ["**程序说明**"] + note.split("\n")
        if got != want:
            rep.err(f"大题组 {name!r} 的程序说明与 meta.groups[].program_note 不符: "
                    f"{got!r} vs {want!r}")

    total = sum(1 for l in text.split("\n") if GROUP_NOTE_HEAD.match(l))
    want_total = sum(1 for g in by_name.values()
                     if (g.get("program_note") or "").strip())
    if total != want_total:
        rep.err(f"paper.md 里 `> **程序说明**` 块共 {total} 个，"
                f"meta.groups 里 program_note 非空的组有 {want_total} 个，数量不符")


def check_dir(paper_dir: pathlib.Path, rep: Report) -> dict | None:
    meta_path = paper_dir / "meta.json"
    paper_path = paper_dir / "paper.md"

    if not meta_path.is_file():
        rep.err(f"{paper_dir}: 缺少 meta.json")
        return None
    if not paper_path.is_file():
        rep.err(f"{paper_dir}: 缺少 paper.md")
        return None

    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        rep.err(f"{paper_dir}/meta.json 不是合法 JSON: {e}")
        return None

    text = paper_path.read_text(encoding="utf-8")

    # --- meta.json 结构 ---
    for key in REQUIRED_META:
        if key not in meta:
            rep.err(f"meta.json 缺少字段: {key}")
    for key in ("file", "pages", "kind", "ocr"):
        if key not in meta.get("source", {}):
            rep.err(f"meta.json source 缺少字段: {key}")

    check_location(paper_dir, meta, rep)
    check_source_copy(paper_dir, meta, rep)

    paper_id = meta.get("paper_id", "")
    if not PAPER_ID_RE.match(paper_id):
        rep.err(f"paper_id 格式不合规: {paper_id!r}（应形如 csp-s1-2019b）")

    # --- front matter 与 meta 一致 ---
    fm = parse_front_matter(text)
    for key in ("paper_id", "title", "year", "total_score"):
        if key not in fm:
            rep.err(f"paper.md front matter 缺少 {key}")
        elif str(meta.get(key)) != fm[key]:
            rep.err(
                f"front matter 与 meta.json 不一致 [{key}]: "
                f"{fm[key]!r} vs {meta.get(key)!r}"
            )

    # --- 题号连续性 ---
    questions = meta.get("questions", [])
    if len(questions) != meta.get("question_count"):
        rep.err(
            f"question_count={meta.get('question_count')} "
            f"与实际题目数 {len(questions)} 不符"
        )
    for idx, q in enumerate(questions, start=1):
        if q.get("no") != idx:
            rep.err(f"题目 no 不连续: 第 {idx} 项为 {q.get('no')}")
        expect_qid = f"{paper_id}-{idx:03d}"
        if q.get("qid") != expect_qid:
            rep.err(f"qid 不合规: {q.get('qid')!r}，应为 {expect_qid!r}")
        if q.get("type") not in VALID_TYPES:
            rep.err(f"{q.get('qid')}: type 非法 {q.get('type')!r}")
        if not isinstance(q.get("score"), (int, float)):
            rep.err(f"{q.get('qid')}: score 必须是数字")

    # --- 分节分值 ---
    total = 0
    all_qids: list[str] = []
    for sec in meta.get("sections", []):
        s = sum(
            q["score"] for q in questions if q.get("section") == sec.get("id")
        )
        if abs(s - sec.get("score", -1)) > 1e-9:
            rep.err(
                f"节 {sec.get('id')} 分值不符: sections 声明 {sec.get('score')}，"
                f"题目合计 {s}"
            )
        total += s
        all_qids.extend(sec.get("qids", []))
        missing = [x for x in sec.get("qids", []) if x not in {q["qid"] for q in questions}]
        if missing:
            rep.err(f"节 {sec.get('id')} 引用了不存在的 qid: {missing}")
    if abs(total - meta.get("total_score", -1)) > 1e-9:
        rep.err(f"总分不符: total_score={meta.get('total_score')}，题目合计 {total}")
    if len(all_qids) != len(set(all_qids)):
        rep.err("sections 中存在重复 qid")
    if set(all_qids) != {q["qid"] for q in questions}:
        rep.err("sections 覆盖的 qid 集合与 questions 不一致")

    # --- paper.md 题块 ---
    headings = [int(m.group(1)) for m in HEADING.finditer(text)]
    if headings != list(range(1, len(headings) + 1)):
        rep.err(f"paper.md 题目标题编号不连续: {headings[:20]}")

    blocks = parse_qid_comments(text)
    if len(blocks) != len(questions):
        rep.err(
            f"paper.md 题块注释 {len(blocks)} 个，"
            f"meta.json 题目 {len(questions)} 个，数量不符"
        )
    for idx, (blk, q) in enumerate(zip(blocks, questions), start=1):
        if blk.get("qid") != q["qid"]:
            rep.err(f"第 {idx} 个题块 qid 不符: {blk.get('qid')!r} vs {q['qid']!r}")
        if blk.get("type") != q["type"]:
            rep.err(f"{q['qid']}: 题块 type 与 meta 不符")
        try:
            if abs(float(blk.get("score", "nan")) - q["score"]) > 1e-9:
                rep.err(f"{q['qid']}: 题块 score 与 meta 不符")
        except ValueError:
            rep.err(f"{q['qid']}: 题块 score 不是数字: {blk.get('score')!r}")

        blk_tags = [t for t in blk.get("tags", "").split(",") if t]
        if blk_tags != q.get("tags", []):
            rep.err(
                f"{q['qid']}: 题块 tags 与 meta 不符: {blk_tags} vs {q.get('tags', [])}"
            )
        for t in q.get("tags", []):
            if VOCAB and t not in VOCAB:
                rep.err(f"{q['qid']}: 标签不在受控词表中: {t!r}（见 TAGS.md）")

        blk_imgs = [i for i in blk.get("images", "").split(",") if i]
        if blk_imgs != q.get("images", []):
            rep.err(
                f"{q['qid']}: 题块 images 与 meta 不符: "
                f"{blk_imgs} vs {q.get('images', [])}"
            )

        # 答案要在两处一致，且取值符合题型
        blk_ans = blk.get("answer") or None
        meta_ans = q.get("answer") or None
        if blk_ans != meta_ans:
            rep.err(f"{q['qid']}: 题块 answer 与 meta 不符: {blk_ans!r} vs {meta_ans!r}")
        if meta_ans:
            allowed = ("T", "F") if q["type"] == "true_false" else ("A", "B", "C", "D")
            if meta_ans not in allowed:
                rep.err(
                    f"{q['qid']}: answer {meta_ans!r} 与题型 {q['type']} 不匹配"
                    f"（应为 {'/'.join(allowed)}）"
                )

    # --- 题解块（SPEC 3.9）---
    check_solutions(text, questions, rep)

    # --- 组级程序说明（SPEC 3.9 的组级部分）---
    check_group_notes(text, meta, rep)

    # --- 图片 ---
    assets_dir = paper_dir / "assets"
    refs: list[tuple[str, str]] = []
    for m in IMG_REF.finditer(text):
        alt, path = m.group("alt"), m.group("path")
        refs.append((alt, path))
        if path.startswith(("http://", "https://", "data:")):
            rep.err(f"图片引用不得使用外链或 base64: {path[:60]}")
            continue
        if not path.startswith("assets/"):
            rep.err(f"图片引用必须使用 assets/ 相对路径: {path}")
            continue
        if not (paper_dir / path).is_file():
            rep.err(f"图片引用指向的文件不存在: {path}")
        stem = pathlib.PurePosixPath(path).stem
        if alt.strip() == stem or alt.strip() == path:
            rep.err(f"图片替代文本不能是文件名，应为中文描述: {path}")

    referenced = {pathlib.PurePosixPath(p).name for _, p in refs}
    if assets_dir.is_dir():
        on_disk = {f.name for f in assets_dir.iterdir() if f.is_file()}
        for orphan in sorted(on_disk - referenced):
            rep.err(f"assets/ 中未被 paper.md 引用的孤儿图片: {orphan}")
        for missing in sorted(referenced - on_disk):
            rep.err(f"paper.md 引用但 assets/ 中不存在: {missing}")

    # --- meta.images 与 paper.md 引用一致 ---
    meta_imgs = {i for q in questions for i in q.get("images", [])}
    if meta_imgs != referenced:
        rep.err(
            f"meta.json images 与 paper.md 引用不一致: "
            f"meta 多 {sorted(meta_imgs - referenced)}，"
            f"paper 多 {sorted(referenced - meta_imgs)}"
        )

    # --- 代码块 ---
    check_code_blocks(text, rep)

    # --- 标题层级 ---
    check_headings(text, rep)

    # --- 中间产物：任何下划线开头的目录都不该出现在交付里 ---
    for sub in sorted(paper_dir.iterdir()):
        if sub.is_dir() and sub.name.startswith("_"):
            rep.warn(f"{paper_dir.name}/{sub.name} 疑似中间产物，交付前应删除")

    return meta


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1

    roots = [pathlib.Path(a) for a in args]
    dirs: list[pathlib.Path] = []
    for r in roots:
        if (r / "meta.json").is_file():
            dirs.append(r)
        elif r.is_dir():
            # 递归发现，跳过下划线/点开头的中间产物目录
            found = [
                p.parent for p in r.rglob("meta.json")
                if not any(part.startswith(("_", ".")) for part in p.parts)
            ]
            dirs.extend(sorted(set(found)))
        else:
            print(f"跳过（不是试卷目录）: {r}", file=sys.stderr)

    if not dirs:
        print("没有找到任何试卷目录", file=sys.stderr)
        return 1

    # 词表：先确认它本身是同步的，再拿它校验题目
    vocab_problems = []
    if VOCAB_ERR:
        vocab_problems.append(VOCAB_ERR)
    else:
        vocab_problems = check_vocab_sync()
    for p in vocab_problems:
        print(f"✗ 标签词表: {p}", file=sys.stderr)

    failed = 0
    for d in dirs:
        rep = Report()
        meta = check_dir(d, rep)
        label = d.as_posix()
        if meta:
            label += f"  [{meta.get('paper_id')}]"
        if rep.errors:
            failed += 1
            print(f"✗ {label}")
            for e in rep.errors:
                print(f"    错误: {e}")
        else:
            print(f"✓ {label}")
        for w in rep.warnings:
            print(f"    提示: {w}")

    print()
    if vocab_problems:
        print(f"共 {len(dirs)} 份，失败 {failed} 份；"
              f"另有 {len(vocab_problems)} 项标签词表问题")
    else:
        print(f"共 {len(dirs)} 份，失败 {failed} 份")
    return 1 if (failed or vocab_problems) else 0


if __name__ == "__main__":
    raise SystemExit(main())
