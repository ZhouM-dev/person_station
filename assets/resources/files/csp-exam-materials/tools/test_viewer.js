/* 一次性：把 viewer.html 里的解析逻辑抽出来，用真实 paper.md 跑一遍。
   用 bun 运行：bun tools/_test_viewer.js */
import { readFileSync } from "fs";

const html = readFileSync("viewer.html", "utf8");
const m = /<script>([\s\S]*?)<\/script>/.exec(html);
if (!m) { console.error("找不到 <script>"); process.exit(1); }

// 截到「7. 交互装配」之前——那之后有顶层 DOM 调用，在 Node 里跑不了
let js = m[1];
const cut = js.indexOf("7. 交互装配");
js = js.slice(0, js.lastIndexOf("/* ====", cut));
js += "\nreturn { parsePaper, splitBody, renderMarkdown, inlineMd, renderMath, "
    + "splitFrontMatter, examLabel, tagLabel, TAG_LABEL, UI, UI_CLASS, "
    + "groupMaterial, groupQuestions };";

let api;
try {
  api = new Function(js)();
} catch (e) {
  console.error("脚本语法错误：", e.message);
  process.exit(1);
}
console.log("✓ 脚本语法通过");

const md = readFileSync("题库/csp-s1/2019/paper.md", "utf8");
const { fm, sections, questions } = api.parsePaper(md);

let fail = 0;
const check = (name, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗"} ${name}: ${got}${ok ? "" : "  (期望 " + want + ")"}`);
};

check("front matter paper_id", fm.paper_id, "csp-s1-2019b");
check("节数", sections.length, 3);
check("总题数", questions.length, 43);
check("第一节题数", sections[0].questions.length, 15);
check("第二节题数", sections[1].questions.length, 18);
check("第三节题数", sections[2].questions.length, 10);
check("首题 qid", questions[0].qid, "csp-s1-2019b-001");
check("末题 qid", questions[42].qid, "csp-s1-2019b-043");
check("首题分值", questions[0].score, "2");
check("首题题型", questions[0].type, "single_choice");
check("判断题数量", questions.filter(q => q.type === "true_false").length, 12);
check("带图题", questions.filter(q => q.images.length).length, 1);
check("第15题图片名", questions[14].images[0], "q015-fig1.png");
check("第15题标签数", questions[14].tags.length, 3);
check("分组名", questions[15].group, "阅读程序(1)");
check("第30题分值", questions[29].score, "2");
// 答案写在题块注释里，解析时要一并取出（答题功能据此判分）
check("答案从注释解析", questions[0].answer, "C");
check("判断题答案", questions[15].answer, "F");
check("43 题都有答案", questions.filter(q => q.answer).length, 43);
check("单选答案取值合法",
  questions.filter(q => q.type === "single_choice").every(q => "ABCD".includes(q.answer)), true);
check("判断答案取值合法",
  questions.filter(q => q.type === "true_false").every(q => "TF".includes(q.answer)), true);

/* ---- 题解块（SPEC 3.9）---------------------------------------------------
   题解由 meta.json 派生、写在题干末尾。解析时必须把它从 q.lines 里剥离，
   否则会被 splitBody() 当成普通文字画进题干（选项下面多出「> **题解**」）。 */
const TF_MARK = { T: "√", F: "×" };
const solText = q => q.type === "true_false" ? TF_MARK[q.answer] : q.answer;

check("有答案的题都有题解",
  questions.filter(q => q.answer && !q.solution).length, 0);
check("题解都带答案行", questions.every(q => !q.solution || q.solution.answer), true);
check("题解答案与题块注释一致",
  questions.every(q => !q.solution || q.solution.answer === solText(q)), true);
// 判断题刻意用卷面答案卡的 √/×，机器读的注释里仍是 T/F
check("判断题 T 渲染成 √",
  questions.find(q => q.answer === "T").solution.answer, "√");
check("判断题 F 渲染成 ×",
  questions.find(q => q.answer === "F").solution.answer, "×");
