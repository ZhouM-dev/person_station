# 界面标识对照表

`viewer.html` 里每个可见部分都带一个 `data-ui="..."` 标识。想改哪一块，
先在本文档查到标识，再在 `viewer.html` 里搜这个字符串，就能直接定位——
不必再靠 class 名或肉眼翻文件。

标识是**稳定契约**：`tools/test_viewer.js` 会检查本文档与 `viewer.html` 是否一致，
新增标识忘了登记、或登记了却已删除，都会测试失败。

---

## 1. 界面开关（多数需求改这里就够）

脚本顶部有一个 `UI` 配置对象：

```js
const UI = {
  showTopicTags:  true,    // 题目卡片上的考点标签（如「组合计数」）
  showFeatTags:   true,    // 题目卡片上的内容特征标签（如「配图」「行号引用」）
  showGroupBadge: true,    // 卡片上的大题组徽章（如「阅读程序(1)」）
  showQid:        true,    // 卡片右侧的 qid
  showSolution:   true,    // 题目卡片上的题解区（见 SPEC.md 3.9）
};
```

改成 `false` 就隐藏，改回 `true` 就显示。**不要在模板里删元素。**

> **隐藏 ≠ 移除。** 元素仍在 DOM 里，用 `display:none` 收起。数据、筛选、导出、
> 搜索一概不受影响——知识点标签藏起来了，按知识点筛选照样能用。
>
> 例外是**考试模式下的题解**：那不是隐藏，是提交前**根本不建节点**——
> 见下面「题目卡片」里的 `qcard.solution`。

开关的实现是给 `<body>` 挂一个类，样式集中在 CSS 的「界面开关」一节：

```css
body.ui-hide-topic-tags [data-ui="qcard.tag.topic"] { display:none }
```

要加新开关，三处各加一行：`UI` 配置、`UI_CLASS` 映射、CSS 规则。

---

## 2. 标识对照

### 顶栏

| 标识 | 元素 | 说明 |
|---|---|---|
| `header` | `<header>` | 整条顶栏 |
| `header.brand` | `.brand` | 标题「试题库 · 浏览 · 对比校阅」 |
| `header.dir-badge` | `#dirBadge` | 已连接目录名，未连接时隐藏 |
| `header.rescan` | `#rescanBtn` | 「重新扫描」按钮 |
| `header.quiz-mode` | `.quizctl` | 答题模式切换整组 |
| `header.quiz-mode.normal` | button | 「普通模式」——点选项即时判对错 |
| `header.quiz-mode.exam` | button | 「考试模式」——提交后才出结果 |
| `header.font-size` | `.fontctl` | 字号控件整组 |
| `header.font-size.down` | `#fsDown` | 「A−」缩小字号 |
| `header.font-size.value` | `#fsVal` | 当前档位，如「115%」 |
| `header.font-size.up` | `#fsUp` | 「A+」放大字号 |
| `header.tabs` | `#tabs` | 标签页容器 |
| `header.tab.browse` | button | 「题目浏览」页签 |
| `header.tab.compare` | button | 「对比查看」页签 |

### 导入引导

| 标识 | 元素 | 说明 |
|---|---|---|
| `import` | `#importer` | 导入区整体，导入成功后整体隐藏 |
| `import.drop` | `#drop` | 虚线框，拖拽时高亮 |
| `import.title` | `#dropTitle` | 标题，恢复授权时会改成「继续使用上次的题库」 |
| `import.msg` | `#dropMsg` | 说明文字 |
| `import.actions` | `p` | 按钮行 |
| `import.pick` | `#pick` | 「选择文件夹」/「恢复访问」 |
| `import.pick-file` | `#pickFile` | 「改用文件选择」兜底入口 |
| `import.hint` | `#dropHint` | 底部提示，浏览器不支持时会改写 |

### 题目浏览

