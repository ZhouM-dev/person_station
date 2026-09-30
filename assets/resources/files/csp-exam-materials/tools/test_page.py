#!/usr/bin/env python3
"""viewer.html 的浏览器集成测试。

单元测试（tools/test_viewer.js）只跑解析逻辑，碰不到布局与交互。
这个脚本用真实 Chrome 打开页面，注入 2019 年试卷，验证滚动、折叠、
字号缩放、题面浮层这些只有在浏览器里才暴露的问题。

用法:
    uv run --with playwright python tools/test_page.py
    uv run --with playwright python tools/test_page.py --shots   # 顺便截图
"""
from __future__ import annotations

import argparse
import base64
import json
import pathlib
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAPER = ROOT / "题库" / "csp-s1" / "2019"
SHOTS = ROOT / "_shots"

# 一个极小的合法 PDF，够验证 iframe 是否被正确创建即可
TINY_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n"
    b"trailer<</Root 1 0 R>>\n%%EOF\n"
)

INJECT = """([md, meta, png, pdf]) => {
    const mk = (name, rel, body, type) => {
      const f = new File([body], name, { type });
      Object.defineProperty(f, "webkitRelativePath", { value: rel });
      return f;
    };
    const bin = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const dir = "题库/csp-s1/2019";
    const e = (rel, body, t) => ({ file: mk(rel.split("/").pop(), dir + "/" + rel, body, t),
                                   rel: dir + "/" + rel });
    ingest([
      e("paper.md", md, "text/markdown"),
      e("meta.json", meta, "application/json"),
      e("assets/q015-fig1.png", bin(png), "image/png"),
      e("2019-试题.pdf", bin(pdf), "application/pdf"),
    ]);
}"""

# 同一个探针元素放进目标容器前后各量一次，得出真实缩放倍率。
# 直接读 getComputedStyle().zoom 会被嵌套缩放骗过去（曾因此漏掉 4 倍叠加）。
ZOOM_PROBE = """(sel) => {
    const el = document.createElement('div');
    el.style.cssText = 'font-size:20px;line-height:1.5;white-space:nowrap;' +
                       'position:absolute;visibility:hidden;left:0;top:0';
    el.textContent = 'X';
    document.body.appendChild(el);
    const outside = el.getBoundingClientRect().height;
    const target = document.querySelector(sel);
    if (!target) { el.remove(); return -1; }
    target.appendChild(el);
    const inside = el.getBoundingClientRect().height;
    el.remove();
    return +(inside / outside).toFixed(2);
}"""

# 代码行高：直接读计算值最准。inline 元素的 getBoundingClientRect 首行只算
# 字形高度、不算完整行框，用它反推行高会偏小。
CODE_LH_PROBE = """(sel) => {
    const c = document.querySelector(sel);
    if (!c) return null;
    const cs = getComputedStyle(c);
    const fs = parseFloat(cs.fontSize);
    const lh = cs.lineHeight;
    const lhPx = lh.endsWith('px') ? parseFloat(lh) : parseFloat(lh) * fs;
    return { raw: lh, fs, ratio: +(lhPx / fs).toFixed(3) };
}"""