check("判断题题解全是 √ 或 ×",
  questions.filter(q => q.type === "true_false")
    .every(q => "√×".includes(q.solution.answer)), true);
check("标注卷别的题解答案用 A~D",
  questions.filter(q => q.type === "single_choice")
    .every(q => "ABCD".includes(q.solution.answer)), true);
// 题解 v2：有答案的题一律要写解释（2019 无争议题，43 道也都有解释）
check("有答案的题都有解释",
  questions.filter(q => q.answer).every(q => q.solution.note), true);
check("解释条数等于题数",
  questions.filter(q => q.solution.note).length, 43);
// 争议栏只挂在有争议的题上：本卷只有第 3 题（题干印「逻辑或」、实考按位或）
check("争议栏只给争议题",
  questions.filter(q => q.solution.dispute).map(q => q.no), [3]);
check("题解块已从题干剥离",
  questions.some(q => q.lines.join("\n").includes("**题解**")), false);
check("答案行未落进题干",
  questions.some(q => q.lines.some(l => /^>\s*答案：/.test(l))), false);
// 剥离后题干里不该再出现 「> **题解**」这一段，切块结果里也不能有
check("切块后题解不进题干",
  questions.some(q => api.splitBody(q.lines).blocks
    .some(b => b.kind === "text" && b.text.includes("答案："))), false);
// 每道完善程序小题只含一个带圈数字：34~38 用 ①②③④⑤，39~43 再用一遍
const circled = /[①②③④⑤]/;
check("含带圈填空的题", questions.filter(q => circled.test(q.lines.join(""))).length, 10);
check("含①的题", questions.filter(q => q.lines.join("").includes("①")).length, 2);

/* ---- 题解 v2：解释 / 争议 / 组级程序说明 ---------------------------------
   v2（SPEC 1.5）起：每题都写 `解释：`；争议题多一段 `争议：`，且必须排在
   `解释：` 之后；大题组另有组级 `> **程序说明**`，长在组内代码块之后、
   第一个分栏之前。拿参考件 csp-j1-2019b 跑一遍真实数据。 */
const mdJ = readFileSync("题库/csp-j1/2019/paper.md", "utf8");
const pj = api.parsePaper(mdJ);
const jq = pj.questions;
const jGroups = pj.sections.flatMap(s => s.blocks)
  .filter(b => api.groupMaterial(b).some(l => /^\s*>\s*\*\*程序说明\*\*\s*$/.test(l)));

check("J 卷题数", jq.length, 43);
check("J 卷每题都有解释", jq.filter(q => !q.solution || !q.solution.note).length, 0);
check("J 卷有解释的题数", jq.filter(q => q.solution.note).length, 43);
check("J 卷争议题数", jq.filter(q => q.solution.dispute).length, 1);
check("J 卷争议题的 qid",
  jq.filter(q => q.solution.dispute).map(q => q.qid).join(","), "csp-j1-2019b-021");
check("J 卷争议段不是解释段的副本",
  jq.find(q => q.qid === "csp-j1-2019b-021").solution.dispute
    !== jq.find(q => q.qid === "csp-j1-2019b-021").solution.note, true);
check("J 卷题解三段都从题干里剥离",
  jq.some(q => /题解|答案：|解释：|争议：/.test(q.lines.join("\n"))), false);
check("J 卷五段程序说明都在组内", jGroups.length, 5);
check("J 卷程序说明在代码之前的分栏之外",
  jGroups.every(b => {
    const m = api.groupMaterial(b).join("\n");
    return m.indexOf("```cpp") < m.indexOf("**程序说明**");
  }), true);
check("J 卷程序说明未落进题干",
  jq.some(q => q.lines.join("\n").includes("程序说明")), false);

// 选项解析
const b1 = api.splitBody(questions[0].lines);
check("第1题选项数", b1.opts.length, 4);
check("第1题选项A", b1.opts[0].label, "A");
const b15 = api.splitBody(questions[14].lines);
check("第15题图片块", b15.blocks.filter(x => x.kind === "img").length, 1);