| 标识 | 元素 | 说明 |
|---|---|---|
| `browse` | `#browseWrap` | 浏览主体，由 `renderBrowse()` 生成 |
| `browse.stats` | `.stats` | 统计卡容器 |
| `browse.stat.papers` | `.stat` | 份试卷 |
| `browse.stat.questions` | `.stat` | 道小题 |
| `browse.stat.score` | `.stat` | 合计分值 |
| `browse.stat.images` | `.stat` | 带图题 |
| `browse.filters` | `#filters` | 吸顶的**状态栏**（可筛条件本身在 `browse.panels` 里），高度恒定约 56px |
| `browse.filters.head` | `.fhead` | 常驻可见的那一条：摘要 + 答题状态 + 清空 |
| `browse.filters.summary` | `#fSummary` | 已选条件摘要；常驻筛选区会随页面滚走，靠它一直看得见筛了什么 |
| `browse.panels` | `.fblocks` | **常驻筛选区**：四个区块，各自独立、不折叠、**不吸顶**（随页面滚动，避免吸顶块过高） |
| `browse.filters.selects` | `.frow` | 第一行：组别 + 试卷两个**下拉**（都是单选） |
| `browse.filters.exam` | `select#fExam` | 组别下拉（`""` = 全部） |
| `browse.filters.paper` | `select#fPaper` | 试卷下拉（`""` = 全部） |
| `browse.filters.type[-row]` | `.frow` / `#ddType` | 题型筛选（**多选下拉**）：只有 **选择题 / 阅读程序 / 完善程序** 三类，按「节」划分（`part1`/`part2`/`part3`）。判断题与单选题是**作答形式**（`q.type`），不参与这一维度 |
| `browse.filters.type.btn` | `.ddbtn` | 题型下拉的触发按钮，显示「全部」或已选的项 |
| `browse.filters.type.panel` | `.ddpanel` | 题型下拉的选项面板（复选：`.ddopt` 里一个 `input[type=checkbox]`） |
| `browse.filters.topic[-row]` | `.frow` / `#ddTopic` | 知识点（考点）筛选，**多选下拉**，结构与题型同 |
| `browse.filters.topic.btn` | `.ddbtn` | 知识点下拉的触发按钮（已选多时用省略号收尾） |
| `browse.filters.topic.panel` | `.ddpanel` | 知识点下拉的选项面板（19 个考点，复选，超出高度可滚） |
| `browse.quiz-stat` | `.quizstat` | 答题状态区，在筛选栏右侧 |
| `browse.quiz-stat.done` | `b` | 已答题数 |
| `browse.quiz-stat.total` | `b` | 总题数 |
| `browse.quiz-stat.score` | `span` | 对错统计，无已判分题目时隐藏 |
| `browse.quiz-submit` | button | 「提交」，仅考试模式未提交时出现 |
| `browse.quiz-reset` | button | 「重做」 |
| `browse.filters.search[-row]` | `.frow` / `#q` | 搜索框（在 `browse.panels` 里） |
| `browse.filters.clear` | `#clear` | 「清空」按钮 |
| `browse.list` | `#list` | 题目列表容器，由 `renderList()` 生成 |

> **已删除的标识（留档，见 §4 第 4 条）**：
> - `browse.filters.feat`（`#fFeat`）—— 特征标签筛选。2026-09-22 按要求移除该筛选维度（`filter.feat` 一并从脚本里删掉）。**卡片上的特征标签徽章 `qcard.tag.feat` 不受影响**，仍由 `UI.showFeatTags` 控制。
> - `browse.filters.toggle`（`#fToggle`）、`browse.filters.body`（`.fbody`）—— 「筛选」按钮与它开合的弹层。2026-09-22 按要求整个删除：条件全部改成常驻，其中**组别与试卷改用下拉**（`browse.filters.exam` / `.paper` 由 chip 容器变为 `select`）。相关的 `setFilterOpen()` / `onBrowseScroll()` / `filterOpen` 与三处收起监听（滚动、点外部、Esc）一并删除。
> - `browse.filters.exam-row`、`browse.filters.paper-row`—— 原为两个 `.frow`，现合并成一行 `browse.filters.selects`。
> - 连带语义变化：`filter.exam` 由 `Set`（多选）改为**单值**（下拉是单选）。
> - **2026-09-22 再次改版**：题型与知识点由一排 chip 改为**多选下拉**（`.dd` + `.ddbtn` + `.ddpanel`）。**多选能力保留**——它们是 `Set`，面板里是复选框，这是规范要求的（同时选上位与下位考点）。为此新增了 `setFilterOpen` 那套之外的 `openDD` / `applyDD()` / `closeDD()`（重绘后恢复展开态），并恢复了滚动 / 点外部 / Esc 三处收起监听（面板用 `position:absolute`，不改文档高度）。
>   连带：`.chips` / `.chip` 在浏览页的筛选区已不再使用（对比页的 `compare.bar.mode` 仍在用，样式保留）。