class T:
    def __init__(self):
        self.fail: list[str] = []
        self.n = 0

    def check(self, name, got, want):
        self.n += 1
        ok = got == want
        if not ok:
            self.fail.append(name)
        print(f"{'✓' if ok else '✗'} {name}: {got}" + ("" if ok else f"   ← 期望 {want}"))

    def near(self, name, got, want, tol=0.06):
        self.n += 1
        ok = isinstance(got, (int, float)) and abs(got - want) <= tol
        if not ok:
            self.fail.append(name)
        print(f"{'✓' if ok else '✗'} {name}: {got}"
              + ("" if ok else f"   ← 期望 {want}±{tol}"))

    def report(self):
        print()
        if self.fail:
            print(f"失败 {len(self.fail)}/{self.n} 项：")
            for f in self.fail:
                print("   -", f)
            return 1
        print(f"全部通过（{self.n} 项）")
        return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", action="store_true", help="顺便把关键状态截图到 _shots/")
    args = ap.parse_args()

    md = (PAPER / "paper.md").read_text(encoding="utf-8")

    # 把最后一题的答案抹掉，留一条「暂无答案」的兜底路径来测。
    # 答案以 paper.md 的题块注释为准，所以注释和 meta 两处都要清。
    md = re.sub(r"(csp-s1-2019b-043 \| type: [a-z_]+ \| score: [\d.]+) \| answer: [A-DTF]",
                r"\1", md)
    # 题解块是**由答案派生**的（SPEC 3.9）：没有答案就不该有题解块，
    # 否则新校验规则下夹具自相矛盾。最后一题的题解块在正文末尾，整段删掉。
    lines = md.split("\n")
    while lines and not lines[-1].strip():
        lines.pop()
    j = len(lines)
    while j and lines[j - 1].startswith(">"):
        j -= 1
    if not any("题解" in x for x in lines[j:]):
        raise SystemExit("夹具失效：paper.md 末尾没有题解块，无法按预期置空答案")
    del lines[j:]
    md = "\n".join(lines) + "\n"
    meta_obj = json.loads((PAPER / "meta.json").read_text(encoding="utf-8"))
    meta_obj["questions"][-1]["answer"] = None
    meta = json.dumps(meta_obj, ensure_ascii=False)
    png = base64.b64encode((PAPER / "assets" / "q015-fig1.png").read_bytes()).decode()
    pdf = base64.b64encode(TINY_PDF).decode()

    t = T()
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": 1440, "height": 900})
        errs: list[str] = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto((ROOT / "viewer.html").as_uri())

        if args.shots:
            SHOTS.mkdir(exist_ok=True)

        def shot(name):
            if args.shots:
                pg.screenshot(path=str(SHOTS / f"{name}.png"))

        pg.evaluate(INJECT, [md, meta, png, pdf])
        pg.wait_for_selector('[data-ui="qcard"]', timeout=8000)

        def q(expr):
            return pg.evaluate(expr)

        def filters():
            return pg.evaluate(
                """() => {
                    const f = document.querySelector('[data-ui="browse.filters"]');
                    const page = document.querySelector('#page-browse');
                    return { top: Math.round(page.scrollTop),
                             h: Math.round(f.getBoundingClientRect().height) };
                }"""
            )

        # 只看列表里的卡片：浮层关闭后它的卡片仍留在 DOM 里，不限定范围会多算
        def cards():
            return pg.locator('[data-ui="browse.list"] [data-ui="qcard"]').count()

        # ---------- 数据 ----------
        print("\n【数据】")
        t.check("题目卡片数", cards(), 43)
        t.check("试卷标题数", pg.locator('[data-ui="list.paper-title"]').count(), 1)
        t.check("题组数", pg.locator('[data-ui="list.group-title"]').count(), 5)
        t.check("展开按钮数", pg.locator('[data-ui="list.group-expand"]').count(), 5)
        t.check("组内代码块数", pg.locator('[data-ui="qpre.code"]').count(), 5)

        # ---------- 界面开关 ----------
        print("\n【界面开关】")
        t.check("考点标签可见",
                pg.locator('[data-ui="qcard.tag.topic"]:visible').count() > 0, True)
        t.check("考点标签在 DOM 里（隐藏也不影响筛选）",
                pg.locator('[data-ui="qcard.tag.topic"]').count() > 0, True)
        t.check("特征标签可见",
                pg.locator('[data-ui="qcard.tag.feat"]:visible').count() > 0, True)
        t.check("目录徽章不显示（[hidden] 生效）",
                pg.locator('[data-ui="header.dir-badge"]:visible').count(), 0)

        # ---------- 常驻筛选区：题型只有三类，按「节」划分 ----------
        print("\n【筛选区】")
        t.check("特征筛选已移除",
                pg.locator('[data-ui="browse.filters.feat"]').count(), 0)
        t.check("常驻区四个区块（组别+试卷 / 题型 / 知识点 / 搜索）",
                pg.locator('[data-ui="browse.panels"] .frow').count(), 4)
        # 组别/试卷/题型/知识点 排在同一行，搜索独占下一行（宽度不够时 flex 自动折行）。
        # 容差 2px：select 比下拉按钮略高，居中后行框 top 会差一两个像素。
        tops = pg.eval_on_selector_all(
            '[data-ui="browse.panels"] .frow',
            "els => els.map(e => Math.round(e.getBoundingClientRect().top))")
        t.check("四个条件排在同一行", max(tops[:3]) - min(tops[:3]) <= 2, True)
        t.check("搜索另起一行", tops[3] > tops[0], True)
        t.check("搜索框在常驻区里（不折叠）",
                pg.locator('[data-ui="browse.panels"] '
                           '[data-ui="browse.filters.search"]').count(), 1)
        t.check("搜索框可见（无需展开任何面板）",
                pg.locator('[data-ui="browse.filters.search"]:visible').count(), 1)
        # 题型是「多选下拉」：选项默认收起，点按钮才展开
        chip_v = pg.eval_on_selector_all(
            '[data-ui="browse.filters.type.panel"] input',
            "els => els.map(e => e.dataset.v)")
        t.check("题型只有三类", sorted(chip_v),
                sorted(["选择题", "阅读程序", "完善程序"]))
        t.check("题型选项默认收起",
                pg.locator('[data-ui="browse.filters.type.panel"]:visible').count(), 0)
        pg.click('[data-ui="browse.filters.type.btn"]')
        pg.wait_for_timeout(150)
        t.check("点题型按钮展开选项",
                pg.locator('[data-ui="browse.filters.type.panel"]:visible').count(), 1)
        pg.check('[data-ui="browse.filters.type.panel"] input[data-v="阅读程序"]')
        pg.wait_for_timeout(250)
        t.check("筛「阅读程序」只剩第二节 18 题", cards(), 18)
        t.check("题型按钮显示已选",
                "阅读程序" in pg.inner_text('[data-ui="browse.filters.type.btn"]'), True)
        t.check("筛选摘要显示题型",
                "阅读程序" in pg.inner_text('[data-ui="browse.filters.summary"]'), True)
        t.check("勾选后下拉仍展开（重绘不收起）",
                pg.locator('[data-ui="browse.filters.type.panel"]:visible').count(), 1)
        pg.check('[data-ui="browse.filters.type.panel"] input[data-v="完善程序"]')
        pg.wait_for_timeout(250)
        t.check("题型多选取并集（18 + 10 = 28）", cards(), 28)
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(150)
        t.check("Esc 收起下拉",
                pg.locator('[data-ui="browse.filters.type.panel"]:visible').count(), 0)
        pg.click('[data-ui="browse.filters.clear"]')
        pg.wait_for_timeout(250)
        t.check("清空后恢复 43 题", cards(), 43)

        # ---------- 筛选栏 ----------
        print("\n【筛选栏：滚动不占视野】")
        heights = set()
        for y in (0, 300, 900, 2400, 6000):
            pg.evaluate(f"document.querySelector('#page-browse').scrollTop = {y}")
            pg.wait_for_timeout(120)
            heights.add(filters()["h"])
        t.check("面板高度全程恒定", len(heights), 1)
        t.check("面板是紧凑一条（<80px）", max(heights) < 80, True)

        for y in (200, 400, 1200):
            pg.evaluate("document.querySelector('#page-browse').scrollTop = 0")
            pg.wait_for_timeout(100)
            pg.evaluate(f"document.querySelector('#page-browse').scrollTop = {y}")
            pg.wait_for_timeout(120)
            t.check(f"scrollTop={y} 未被滚动锚定拽回", filters()["top"], y)

        pg.evaluate("document.querySelector('#page-browse').scrollTop = 0")
        pg.wait_for_timeout(120)
        pg.mouse.move(700, 600)
        for _ in range(5):
            pg.mouse.wheel(0, 400)
            pg.wait_for_timeout(90)
        t.check("滚轮能一路下滑", filters()["top"] > 1500, True)

        pg.evaluate("document.querySelector('#page-browse').scrollTop = 0")
        pg.wait_for_timeout(150)
        # 筛选按钮与弹层已按要求删除，条件都在常驻筛选区里直接改
        t.check("筛选按钮已移除",
                pg.locator('[data-ui="browse.filters.toggle"]').count(), 0)
        t.check("筛选弹层已移除",
                pg.locator('[data-ui="browse.filters.body"]').count(), 0)
        sel = 'select[data-ui="browse.filters.%s"]'
        t.check("组别是下拉", pg.locator(sel % "exam").count(), 1)
        t.check("试卷是下拉", pg.locator(sel % "paper").count(), 1)
        t.check("两个下拉都常驻可见",
                pg.locator(sel % "exam").is_visible()
                and pg.locator(sel % "paper").is_visible(), True)
        shot("filters-area")
        # 下拉真的会改筛选条件（本夹具只有 1 组 1 卷，所以题数不变，看摘要与复位）
        pg.select_option(sel % "exam", "csp-s1")
        pg.wait_for_timeout(250)
        t.check("选组别后摘要反映出来",
                "CSP-S 提高级" in pg.inner_text('[data-ui="browse.filters.summary"]'), True)
        t.check("选组别后题数不变（夹具只此一组）", cards(), 43)
        pg.click('[data-ui="browse.filters.clear"]')
        pg.wait_for_timeout(250)
        t.check("清空后下拉复位",
                pg.evaluate("""() => document.querySelector(
                  'select[data-ui="browse.filters.exam"]').value"""), "")

        # ---------- 字号缩放 ----------
        print("\n【字号缩放】")
        val = lambda: pg.inner_text('[data-ui="header.font-size.value"]')
        t.check("初始 100%", val(), "100%")
        for want in ("115%", "130%", "150%"):
            pg.click('[data-ui="header.font-size.up"]')
            pg.wait_for_timeout(90)
        t.check("三档之后为 150%", val(), "150%")

        def zoom_in(sel):
            return pg.evaluate(ZOOM_PROBE, sel)

        pg.click('[data-ui="header.tab.compare"]')
        pg.wait_for_timeout(350)
        t.check("对比页倍率=1.5（未叠加）",
                zoom_in('[data-ui="compare.markdown"]'), 1.5)
        shot("compare-150")
        pg.click('[data-ui="header.tab.browse"]')
        pg.wait_for_timeout(200)
        t.check("浏览页倍率=1.5（未叠加）", zoom_in("#list"), 1.5)

        for _ in range(9):
            btn = pg.locator('[data-ui="header.font-size.up"]')
            if btn.is_disabled():
                break
            btn.click()
            pg.wait_for_timeout(70)
        t.check("到顶为 200%", val(), "200%")
        t.check("到顶后 A+ 禁用",
                pg.locator('[data-ui="header.font-size.up"]').is_disabled(), True)
        t.check("200% 时浏览页倍率=2", zoom_in("#list"), 2.0)
        t.check("200% 时对比页倍率=2", (
            pg.click('[data-ui="header.tab.compare"]'), pg.wait_for_timeout(300),
            zoom_in('[data-ui="compare.markdown"]'))[2], 2.0)
        shot("compare-200")
        pg.click('[data-ui="header.tab.browse"]')
        pg.wait_for_timeout(200)
        t.check("200% 时内容未横向溢出",
                q("() => document.querySelector('#list').scrollWidth "
                  "<= document.querySelector('#page-browse').clientWidth + 2"), True)
        shot("browse-200")

        # 恢复 100%。注意要退到 100% 为止，一路退到底会停在 90%——
        # 后面的行高与浮层倍率都在 100% 下才有意义。
        for _ in range(12):
            if val() == "100%":
                break
            btn = pg.locator('[data-ui="header.font-size.down"]')
            if btn.is_disabled():
                break
            btn.click()
            pg.wait_for_timeout(60)
        t.check("回到 100%", val(), "100%")

        # ---------- 代码行高 ----------
        print("\n【代码行高】")
        a = pg.evaluate(CODE_LH_PROBE, '[data-ui="qpre.code"] code')
        print("   组内代码:", a)
        t.near("组内代码行高倍率", a["ratio"], 1.13)
        pg.click('[data-ui="header.tab.compare"]')
        pg.wait_for_timeout(350)
        b_ = pg.evaluate(CODE_LH_PROBE, '[data-ui="compare.markdown"] pre code')
        print("   对比页代码:", b_)
        t.near("对比页代码行高倍率", b_["ratio"], 1.13)
        pg.click('[data-ui="header.tab.browse"]')
        pg.wait_for_timeout(200)

        # ---------- 题面浮层 ----------
        print("\n【题面浮层】")
        t.check("浮层初始隐藏", pg.locator('[data-ui="overlay"]').is_visible(), False)
        pg.click('[data-ui="list.group-expand"]')
        pg.wait_for_timeout(300)
        t.check("点击后浮层打开", pg.locator('[data-ui="overlay"]').is_visible(), True)
        t.check("浮层标题", pg.inner_text('[data-ui="overlay.title"]'),
                "(1)　阅读程序(1)")
        t.check("左栏有代码", pg.locator('[data-ui="overlay.material"] pre').count() > 0, True)
        t.check("左栏不含题干",
                q("""() => /第\\s*\\d+\\s*题/.test(
                        document.querySelector('[data-ui="overlay.material"]').textContent)"""), False)
        t.check("右栏题目数", pg.locator('[data-ui="overlay.questions"] [data-ui="qcard"]').count(), 6)
        t.check("右栏有分栏标题",
                pg.locator('[data-ui="overlay.sub-title"]').count(), 2)
        t.check("左右两栏可独立滚动",
                q("""() => {
                    const l = document.querySelector('[data-ui="overlay.material"]');
                    const r = document.querySelector('[data-ui="overlay.questions"]');
                    return getComputedStyle(l).overflowY === 'auto' &&
                           getComputedStyle(r).overflowY === 'auto';
                }"""), True)
        t.check("浮层内有字号控件",
                pg.locator('[data-ui="overlay.font-size"]').is_visible(), True)
        t.check("浮层字号与顶栏一致",
                pg.inner_text('[data-ui="overlay.font-size.value"]'),
                pg.inner_text('[data-ui="header.font-size.value"]'))

        # 浮层盖住了顶栏，没有这套控件就只能关掉再调——教学时很别扭
        pg.click('[data-ui="overlay.font-size.up"]')
        pg.click('[data-ui="overlay.font-size.up"]')
        pg.wait_for_timeout(250)
        t.check("浮层内放大后倍率=1.3",
                zoom_in('[data-ui="overlay.material"]'), 1.3)
        t.check("右栏同步放大",
                zoom_in('[data-ui="overlay.questions"]'), 1.3)
        t.check("顶栏标签跟着更新",
                pg.inner_text('[data-ui="header.font-size.value"]'), "130%")
        shot("overlay-zoom")
        pg.click('[data-ui="overlay.font-size.down"]')
        pg.click('[data-ui="overlay.font-size.down"]')
        pg.wait_for_timeout(250)
        t.check("浮层内缩回 100%",
                pg.inner_text('[data-ui="overlay.font-size.value"]'), "100%")

        shot("overlay")
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(200)
        t.check("Esc 关闭浮层", pg.locator('[data-ui="overlay"]').is_visible(), False)

        # ---------- 筛选生效 ----------
        print("\n【筛选】")
        before = cards()
        pg.evaluate("document.querySelector('#page-browse').scrollTop = 0")
        pg.wait_for_timeout(150)
        # 知识点也是多选下拉；按可见文字选，别按下标——顺序随计数变化
        pg.click('[data-ui="browse.filters.topic.btn"]')
        pg.wait_for_timeout(150)
        opt = pg.locator('[data-ui="browse.filters.topic.panel"] .ddopt',
                         has_text="排序").first
        want = int(opt.locator(".n").inner_text())
        opt.locator("input").check()
        pg.wait_for_timeout(300)
        t.check("按考点筛选后题目变少", cards() < before, True)
        t.check("筛出的题数与该考点计数一致", cards(), want)
        pg.click('[data-ui="browse.filters.clear"]')
        pg.wait_for_timeout(300)
        t.check("清空后恢复", cards(), before)
        # 面板自己的滚动位置不能被重绘清零——否则挑靠下的考点时，每勾一次就被弹回顶部。
        # 上面点了「清空」，那一下点在 .dd 外面，下拉已自动收起，这里要重新点开。
        # 夹具只有 1 卷、考点少、面板本来滚不动，所以注入一条样式把它压矮，再验这个机制
        # （注入的 <style> 留在 head 里，重绘之后依然生效）。
        pg.click('[data-ui="browse.filters.topic.btn"]')
        pg.wait_for_timeout(150)
        pg.add_style_tag(content='[data-ui="browse.filters.topic.panel"]'
                                 '{max-height:90px !important}')
        pg.evaluate("""() => { const p = document.querySelector(
          '[data-ui="browse.filters.topic.panel"]'); p.scrollTop = p.scrollHeight; }""")
        pg.wait_for_timeout(150)
        top_before = pg.evaluate("""() => Math.round(document.querySelector(
          '[data-ui="browse.filters.topic.panel"]').scrollTop)""")
        pg.evaluate("""() => {
          const p = document.querySelector('[data-ui="browse.filters.topic.panel"]');
          [...p.querySelectorAll('input[data-v]')]
            .find(e => e.dataset.v === "topic:greedy").click();
        }""")
        pg.wait_for_timeout(350)
        top_after = pg.evaluate("""() => Math.round(document.querySelector(
          '[data-ui="browse.filters.topic.panel"]').scrollTop)""")
        t.check("面板确实滚下去了（前提成立）", top_before > 0, True)
        t.check("勾选后面板滚动位置保留", top_after, top_before)
        pg.click('[data-ui="browse.filters.clear"]')
        pg.wait_for_timeout(250)
        pg.keyboard.press("Escape")          # 收起下拉，别挡着后面几节的点击
        pg.wait_for_timeout(150)

        # ---------- 排版 ----------
        print("\n【排版】")
        ti = q("""() => {
            const p = document.querySelector('[data-ui="qpre"] p')
                   || document.querySelector('[data-ui="compare.markdown"] p');
            if (!p) return null;
            const cs = getComputedStyle(p);
            return { indent: cs.textIndent, fs: cs.fontSize };
        }""")
        t.near("题面段落首行缩进 = 2 字",
               float(ti["indent"].replace("px", "")) / float(ti["fs"].replace("px", "")), 2.0)
        t.check("选项不缩进",
                q("() => getComputedStyle(document.querySelector("
                  "'[data-ui=\"qcard.opt\"]')).textIndent"), "0px")
        t.check("代码块行高倍率",
                pg.evaluate(CODE_LH_PROBE, '[data-ui="qpre.code"] code')["ratio"], 1.13)

        # ---------- 题解 ----------
        print("\n【题解】")
        sols = pg.locator('[data-ui="browse.list"] [data-ui="qcard.solution"]')
        # 夹具把最后一题的答案置空，题解也随之消失 → 42 条（考题解由答案派生）
        t.check("题解区数量 = 有答案的题数", sols.count(), 42)
        t.check("题解默认全部折叠",
                pg.locator('[data-ui="browse.list"] '
                           '[data-ui="qcard.solution.body"]:visible').count(), 0)
        t.check("题干里没有题解残留",
                q("""() => /题解|答案：/.test(
                        document.querySelector('[data-qid="csp-s1-2019b-001"]')
                          .querySelector('[data-ui="qcard.stem"]').textContent)"""), False)

        c1s = pg.locator('[data-ui="browse.list"] [data-qid="csp-s1-2019b-001"]')
        t.check("题解按钮默认文案",
                c1s.locator('[data-ui="qcard.solution.toggle"]').inner_text(), "题解")
        c1s.locator('[data-ui="qcard.solution.toggle"]').click()
        pg.wait_for_timeout(150)
        t.check("点击后展开题解",
                c1s.locator('[data-ui="qcard.solution.body"]').is_visible(), True)
        t.check("展开后显示答案",
                c1s.locator('[data-ui="qcard.solution.answer"]').inner_text(), "答案：C")
        t.check("展开后按钮变收起",
                c1s.locator('[data-ui="qcard.solution.toggle"]').inner_text(), "收起题解")
        shot("solution-open")
        c1s.locator('[data-ui="qcard.solution.toggle"]').click()
        pg.wait_for_timeout(150)
        t.check("再点收回",
                c1s.locator('[data-ui="qcard.solution.body"]').is_visible(), False)

        # 判断题按卷面答案卡写 √ / ×，而不是注释里的 T / F（SPEC 3.2）
        tf16 = pg.locator('[data-ui="browse.list"] [data-qid="csp-s1-2019b-016"]')
        tf16.locator('[data-ui="qcard.solution.toggle"]').click()
        pg.wait_for_timeout(150)
        t.check("判断题题解写 ×（不是 F）",
                tf16.locator('[data-ui="qcard.solution.answer"]').inner_text(), "答案：×")
        tf17 = pg.locator('[data-ui="browse.list"] [data-qid="csp-s1-2019b-017"]')
        tf17.locator('[data-ui="qcard.solution.toggle"]').click()
        pg.wait_for_timeout(150)
        t.check("判断题题解写 √（不是 T）",
                tf17.locator('[data-ui="qcard.solution.answer"]').inner_text(), "答案：√")
        t.check("无答案的题没有题解区",
                pg.locator('[data-ui="browse.list"] [data-qid="csp-s1-2019b-043"] '
                           '[data-ui="qcard.solution"]').count(), 0)

        # 一键关掉题解：与其它开关同一套机制，元素仍在 DOM 里，只是不显示
        pg.evaluate("() => { UI.showSolution = false; applyUiFlags(); }")
        pg.wait_for_timeout(200)
        t.check("UI.showSolution=false 时题解不显示",
                pg.locator('[data-ui="browse.list"] '
                           '[data-ui="qcard.solution"]:visible').count(), 0)
        t.check("但题解仍在 DOM 里", sols.count(), 42)
        pg.evaluate("() => { UI.showSolution = true; applyUiFlags(); }")
        pg.wait_for_timeout(200)
        t.check("开关打开后题解回来",
                pg.locator('[data-ui="browse.list"] '
                           '[data-ui="qcard.solution"]:visible').count(), 42)

        # ---------- 答题 ----------
        cards = lambda: pg.locator('[data-ui="browse.list"] [data-ui="qcard"]')

        print("\n【答题 · 普通模式】")
        t.check("默认是普通模式",
                pg.get_attribute('[data-ui="header.quiz-mode.normal"]', "aria-pressed"), "true")
        t.check("单选题有 4 个可点选项",
                cards().first.locator('[data-ui="qcard.opt"]').count(), 4)

        # 第1题正确答案是 C
        c1 = cards().first
        c1.locator('[data-ui="qcard.opt"][data-opt="C"]').click()
        pg.wait_for_timeout(220)
        t.check("点对后该项标 correct",
                c1.locator('[data-ui="qcard.opt"][data-opt="C"]')
                  .get_attribute("data-state"), "correct")
        t.check("点对给出结论",
                c1.locator('[data-ui="qcard.verdict"]').inner_text(), "回答正确")
        shot("quiz-right")

        # 第2题正确答案是 D，这里故意点 A
        c2 = cards().nth(1)
        c2.locator('[data-ui="qcard.opt"][data-opt="A"]').click()
        pg.wait_for_timeout(220)
        t.check("点错后该项标 wrong",
                c2.locator('[data-ui="qcard.opt"][data-opt="A"]')
                  .get_attribute("data-state"), "wrong")
        t.check("点错后标出正确答案",
                c2.locator('[data-ui="qcard.opt"][data-opt="D"]')
                  .get_attribute("data-state"), "correct")
        t.check("点错给出结论",
                c2.locator('[data-ui="qcard.verdict"]').inner_text(),
                "回答错误 · 正确答案 D")

        c2.locator('[data-ui="qcard.opt"][data-opt="B"]').click()
        pg.wait_for_timeout(180)
        t.check("已揭示的题不能再改选",
                c2.locator('[data-ui="qcard.opt"][data-opt="B"]')
                  .get_attribute("data-state"), "")

        # 判断题没有 ABCD，应自动补出「正确 / 错误」。第16题正确答案是「错误」。
        # 限定在列表内：浮层里也有同 qid 的卡片，不限定会撞上
        tf = pg.locator('[data-ui="browse.list"] [data-qid="csp-s1-2019b-016"]')
        t.check("判断题补出两个选项",
                tf.locator('[data-ui="qcard.opt"]').count(), 2)
        tf.locator('[data-ui="qcard.opt"][data-opt="T"]').click()
        pg.wait_for_timeout(220)
        t.check("判断题判错",
                tf.locator('[data-ui="qcard.verdict"]').inner_text(),
                "回答错误 · 正确答案 错误 ×")

        # 最后一道题的答案在夹具里被抹掉了：能选，但明确提示判不了
        cN = cards().last
        cN.locator('[data-ui="qcard.opt"]').first.click()
        pg.wait_for_timeout(220)
        t.check("无答案题给出提示",
                cN.locator('[data-ui="qcard.verdict"]').inner_text(),
                "本题暂无答案，无法判分")
        t.check("无答案题不计入判分",
                pg.inner_text('[data-ui="browse.quiz-stat.score"]'), "正确 1 · 错误 2")
        t.check("已答计数", pg.inner_text('[data-ui="browse.quiz-stat.done"]'), "4")

        # 结论元素在卡片重绘后不能被重复插入。
        # 开合题面浮层会重建 QUIZ.dom 索引，索引若没认领已存在的结论元素，
        # paintCard 会以为缺一个、再插一条，页面上就出现两条结论。
        pg.locator('[data-ui="list.group-expand"]').first.click()
        pg.wait_for_timeout(300)
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(300)
        t.check("浮层开合后结论不重复",
                c1.locator('[data-ui="qcard.verdict"]').count(), 1)
        # 这里必须用 text_content 而非 inner_text：卡片是 content-visibility:auto，
        # 滚出视口的卡不参与渲染，inner_text() 会返回空串（计数却仍是 1），
        # 看着像「结论丢了」，其实只是没画。
        t.check("浮层开合后结论仍在",
                c1.locator('[data-ui="qcard.verdict"]').text_content(), "回答正确")

        print("\n【答题 · 考试模式】")
        pg.click('[data-ui="header.quiz-mode.exam"]')
        pg.wait_for_timeout(280)
        t.check("切模式后清空作答",
                pg.inner_text('[data-ui="browse.quiz-stat.done"]'), "0")
        t.check("提交按钮出现",
                pg.locator('[data-ui="browse.quiz-submit"]').is_visible(), True)
        t.check("考试模式不显示分数",
                pg.locator('[data-ui="browse.quiz-stat.score"]').is_visible(), False)
        # 题解就是答案：交卷前整个题解区不渲染（不是隐藏，是根本不在 DOM 里）
        t.check("考试模式提交前不渲染题解",
                pg.locator('[data-ui="browse.list"] [data-ui="qcard.solution"]').count(), 0)

        c1 = cards().first
        c1.locator('[data-ui="qcard.opt"][data-opt="B"]').click()
        pg.wait_for_timeout(220)
        t.check("考试模式下点击不揭示结果",
                c1.locator('[data-ui="qcard.verdict"]').count(), 0)
        t.check("但记下已选",
                c1.locator('[data-ui="qcard.opt"][data-opt="B"]')
                  .get_attribute("data-state"), "chosen")
        shot("quiz-exam")

        pg.click('[data-ui="browse.quiz-submit"]')
        pg.wait_for_timeout(320)
        t.check("提交后揭示选错",
                c1.locator('[data-ui="qcard.opt"][data-opt="B"]')
                  .get_attribute("data-state"), "wrong")
        t.check("提交后题解才出现",
                pg.locator('[data-ui="browse.list"] [data-ui="qcard.solution"]').count(), 42)
        t.check("提交后提交按钮消失",
                pg.locator('[data-ui="browse.quiz-submit"]').is_visible(), False)
        t.check("未作答的题也揭示",
                cards().nth(2).locator('[data-ui="qcard.verdict"]').inner_text(),
                "未作答 · 正确答案 C")
        shot("quiz-submitted")

        pg.click('[data-ui="browse.quiz-reset"]')
        pg.wait_for_timeout(260)
        t.check("重做清空作答",
                pg.inner_text('[data-ui="browse.quiz-stat.done"]'), "0")
        t.check("重做后提交按钮回来",
                pg.locator('[data-ui="browse.quiz-submit"]').is_visible(), True)
        t.check("重做后题解重新收起",
                pg.locator('[data-ui="browse.list"] [data-ui="qcard.solution"]').count(), 0)

        pg.click('[data-ui="header.quiz-mode.normal"]')
        pg.wait_for_timeout(250)
        t.check("切回普通模式",
                pg.get_attribute('[data-ui="header.quiz-mode.normal"]', "aria-pressed"), "true")
        t.check("切回后作答已清空",
                pg.inner_text('[data-ui="browse.quiz-stat.done"]'), "0")
        t.check("普通模式不限制题解",
                pg.locator('[data-ui="browse.list"] [data-ui="qcard.solution"]').count(), 42)

        t.check("全程无 JS 报错", errs, [])
        b.close()

    return t.report()


if __name__ == "__main__":
    sys.exit(main())