// Markdown 渲染
const out = api.renderMarkdown(md);
check("渲染无残留注释", /<!--/.test(out), false);
check("渲染出 h2", (out.match(/<h2>/g) || []).length, 3);
check("渲染出 figure img", /data-src="assets\/q015-fig1\.png"/.test(out), true);
check("渲染出代码块", (out.match(/<pre>/g) || []).length >= 5, true);

// 行内渲染：确认 " 2 " 这类数字空格不会被误当成代码占位符
const s = api.inlineMd("第 2 题有 `int a` 和 **粗体**");
check("行内不误伤数字", s.includes("第 2 题"), true);
check("行内代码", s.includes("<code>int a</code>"), true);
check("行内粗体", s.includes("<strong>粗体</strong>"), true);

// ---- LaTeX 渲染 ----
const mt = src => api.renderMath(src);
check("\\le -> ≤", mt("1 \\le n \\le 64"), "1 ≤ n ≤ 64");
check("\\ge -> ≥", mt("n \\ge 10"), "n ≥ 10");
check("上标", mt("10^7").includes("<sup>7</sup>"), true);
check("下标带花括号", mt("a_{1,1}").includes("<sub>1,1</sub>"), true);
check("下标单字符", mt("a_i").includes("<sub>i</sub>"), true);
check("\\log 直立", mt("n \\log n").includes('<span class="op">log</span>'), true);
check("\\max 直立", mt("\\max\\{a, b\\}").includes('<span class="op">max</span>'), true);
check("花括号转义", mt("\\{a\\}"), "{a}");
check("\\frac 叠放", mt("\\frac{a}{b}").includes('class="frac"'), true);
// \sqrt 输出 √ 加上带 .rad 的横线层（CSS 画上划线），不是裸的 "√x"
check("\\sqrt 根号", mt("\\sqrt{x}").startsWith("√"), true);
check("\\sqrt 被开方数", mt("\\sqrt{x}").includes(">x<"), true);
check("希腊字母", mt("\\alpha + \\Theta"), "α + Θ");
check("未知命令退化", mt("\\foobar x"), "foobar x");
check("无残留反斜杠", /\\[A-Za-z]/.test(mt("1 \\le n \\times 2 \\cdot m")), false);

// 行内公式：美元符必须被吃掉
const mi = api.inlineMd("规则个数 $1 \\le n \\le 64$，共 $n$ 行");
check("行内公式去美元符", mi.includes("$"), false);
check("行内公式出 ≤", mi.includes("≤"), true);
check("行内公式保留正文", mi.includes("规则个数"), true);

// 真实文档：渲染后不应再有 LaTeX 命令泄漏
check("全文无 \\le 泄漏", /\\le\b/.test(out), false);
check("全文无 \\log 泄漏", /\\log\b/.test(out), false);
check("全文无 \\max 泄漏", /\\max\b/.test(out), false);

/* ---- 结构不变量 ----------------------------------------------------------
   这一组不针对某个具体 bug，而是断言「整类问题」不会再现。
   凡是「不属于题目的内容」被塞进题目正文，或「题目的内容」被丢掉，
   下面任一条就会失败。新增试卷时若某种新写法漏了处理，也会在这里暴露。 */

const secQs = s => s.blocks.flatMap(b => b.subs.flatMap(x => x.questions));
const allPre = sections.flatMap(s => s.blocks.flatMap(b => [
  ...b.pre, ...b.subs.flatMap(x => x.pre),
]));

