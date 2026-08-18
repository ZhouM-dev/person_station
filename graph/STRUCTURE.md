# Graph Studio · 结构索引

> 本文件是**开发用索引**（非用户手册，用户手册见 `MANUAL.md`）。
> 用途：快速定位改动区段，避免每次通读全文件。
> **行号快照日期：2026-08-17**（此后每次改动后，本文件关键锚点可能偏移，改动后建议顺手更新对应行号）。

---

## 一、项目固定约定（缓存前缀）

- **项目**：个人工作站 `person_station` 中的 Graph Studio（图数据可视化工具，纯前端）。
- **两个版本**：
  - `index.html` — 桌面版，`<link styles.css>` + `<script src="app.js">`，非单文件。
  - `mobile.html` — 移动版，**单文件全内联**（CSS 10–720，HTML 722–~990，JS ~990–5582）。
- **改动双同步**：`app.js` 与 `mobile.html` 内联 JS 是**同一套代码副本**，功能改动几乎总需两处同步（mobile 行号≠app 行号，以 grep 为准）。
- **数据模型**（2026-08-17 起）：
  - `node = { id: uid(唯一, 内部定位), label: 编号(可重复, 显示用), x, y }`
  - `edge = { source: uid, target: uid, weight }`
  - 布局/选择/拖拽/删除用 `id`(uid)；显示/导出/比较用 `label`。
  - `nodeLabelOf(uid)` 取显示编号；`compareNodeUids(a,b)` 按 label 排序 uid。
- **近期行为约定**：
  - 「返回主页」按钮：侧栏底部（`.home-link`），带文字，指向 `https://zhoum-dev.github.io/person_station/`。
  - 「清除」按钮：任何模式下始终显示（`.brush-tools` 不再整体隐藏，只隐藏 select/.color-palette）。
  - 表格：单元格宽/高/字号三设置；拖拽绘制实时预览网格；松手按单元格尺寸自动算行列。
  - 节点重编号：允许重复（对话框放开「编号已存在」校验）；输入数据仍默认去重。
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

## 四、app.js（桌面版逻辑，~4560 行）