### 列表标题与组内内容

| 标识 | 元素 | 说明 |
|---|---|---|
| `list.paper-title` | `.sec` | 试卷标题，如「CSP-S 2019 · …」 |
| `list.section-title` | `.grp` | 节标题，如「二、阅读程序」 |
| `list.group-title` | `.grp2` | 大题组整行，如「(1) 阅读程序(1)」 |
| `list.group-title.text` | `span` | 其中的组名文字 |
| `list.group-expand` | `.expand` | 「展开题面」按钮，仅题组有 |
| `list.sub-title` | `.grp3` | 分栏标题，如「判断题」 |
| `qpre` | `.qpre` | **题目之外**的内容块（组内程序代码、题面提示） |
| `qpre.code` | `pre` | 其中的代码块——阅读程序的程序就渲染在这里 |
| `qpre.text` | `div` | 其中的文字段落 |
| `qpre.program-note` | `.qnote` | 组级**程序说明**（`> **程序说明**`，整段代码在求解什么），见 [SPEC.md](SPEC.md) 3.9 |

> `qpre` 与 `qcard` 是并列关系，不是包含关系：一段程序属于整个大题组，
> 不属于组内任何一道小题。

### 题目卡片

| 标识 | 元素 | 说明 |
|---|---|---|
| `qcard` | `.qcard` | 卡片根元素，另带 `data-qid` 便于单独定位某题 |
| `qcard.head` | `.qhead` | 卡片头部行 |
| `qcard.head.no` | `.qno` | 「第 N 题」 |
| `qcard.head.type` | `.badge.tf` / `.badge.sc` | 判断题/单选题徽章 |
| `qcard.head.score` | `.badge` | 分值徽章 |
| `qcard.head.group` | `.badge` | 大题组徽章（受 `UI.showGroupBadge` 控制） |
| `qcard.tag.topic` | `.badge.topic` | **考点标签**（受 `UI.showTopicTags` 控制） |
| `qcard.tag.feat` | `.badge.feat` | **特征标签**（受 `UI.showFeatTags` 控制） |
| `qcard.qid` | `.qid` | 右侧的 qid（受 `UI.showQid` 控制） |
| `qcard.stem` | `.stem` | 题干容器 |
| `qcard.text` | `div` | 题干段落 |
| `qcard.image` | `img.qimg` | 题干插图，`src` 由 blob URL 注入 |
| `qcard.opts` | `ul.opts` | 选项列表 |
| `qcard.opt` | `li` | 单个选项，可点击作答；带 `data-opt`（选项字母）与 `data-state`（作答状态） |
| `qcard.verdict` | `.verdict` | 判定结论，揭示后才出现 |
| `qcard.code` | `pre` | 题干自带的代码块（少见，组内代码在 `qpre.code`） |
| `qcard.solution` | `.sol` | **题解区**（见 [SPEC.md](SPEC.md) 3.9），随答题模式增删，受 `UI.showSolution` 控制 |
| `qcard.solution.toggle` | `.solbtn` | 「题解」/「收起题解」按钮，默认折叠 |
| `qcard.solution.body` | `.solbody` | 展开后的题解正文容器，收起时带 `hidden` |
| `qcard.solution.answer` | `.solans` | `答案：C`（判断题是 `答案：√` / `答案：×`） |
| `qcard.solution.note` | `.solnote` | `解释：…`——**有答案的题都有**，不是只有争议题才写 |
| `qcard.solution.dispute` | `.soldisp` | 争议题的 `争议：…`，另起一段、带警示色左边条；**排在解释之后** |

