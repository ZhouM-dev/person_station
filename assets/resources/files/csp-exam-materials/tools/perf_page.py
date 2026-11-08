#!/usr/bin/env python3
"""临时：量 viewer.html 导入全部 14 卷时的打开与点击耗时（含渲染，不只看 JS）（用完即删）。

用法: uv run --with playwright python tools/_perf.py
"""
from __future__ import annotations

import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.stdout.reconfigure(encoding="utf-8")

FILES = []
for group in ("csp-s1", "csp-j1"):
    for d in sorted((ROOT / "题库" / group).iterdir()):
        if not (d / "paper.md").is_file():
            continue
        rel = f"题库/{group}/{d.name}"
        for name in ("paper.md", "meta.json"):
            FILES.append((f"{rel}/{name}", (d / name).read_text(encoding="utf-8")))

print(f"注入 {len(FILES)//2} 卷，{len(FILES)} 个文件")

INJECT = """(files) => {
    const mk = (name, rel, body) => {
      const f = new File([body], name, { type: "text/plain" });
      Object.defineProperty(f, "webkitRelativePath", { value: rel });
      return f;
    };
    ingest(files.map(([rel, body]) =>
      ({ file: mk(rel.split("/").pop(), rel, body), rel })));
}"""

# 记录长任务（>50ms 的主线程阻塞）
WATCH = """() => {
    window.__lt = [];
    if (!window.__ltObs) {
      window.__ltObs = new PerformanceObserver(l =>
        l.getEntries().forEach(e => window.__lt.push(+e.duration.toFixed(1))));
      window.__ltObs.observe({ entryTypes: ["longtask"] });
    }
    return true;
}"""

# 点一个选项：js = 点击处理函数本身的耗时；
# frame = 从点击到「下一帧画完」为止（含样式重算 + 布局 + 重绘）
CLICK_TIMING = """() => {
    const card = [...document.querySelectorAll('[data-ui="qcard"]')]
      .find(c => c.querySelector('[data-ui="qcard.opt"][data-state=""]'));
    if (!card) return null;
    const li = card.querySelector('[data-ui="qcard.opt"]');
    return new Promise(res => {
      const t0 = performance.now();
      li.click();
      const js = performance.now() - t0;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        res({ qid: card.dataset.qid,
              js: +js.toFixed(2),
              frame: +(performance.now() - t0).toFixed(1) });
      }));
    });
}"""

with sync_playwright() as pw:
    br = pw.chromium.launch(channel="chrome")
    pg = br.new_page(viewport={"width": 1400, "height": 900})
    pg.goto((ROOT / "viewer.html").as_uri())
    pg.wait_for_timeout(400)
    pg.evaluate(WATCH)

    t0 = pg.evaluate("() => performance.now()")
    pg.evaluate(INJECT, FILES)
    pg.wait_for_selector('[data-ui="qcard"]', timeout=60000)
    # 等到真正画完一帧
    pg.evaluate("""() => new Promise(r =>
        requestAnimationFrame(() => requestAnimationFrame(r)))""")
    t1 = pg.evaluate("() => performance.now()")
    print(f"\n导入 + DOM + 首帧: {t1 - t0:.0f} ms")

    n = pg.evaluate("() => document.querySelectorAll('[data-ui=\"qcard\"]').length")
    opts = pg.evaluate("() => document.querySelectorAll('[data-ui=\"qcard.opt\"]').length")
    print(f"卡片 {n} 张，选项 {opts} 个")

    lt = pg.evaluate("() => window.__lt")
    print(f"长任务（>50ms）: {lt}   合计 {sum(lt):.0f} ms")

    # 点三次
    for i in range(3):
        r = pg.evaluate(CLICK_TIMING)
        print(f"点击 {i+1}: JS {r['js']} ms / 到下一帧 {r['frame']} ms   ({r['qid']})")
        pg.wait_for_timeout(150)

    # 用户平时是放大了字号看的，放大后全表重排更贵，单独量一轮
    for z in ("1.4", "1.8"):
        pg.evaluate("z => document.documentElement.style.setProperty('--content-zoom', z)", z)
        pg.evaluate("""() => new Promise(r =>
            requestAnimationFrame(() => requestAnimationFrame(r)))""")
        r = pg.evaluate(CLICK_TIMING)
        print(f"缩放 {z} 倍点击: JS {r['js']} ms / 到下一帧 {r['frame']} ms")

    # 搜索框逐字输入：量「敲 6 个字到界面稳定」的总墙钟时间
    pg.evaluate("""() => {
        const qi = document.querySelector('[data-ui="browse.filters.search"]');
        qi.value = ""; qi.dispatchEvent(new Event("input", { bubbles: true }));
    }""")
    pg.wait_for_timeout(300)
    t4 = pg.evaluate("""() => {
        const qi = document.querySelector('[data-ui="browse.filters.search"]');
        return new Promise(res => {
          const t0 = performance.now();
          const word = "二叉树";
          let i = 0;
          const tick = () => {
            if (i < word.length){
              qi.value += word[i++];
              qi.dispatchEvent(new Event("input", { bubbles: true }));
              setTimeout(tick, 30);          // 模拟人手打字间隔
            } else {
              setTimeout(() => res(+(performance.now() - t0).toFixed(0)), 400);
            }
          };
          tick();
        });
    }""")
    print(f"搜索框逐字输入 3 字（含防抖后重绘）: {t4} ms")

    n2 = pg.evaluate("() => document.querySelectorAll('[data-ui=\"qcard\"]').length")
    print(f"筛选后卡片: {n2} 张")

    br.close()
