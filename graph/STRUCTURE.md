# Graph Studio · 结构索引

> 本文件是**开发用索引**（非用户手册，用户手册见 `MANUAL.md`）。
> 用途：快速定位改动区段，避免每次通读全文件。
> **行号快照日期：2026-08-19**（触摸模式连续输入节点编号加入，函数行号较上一快照有偏移，定位请以 grep 为准）。

---

## 一、项目固定约定（缓存前缀）

- **项目**：个人工作站 `person_station` 中的 Graph Studio（图数据可视化工具，纯前端）。
- **两个版本**：
  - `index.html` — 桌面版，`<link styles.css>` + `<script src="app.js">`，非单文件。
  - `mobile.html` — 移动版，**单文件全内联**（CSS 10–720，HTML 722–~990，JS ~990–5904）。
- **改动双同步**：`app.js` 与 `mobile.html` 内联 JS 是**同一套代码副本**，功能改动几乎总需两处同步（mobile 行号≠app 行号，以 grep 为准）。
- **数据模型**（2026-08-17 起，2026-08-18 加 `weight` 点权）：
  - `node = { id: uid(唯一, 内部定位), label: 编号(可重复, 显示用), x, y, weight(点权, 可 null) }`
  - `edge = { source: uid, target: uid, weight }`
  - 布局/选择/拖拽/删除用 `id`(uid)；显示/导出/比较用 `label`。
  - `nodeLabelOf(uid)` 取显示编号；`compareNodeUids(a,b)` 按 label 排序 uid。
- **近期行为约定**：
  - 点权：节点可选数值属性，输入格式 `label:weight`（单列冒号）或首行 `n m` + 第二行 n 个点权值（点权行，`parseGraph` 的 `nodeWeightValues`）+ 第三行起边；「显示点权」开关 `#nodeWeightInput`（默认开）控制节点下方 `.node-weight` 小字；导出时全部节点带点权则输出点权行格式（`updateDataInput` 的 `allWeighted`/`weightLine`）；双击节点（绘制模式）打开「编辑节点」对话框 `#nodeIdDialog` 可同时改编号与点权（`#nodeWeightEdit`）；随机生成与绘制建节点自动带点权（1–10，绘制按「图内已有带点权节点则新节点带权」规则）。
  - 「返回主页」按钮：侧栏底部（`.home-link`），带文字，指向 `https://zhoum-dev.github.io/person_station/`。
  - 侧栏收起：`toggleSidebar` 通过 `preserveViewportAroundLayoutChange` 补偿画布左上角变化，不再自动 `fitGraph`；`.app-shell` 无列宽过渡，避免视口缩放和抖动。
  - 「清除」按钮：任何模式下始终显示（`.brush-tools` 不再整体隐藏，只隐藏 select/.color-palette）；若有圈选笔迹则只清圈选笔迹，若有多选节点则删多选节点，二者同时存在时圈选笔迹优先；无选择时保留原单击清画布、双击清全部。桌面版 `Del` 等价点击清除。
  - 表格：单元格宽/高/字号三设置；拖拽绘制实时预览网格；松手按单元格尺寸自动算行列。
  - 节点重编号：允许重复（对话框放开「编号已存在」校验）；保存时用 uid 定位当前节点，重复 label 不会联动修改；触摸模式选中单点可连续输入当前模式字符改编号（如 `1`+`0`+`0` => `100`），数字图只接收数字、字母图只接收字母，刚选中 `1` 输入 `A` 当前连通块转字母，刚选中 `A` 输入 `1` 当前连通块转数字；模式切换按所在连通块内旧 label 分组映射，保留重复编号关系；输入数据仍默认去重。
  - 连通块复制：触摸模式双击节点选中整块（`selectComponentOfNode`）；右上角 `#duplicateBtn` 复制（`duplicateSelectedComponent`，编号与原块相同，新副本被选中）。
- **协作协议**：我是 `graph` 执行者，只改 `person_station/graph/` 及本人汇报文件；每轮只认领一个任务。

---

## 二、index.html（桌面版，~298 行）