> **题解区的两条特殊规则**（`qCard()` 不渲染它，由 `paintCard()` 负责）：
>
> 1. **默认折叠**——答案直接摊在卡片上就没法先自己做一遍。
> 2. **考试模式在交卷前整个题解区不建节点**（连按钮都不出现），交卷后正常显示。
>    不是 `display:none`：考试模式下答案不该能从 DOM 里读出来。
>    普通模式不受限制。这一条实现见 `viewer.html` 的 `solutionNode()` /
>    `solutionAllowed()`。

### 题面浮层

阅读程序 / 完善程序的程序与小题在正文里上下排开，读代码时看不见选项。
点题组右上角「展开题面」，浮层把两者拆成左右两栏，各自独立滚动。

| 标识 | 元素 | 说明 |
|---|---|---|
| `overlay` | `#groupOverlay` | 浮层根，点遮罩空白处关闭 |
| `overlay.card` | `.ovcard` | 白色卡片 |
| `overlay.head` | `.ovhead` | 顶部条 |
| `overlay.title` | `.ovtitle` | 组名，如「(1) 阅读程序(1)」 |
| `overlay.meta` | `.ovmeta` | 「6 题 · 12 分」 |
| `overlay.close` | `#ovClose` | 「✕ 关闭」 |
| `overlay.body` | `.ovbody` | 左右分栏容器 |
| `overlay.material` | `.ovleft` | **左栏：题面**（说明、程序代码、提示） |
| `overlay.divider` | `.ovdiv` | 可拖动分隔条，15%~85% 之间调 |
| `overlay.questions` | `.ovright` | **右栏：题目与选项**，独立滚动 |
| `overlay.sub-title` | `.grp3` | 右栏里的「判断题」「选择题」小标题 |
| `overlay.font-size` | `.fontctl` | 字号控件整组 |
| `overlay.font-size.down` | `.fs-down` | 「A−」缩小字号 |
| `overlay.font-size.value` | `.fval` | 当前档位 |
| `overlay.font-size.up` | `.fs-up` | 「A+」放大字号 |

> 浮层盖住了顶栏，那里点不到字号控件，所以浮层里另有一套。
> 两套共享同一个 `fontStep`，`setFontStep()` 会一起更新，显示始终一致。
> 控件按 `.fs-down` / `.fs-up` / `.fval` 类名绑定，加第三套也不用改逻辑。

左右两栏都跟随顶栏的字号缩放（各自带 `zoom`），Esc 或点遮罩关闭。

### 对比查看

| 标识 | 元素 | 说明 |
|---|---|---|
| `compare` | `#page-compare` | 对比页签 |
| `compare.empty` | `.empty` | 未导入题库时的空状态 |
| `compare.to-import` | button | 「去导入」按钮 |
| `compare.bar` | `.cmpbar` | 顶部工具条 |
| `compare.bar.paper-label` | `label` | 「试卷」二字 |
| `compare.bar.paper-select` | `#cmpSel` | 试卷下拉，按组别分组 |
| `compare.bar.mode` | `#cmpMode` | 并排 / 只看 Markdown / 只看 PDF |
| `compare.bar.info` | `span` | 右侧信息：组别、PDF 名、题数 |
| `compare.body` | `#cmpBody` | 双栏容器，模式切换时给它加类 |
| `compare.pane.md` | `.pane.md` | 左栏 |
| `compare.pane.md.header` | `.ph` | 左栏标题条 |
| `compare.pane.md.body` | `.pb` | 左栏滚动区 |
| `compare.markdown` | `#mdPane` | Markdown 渲染结果 |
| `compare.pane.pdf` | `.pane.pdf` | 右栏 |
| `compare.pane.pdf.header` | `.ph` | 右栏标题条 |
| `compare.pane.pdf.body` | `.pb` | 右栏滚动区 |
| `compare.pdf-frame` | `#pdfFrame` | PDF 内嵌框 |
| `compare.pdf-missing` | `.empty` | 目录里没有 PDF 时的替代提示 |

---

## 3. 常见修改配方

**隐藏考点标签**（当前是**显示**状态）

```js
UI.showTopicTags = false;
```

**全站关掉题解**（讲课时不想让学员看到答案）