| 区段 | 函数（行号） |
|---|---|
| 常量/elements/state | 1–165 |
| 数据解析 | `parseGraph`(167), `isIntegerToken`(238) |
| 布局/力导向 | `layoutGraph`(240), `runForceLayout`(263), `resolveNodeOverlaps`(309), `resolveEdgeNodeCollisions`(360), `wrapLongChains`(415), `foldChain`(455), `buildEdgeLayouts`(493) |
| 渲染 | `renderGraph`(526), `renderLayerGuides`(583), `updateAllEdges`(601), `positionEdgeLabel`(617), `updateEdge`(640) |
| 基础工具 | `nodeRadius`(687), `svgElement`(691), `captureSnapshot`(707), `pushUndoSnapshot`(747), `readLocalJSON`(724) |
| 内容编辑/撤销 | `beginContentEditSession`(755), `commitContentEditSession`(763), `cancelPointerInteraction`(782), `undoLastOperation`(888), `redoLastOperation`(896), `restoreSnapshot`(904) |
| 图绘制/清空 | `draw`(950), `clearGraph`(991), `clearAllContent`(1022), `requestClearAllContent`(1075), `scheduleAutoDraw`(1096), `updateGraphCount`(1107), `updateEmptyState`(1113), `updateTransform`(1127), `zoomAt`(1135), `fitGraph`(1146) |
| 树/整理 | `organizeAsTree`(1158), `layoutPathSerpentine`(1266), `centeredTreeXPositions`(1284), `graphCenter`(1304), `organizeGraphOnLattice`(1326), `updateOrganizeToggleUI`(1449), `organizeLayout`(1466), `isTreeGraph`(1500), `isForestGraph`(1521), `treeComponents`(1543), `layoutTreeComponent`(1575), `organizeTreeForest`(1613), `setMode`(1636) |
| 工具/颜色 UI | `activeToolColorKey`(1691), `syncActiveToolColorUI`(1698), `setActiveToolColor`(1709), `updateCanvasToolUI`(1716) |
| 选择/框选 | `applyBoxSelectionClasses`(1731), `clearBoxSelection`(1742), `toggleNodeBoxSelection`(1792), `selectedNodeDragGroupFor`(1806), `activateCanvasSelection`(1819), `finishCanvasSelectionInteraction`(1891) |
| 圈选 lasso | `beginLasso`(2066)…`duplicateLassoSelection`(2208) |
| 画布工具 | `beginCanvasAction`(2213), `continueCanvasAction`(2262), `insertTextAt`(2306), `resizeCanvasTextEditor`(2328), `selectTextObject`(2396) |
| **表格** | `insertTableAt`(2485), `finalizePendingTableInsertion`(2524), `tableCellPosition`(2546), `clearOtherTableSelections`(2553), `activateTableSelectionDrag`(2584), `beginTableSelectionHold`(2618), `startPendingTableObjectDrag`(2634), `updateTableSelectionDrag`(2698), `focusTableCell`(2706), `orderedSelectedTableCells`(2718), `restoreTableCellSelection`(2725), `scheduleTableCellFocus`(2733), `finishTableSelectionDrag`(2748), `fillSelectedTableCells`(2768), `clampInteger`(2813) |
| 绘制/连线/删除 | `nextNodeId`(2818), `addNodeAt`(2833), `selectNodeForEdge`(2872), `handleDrawNodeTap`(2900), `beginDrawNodeHold`(2912), `updateDrawNodeHold`(2968), `finishDrawNodeHold`(3000), `beginDrawCanvasInteraction`(3022), `deleteNode`(3067), `deleteEdge`(3078), `deleteCanvasObject`(3086), `openEdgeWeightEditor`(3112), `saveEditedEdgeWeight`(3127) |
| 节点重编号 | `openNodeIdEditor`(3156), `alphabeticNodeId`(3174), `applyNodeIdMap`(3190), `saveEditedNodeId`(3198) |
| 删除手势 | `beginDeleteGesture`(3247), `eraseStrokesAlong`(3298), `eraseStrokesAt`(3314), `distanceToStroke`(3328), `finishDeleteGesture`(3365), `commitGraphEdit`(3394) |
| 导出/比较/随机 | `updateDataInput`(3420), `nodeLabelOf`(3441), `compareNodeUids`(3445), `compareNodeIds`(3449), `latticeKey`(3459), `latticePoint`(3461), `buildFixedLengthRandomGraph`(3468), `generateRandomGraph`(3569), `randomInteger`(3605) |
| 设置/主题/移动 | `toggleSidebar`(3609), `saveSettings`(3623), `restoreSettings`(3651), `applyTheme`(3711), `toGraphPoint`(3728), `mobilePenOnlyEnabled`(3733), `beginStylusPageDelete`(3751), `finishStylusPageDelete`(3764), `resetMobileInputState`(3777) |
| 指针/触摸事件 | `endPointer`(4108)…`isTypingTarget`(4557) |

## 五、mobile.html（移动版，~5582 行）

- 内联 CSS：`:root`(11)，`.mode-switch`(185)，`.brush-tools`(190)，`.table-settings`(208)，`.canvas-table-editor`(325)，`light`(351)，`</style>`(720)。
- HTML：`<body data-mobile-standalone>`(722)，`#dataInput`(765)，`.home-link`(834)，`.mode-switch`(846)，`#tableCellWidth`(893)。
- 内联 JS 关键锚点：`elements`(1020)，`state`(1078)，`parseGraph`(1171)，`buildEdgeLayouts`(1497)，`renderGraph`(1530)，`draw`(1954)，`setMode`(2640)，`insertTableAt`(3489)，`addNodeAt`(3837)，`applyNodeIdMap`(4194)，`saveEditedNodeId`(4202)，`updateDataInput`(4424)，`nodeLabelOf`(4445)，`buildFixedLengthRandomGraph`(4472)，`generateRandomGraph`(4573)，`</script>`(5582)。

> 定位技巧：mobile.html 内联 JS 是 app.js 副本，但行号偏移随函数不同而不同；改 mobile 时先用 Grep 在该文件内找函数名拿真实行号，不要用 app.js 的行号直接套。

---

## 六、改动后维护

- 每次对本项目文件做结构性改动（新增/删除 id、函数、CSS 选择器）后，**顺手更新本文件对应行号**，保持索引有效。
- 大段插入/删除会让本文件行号整体偏移——此时对受影响区段重跑一次 Grep 更新即可，无需重读全文件。