| 锚点 | 行号 | 说明 |
|---|---|---|
| 移动跳转 script | 11–16 | UA/宽度检测跳 mobile.html |
| `<aside class="sidebar">` | 20 | |
| `.brand` | 21–32 | logo+标题；`#sidebarToggle`(29) |
| `.collapsed-shortcuts` | 34–51 | 收起态快捷按钮 |
| `.editor-section` | 53–66 | `#exampleBtn`(59), `#dataInput`(61) |
| `.settings-section` | 68–108 | `#directedInput`(76), `#weightInput`(84), `#mobilePenOnlyInput`(92), `#rootInput`(104), `#organizeBtn`(105) |
| `.shortcuts-section` | 110–128 | 快捷键说明 |
| `.home-link` | 130–133 | 返回主页 |
| `.workspace-header` | 137–222 | `#graphStatus`(140), `.mode-switch`(142), `#brushTools`(163), `#canvasTool`(164), `#colorPalette`(171), `#colorPaletteToggle`(172), `#brushColor`(183), `#clearDrawingBtn`(187), `#tableSettings`(188), `#tableCellWidth/Height/FontSize`(189–191), `.header-actions`(196), `#undoBtn`(197), `#redoBtn`(200), `#themeToggle`(203), `.top-random`(207), `#randomNodeCount`(209), `#randomType`(210), `#randomBtn`(214), `.toolbar`(216), `#zoomOutBtn`(217), `#zoomLabel`(218), `#zoomInBtn`(219), `#fitBtn`(221) |
| `#canvasWrap` | 228–257 | `#graphCanvas`(229), `#viewport`(238), 图层 `#guidesLayer/#edgesLayer/#labelsLayer/#nodesLayer/#drawingLayer`(239–243), `#emptyState`(246), `#errorToast`(257) |
| footer | 261–263 | `#selectionInfo`(262), `#graphCount`(263) |
| 对话框 | 268–295 | `#edgeWeightDialog`(268), `#edgeWeightInput`(276), `#nodeIdDialog`(284), `#nodeIdInput`(292) |
| `<script src="app.js">` | 296 | |

## 三、styles.css（桌面版样式，~730 行）

| 区段 | 行号 |
|---|---|
| `:root` 变量 | 1–44 |
| 侧栏 `.sidebar/.brand/.brand-mark/.sidebar-toggle/.home-link/.collapsed-shortcuts` | 45–91 |
| 输入/设置 `.editor-section/.settings-section/.toggle-row/.tree-tools/.shortcuts-section` | 92–153 |
| 顶栏 `.workspace-header/.header-actions/.theme-toggle/.undo-button/.top-random/.toolbar` | 154–171 |
| 模式/工具 `.mode-switch/.brush-tools/.color-palette/.table-settings` | 172–213 |
| 画布 `.canvas-wrap/#graphCanvas/.empty-state/.error-toast/.canvas-footer` | 214–283 |
| 边 `.graph-edge/.graph-edge-flow/.graph-edge-hit/.edge-label` | 227–260 |
| 节点 `.graph-node/.node-*/.node-selection-*/.node-label` | 261–282 |
| 笔迹/圈选/文本/表格 `.canvas-stroke/.lasso-*/.canvas-text-editor/.canvas-table-editor` | 284–326 |
| 浅色主题 `:root[data-theme="light"]` | 348–457 |
| 响应式 `@media` | 459, 469, 503, 642, 654, 685, 694, 713 |

## 四、app.js（桌面版逻辑，~4889 行）