```js
UI.showSolution = false;
```

与其它开关同一套机制：题解区仍在 DOM 里，只是 `display:none`。
**考试模式的「交卷前不给看答案」不走这个开关**——那条是根本不建节点，
两者互不影响。

**隐藏整个知识点筛选行**（连筛选入口一起去掉）

在 CSS 里加一行，或直接改 `browse.filters.topic-row` 所在模板：

```css
body.ui-hide-topic-tags [data-ui="browse.filters.topic-row"] { display:none }
```

**只改知识点标签的颜色**——不必动脚本，改 CSS 里的 `.badge.topic`。

**调整字号档位**——改脚本里的 `FONT_STEPS`：

```js
const FONT_STEPS = [0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];
```

数组元素是缩放倍率，控件只在这几档之间切换。想让投影时能放得更大，往后面加
`2.5`、`3` 即可。

缩放范围由 CSS 决定，改 `#list, #mdPane` 这条规则：

```css
#list, #mdPane{ zoom: var(--content-zoom) }   /* 浏览列表 + 对比页 Markdown */
.ovleft,.ovright{ zoom: var(--content-zoom) } /* 题面浮层左右两栏 */
```

去掉哪一项，哪一块就不参与缩放。**选择器一律写 id 或专属类名，别用会撞车的类名**
（`.md` 那次叠成 4 倍就是教训）。

**改代码行高**——改 `:root` 里的 `--code-lh`，一处生效于组内代码与对比页代码：

```css
--code-lh:1.13;   /* 约为正文行高 1.62 的 70% */
```

**关掉筛选面板的自动收起**——把 `onBrowseScroll()` 的阈值调大，或直接不注册监听：

```js
// $("#page-browse").addEventListener("scroll", onBrowseScroll, { passive:true });
```

**只改收起阈值**——`onBrowseScroll()` 里的 `y > 160`（160 像素）与 `y < 60`。

**改题面浮层的左右比例**——CSS 的 `.ovleft{flex:0 0 58%}` 是初始比例；
拖动范围在 `initOverlayResize()` 的 `Math.min(85, Math.max(15, pct))`。

**让第一节课的散题也能展开**——它们没有独立题面，展开会是空的。
真要支持，得先让第一节的题也归组（`b.group` 非空），见 [SPEC.md](SPEC.md) 3.0。

**调整卡片头部元素顺序**——在 `qCard()` 的模板字符串里移动带 `data-ui` 的那几行。

**给某一道题单独加样式**——用 `data-qid`：

```css
[data-qid="csp-s1-2019b-015"] { border-color:#f0b429 }
```

**统计卡增减一项**——改 `browse.stats` 那段模板，同时给新卡加一个 `browse.stat.*` 标识
并登记到本文档。

---

## 4. 维护约定

1. **新增可见元素就给它一个 `data-ui`**，命名沿用 `区域.子区域.元素`，小写、点分隔。
2. **同步登记到本文档**，否则 `bun tools/test_viewer.js` 会失败。
3. **优先用界面开关，不要删元素**。删了元素对应的筛选、导出功能会一起失效。
4. 标识一经使用**不要改名**——它是外部定位入口，改名等于把别人的定位打断。
   确实要改，就在本文档留一行说明旧名对应什么。
5. **吸顶元素的高度必须恒定。** 这是踩过的坑：筛选面板原本做成「可收起」，
   sticky 元素一收起，文档高度少了 281px，Chrome 的滚动锚定为了稳住视野内内容
   会把 `scrollTop` 往回补 → 落到展开阈值以下 → 又展开，来回震荡，页面滑不动。
   另外展开的面板带 `overflow:auto`，鼠标悬在上面时滚轮会被它吃掉。
   现在的做法是常驻紧凑栏 + 绝对定位弹层，高度不变，两个问题一起消失。
   改这块之前建议先跑 `tools/test_page.py` 里的「筛选栏」一节。
6. **类名不要复用。** `.md` 同时被对比页的栏容器和 Markdown 内容用过，结果
   字号缩放的 `zoom` 选择器命中两层，叠成 4 倍。缩放选择器现在写死 id
   （`#list, #mdPane`），类名也已分开。