check("题目正文无 Markdown 标题残留",
  questions.some(q => q.lines.some(l => /^#{1,6}\s/.test(l))), false);
check("题目正文无 HTML 注释残留",
  questions.some(q => q.lines.some(l => /<!--/.test(l))), false);
check("分栏小标题未串进正文",
  questions.some(q => q.lines.some(l => /^(判断题|选择题|单选题)\s*$/.test(l.trim()))), false);
check("组标记未串进正文",
  questions.some(q => q.lines.some(l => /group:/.test(l))), false);

// 代码围栏总数守恒：原文有几个，就必须被接住几个（在题目里或在组内 pre 里）
const count = (t, re) => (t.match(re) || []).length;
const FENCE = /^```\w*\s*$/gm;
const inMd  = count(md, FENCE);
const inQ   = questions.reduce((n, q) => n + count(q.lines.join("\n"), FENCE), 0);
const inPre = count(allPre.join("\n"), FENCE);
check("代码围栏总数对得上", inQ + inPre, inMd);
check("确实有代码落在组内", inPre > 0, true);

// 分节题目数与扁平列表一致
const bySec = sections.reduce((n, s) => n + secQs(s).length, 0);
check("分节题目数 = 总题数", bySec, questions.length);
check("每个题组都有归属的节",
  sections.every(s => s.blocks.every(b => b.subs.every(x => x.questions.every(q => q.section === s)))), true);

// 阅读程序的大题组名与分栏结构
const rd = sections.find(s => s.title.includes("阅读程序"));
check("识别出大题组名", rd.blocks[0].group, "阅读程序(1)");
check("识别出大题组标题", rd.blocks[0].heading, "(1)");
check("识别出判断题分栏",
  rd.blocks.some(b => b.subs.some(x => x.title === "判断题")), true);
check("识别出选择题分栏",
  rd.blocks.some(b => b.subs.some(x => x.title === "选择题")), true);
check("阅读程序共 3 个题组", rd.blocks.length, 3);
check("每个题组都带代码",
  rd.blocks.every(b => count([...b.pre, ...b.subs.flatMap(x => x.pre)].join("\n"), FENCE) > 0), true);

// 题号必须是有效的整数，且与 qid、数组下标、标题层级三者自洽
check("题号全是整数", questions.every(q => Number.isInteger(q.no)), true);
check("题号连续且从 1 开始",
  questions.every((q, i) => q.no === i + 1), true);
check("题号与 qid 末三位一致",
  questions.every(q => q.qid.endsWith("-" + String(q.no).padStart(3, "0"))), true);
check("第一节题目层级为 ###",
  secQs(sections[0]).every(q => q.level === 3), true);
check("第二、三节题目层级为 #####",
  sections.slice(1).every(s => secQs(s).every(q => q.level === 5)), true);

// 标签中文名：由 tools/gen_tags.py 从 TAGS.md 生成，注入 viewer.html
check("标签中文名 feat:figure", api.tagLabel("feat:figure"), "配图");
check("标签中文名 topic:combinatorics", api.tagLabel("topic:combinatorics"), "组合计数");
check("未知标签回退为去前缀原文", api.tagLabel("topic:zzz"), "zzz");

// 凡是题目用到的标签，都必须有中文名——新增标签忘了登记会在这里暴露
const usedTags = [...new Set(questions.flatMap(q => q.tags || []))].sort();
const unnamed = usedTags.filter(t => !api.TAG_LABEL[t]);
check("题目用到的标签都有中文名", unnamed.join(",") || "无", "无");

// ---- 组别 ----
check("S 组标签", api.examLabel("csp-s1"), "CSP-S 提高级");
check("J 组标签", api.examLabel("csp-j1"), "CSP-J 入门级");
check("未知组别回退原名", api.examLabel("csp-x9"), "csp-x9");

/* ---- 题面浮层 ------------------------------------------------------------
   左栏取「题目之外的内容」，右栏取「该组全部小题」。两者必须严格互补：
   题面里混进题干，或代码没进题面，展开后就是错的。 */
const rdG = sections.find(s => s.title.includes("阅读程序"));
const rdMat = api.groupMaterial(rdG.blocks[0]).join("\n");
const rdQs = api.groupQuestions(rdG.blocks[0]);

check("题面含程序代码", /```cpp/.test(rdMat), true);
check("题面不含题干", /第\s*\d+\s*题/.test(rdMat), false);
check("题面不含选项", /^[-*]\s+[A-D][.、]/m.test(rdMat), false);
check("右栏题目数 = 组内题数",
  rdQs.length, rdG.blocks[0].subs.flatMap(x => x.questions).length);
check("右栏题目都带分栏名", rdQs.every(o => o.sub), true);
check("右栏首题属判断题", rdQs[0].sub, "判断题");
check("右栏末题属选择题", rdQs[rdQs.length - 1].sub, "选择题");

// 左右两栏内容不重叠，也不漏
const allGroupQ = rdG.blocks[0].subs.flatMap(x => x.questions);
check("右栏题目与组内题目一致",
  rdQs.map(o => o.q.qid).join(",") === allGroupQ.map(q => q.qid).join(","), true);

// 完善程序组同样要有题面
const cgG = sections.find(s => s.title.includes("完善程序"));
check("完善程序题面含代码",
  /```cpp/.test(api.groupMaterial(cgG.blocks[0]).join("\n")), true);
check("三个题组都能取出题面",
  rdG.blocks.every(b => api.groupMaterial(b).join("").trim().length > 0), true);

/* ---- 界面标识契约 --------------------------------------------------------
   viewer.html 里每个 data-ui 都必须在 UI-MAP.md 登记，反之亦然。
   这样「加了标识没写文档」和「文档里留着已删的标识」都会被挡下。 */
function landmarksInViewer(src){
  const set = new Set();
  for (const m of src.matchAll(/data-ui="([^"]+)"/g)) set.add(m[1]);
  for (const m of src.matchAll(/setAttribute\("data-ui",\s*"([^"]+)"/g)) set.add(m[1]);
  for (const m of src.matchAll(/tagHtml\([^,]+,\s*"[a-z]+",\s*"([^"]+)"\)/g)) set.add(m[1]);
  set.delete("${ui}");                    // 模板变量，不是标识
  return set;
}

function landmarksInDoc(md){
  const set = new Set();
  for (const line of md.split("\n")){
    const m = /^\|\s*`([a-z][a-z0-9.\-\[\]]*)`\s*\|/.exec(line);
    if (!m) continue;
    const raw = m[1];
    if (raw.endsWith("[-row]")){          // 文档里的 `x[-row]` 表示 x 和 x-row 两个
      const base = raw.slice(0, -6);
      set.add(base);
      set.add(base + "-row");
    } else {
      set.add(raw);
    }
  }
  return set;
}

const doc = readFileSync("UI-MAP.md", "utf8");
const inViewer = landmarksInViewer(html);
const inDoc = landmarksInDoc(doc);
check("页面标识都已在 UI-MAP.md 登记",
  [...inViewer].filter(x => !inDoc.has(x)).sort().join(",") || "无", "无");
check("UI-MAP.md 没有已失效的标识",
  [...inDoc].filter(x => !inViewer.has(x)).sort().join(",") || "无", "无");
check("界面开关都有对应样式",
  Object.values(api.UI_CLASS).every(c => html.includes("body." + c)), true);
check("界面开关都有对应 CSS 选择器",
  ["qcard.tag.topic", "qcard.tag.feat", "qcard.head.group", "qcard.qid", "qcard.solution"]
    .every(k => html.includes(`[data-ui="${k}"]`)), true);
// 题解区的一键开关：showSolution=false 时全站不显示题解（样式收起，元素仍在 DOM）
check("题解有界面开关", api.UI_CLASS.showSolution, "ui-hide-solution");
check("题解开关默认打开", api.UI.showSolution, true);
check("题解开关有对应样式",
  /body\.ui-hide-solution\s+\[data-ui="qcard\.solution"\]/.test(html), true);

console.log(fail ? `\n失败 ${fail} 项` : "\n全部通过");
process.exit(fail ? 1 : 0);