| 区段 | 函数（行号） |
|---|---|
| 常量/elements/state | 1–165 |
| 数据解析 | `parseGraph`(167), `isIntegerToken`(238) |
| 布局/力导向 | `layoutGraph`(240), `runForceLayout`(263), `resolveNodeOverlaps`(309), `resolveEdgeNodeCollisions`(360), `wrapLongChains`(415), `foldChain`(455), `buildEdgeLayouts`(493) |
| 渲染 | `renderGraph`(526), `renderLayerGuides`(583), `updateAllEdges`(601), `positionEdgeLabel`(617), `updateEdge`(640) |
| 基础工具 | `nodeRadius`(687), `svgElement`(691), `captureSnapshot`(742), `pushUndoSnapshot`(783), `readLocalJSON`(760) |
| 内容编辑/撤销 | `beginContentEditSession`(791), `commitContentEditSession`(799), `cancelPointerInteraction`(818), `undoLastOperation`(924), `redoLastOperation`(932), `restoreSnapshot`(940) |
| 图绘制/清空 | `draw`(988), `clearGraph`(1030), `clearAllContent`(1062), `clearCanvasContent`(1094), `clearSelectedLassoStrokes`(1115), `clearSelectedNodes`(1133), `clearActiveSelection`(1157), `requestClearAllContent`(1163), `scheduleAutoDraw`(1192), `updateGraphCount`(1203), `updateEmptyState`(1209), `updateTransform`(1223), `zoomAt`(1231), `fitGraph`(1242) |
| 树/整理 | `organizeAsTree`(1254), `layoutPathSerpentine`(1362), `centeredTreeXPositions`(1380), `graphCenter`(1400), `organizeGraphOnLattice`(1422), `updateOrganizeToggleUI`(1545), `organizeLayout`(1562), `isTreeGraph`(1596), `isForestGraph`(1617), `treeComponents`(1639), `layoutTreeComponent`(1671), `organizeTreeForest`(1709), `setMode`(1732) |
| 工具/颜色 UI | `activeToolColorKey`(1788), `syncActiveToolColorUI`(1795), `setActiveToolColor`(1806), `updateCanvasToolUI`(1813) |
| 选择/框选 | `applyBoxSelectionClasses`(1828), `clearBoxSelection`(1839), `toggleNodeBoxSelection`(1890), `selectedNodeDragGroupFor`(1904), `selectComponentOfNode`(1917), `duplicateSelectedComponent`(1931), `activateCanvasSelection`(1971), `finishCanvasSelectionInteraction`(2043) |
| 圈选 lasso | `beginLasso`(2210)…`duplicateLassoSelection`(2352) |
| 画布工具 | `beginCanvasAction`(2357), `continueCanvasAction`(2406), `insertTextAt`(2450), `resizeCanvasTextEditor`(2472), `selectTextObject`(2540) |
| **表格** | `insertTableAt`(2629), `finalizePendingTableInsertion`(2668), `tableCellPosition`(2690), `clearOtherTableSelections`(2697), `activateTableSelectionDrag`(2728), `beginTableSelectionHold`(2762), `startPendingTableObjectDrag`(2778), `updateTableSelectionDrag`(2842), `focusTableCell`(2850), `orderedSelectedTableCells`(2862), `restoreTableCellSelection`(2869), `scheduleTableCellFocus`(2877), `finishTableSelectionDrag`(2892), `fillSelectedTableCells`(2912), `clampInteger`(2957) |
| 绘制/连线/删除 | `nextNodeId`(2962), `addNodeAt`(2977), `selectNodeForEdge`(3017), `handleDrawNodeTap`(3045), `beginDrawNodeHold`(3057), `updateDrawNodeHold`(3113), `finishDrawNodeHold`(3145), `beginDrawCanvasInteraction`(3167), `deleteNode`(3212), `deleteEdge`(3223), `deleteCanvasObject`(3231), `openEdgeWeightEditor`(3257), `saveEditedEdgeWeight`(3272) |
| 节点重编号 | `openNodeIdEditor`(3309), `alphabeticNodeId`(3330), `graphLabelMode`(3346), `applyNodeRelabels`(3354), `relabelGraphSequentially`(3368), `saveEditedNodeId`(3389), `relabelSelectedNodeFromInput`(3457) |
| 删除手势 | `beginDeleteGesture`(3500), `eraseStrokesAlong`(3551), `eraseStrokesAt`(3567), `distanceToStroke`(3581), `finishDeleteGesture`(3618), `commitGraphEdit`(3647) |
| 导出/比较/随机 | `updateDataInput`(3673), `nodeLabelOf`(3704), `compareNodeUids`(3708), `compareNodeIds`(3712), `latticeKey`(3722), `latticePoint`(3724), `buildFixedLengthRandomGraph`(3731), `generateRandomGraph`(3833), `randomInteger`(3869) |
| 设置/主题/移动 | `preserveViewportAroundLayoutChange`(3873), `toggleSidebar`(3886), `saveSettings`(3897), `restoreSettings`(3926), `applyTheme`(3987), `toGraphPoint`(4004), `mobilePenOnlyEnabled`(4009), `beginStylusPageDelete`(4027), `finishStylusPageDelete`(4040), `resetMobileInputState`(4053) |
| 指针/触摸事件 | `endPointer`(4387)…`isTypingTarget`(4870) |

## 五、mobile.html（移动版，~5904 行）

- 内联 CSS：`:root`(11)，`.mode-switch`(185)，`.brush-tools`(190)，`.table-settings`(208)，`.canvas-table-editor`(325)，`light`(351)，`</style>`(720)。
- HTML：`<body data-mobile-standalone>`(722)，`#dataInput`(765)，`.home-link`(834)，`.mode-switch`(846)，`#tableCellWidth`(893)。
- 内联 JS 关键锚点：`elements`(1033)，`state`(1094)，`parseGraph`(1188)，`buildEdgeLayouts`(1542)，`renderGraph`(1575)，`draw`(2005)，`clearSelectedLassoStrokes`(2132)，`clearSelectedNodes`(2150)，`requestClearAllContent`(2180)，`setMode`(2749)，`insertTableAt`(3654)，`addNodeAt`(4002)，`graphLabelMode`(4363)，`applyNodeRelabels`(4371)，`relabelGraphSequentially`(4385)，`saveEditedNodeId`(4406)，`relabelSelectedNodeFromInput`(4474)，`updateDataInput`(4690)，`nodeLabelOf`(4721)，`buildFixedLengthRandomGraph`(4748)，`generateRandomGraph`(4850)，`preserveViewportAroundLayoutChange`(4890)，`toggleSidebar`(4903)，`</script>`(5902)。

> 定位技巧：mobile.html 内联 JS 是 app.js 副本，但行号偏移随函数不同而不同；改 mobile 时先用 Grep 在该文件内找函数名拿真实行号，不要用 app.js 的行号直接套。

---

## 六、改动后维护

- 每次对本项目文件做结构性改动（新增/删除 id、函数、CSS 选择器）后，**顺手更新本文件对应行号**，保持索引有效。
- 大段插入/删除会让本文件行号整体偏移——此时对受影响区段重跑一次 Grep 更新即可，无需重读全文件。
