const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";
const TABLE_SELECTION_HOLD_MS = 280;
const TABLE_SELECTION_MOVE_THRESHOLD = 6;
const DRAW_NODE_HOLD_MS = 360;
const CANVAS_SELECTION_HOLD_MS = 320;
const CANVAS_SELECTION_MOVE_THRESHOLD = 7;
const GENERATED_EDGE_DIAMETER_MULTIPLIER = 2.6;
const TREE_LAYOUT_SPACING_SCALE = .8;
const NEW_TREE_DISTANCE_FACTOR = 2.2;
const DESKTOP_SETTINGS_KEY = "graph-studio-settings";
const MOBILE_SETTINGS_KEY = "graph-studio-mobile-settings";
const MOBILE_WORKSPACE_KEY = "graph-studio-mobile-workspace";
const MOBILE_THEME_KEY = "graph-studio-mobile-theme";

const elements = {
  appShell: document.querySelector(".app-shell"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  undo: document.querySelector("#undoBtn"),
  redo: document.querySelector("#redoBtn"),
  themeToggle: document.querySelector("#themeToggle"),
  input: document.querySelector("#dataInput"),
  directed: document.querySelector("#directedInput"),
  showWeights: document.querySelector("#weightInput"),
  mobilePenOnly: document.querySelector("#mobilePenOnlyInput"),
  example: document.querySelector("#exampleBtn"),
  modeButtons: [...document.querySelectorAll("[data-mode]")],
  brushTools: document.querySelector("#brushTools"),
  canvasTool: document.querySelector("#canvasTool"),
  colorPalette: document.querySelector("#colorPalette"),
  colorPaletteToggle: document.querySelector("#colorPaletteToggle"),
  colorSwatches: [...document.querySelectorAll(".color-swatch")],
  brushColor: document.querySelector("#brushColor"),
  clearDrawing: document.querySelector("#clearDrawingBtn"),
  tableSettings: document.querySelector("#tableSettings"),
  tableCellWidth: document.querySelector("#tableCellWidth"),
  tableCellHeight: document.querySelector("#tableCellHeight"),
  tableFontSize: document.querySelector("#tableFontSize"),
  rootInput: document.querySelector("#rootInput"),
  organize: document.querySelector("#organizeBtn"),
  randomNodeCount: document.querySelector("#randomNodeCount"),
  randomType: document.querySelector("#randomType"),
  random: document.querySelector("#randomBtn"),
  duplicate: document.querySelector("#duplicateBtn"),
  canvasWrap: document.querySelector("#canvasWrap"),
  svg: document.querySelector("#graphCanvas"),
  viewport: document.querySelector("#viewport"),
  guides: document.querySelector("#guidesLayer"),
  edges: document.querySelector("#edgesLayer"),
  labels: document.querySelector("#labelsLayer"),
  nodes: document.querySelector("#nodesLayer"),
  drawing: document.querySelector("#drawingLayer"),
  empty: document.querySelector("#emptyState"),
  status: document.querySelector("#graphStatus"),
  statusDot: document.querySelector(".status-dot"),
  zoomLabel: document.querySelector("#zoomLabel"),
  zoomIn: document.querySelector("#zoomInBtn"),
  zoomOut: document.querySelector("#zoomOutBtn"),
  fit: document.querySelector("#fitBtn"),
  toast: document.querySelector("#errorToast"),
  selection: document.querySelector("#selectionInfo"),
  graphCount: document.querySelector("#graphCount"),
  edgeWeightDialog: document.querySelector("#edgeWeightDialog"),
  edgeWeightForm: document.querySelector("#edgeWeightForm"),
  edgeWeightInput: document.querySelector("#edgeWeightInput"),
  edgeWeightDescription: document.querySelector("#edgeWeightDescription"),
  edgeWeightCancel: document.querySelector("#edgeWeightCancel"),
  nodeIdDialog: document.querySelector("#nodeIdDialog"),
  nodeIdForm: document.querySelector("#nodeIdForm"),
  nodeIdInput: document.querySelector("#nodeIdInput"),
  nodeIdDescription: document.querySelector("#nodeIdDescription"),
  nodeIdCancel: document.querySelector("#nodeIdCancel")
};

const state = {
  graph: null,
  edgeViews: [],
  drawingMarkupCache: "",
  autoDrawTimer: null,
  clearClickTimer: null,
  clearClickSnapshot: null,
  clearClickHistoryRecorded: false,
  treeLayout: null,
  treeAutoArrange: false,
  mode: "touch",
  toolColors: {
    brush: "#ff5f7e",
    line: "#2dd4ff",
    arrow: "#ffd166",
    text: "#67e8b7"
  },
  edgeStart: null,
  painting: false,
  currentStroke: null,
  currentStrokePath: "",
  drawingStart: null,
  drawingMoved: false,
  pendingTextObject: null,
  pendingTextSnapshot: null,
  pendingTableObject: null,
  pendingTableSnapshot: null,
  tablePreview: null,
  contentEditSession: null,
  undoStack: [],
  redoStack: [],
  lastCommittedInput: "",
  pendingBrushSnapshot: null,
  pendingDragSnapshot: null,
  dragOrigin: null,
  draggingCanvasObject: null,
  canvasObjectDragOrigin: null,
  pendingCanvasObjectSnapshot: null,
  canvasObjectEditTarget: null,
  canvasObjectDragStarted: false,
  selectedTextObject: null,
  textSelectionOverlay: null,
  textResizeInteraction: null,
  lassoPoints: null,
  lassoOutline: null,
  lassoSelectedStrokes: [],
  lassoSelectionOverlay: null,
  lassoMoveInteraction: null,
  lassoClipboard: [],
  tableSelectionPending: null,
  tableSelectionDrag: null,
  drawNodeHold: null,
  lastDrawNodeTap: null,
  lastTouchNodeTap: null,
  drawCanvasPending: null,
  canvasSelectionPending: null,
  canvasSelectionDrag: null,
  boxSelectedNodeIds: new Set(),
  mobileAnimatedSelectedNodeId: null,
  selectedEdges: new Set(),
  edgeSelectionPending: null,
  mobileNodeSelectionPending: null,
  activeTouchPointers: new Set(),
  activePenPointerId: null,
  pinchGesture: null,
  deleteHoldTimer: null,
  deleteHoldStart: null,
  deleteCurrentPoint: null,
  deleteGestureActive: false,
  deleteGestureMoved: false,
  deleteGestureTarget: null,
  deleteGestureSnapshot: null,
  deletedStrokeCount: 0,
  deleteSweepLast: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  draggingNode: null,
  draggingNodeElement: null,
  draggingNodeGroup: null,
  panning: false,
  panningPointerId: null,
  pointerStart: null,
  selectedNode: null,
  editingEdgeIndex: null,
  editingNodeId: null,
  nextTreeKind: "multi",
  sidebarFitTimer: null,
  restoringSettings: false,
  mobilePersistTimer: null,
  stylusPageDeleteActive: false,
  stylusPageDeleteReturnMode: "touch"
};

function parseGraph(raw) {
  const lines = raw.split(/\r?\n/)
    .map((text, index) => ({ text: text.trim(), number: index + 1 }))
    .filter(line => line.text && !line.text.startsWith("#") && !line.text.startsWith("//"));

  if (!lines.length) throw new Error("请先输入图数据");

  let nodeCount = null;
  let edgeLines = lines;
  const first = lines[0].text.split(/[\s,]+/);
  const possibleHeader = first.length === 2 && first.every(isIntegerToken);
  const remainingParts = lines.slice(1).map(line => line.text.split(/[\s,]+/));
  const remainingEdgeCount = remainingParts.filter(parts => parts.length >= 2).length;
  const remainingNodeIds = new Set(remainingParts.flatMap(parts => parts.slice(0, Math.min(2, parts.length))));
  const declaredNodeCount = possibleHeader ? Number(first[0]) : null;
  const declaredEdgeCount = possibleHeader ? Number(first[1]) : null;
  const numericRemainingIds = [...remainingNodeIds].every(isIntegerToken);
  const headerNodeRangeValid = !numericRemainingIds || [...remainingNodeIds].every(id => {
    const value = Number(id);
    return remainingNodeIds.has("0") ? value >= 0 && value < declaredNodeCount : value >= 1 && value <= declaredNodeCount;
  });
  const headerCountsValid = possibleHeader && remainingEdgeCount === declaredEdgeCount &&
    remainingNodeIds.size <= declaredNodeCount && headerNodeRangeValid;
  if (headerCountsValid) {
    nodeCount = Number(first[0]);
    edgeLines = lines.slice(1);
  }

  const nodeIds = new Set();
  const edges = [];
  edgeLines.forEach(line => {
    const parts = line.text.split(/[\s,]+/).filter(Boolean);
    if (parts.length > 3) {
      throw new Error(`第 ${line.number} 行格式有误，应为：节点，或 起点 终点 [权重]`);
    }
    if (parts.length === 1) {
      nodeIds.add(parts[0]);
      return;
    }
    const [source, target, weight] = parts;
    if (!source || !target) throw new Error(`第 ${line.number} 行缺少节点`);
    nodeIds.add(source);
    nodeIds.add(target);
    edges.push({ source, target, weight: weight ?? null });
  });

  if (nodeCount !== null) {
    if (nodeCount < 0 || nodeCount > 500) throw new Error("节点数应在 0 到 500 之间");
    const numericIds = [...nodeIds].every(isIntegerToken);
    if (numericIds) {
      const nums = [...nodeIds].map(Number);
      const zeroBased = nums.includes(0);
      for (let i = zeroBased ? 0 : 1; i < (zeroBased ? nodeCount : nodeCount + 1); i++) nodeIds.add(String(i));
    }
  }
  if (nodeIds.size > 500 || edges.length > 2000) throw new Error("为保证流畅，最多支持 500 个节点和 2000 条边");
  // 内部用唯一 id（uid）定位节点，label 为可重复的显示编号。
  let uidSeed = 0;
  const nodeByLabel = new Map();
  const nodes = [...nodeIds].map(label => {
    const node = { id: `n${uidSeed++}`, label, x: 0, y: 0 };
    nodeByLabel.set(label, node);
    return node;
  });
  edges.forEach(edge => {
    edge.source = nodeByLabel.get(edge.source).id;
    edge.target = nodeByLabel.get(edge.target).id;
  });
  return { nodes, edges };
}

function isIntegerToken(value) { return /^\d+$/.test(value); }

function layoutGraph(graph) {
  const { width, height } = elements.canvasWrap.getBoundingClientRect();
  const cx = width / 2;
  const cy = height / 2;
  const count = graph.nodes.length;
  const radius = Math.min(width, height) * (count < 5 ? .117 : .176);

  graph.nodes.forEach((node, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(count, 1);
    const ring = count > 18 ? .72 + (index % 3) * .14 : 1;
    node.x = cx + Math.cos(angle) * radius * ring;
    node.y = cy + Math.sin(angle) * radius * ring;
  });

  if (count > 1 && count <= 90) runForceLayout(graph, width, height);
  if (count > 1) {
    wrapLongChains(graph, width, height);
    resolveNodeOverlaps(graph, width, height);
    resolveEdgeNodeCollisions(graph, width, height);
    resolveNodeOverlaps(graph, width, height);
  }
}

function runForceLayout(graph, width, height) {
  const iterations = graph.nodes.length < 35 ? 150 : 80;
  const area = width * height;
  const referenceRadius = Math.max(...graph.nodes.map(node => nodeRadius(node.label)), 17);
  const referenceSpacing = referenceRadius * 2 * GENERATED_EDGE_DIAMETER_MULTIPLIER;
  const ideal = Math.min(124, Math.max(referenceSpacing, Math.sqrt(area / graph.nodes.length) * .325));
  const byId = new Map(graph.nodes.map(n => [n.id, n]));

  for (let step = 0; step < iterations; step++) {
    const movement = new Map(graph.nodes.map(n => [n.id, { x: 0, y: 0 }]));
    for (let i = 0; i < graph.nodes.length; i++) {
      for (let j = i + 1; j < graph.nodes.length; j++) {
        const a = graph.nodes[i], b = graph.nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const force = (ideal * ideal) / distance;
        dx /= distance; dy /= distance;
        movement.get(a.id).x += dx * force;
        movement.get(a.id).y += dy * force;
        movement.get(b.id).x -= dx * force;
        movement.get(b.id).y -= dy * force;
      }
    }
    graph.edges.forEach(edge => {
      const a = byId.get(edge.source), b = byId.get(edge.target);
      let dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const force = (distance * distance) / ideal * .5;
      dx /= distance; dy /= distance;
      movement.get(a.id).x += dx * force;
      movement.get(a.id).y += dy * force;
      movement.get(b.id).x -= dx * force;
      movement.get(b.id).y -= dy * force;
    });
    const temperature = Math.max(1, 22 * (1 - step / iterations));
    graph.nodes.forEach(node => {
      const move = movement.get(node.id);
      const length = Math.max(1, Math.hypot(move.x, move.y));
      node.x += (move.x / length) * Math.min(length, temperature);
      node.y += (move.y / length) * Math.min(length, temperature);
      node.x = Math.max(45, Math.min(width - 45, node.x));
      node.y = Math.max(45, Math.min(height - 45, node.y));
    });
  }
}

function resolveNodeOverlaps(graph, width, height) {
  const padding = 14;
  const iterations = graph.nodes.length < 40 ? 140 : 220;
  const radii = graph.nodes.map(node => nodeRadius(node.label));
  const cellSize = Math.max(48, Math.max(...radii, 17) * 2 + padding);
  for (let step = 0; step < iterations; step++) {
    let collisionCount = 0;
    const grid = new Map();
    graph.nodes.forEach((node, index) => {
      const cellX = Math.floor(node.x / cellSize), cellY = Math.floor(node.y / cellSize);
      const key = `${cellX},${cellY}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(index);
    });
    for (let i = 0; i < graph.nodes.length; i++) {
      const a = graph.nodes[i];
      const cellX = Math.floor(a.x / cellSize), cellY = Math.floor(a.y / cellSize);
      const nearbyIndices = [];
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        for (let offsetY = -1; offsetY <= 1; offsetY++) {
          const bucket = grid.get(`${cellX + offsetX},${cellY + offsetY}`);
          if (bucket) nearbyIndices.push(...bucket);
        }
      }
      for (const j of nearbyIndices) {
        if (j <= i) continue;
        const a = graph.nodes[i], b = graph.nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minimumDistance = radii[i] + radii[j] + padding;
        if (distance >= minimumDistance) continue;
        collisionCount++;
        if (distance < .01) {
          const angle = ((i + 1) * 2.399 + (j + 1) * .73) % (Math.PI * 2);
          dx = Math.cos(angle); dy = Math.sin(angle); distance = 1;
        }
        const push = (minimumDistance - distance) / 2 + .3;
        const ux = dx / distance, uy = dy / distance;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
      }
    }
    graph.nodes.forEach(node => {
      const margin = nodeRadius(node.label) + 12;
      node.x = Math.max(margin, Math.min(width - margin, node.x));
      node.y = Math.max(margin, Math.min(height - margin, node.y));
    });
    if (collisionCount === 0) break;
  }
}

function resolveEdgeNodeCollisions(graph, width, height) {
  if (!graph.edges.length) return;
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const iterations = graph.nodes.length <= 120 && graph.edges.length <= 300 ? 55 : 12;

  for (let step = 0; step < iterations; step++) {
    let collisionCount = 0;
    graph.edges.forEach((edge, edgeIndex) => {
      const source = byId.get(edge.source), target = byId.get(edge.target);
      if (!source || !target || source === target) return;
      const edgeX = target.x - source.x, edgeY = target.y - source.y;
      const edgeLengthSquared = edgeX * edgeX + edgeY * edgeY;
      if (edgeLengthSquared < 1) return;

      graph.nodes.forEach((node, nodeIndex) => {
        if (node === source || node === target) return;
        const projection = ((node.x - source.x) * edgeX + (node.y - source.y) * edgeY) / edgeLengthSquared;
        // 靠近端点的区域交给节点碰撞处理，避免拉扯相邻节点。
        if (projection <= .08 || projection >= .92) return;
        const closestX = source.x + edgeX * projection;
        const closestY = source.y + edgeY * projection;
        let dx = node.x - closestX, dy = node.y - closestY;
        let distance = Math.hypot(dx, dy);
        const clearance = nodeRadius(node.label) + 11;
        if (distance >= clearance) return;
        collisionCount++;

        if (distance < .01) {
          const direction = (edgeIndex + nodeIndex) % 2 === 0 ? 1 : -1;
          const edgeLength = Math.sqrt(edgeLengthSquared);
          dx = -edgeY / edgeLength * direction;
          dy = edgeX / edgeLength * direction;
          distance = 1;
        }
        const push = Math.min(5, (clearance - distance) * .42 + .35);
        const ux = dx / distance, uy = dy / distance;
        node.x += ux * push;
        node.y += uy * push;
        // 端点轻微向反方向让位，减少单个节点承担全部位移造成的新碰撞。
        source.x -= ux * push * .08;
        source.y -= uy * push * .08;
        target.x -= ux * push * .08;
        target.y -= uy * push * .08;
      });
    });

    graph.nodes.forEach(node => {
      const margin = nodeRadius(node.label) + 12;
      node.x = Math.max(margin, Math.min(width - margin, node.x));
      node.y = Math.max(margin, Math.min(height - margin, node.y));
    });
    if (collisionCount === 0) break;
  }
}

function wrapLongChains(graph, width, height) {
  const adjacency = new Map(graph.nodes.map(node => [node.id, []]));
  graph.edges.forEach((edge, edgeIndex) => {
    if (edge.source === edge.target || !adjacency.has(edge.source) || !adjacency.has(edge.target)) return;
    adjacency.get(edge.source).push({ id: edge.target, edgeIndex });
    adjacency.get(edge.target).push({ id: edge.source, edgeIndex });
  });
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const visitedEdges = new Set();
  let wrappedCount = 0;

  graph.nodes.filter(node => adjacency.get(node.id).length !== 2).forEach(startNode => {
    adjacency.get(startNode.id).forEach(firstStep => {
      if (visitedEdges.has(firstStep.edgeIndex)) return;
      const path = [startNode.id];
      let previousId = startNode.id;
      let currentStep = firstStep;
      while (currentStep) {
        visitedEdges.add(currentStep.edgeIndex);
        path.push(currentStep.id);
        const nextOptions = adjacency.get(currentStep.id)
          .filter(option => option.id !== previousId && !visitedEdges.has(option.edgeIndex));
        if (adjacency.get(currentStep.id).length !== 2 || !nextOptions.length) break;
        previousId = currentStep.id;
        currentStep = nextOptions[0];
      }

      if (path.length < 4) return;
      const startDegree = adjacency.get(path[0]).length;
      const endDegree = adjacency.get(path[path.length - 1]).length;
      // 只回旋带叶端的长链，不改变两个核心区域之间的连接链。
      if (startDegree !== 1 && endDegree !== 1) return;
      if (startDegree === 1 && endDegree > 1) path.reverse();
      foldChain(path, byId, width, height);
      wrappedCount++;
    });
  });
  return wrappedCount;
}

function foldChain(path, byId, width, height) {
  const anchor = byId.get(path[0]);
  const first = byId.get(path[1]);
  let ux = first.x - anchor.x, uy = first.y - anchor.y;
  let length = Math.hypot(ux, uy);
  if (length < 1) { ux = 1; uy = 0; length = 1; }
  ux /= length; uy /= length;

  const items = path.slice(1).map(id => byId.get(id));
  const columns = Math.max(3, Math.min(8, Math.ceil(Math.sqrt(items.length * 1.5))));
  const spacing = 72;
  const requiredForward = columns * spacing + 30;
  const availableForward = rayRoom(anchor, ux, uy, width, height);
  const availableBackward = rayRoom(anchor, -ux, -uy, width, height);
  if (availableForward < requiredForward && availableBackward > availableForward) { ux *= -1; uy *= -1; }

  let px = -uy, py = ux;
  if (rayRoom(anchor, -px, -py, width, height) > rayRoom(anchor, px, py, width, height)) { px *= -1; py *= -1; }

  items.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const rawColumn = index % columns;
    const column = row % 2 === 0 ? rawColumn : columns - 1 - rawColumn;
    node.x = anchor.x + ux * (column + 1) * spacing + px * row * spacing;
    node.y = anchor.y + uy * (column + 1) * spacing + py * row * spacing;
  });
}

function rayRoom(origin, dx, dy, width, height) {
  const margin = 36;
  const distances = [];
  if (dx > .001) distances.push((width - margin - origin.x) / dx);
  if (dx < -.001) distances.push((margin - origin.x) / dx);
  if (dy > .001) distances.push((height - margin - origin.y) / dy);
  if (dy < -.001) distances.push((margin - origin.y) / dy);
  return Math.max(0, Math.min(...distances.filter(distance => distance >= 0)));
}

function buildEdgeLayouts(edges) {
  const labelOf = new Map((state.graph?.nodes ?? []).map(node => [node.id, node.label]));
  const groups = new Map();
  edges.forEach((edge, index) => {
    const selfLoop = edge.source === edge.target;
    const sourceLabel = labelOf.get(edge.source) ?? edge.source;
    const targetLabel = labelOf.get(edge.target) ?? edge.target;
    const ordered = selfLoop || compareNodeIds(sourceLabel, targetLabel) <= 0
      ? [edge.source, edge.target]
      : [edge.target, edge.source];
    const key = JSON.stringify(ordered);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ edge, index, canonicalSource: ordered[0] });
  });
  const layouts = Array(edges.length);
  groups.forEach(group => {
    const count = group.length;
    const spacing = count <= 5 ? 24 : Math.max(8, 120 / Math.max(1, count - 1));
    const middle = (count - 1) / 2;
    group.forEach((entry, groupIndex) => {
      const baseOffset = count === 1 ? 0 : (groupIndex - middle) * spacing;
      const forward = entry.edge.source === entry.canonicalSource;
      layouts[entry.index] = {
        count,
        groupIndex,
        baseOffset,
        curveOffset: forward ? baseOffset : -baseOffset
      };
    });
  });
  return layouts;
}

function renderGraph() {
  const graph = state.graph;
  state.edgeViews = [];
  elements.guides.replaceChildren();
  elements.edges.replaceChildren();
  elements.labels.replaceChildren();
  elements.nodes.replaceChildren();
  if (!graph) {
    updateOrganizeToggleUI();
    return;
  }
  state.selectedEdges = new Set([...state.selectedEdges].filter(edge => graph.edges.includes(edge)));

  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const edgeLayouts = buildEdgeLayouts(graph.edges);
  graph.edges.forEach((edge, index) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    const hasWeightLabel = edge.weight !== null && elements.showWeights.checked;
    const hitPath = svgElement("path", { class: "graph-edge-hit", "data-edge": index });
    const path = svgElement("path", { class: `graph-edge${elements.directed.checked ? " directed" : ""}`, "data-edge": index });
    const flowPath = elements.directed.checked
      ? svgElement("path", { class: "graph-edge-flow", "aria-hidden": "true" })
      : null;
    let label = null;
    elements.edges.append(hitPath, path);
    if (flowPath) elements.edges.append(flowPath);
    if (hasWeightLabel) {
      label = svgElement("text", { class: "edge-label", "data-edge-label": index }, edge.weight);
      elements.labels.append(label);
    }
    const layout = edgeLayouts[index];
    updateEdge(hitPath, source, target, false, 0, layout);
    updateEdge(path, source, target, elements.directed.checked, hasWeightLabel ? weightGap(edge.weight) : 0, layout);
    if (flowPath) updateEdge(flowPath, source, target, true, 0, layout);
    positionEdgeLabel(label, source, target, layout);
    state.edgeViews.push({ path, hitPath, flowPath, label, layout });
  });

  graph.nodes.forEach(node => {
    const group = svgElement("g", { class: "graph-node", transform: `translate(${node.x} ${node.y})`, "data-node-id": node.id, tabindex: "0", role: "button", "aria-label": `节点 ${node.label}` });
    group.append(svgElement("circle", { class: "node-hit", r: nodeRadius(node.label) }));
    group.append(svgElement("circle", { class: "node-selection-ring", r: nodeRadius(node.label) + 7 }));
    group.append(svgElement("circle", { class: "node-circle", r: nodeRadius(node.label) }));
    group.append(svgElement("text", { class: "node-label" }, node.label));
    group.classList.toggle("box-selected", state.boxSelectedNodeIds.has(node.id));
    group.classList.toggle("mobile-active-selection",
      document.body.dataset.mobileStandalone === "true"
      && state.mobileAnimatedSelectedNodeId === node.id
      && state.boxSelectedNodeIds.has(node.id));
    elements.nodes.append(group);
  });
  applyEdgeSelectionClasses();
  renderLayerGuides();
  updateOrganizeToggleUI();
}

function renderLayerGuides() {
  if (!state.treeLayout) return;
  const allNodes = state.treeLayout.layers.flat();
  if (!allNodes.length) return;
  const minX = Math.min(...allNodes.map(node => node.x)) - 55;
  const maxX = Math.max(...allNodes.map(node => node.x)) + 55;
  state.treeLayout.layers.forEach((layer, index) => {
    if (!layer.length) return;
    const y = layer[0].y;
    elements.guides.append(svgElement("line", {
      class: "layer-guide", x1: minX, y1: y, x2: maxX, y2: y
    }));
    elements.guides.append(svgElement("text", {
      class: "layer-guide-label", x: minX - 10, y
    }, `第 ${index + 1} 层`));
  });
}

function updateAllEdges() {
  if (!state.graph) return;
  const byId = new Map(state.graph.nodes.map(node => [node.id, node]));
  const edgeLayouts = buildEdgeLayouts(state.graph.edges);
  state.graph.edges.forEach((edge, index) => {
    const { path, hitPath, flowPath, label } = state.edgeViews[index] || {};
    const source = byId.get(edge.source), target = byId.get(edge.target);
    if (!path || !hitPath || !source || !target) return;
    const layout = edgeLayouts[index];
    updateEdge(hitPath, source, target, false, 0, layout);
    updateEdge(path, source, target, elements.directed.checked, label ? weightGap(edge.weight) : 0, layout);
    if (flowPath) updateEdge(flowPath, source, target, true, 0, layout);
    positionEdgeLabel(label, source, target, layout);
  });
}

function positionEdgeLabel(label, source, target, layout = null) {
  if (!label) return;
  const selfLoop = source.id === target.id;
  if (selfLoop) {
    const level = Math.floor((layout?.groupIndex ?? 0) / 2);
    const above = (layout?.groupIndex ?? 0) % 2 === 0;
    label.setAttribute("x", source.x);
    label.setAttribute("y", source.y + (above ? -1 : 1) * (49 + level * 16));
    return;
  }
  const dx = target.x - source.x, dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const px = -dy / distance, py = dx / distance;
  const offset = layout?.curveOffset ?? 0;
  label.setAttribute("x", (source.x + target.x) / 2 + px * offset);
  label.setAttribute("y", (source.y + target.y) / 2 + py * offset);
}

function weightGap(weight) {
  // 返回文字中心到线段端点的距离：字形外侧仅保留约 2–3px。
  return Math.max(10, String(weight).length * 4.5 + 5.5);
}

function updateEdge(path, source, target, directed, gap = 0, layout = null) {
  if (source === target || source.id === target.id) {
    const r = nodeRadius(source.label);
    const groupIndex = layout?.groupIndex ?? 0;
    const level = Math.floor(groupIndex / 2);
    const above = groupIndex % 2 === 0;
    const sign = above ? -1 : 1;
    const width = 48 + level * 14;
    const height = 54 + level * 16;
    path.setAttribute("d", `M ${source.x + r * .55} ${source.y + sign * r * .7} C ${source.x + width} ${source.y + sign * height}, ${source.x - width} ${source.y + sign * height}, ${source.x - r * .55} ${source.y + sign * r * .7}`);
    return;
  }
  const dx = target.x - source.x, dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / distance, uy = dy / distance;
  const sourceR = nodeRadius(source.label);
  const targetR = nodeRadius(target.label) + (directed ? 7 : 0);
  const startX = source.x + ux * sourceR, startY = source.y + uy * sourceR;
  const endX = target.x - ux * targetR, endY = target.y - uy * targetR;
  const curveOffset = layout?.curveOffset ?? 0;
  if (Math.abs(curveOffset) > .01) {
    const px = -uy, py = ux;
    const controlX = (startX + endX) / 2 + px * curveOffset * 2;
    const controlY = (startY + endY) / 2 + py * curveOffset * 2;
    const leftControlX = (startX + controlX) / 2;
    const leftControlY = (startY + controlY) / 2;
    const rightControlX = (controlX + endX) / 2;
    const rightControlY = (controlY + endY) / 2;
    const curveMidX = (leftControlX + rightControlX) / 2;
    const curveMidY = (leftControlY + rightControlY) / 2;
    if (gap > 0 && Math.hypot(endX - startX, endY - startY) > gap * 2 + 8) {
      path.setAttribute("d", `M ${startX} ${startY} Q ${leftControlX} ${leftControlY} ${curveMidX - ux * gap} ${curveMidY - uy * gap} M ${curveMidX + ux * gap} ${curveMidY + uy * gap} Q ${rightControlX} ${rightControlY} ${endX} ${endY}`);
    } else {
      path.setAttribute("d", `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`);
    }
    return;
  }
  if (gap > 0 && Math.hypot(endX - startX, endY - startY) > gap * 2 + 8) {
    const midX = (source.x + target.x) / 2, midY = (source.y + target.y) / 2;
    path.setAttribute("d", `M ${startX} ${startY} L ${midX - ux * gap} ${midY - uy * gap} M ${midX + ux * gap} ${midY + uy * gap} L ${endX} ${endY}`);
  } else {
    path.setAttribute("d", `M ${startX} ${startY} L ${endX} ${endY}`);
  }
}

function naturalNodeRadius(id) { return Math.max(17, 10 + String(id).length * 4.2); }

function nodeRadius(id) {
  return state.graph?.uniformNodeRadius ?? naturalNodeRadius(id);
}

function svgElement(tag, attributes = {}, text = null) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  if (text !== null) element.textContent = text;
  return element;
}

function getDrawingMarkup() {
  if (state.drawingMarkupCache === null) state.drawingMarkupCache = elements.drawing.innerHTML;
  return state.drawingMarkupCache;
}

function invalidateDrawingMarkup() {
  state.drawingMarkupCache = null;
}

function captureSnapshot() {
  return {
    graph: state.graph ? JSON.parse(JSON.stringify(state.graph)) : null,
    inputValue: state.lastCommittedInput,
    directed: elements.directed.checked,
    showWeights: elements.showWeights.checked,
    drawingMarkup: getDrawingMarkup(),
    scale: state.scale,
    offsetX: state.offsetX,
    offsetY: state.offsetY
  };
}

function mobileStandalone() {
  return document.body.dataset.mobileStandalone === "true";
}

function readLocalJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); }
  catch (_) { return null; }
}

function persistMobileWorkspaceNow() {
  if (!mobileStandalone() || state.restoringSettings) return false;
  clearTimeout(state.mobilePersistTimer);
  state.mobilePersistTimer = null;
  try {
    localStorage.setItem(MOBILE_WORKSPACE_KEY, JSON.stringify(captureSnapshot()));
    return true;
  } catch (_) {
    return false;
  }
}

function scheduleMobileWorkspaceSave(delay = 180) {
  if (!mobileStandalone() || state.restoringSettings) return;
  clearTimeout(state.mobilePersistTimer);
  state.mobilePersistTimer = window.setTimeout(persistMobileWorkspaceNow, delay);
}

function pushUndoSnapshot(snapshot = captureSnapshot(), clearRedo = true) {
  state.undoStack.push(snapshot);
  if (state.undoStack.length > 60) state.undoStack.shift();
  if (clearRedo) state.redoStack = [];
  updateHistoryButtons();
  scheduleMobileWorkspaceSave();
}

function beginContentEditSession(target) {
  state.contentEditSession = target ? {
    target,
    before: target.textContent,
    snapshot: captureSnapshot()
  } : null;
}

function commitContentEditSession(keepOpen = false) {
  const session = state.contentEditSession;
  if (!session?.target?.isConnected) {
    state.contentEditSession = null;
    return false;
  }
  const changed = session.target.textContent !== session.before;
  if (changed) {
    pushUndoSnapshot(session.snapshot);
    invalidateDrawingMarkup();
  }
  state.contentEditSession = keepOpen ? {
    target: session.target,
    before: session.target.textContent,
    snapshot: captureSnapshot()
  } : null;
  return changed;
}

function cancelPointerInteraction(revert = true) {
  cancelLassoPointerInteraction(revert);
  state.edgeSelectionPending = null;
  state.mobileNodeSelectionPending = null;
  if (state.drawNodeHold) {
    clearTimeout(state.drawNodeHold.timer);
    state.drawNodeHold.element?.classList.remove("long-press-moving");
    state.drawNodeHold = null;
  }
  state.drawCanvasPending = null;
  if (state.canvasSelectionPending) {
    clearTimeout(state.canvasSelectionPending.timer);
    state.canvasSelectionPending = null;
  }
  if (state.canvasSelectionDrag) {
    state.canvasSelectionDrag.rectangle?.remove();
    state.canvasSelectionDrag = null;
    elements.canvasWrap.classList.remove("box-selecting");
    applyBoxSelectionClasses(state.boxSelectedNodeIds);
  }
  if (state.deleteHoldTimer || state.deleteGestureActive || state.deleteGestureTarget) {
    finishDeleteGesture(false);
  }
  if (state.painting && state.currentStroke && revert) state.currentStroke.remove();
  if (state.draggingNode && state.dragOrigin && revert) {
    const draggedNodes = state.draggingNodeGroup?.length
      ? state.draggingNodeGroup
      : [{
          node: state.draggingNode,
          element: state.draggingNodeElement,
          originX: state.dragOrigin.x,
          originY: state.dragOrigin.y
        }];
    draggedNodes.forEach(item => {
      item.node.x = item.originX;
      item.node.y = item.originY;
      const nodeElement = item.element || elements.nodes.querySelector(`[data-node-id="${CSS.escape(item.node.id)}"]`);
      nodeElement?.setAttribute("transform", `translate(${item.originX} ${item.originY})`);
    });
    updateAllEdges();
  }
  if (state.draggingCanvasObject && state.canvasObjectDragOrigin) {
    state.draggingCanvasObject.classList.remove("dragging");
    if (revert) {
      state.draggingCanvasObject.setAttribute("x", state.canvasObjectDragOrigin.x);
      state.draggingCanvasObject.setAttribute("y", state.canvasObjectDragOrigin.y);
    }
  }
  if (state.textResizeInteraction && revert) {
    const resize = state.textResizeInteraction;
    resize.editor.style.fontSize = resize.originFontSize;
    resize.object.setAttribute("width", resize.originWidth);
    resize.object.setAttribute("height", resize.originHeight);
    updateTextSelectionOverlay();
  }
  if (state.tableSelectionPending) {
    clearTimeout(state.tableSelectionPending.timer);
  }
  if (state.tableSelectionDrag) {
    state.tableSelectionDrag.table.querySelectorAll("td.cell-selected, td.cell-anchor")
      .forEach(cell => cell.classList.remove("cell-selected", "cell-anchor"));
  }
  state.painting = false;
  state.currentStroke = null;
  state.currentStrokePath = "";
  state.drawingStart = null;
  state.drawingMoved = false;
  state.pendingBrushSnapshot = null;
  state.tablePreview = null;
  state.draggingNode = null;
  state.draggingNodeElement = null;
  state.draggingNodeGroup = null;
  state.pendingDragSnapshot = null;
  state.dragOrigin = null;
  state.draggingCanvasObject = null;
  state.canvasObjectDragOrigin = null;
  state.pendingCanvasObjectSnapshot = null;
  state.canvasObjectEditTarget = null;
  state.canvasObjectDragStarted = false;
  state.textResizeInteraction = null;
  state.tableSelectionPending = null;
  state.tableSelectionDrag = null;
  state.panning = false;
  state.panningPointerId = null;
  state.pointerStart = null;
  elements.canvasWrap.classList.remove("panning");
  elements.canvasWrap.classList.remove("table-selecting");
  updateEmptyState();
}

function updateHistoryButtons() {
  elements.undo.disabled = state.undoStack.length === 0;
  elements.redo.disabled = state.redoStack.length === 0;
}

function hasActivePointerInteraction() {
  return Boolean(state.painting || state.draggingNode || state.draggingCanvasObject || state.panning ||
    state.textResizeInteraction ||
    state.lassoPoints || state.lassoMoveInteraction ||
    state.tableSelectionPending || state.tableSelectionDrag || state.drawNodeHold ||
    state.drawCanvasPending ||
    state.canvasSelectionPending || state.canvasSelectionDrag || state.edgeSelectionPending ||
    state.mobileNodeSelectionPending ||
    state.deleteHoldTimer || state.deleteGestureActive);
}

function undoLastOperation() {
  const snapshot = state.undoStack.pop();
  if (!snapshot) return;
  state.redoStack.push(captureSnapshot());
  if (state.redoStack.length > 60) state.redoStack.shift();
  restoreSnapshot(snapshot, "已撤销上一步操作");
}

function redoLastOperation() {
  const snapshot = state.redoStack.pop();
  if (!snapshot) return;
  state.undoStack.push(captureSnapshot());
  if (state.undoStack.length > 60) state.undoStack.shift();
  restoreSnapshot(snapshot, "已恢复下一步操作");
}

function restoreSnapshot(snapshot, message) {
  clearTimeout(state.autoDrawTimer);
  cancelPointerInteraction(false);
  state.graph = snapshot.graph ? JSON.parse(JSON.stringify(snapshot.graph)) : null;
  state.treeLayout = null;
  state.edgeStart = null;
  state.lastDrawNodeTap = null;
  state.painting = false;
  state.currentStroke = null;
  state.pendingTextObject = null;
  state.pendingTextSnapshot = null;
  state.pendingTableObject = null;
  state.pendingTableSnapshot = null;
  state.contentEditSession = null;
  clearTextObjectSelection();
  clearLassoSelection();
  state.pendingBrushSnapshot = null;
  state.pendingDragSnapshot = null;
  state.mobileAnimatedSelectedNodeId = null;
  state.lastCommittedInput = snapshot.inputValue;
  elements.input.value = snapshot.inputValue;
  elements.directed.checked = snapshot.directed;
  elements.showWeights.checked = snapshot.showWeights;
  renderGraph();
  elements.drawing.innerHTML = snapshot.drawingMarkup || "";
  state.drawingMarkupCache = snapshot.drawingMarkup || "";
  requestAnimationFrame(() => {
    elements.drawing.querySelectorAll(".canvas-text-editor").forEach(resizeCanvasTextEditor);
  });
  state.scale = snapshot.scale;
  state.offsetX = snapshot.offsetX;
  state.offsetY = snapshot.offsetY;
  updateTransform();
  const hasNodes = state.graph?.nodes.length > 0;
  updateEmptyState();
  elements.status.textContent = hasNodes
    ? `${state.graph.nodes.length} 个节点 · ${state.graph.edges.length} 条边`
    : "等待输入数据";
  elements.statusDot.classList.toggle("ready", hasNodes);
  elements.selection.textContent = message;
  updateGraphCount();
  updateHistoryButtons();
  saveSettings();
  hideError();
}

function draw(options = {}) {
  const silent = options?.silent === true;
  if (silent && hasActivePointerInteraction()) {
    clearTimeout(state.autoDrawTimer);
    state.autoDrawTimer = window.setTimeout(() => draw({ silent: true }), 120);
    return;
  }
  try {
    const graph = parseGraph(elements.input.value);
    cancelPointerInteraction();
    pushUndoSnapshot();
    layoutGraph(graph);
    state.graph = graph;
    state.treeLayout = null;
    state.edgeStart = null;
    state.selectedNode = null;
    state.boxSelectedNodeIds.clear();
    state.mobileAnimatedSelectedNodeId = null;
    state.scale = 1; state.offsetX = 0; state.offsetY = 0;
    updateTransform();
    const autoArrangeTree = state.treeAutoArrange && isForestGraph(graph);
    if (autoArrangeTree) organizeTreeForest(false);
    else renderGraph();
    updateEmptyState();
    if (!autoArrangeTree) elements.status.textContent = `${graph.nodes.length} 个节点 · ${graph.edges.length} 条边`;
    updateGraphCount();
    elements.statusDot.classList.add("ready");
    elements.selection.textContent = autoArrangeTree ? "数据已更新 · 已自动整理树" : "未选择节点";
    state.lastCommittedInput = elements.input.value;
    updateOrganizeToggleUI();
    hideError();
  } catch (error) {
    if (silent) {
      elements.status.textContent = "输入尚未完成，保留上次结果";
      elements.statusDot.classList.remove("ready");
    } else {
      showError(error.message);
    }
  }
}

function clearGraph(recordHistory = false, deferIfBusy = false) {
  if (deferIfBusy && hasActivePointerInteraction()) {
    clearTimeout(state.autoDrawTimer);
    state.autoDrawTimer = window.setTimeout(() => clearGraph(recordHistory, true), 120);
    return;
  }
  cancelPointerInteraction();
  if (recordHistory && (state.graph || state.lastCommittedInput)) pushUndoSnapshot();
  state.graph = null;
  state.edgeViews = [];
  state.treeLayout = null;
  state.treeAutoArrange = false;
  state.edgeStart = null;
  state.lastCommittedInput = "";
  state.selectedNode = null;
  state.boxSelectedNodeIds.clear();
  state.mobileAnimatedSelectedNodeId = null;
  state.selectedEdges.clear();
  elements.edges.replaceChildren();
  elements.guides.replaceChildren();
  elements.labels.replaceChildren();
  elements.nodes.replaceChildren();
  updateEmptyState();
  elements.status.textContent = "等待输入数据";
  updateGraphCount();
  elements.statusDot.classList.remove("ready");
  elements.selection.textContent = "未选择节点";
  updateOrganizeToggleUI();
  hideError();
}

function clearAllContent(historySnapshot = null, historyAlreadyRecorded = false) {
  const hasContent = Boolean(
    state.graph
    || elements.input.value.trim()
    || elements.drawing.children.length
  );
  if (!hasContent) {
    elements.selection.textContent = historyAlreadyRecorded
      ? "全部内容已清除 · 可撤销"
      : "当前没有可清除的内容";
    return;
  }

  clearTimeout(state.autoDrawTimer);
  cancelPointerInteraction();
  if (!historyAlreadyRecorded) pushUndoSnapshot(historySnapshot || captureSnapshot());
  elements.input.value = "";
  clearGraph(false);
  elements.drawing.replaceChildren();
  clearTextObjectSelection();
  clearLassoSelection();
  state.drawingMarkupCache = "";
  state.pendingTextObject = null;
  state.pendingTextSnapshot = null;
  state.pendingTableObject = null;
  state.pendingTableSnapshot = null;
  state.contentEditSession = null;
  updateEmptyState();
  elements.status.textContent = "已清空全部内容";
  elements.selection.textContent = "图、笔迹、文本和表格均已清除 · 可撤销";
}

function clearCanvasContent(snapshot = captureSnapshot()) {
  if (!elements.drawing.children.length) {
    elements.selection.textContent = "当前没有可清除的画布内容 · 再次点击可清除全部";
    return false;
  }
  cancelPointerInteraction();
  pushUndoSnapshot(snapshot);
  elements.drawing.replaceChildren();
  clearTextObjectSelection();
  clearLassoSelection();
  state.drawingMarkupCache = "";
  state.pendingTextObject = null;
  state.pendingTextSnapshot = null;
  state.pendingTableObject = null;
  state.pendingTableSnapshot = null;
  state.contentEditSession = null;
  updateEmptyState();
  elements.selection.textContent = "已清除笔迹、线条、箭头、文本和表格 · 图形已保留 · 再次点击可清除全部";
  return true;
}

function requestClearAllContent() {
  if (state.clearClickTimer !== null) {
    clearTimeout(state.clearClickTimer);
    const snapshot = state.clearClickSnapshot;
    const historyAlreadyRecorded = state.clearClickHistoryRecorded;
    state.clearClickTimer = null;
    state.clearClickSnapshot = null;
    state.clearClickHistoryRecorded = false;
    clearAllContent(snapshot, historyAlreadyRecorded);
    return;
  }
  const snapshot = captureSnapshot();
  state.clearClickSnapshot = snapshot;
  state.clearClickHistoryRecorded = clearCanvasContent(snapshot);
  state.clearClickTimer = window.setTimeout(() => {
    state.clearClickTimer = null;
    state.clearClickSnapshot = null;
    state.clearClickHistoryRecorded = false;
  }, 420);
}

function scheduleAutoDraw() {
  clearTimeout(state.autoDrawTimer);
  if (!elements.input.value.trim()) {
    state.autoDrawTimer = setTimeout(() => clearGraph(true, true), 300);
    return;
  }
  elements.status.textContent = "正在读取输入…";
  elements.statusDot.classList.remove("ready");
  state.autoDrawTimer = setTimeout(() => draw({ silent: true }), 500);
}

function updateGraphCount() {
  const nodeCount = state.graph?.nodes.length ?? 0;
  const edgeCount = state.graph?.edges.length ?? 0;
  elements.graphCount.textContent = `${nodeCount} 个节点 · ${edgeCount} 条边`;
}

function updateEmptyState() {
  const hasNodes = state.graph?.nodes.length > 0;
  const hasDrawing = elements.drawing.children.length > 0;
  elements.empty.classList.toggle("hidden", state.mode === "canvas" || hasNodes || hasDrawing);
}

function showError(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  clearTimeout(showError.timer);
  showError.timer = setTimeout(hideError, 3500);
}
function hideError() { elements.toast.classList.remove("visible"); }

function updateTransform() {
  elements.viewport.setAttribute("transform", `translate(${state.offsetX} ${state.offsetY}) scale(${state.scale})`);
  elements.zoomLabel.textContent = `${Math.round(state.scale * 100)}%`;
  if (state.selectedTextObject) updateTextSelectionOverlay();
  if (state.lassoSelectedStrokes.length) updateLassoSelectionOverlay();
  scheduleMobileWorkspaceSave(260);
}

function zoomAt(factor, screenX, screenY) {
  const oldScale = state.scale;
  const newScale = Math.max(.25, Math.min(3, oldScale * factor));
  const rect = elements.svg.getBoundingClientRect();
  const x = screenX - rect.left, y = screenY - rect.top;
  state.offsetX = x - (x - state.offsetX) * (newScale / oldScale);
  state.offsetY = y - (y - state.offsetY) * (newScale / oldScale);
  state.scale = newScale;
  updateTransform();
}

function fitGraph(maxScale = 1.6) {
  if (!state.graph?.nodes.length) return;
  const rect = elements.canvasWrap.getBoundingClientRect();
  const xs = state.graph.nodes.map(n => n.x), ys = state.graph.nodes.map(n => n.y);
  const minX = Math.min(...xs) - 45, maxX = Math.max(...xs) + 45;
  const minY = Math.min(...ys) - 45, maxY = Math.max(...ys) + 45;
  state.scale = Math.min(maxScale, Math.max(.25, Math.min((rect.width - 70) / (maxX - minX), (rect.height - 70) / (maxY - minY))));
  state.offsetX = (rect.width - (minX + maxX) * state.scale) / 2;
  state.offsetY = (rect.height - (minY + maxY) * state.scale) / 2;
  updateTransform();
}

function organizeAsTree(recordHistory = true, targetCenterOverride = null) {
  if (!state.graph?.nodes.length) {
    showError("请先输入并绘制一棵树");
    return;
  }

  const graph = state.graph;
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const requestedRootId = elements.rootInput.value.trim() || "1";
  const requestedRootNode = graph.nodes.find(node => node.label === requestedRootId);
  const fallbackRootUsed = !requestedRootNode;
  const rootId = fallbackRootUsed
    ? graph.nodes.map(node => node.id).sort(compareNodeUids)[0]
    : requestedRootNode.id;
  if (fallbackRootUsed) {
    elements.rootInput.value = rootId;
    saveSettings();
  }
  if (graph.edges.length !== graph.nodes.length - 1 || graph.edges.some(edge => edge.source === edge.target)) {
    showError("当前图不是树：树需要连通且边数等于节点数减一");
    return;
  }

  const adjacency = new Map(graph.nodes.map(node => [node.id, []]));
  graph.edges.forEach(edge => {
    adjacency.get(edge.source).push(edge.target);
    adjacency.get(edge.target).push(edge.source);
  });
  adjacency.forEach(neighbors => neighbors.sort(compareNodeUids));

  const visited = new Set([rootId]);
  const layers = [];
  const children = new Map(graph.nodes.map(node => [node.id, []]));
  let current = [rootId];
  while (current.length) {
    layers.push(current.map(id => byId.get(id)));
    const next = [];
    current.forEach(id => {
      adjacency.get(id).forEach(neighbor => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        children.get(id).push(neighbor);
        next.push(neighbor);
      });
    });
    current = next;
  }
  if (visited.size !== graph.nodes.length) {
    showError("当前图不是树：存在未连接的节点");
    return;
  }

  const rect = elements.canvasWrap.getBoundingClientRect();
  const targetCenter = targetCenterOverride || graphCenter(graph);
  if (recordHistory) pushUndoSnapshot();
  const isLongPath = graph.nodes.length >= 6 && graph.nodes.every(node => adjacency.get(node.id).length <= 2);
  const pathEndpointIds = isLongPath
    ? graph.nodes.filter(node => adjacency.get(node.id).length === 1).map(node => node.id).sort(compareNodeUids)
    : [];
  const rootIsPathEndpoint = pathEndpointIds.includes(rootId);
  if (isLongPath && rootIsPathEndpoint) {
    const startId = rootId;
    const orderedNodes = [];
    let previousId = null;
    let pathId = startId;
    while (pathId !== undefined) {
      orderedNodes.push(byId.get(pathId));
      const nextId = adjacency.get(pathId).find(id => id !== previousId);
      previousId = pathId;
      pathId = nextId;
    }
    layoutPathSerpentine(orderedNodes, rect);
    restoreGraphCenter(graph, targetCenter);
    state.treeLayout = null;
    renderGraph();
    elements.status.textContent = `已将 ${graph.nodes.length} 个节点的单链紧凑回旋整理`;
    if (fallbackRootUsed) elements.selection.textContent = `根节点 ${requestedRootId} 不存在，已自动使用最小编号节点 ${nodeLabelOf(rootId)}`;
    elements.statusDot.classList.add("ready");
    hideError();
    return;
  }

  const referenceSpacing = Math.max(...graph.nodes.map(node => nodeRadius(node.label)), 17)
    * 2 * GENERATED_EDGE_DIAMETER_MULTIPLIER * TREE_LAYOUT_SPACING_SCALE;
  const maximumDiameter = Math.max(...graph.nodes.map(node => nodeRadius(node.label) * 2), 34);
  const horizontalGap = Math.max(maximumDiameter + 14, referenceSpacing * .78);
  const verticalGap = Math.max(maximumDiameter + 18, referenceSpacing * .9);
  const rawX = centeredTreeXPositions(rootId, children, horizontalGap);
  const xValues = [...rawX.values()];
  const xOffset = rect.width / 2 - (Math.min(...xValues) + Math.max(...xValues)) / 2;
  layers.forEach((layer, level) => {
    layer.forEach(node => {
      node.x = rawX.get(node.id) + xOffset;
      node.y = level * verticalGap;
    });
  });

  restoreGraphCenter(graph, targetCenter);
  state.treeLayout = { rootId, layers };
  renderGraph();
  elements.status.textContent = isLongPath
    ? `单链已从内部根节点 ${nodeLabelOf(rootId)} 向两侧居中分层 · ${layers.length} 层 · 参考边长 ${referenceSpacing.toFixed(1)}`
    : `已按根节点 ${nodeLabelOf(rootId)} 父子居中整理 · ${layers.length} 层 · 参考边长 ${referenceSpacing.toFixed(1)}`;
  if (fallbackRootUsed) elements.selection.textContent = `根节点 ${requestedRootId} 不存在，已自动使用最小编号节点 ${rootId}`;
  elements.statusDot.classList.add("ready");
  hideError();
}

function layoutPathSerpentine(nodes, rect) {
  const columns = Math.max(3, Math.min(8, Math.ceil(Math.sqrt(nodes.length * 1.5))));
  const rows = Math.ceil(nodes.length / columns);
  const referenceSpacing = Math.max(...nodes.map(node => nodeRadius(node.label)), 17)
    * 2 * GENERATED_EDGE_DIAMETER_MULTIPLIER * TREE_LAYOUT_SPACING_SCALE;
  const horizontalGap = referenceSpacing;
  const verticalGap = referenceSpacing;
  const startX = rect.width / 2 - (columns - 1) * horizontalGap / 2;
  const startY = rect.height / 2 - (rows - 1) * verticalGap / 2;
  nodes.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const rawColumn = index % columns;
    const column = row % 2 === 0 ? rawColumn : columns - 1 - rawColumn;
    node.x = startX + column * horizontalGap;
    node.y = startY + row * verticalGap;
  });
}

function centeredTreeXPositions(rootId, children, horizontalGap) {
  const positions = new Map();
  let leafCursor = 0;
  const placeSubtree = id => {
    const childIds = children.get(id) ?? [];
    if (!childIds.length) {
      const x = leafCursor;
      leafCursor += horizontalGap;
      positions.set(id, x);
      return x;
    }
    const childPositions = childIds.map(placeSubtree);
    const x = (childPositions[0] + childPositions[childPositions.length - 1]) / 2;
    positions.set(id, x);
    return x;
  };
  placeSubtree(rootId);
  return positions;
}

function graphCenter(graph) {
  if (!graph?.nodes.length) return { x: 0, y: 0 };
  return graph.nodes.reduce((center, node) => ({
    x: center.x + node.x / graph.nodes.length,
    y: center.y + node.y / graph.nodes.length
  }), { x: 0, y: 0 });
}

function restoreGraphCenter(graph, center) {
  const current = graphCenter(graph);
  const dx = center.x - current.x, dy = center.y - current.y;
  graph.nodes.forEach(node => {
    node.x += dx;
    node.y += dy;
  });
}

function axialDistance(a, b) {
  const dq = a.q - b.q, dr = a.r - b.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

function organizeGraphOnLattice(graph) {
  const targetCenter = graphCenter(graph);
  const edgeLength = Math.max(...graph.nodes.map(node => nodeRadius(node.label)), 17)
    * 2 * GENERATED_EDGE_DIAMETER_MULTIPLIER;
  const adjacency = new Map(graph.nodes.map(node => [node.id, new Set()]));
  graph.edges.forEach(edge => {
    if (edge.source === edge.target) return;
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const assigned = new Map();
  const occupied = new Map();
  // 生成后的节点继续沿用原网格；新增节点只填入周围空位。
  graph.nodes.forEach(node => {
    if (!Number.isFinite(node.latticeQ) || !Number.isFinite(node.latticeR)) return;
    const q = Math.round(node.latticeQ), r = Math.round(node.latticeR);
    const key = latticeKey(q, r);
    if (occupied.has(key)) return;
    const position = { q, r };
    assigned.set(node.id, position);
    occupied.set(key, node.id);
  });

  if (!assigned.size) {
    const root = [...graph.nodes].sort((a, b) =>
      (adjacency.get(b.id)?.size ?? 0) - (adjacency.get(a.id)?.size ?? 0)
      || compareNodeUids(a.id, b.id))[0];
    assigned.set(root.id, { q: 0, r: 0 });
    occupied.set(latticeKey(0, 0), root.id);
  }

  const openAdjacentCell = anchor => {
    const freeDirection = TRIANGULAR_LATTICE_DIRECTIONS.find(([dq, dr]) =>
      !occupied.has(latticeKey(anchor.q + dq, anchor.r + dr)));
    if (freeDirection) return;

    // 六个相邻位置都被占用时，选择穿过边最少的方向整体推开半平面。
    // 这样能为新节点腾出一个标准边长的位置，不会把它丢到网格外围。
    const choices = TRIANGULAR_LATTICE_DIRECTIONS.map(([dq, dr]) => {
      const direction = latticePoint(dq, dr, 1);
      const movingIds = new Set();
      assigned.forEach((position, id) => {
        const delta = latticePoint(position.q - anchor.q, position.r - anchor.r, 1);
        if (delta.x * direction.x + delta.y * direction.y > .49) movingIds.add(id);
      });
      let cutEdges = 0;
      graph.edges.forEach(edge => {
        if (!assigned.has(edge.source) || !assigned.has(edge.target)) return;
        if (movingIds.has(edge.source) !== movingIds.has(edge.target)) cutEdges++;
      });
      return { dq, dr, movingIds, score: cutEdges * 1000 + movingIds.size };
    }).sort((a, b) => a.score - b.score);
    const choice = choices[0];
    choice.movingIds.forEach(id => {
      const position = assigned.get(id);
      position.q += choice.dq;
      position.r += choice.dr;
    });
    occupied.clear();
    assigned.forEach((position, id) => occupied.set(latticeKey(position.q, position.r), id));
  };

  const unassigned = new Set(graph.nodes.map(node => node.id).filter(id => !assigned.has(id)));
  while (unassigned.size) {
    const nextId = [...unassigned].sort((a, b) => {
      const assignedA = [...(adjacency.get(a) ?? [])].filter(id => assigned.has(id)).length;
      const assignedB = [...(adjacency.get(b) ?? [])].filter(id => assigned.has(id)).length;
      return assignedB - assignedA
        || (adjacency.get(b)?.size ?? 0) - (adjacency.get(a)?.size ?? 0)
        || compareNodeUids(a, b);
    })[0];
    const placedNeighbors = [...(adjacency.get(nextId) ?? [])]
      .map(id => assigned.get(id)).filter(Boolean);
    const anchor = placedNeighbors[0];

    if (!anchor) {
      const existing = [...assigned.values()];
      const q = Math.max(...existing.map(position => position.q)) + 3;
      assigned.set(nextId, { q, r: 0 });
      occupied.set(latticeKey(q, 0), nextId);
      unassigned.delete(nextId);
      continue;
    }

    openAdjacentCell(anchor);
    const candidates = [];
    const maximumRadius = Math.max(4, Math.ceil(Math.sqrt(graph.nodes.length)) * 2);
    for (let radius = 1; radius <= maximumRadius; radius++) {
      for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = -radius; dr <= radius; dr++) {
          const candidate = { q: anchor.q + dq, r: anchor.r + dr };
          if (axialDistance(candidate, anchor) !== radius || occupied.has(latticeKey(candidate.q, candidate.r))) continue;
          const neighborCost = placedNeighbors.reduce((cost, neighbor) => {
            const distance = axialDistance(candidate, neighbor);
            return cost + Math.pow(distance - 1, 2) * 80 + distance * 4;
          }, 0);
          const point = latticePoint(candidate.q, candidate.r, 1);
          candidates.push({ ...candidate, score: neighborCost + Math.hypot(point.x, point.y) * 1.5 });
        }
      }
      if (candidates.length && radius >= 2) break;
    }
    candidates.sort((a, b) => a.score - b.score || a.q - b.q || a.r - b.r);
    const chosen = candidates[0];
    assigned.set(nextId, { q: chosen.q, r: chosen.r });
    occupied.set(latticeKey(chosen.q, chosen.r), nextId);
    unassigned.delete(nextId);
  }

  graph.nodes.forEach(node => {
    const position = assigned.get(node.id);
    const point = latticePoint(position.q, position.r, edgeLength);
    node.latticeQ = position.q;
    node.latticeR = position.r;
    node.x = point.x;
    node.y = point.y;
  });
  graph.generatedEdgeLength = edgeLength;
  restoreGraphCenter(graph, targetCenter);
  return edgeLength;
}

function updateOrganizeToggleUI() {
  const tree = isTreeGraph(state.graph);
  const forest = isForestGraph(state.graph);
  if (!forest) state.treeAutoArrange = false;
  const active = forest && state.treeAutoArrange;
  elements.organize.classList.toggle("active", active);
  elements.organize.setAttribute("aria-pressed", String(active));
  elements.organize.textContent = forest ? `整理 ${active ? "开" : "关"}` : "整理";
  elements.organize.title = forest
    ? `${tree ? "自动树形整理" : "自动森林整理"}：${active ? "已开启" : "已关闭"}`
    : "执行一次图布局整理";
  document.querySelectorAll('[data-quick-action="organize"]').forEach(button => {
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function organizeLayout() {
  if (!state.graph?.nodes.length) {
    showError("请先输入或绘制图形");
    return;
  }
  cancelPointerInteraction();
  if (isForestGraph(state.graph)) {
    state.treeAutoArrange = !state.treeAutoArrange;
    if (state.treeAutoArrange) {
      organizeTreeForest();
      elements.selection.textContent = "自动树形整理已开启";
    } else {
      state.treeLayout = null;
      renderGraph();
      elements.status.textContent = "自动树形整理已关闭";
      elements.selection.textContent = "当前布局保持不变，后续编辑不再自动整理";
      hideError();
    }
    updateOrganizeToggleUI();
    return;
  }

  state.treeAutoArrange = false;
  state.treeLayout = null;
  state.edgeStart = null;
  pushUndoSnapshot();
  const edgeLength = organizeGraphOnLattice(state.graph);
  renderGraph();
  elements.status.textContent = `已按紧凑网格整理 · 参考边长 ${edgeLength.toFixed(1)}`;
  elements.statusDot.classList.add("ready");
  elements.selection.textContent = "已保留视图与图形中心位置";
  hideError();
}

function isTreeGraph(graph) {
  if (!graph?.nodes.length || graph.edges.length !== graph.nodes.length - 1) return false;
  if (graph.edges.some(edge => edge.source === edge.target)) return false;
  const adjacency = new Map(graph.nodes.map(node => [node.id, []]));
  graph.edges.forEach(edge => {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });
  const visited = new Set();
  const pending = [graph.nodes[0].id];
  while (pending.length) {
    const id = pending.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    adjacency.get(id).forEach(neighbor => {
      if (!visited.has(neighbor)) pending.push(neighbor);
    });
  }
  return visited.size === graph.nodes.length;
}

function isForestGraph(graph) {
  if (!graph?.nodes.length) return false;
  const parent = new Map(graph.nodes.map(node => [node.id, node.id]));
  const find = id => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(id) !== id) {
      const next = parent.get(id);
      parent.set(id, root);
      id = next;
    }
    return root;
  };
  for (const edge of graph.edges) {
    if (edge.source === edge.target || !parent.has(edge.source) || !parent.has(edge.target)) return false;
    const sourceRoot = find(edge.source), targetRoot = find(edge.target);
    if (sourceRoot === targetRoot) return false;
    parent.set(sourceRoot, targetRoot);
  }
  return true;
}

function treeComponents(graph) {
  const adjacency = new Map(graph.nodes.map(node => [node.id, []]));
  graph.edges.forEach(edge => {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const visited = new Set();
  const components = [];
  graph.nodes.forEach(start => {
    if (visited.has(start.id)) return;
    const ids = [];
    const pending = [start.id];
    visited.add(start.id);
    while (pending.length) {
      const id = pending.shift();
      ids.push(id);
      adjacency.get(id).forEach(neighbor => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        pending.push(neighbor);
      });
    }
    components.push({
      ids,
      nodes: ids.map(id => byId.get(id)),
      adjacency
    });
  });
  return components;
}

function layoutTreeComponent(component, rootId, targetCenter) {
  const byId = new Map(component.nodes.map(node => [node.id, node]));
  const children = new Map(component.ids.map(id => [id, []]));
  const layers = [];
  const visited = new Set([rootId]);
  let current = [rootId];
  while (current.length) {
    layers.push(current.map(id => byId.get(id)));
    const next = [];
    current.forEach(id => {
      const neighbors = [...component.adjacency.get(id)].sort(compareNodeUids);
      neighbors.forEach(neighbor => {
        if (!byId.has(neighbor) || visited.has(neighbor)) return;
        visited.add(neighbor);
        children.get(id).push(neighbor);
        next.push(neighbor);
      });
    });
    current = next;
  }
  const referenceSpacing = Math.max(...component.nodes.map(node => nodeRadius(node.label)), 17)
    * 2 * GENERATED_EDGE_DIAMETER_MULTIPLIER * TREE_LAYOUT_SPACING_SCALE;
  const maximumDiameter = Math.max(...component.nodes.map(node => nodeRadius(node.label) * 2), 34);
  const horizontalGap = Math.max(maximumDiameter + 14, referenceSpacing * .78);
  const verticalGap = Math.max(maximumDiameter + 18, referenceSpacing * .9);
  const rawX = centeredTreeXPositions(rootId, children, horizontalGap);
  const values = [...rawX.values()];
  const centerOffset = -(Math.min(...values) + Math.max(...values)) / 2;
  layers.forEach((layer, level) => {
    layer.forEach(node => {
      node.x = rawX.get(node.id) + centerOffset;
      node.y = level * verticalGap;
    });
  });
  restoreGraphCenter({ nodes: component.nodes }, targetCenter);
  return layers;
}

function organizeTreeForest(recordHistory = true) {
  if (!isForestGraph(state.graph)) return false;
  if (isTreeGraph(state.graph)) {
    organizeAsTree(recordHistory);
    return true;
  }
  if (recordHistory) pushUndoSnapshot();
  const requestedRoot = elements.rootInput.value.trim();
  const components = treeComponents(state.graph);
  components.forEach(component => {
    const rootId = component.ids.includes(requestedRoot)
      ? requestedRoot
      : [...component.ids].sort(compareNodeUids)[0];
    layoutTreeComponent(component, rootId, graphCenter({ nodes: component.nodes }));
  });
  state.treeLayout = null;
  renderGraph();
  elements.status.textContent = `已自动整理 ${components.length} 棵独立树`;
  elements.statusDot.classList.add("ready");
  hideError();
  return true;
}

function setMode(mode) {
  if (!["touch", "draw", "delete", "canvas", "lasso"].includes(mode)) return;
  cancelPointerInteraction();
  state.mode = mode;
  state.edgeStart = null;
  state.lastDrawNodeTap = null;
  const preserveMobileSelection = document.body.dataset.mobileStandalone === "true";
  if (mode !== "touch" && !preserveMobileSelection) {
    clearBoxSelection();
    clearEdgeSelection();
  }
  if (mode !== "touch") clearTextObjectSelection();
  if (mode !== "lasso") clearLassoSelection();
  state.painting = false;
  state.currentStroke = null;
  if (mode === "canvas" && document.activeElement?.closest?.(".graph-node")) {
    document.activeElement.blur?.();
  }
  document.querySelectorAll(".graph-node.selected").forEach(node => node.classList.remove("selected"));
  elements.drawing.querySelectorAll("td.cell-selected, td.cell-anchor")
    .forEach(cell => cell.classList.remove("cell-selected", "cell-anchor"));
  elements.modeButtons.forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll('.collapsed-shortcuts [data-quick-action="mode"]').forEach(button => {
    button.classList.toggle("active", button.dataset.value === mode);
  });
  elements.canvasWrap.classList.toggle("mode-touch", mode === "touch");
  elements.canvasWrap.classList.toggle("mode-draw", mode === "draw");
  elements.canvasWrap.classList.toggle("mode-delete", mode === "delete");
  elements.canvasWrap.classList.toggle("mode-canvas", mode === "canvas");
  elements.canvasWrap.classList.toggle("mode-lasso", mode === "lasso");
  elements.brushTools.classList.toggle("active", mode === "canvas");
  if (mode !== "canvas") elements.colorPalette.classList.remove("open");
  updateCanvasToolUI();
  elements.selection.textContent = mode === "draw"
    ? "绘制模式：点击空白处建点、拖动空白处平移；短按节点连线、长按节点移动"
    : mode === "delete"
      ? "删除模式：点击节点或边删除"
      : mode === "canvas"
        ? "画布模式：左键涂画，中键/右键或 Shift/Alt 拖动平移"
        : mode === "lasso"
          ? "圈选模式：自由圈住笔迹；拖动选框移动，Alt 拖动复制，Ctrl+C / Ctrl+V 复制粘贴"
        : document.body.dataset.mobileStandalone === "true"
          ? "触摸模式：单击节点或边可多选，重复单击取消"
          : "触摸模式：单击边可多选，Ctrl/Command + 单击节点多选";
  if (mobilePenOnlyEnabled()) {
    elements.selection.textContent += " · 触控笔操作，手指仅导航";
  }
  updateEmptyState();
  saveSettings();
}

function activeToolColorKey() {
  const tool = elements.canvasTool.value;
  return tool === "table" ? "text" : ["brush", "line", "arrow", "text"].includes(tool)
    ? tool
    : "brush";
}

function syncActiveToolColorUI() {
  const key = activeToolColorKey();
  const color = state.toolColors[key] || "#ff5f7e";
  elements.brushColor.value = color;
  elements.colorPalette.style.setProperty("--active-tool-color", color);
  elements.colorPaletteToggle.setAttribute("title", `${key === "brush" ? "画笔" : key === "line" ? "直线" : key === "arrow" ? "箭头" : "文本"}颜色：${color}`);
  elements.colorSwatches.forEach(swatch => {
    swatch.classList.toggle("active", swatch.dataset.color.toLowerCase() === color.toLowerCase());
  });
}

function setActiveToolColor(color, persist = true) {
  if (!/^#[0-9a-f]{6}$/i.test(color || "")) return;
  state.toolColors[activeToolColorKey()] = color.toLowerCase();
  syncActiveToolColorUI();
  if (persist) saveSettings();
}

function updateCanvasToolUI() {
  const inCanvasMode = state.mode === "canvas";
  syncActiveToolColorUI();
  elements.tableSettings.classList.toggle("active", inCanvasMode && elements.canvasTool.value === "table");
  document.querySelectorAll('.collapsed-shortcuts [data-quick-action="tool"]').forEach(button => {
    button.classList.toggle("active", inCanvasMode && button.dataset.value === elements.canvasTool.value);
  });
  if (!inCanvasMode) return;
  const toolNames = { brush: "画笔", line: "直线", arrow: "箭头", text: "文本", table: "表格" };
  const tableHint = elements.canvasTool.value === "table" ? " · 拖拽绘制区域，实时预览表格网格" : "";
  elements.selection.textContent = `画布模式 · ${toolNames[elements.canvasTool.value] || "画笔"}${tableHint}${
    mobilePenOnlyEnabled() ? " · 触控笔操作，手指仅导航" : ""
  }`;
}

function applyBoxSelectionClasses(selectedIds) {
  elements.nodes.querySelectorAll(".graph-node").forEach(nodeElement => {
    const nodeId = nodeElement.dataset.nodeId;
    const selected = selectedIds.has(nodeId);
    nodeElement.classList.toggle("box-selected", selected);
    nodeElement.classList.toggle("mobile-active-selection",
      selected && document.body.dataset.mobileStandalone === "true"
      && state.mobileAnimatedSelectedNodeId === nodeId);
  });
}

function clearBoxSelection() {
  state.boxSelectedNodeIds.clear();
  state.mobileAnimatedSelectedNodeId = null;
  applyBoxSelectionClasses(state.boxSelectedNodeIds);
}

function cancelMobileNodeSelection() {
  if (!mobileStandalone()) return false;
  const selectedElements = [...elements.nodes.querySelectorAll(".graph-node.selected")];
  const hadSelection = state.boxSelectedNodeIds.size > 0
    || state.selectedNode !== null
    || state.edgeStart !== null
    || selectedElements.length > 0;
  if (!hadSelection) return false;
  clearBoxSelection();
  selectedElements.forEach(node => node.classList.remove("selected"));
  state.selectedNode = null;
  state.edgeStart = null;
  state.lastDrawNodeTap = null;
  elements.selection.textContent = "已取消所有节点选择";
  return true;
}

function applyEdgeSelectionClasses() {
  state.edgeViews.forEach((view, index) => {
    const selected = state.selectedEdges.has(state.graph?.edges[index]);
    view.hitPath?.classList.toggle("edge-selected", selected);
    view.path?.classList.toggle("edge-selected", selected);
    view.flowPath?.classList.toggle("edge-selected", selected);
    view.label?.classList.toggle("edge-selected", selected);
  });
}

function clearEdgeSelection() {
  state.selectedEdges.clear();
  state.edgeSelectionPending = null;
  applyEdgeSelectionClasses();
}

function toggleEdgeSelection(edgeIndex) {
  const edge = state.graph?.edges[edgeIndex];
  if (!edge) return;
  if (state.selectedEdges.has(edge)) state.selectedEdges.delete(edge);
  else state.selectedEdges.add(edge);
  applyEdgeSelectionClasses();
  elements.selection.textContent = state.selectedEdges.size
    ? `已选择 ${state.selectedEdges.size} 条边 · 单击可取消`
    : "已取消边选择";
}

function toggleNodeBoxSelection(nodeId) {
  const newlySelected = !state.boxSelectedNodeIds.has(nodeId);
  if (!newlySelected) state.boxSelectedNodeIds.delete(nodeId);
  else state.boxSelectedNodeIds.add(nodeId);
  if (document.body.dataset.mobileStandalone === "true") {
    if (newlySelected) state.mobileAnimatedSelectedNodeId = nodeId;
    else if (state.mobileAnimatedSelectedNodeId === nodeId) state.mobileAnimatedSelectedNodeId = null;
  }
  applyBoxSelectionClasses(state.boxSelectedNodeIds);
  elements.selection.textContent = state.boxSelectedNodeIds.size
    ? `已多选 ${state.boxSelectedNodeIds.size} 个节点`
    : "已取消多选";
}

function selectedNodeDragGroupFor(node) {
  if (state.boxSelectedNodeIds.size <= 1
    || !state.boxSelectedNodeIds.has(node.id)) return null;
  return state.graph.nodes
    .filter(candidate => state.boxSelectedNodeIds.has(candidate.id))
    .map(candidate => ({
      node: candidate,
      element: elements.nodes.querySelector(`[data-node-id="${CSS.escape(candidate.id)}"]`),
      originX: candidate.x,
      originY: candidate.y
    }));
}

function selectComponentOfNode(nodeId) {
  const component = treeComponents(state.graph).find(comp => comp.ids.includes(nodeId));
  if (!component) return;
  state.boxSelectedNodeIds = new Set(component.ids);
  state.selectedNode = null;
  document.querySelectorAll(".graph-node.selected").forEach(el => el.classList.remove("selected"));
  if (document.body.dataset.mobileStandalone === "true") {
    state.mobileAnimatedSelectedNodeId = nodeId;
  }
  applyBoxSelectionClasses(state.boxSelectedNodeIds);
  elements.selection.textContent = `已选中连通块 · ${component.ids.length} 个节点`;
}

function duplicateSelectedComponent() {
  const selectedIds = state.boxSelectedNodeIds;
  if (!state.graph || selectedIds.size === 0) {
    elements.selection.textContent = "请先选中一个连通块（双击节点可选中整块）";
    return;
  }
  pushUndoSnapshot();
  const offset = 40;
  const uidMap = new Map();
  const stamp = Date.now().toString(36);
  const newNodes = state.graph.nodes
    .filter(node => selectedIds.has(node.id))
    .map((node, index) => {
      const newNode = {
        id: `dup${stamp}_${index}`,
        label: node.label,
        x: node.x + offset,
        y: node.y + offset
      };
      uidMap.set(node.id, newNode.id);
      return newNode;
    });
  const newEdges = state.graph.edges
    .filter(edge => selectedIds.has(edge.source) && selectedIds.has(edge.target))
    .map(edge => ({
      source: uidMap.get(edge.source),
      target: uidMap.get(edge.target),
      weight: edge.weight
    }));
  state.graph.nodes.push(...newNodes);
  state.graph.edges.push(...newEdges);
  state.boxSelectedNodeIds = new Set(newNodes.map(node => node.id));
  state.selectedNode = null;
  state.edgeStart = null;
  commitGraphEdit(`已复制连通块 · ${newNodes.length} 个节点、${newEdges.length} 条边 · 已选中新副本`);
  applyBoxSelectionClasses(state.boxSelectedNodeIds);
}

function activateCanvasSelection(pending) {
  if (state.canvasSelectionPending !== pending) return;
  state.canvasSelectionPending = null;
  const rectangle = svgElement("rect", {
    class: "node-selection-marquee",
    x: pending.startPoint.x,
    y: pending.startPoint.y,
    width: 0,
    height: 0
  });
  elements.guides.append(rectangle);
  state.canvasSelectionDrag = {
    pointerId: pending.pointerId,
    startPoint: pending.startPoint,
    rectangle,
    selectedIds: new Set()
  };
  elements.canvasWrap.classList.add("box-selecting");
  elements.selection.textContent = "已进入框选，拖动选择节点";
}

function beginCanvasSelectionHold(event) {
  event.preventDefault();
  elements.canvasWrap.setPointerCapture(event.pointerId);
  const pending = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPoint: toGraphPoint(event),
    timer: null
  };
  pending.timer = window.setTimeout(() => activateCanvasSelection(pending), CANVAS_SELECTION_HOLD_MS);
  state.canvasSelectionPending = pending;
  elements.selection.textContent = "直接拖动平移画布，停留片刻后拖动可框选";
}

function updateCanvasSelectionInteraction(event) {
  const pending = state.canvasSelectionPending;
  if (pending && pending.pointerId === event.pointerId) {
    const movement = Math.hypot(event.clientX - pending.startClientX, event.clientY - pending.startClientY);
    if (movement <= CANVAS_SELECTION_MOVE_THRESHOLD) return true;
    clearTimeout(pending.timer);
    state.canvasSelectionPending = null;
    state.panning = true;
    state.pointerStart = {
      x: pending.startClientX - state.offsetX,
      y: pending.startClientY - state.offsetY
    };
    elements.canvasWrap.classList.add("panning");
    state.offsetX = event.clientX - state.pointerStart.x;
    state.offsetY = event.clientY - state.pointerStart.y;
    updateTransform();
    return true;
  }
  const drag = state.canvasSelectionDrag;
  if (!drag || drag.pointerId !== event.pointerId) return false;
  event.preventDefault();
  const point = toGraphPoint(event);
  const minX = Math.min(drag.startPoint.x, point.x), maxX = Math.max(drag.startPoint.x, point.x);
  const minY = Math.min(drag.startPoint.y, point.y), maxY = Math.max(drag.startPoint.y, point.y);
  drag.rectangle.setAttribute("x", minX);
  drag.rectangle.setAttribute("y", minY);
  drag.rectangle.setAttribute("width", maxX - minX);
  drag.rectangle.setAttribute("height", maxY - minY);
  drag.selectedIds = new Set((state.graph?.nodes ?? [])
    .filter(node => node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY)
    .map(node => node.id));
  applyBoxSelectionClasses(drag.selectedIds);
  elements.selection.textContent = `正在框选 ${drag.selectedIds.size} 个节点`;
  return true;
}

function finishCanvasSelectionInteraction(event) {
  const pending = state.canvasSelectionPending;
  if (pending && pending.pointerId === event.pointerId) {
    clearTimeout(pending.timer);
    state.canvasSelectionPending = null;
    if (event.type === "pointerup" && document.body.dataset.mobileStandalone !== "true") {
      clearBoxSelection();
      elements.selection.textContent = "未选择节点";
    } else if (event.type === "pointerup") {
      const nodeCount = state.boxSelectedNodeIds.size;
      const edgeCount = state.selectedEdges.size;
      elements.selection.textContent = nodeCount || edgeCount
        ? `已保留选择 · ${nodeCount} 个节点 · ${edgeCount} 条边`
        : "未选择节点或边";
    }
    return true;
  }
  const drag = state.canvasSelectionDrag;
  if (!drag || drag.pointerId !== event.pointerId) return false;
  drag.rectangle.remove();
  state.canvasSelectionDrag = null;
  elements.canvasWrap.classList.remove("box-selecting");
  if (event.type === "pointerup") {
    state.boxSelectedNodeIds = new Set(drag.selectedIds);
    state.mobileAnimatedSelectedNodeId = null;
    applyBoxSelectionClasses(state.boxSelectedNodeIds);
    elements.selection.textContent = `已框选 ${state.boxSelectedNodeIds.size} 个节点`;
  } else {
    applyBoxSelectionClasses(state.boxSelectedNodeIds);
  }
  return true;
}

function strokeTranslation(stroke) {
  return {
    x: Number(stroke.dataset.lassoX) || 0,
    y: Number(stroke.dataset.lassoY) || 0
  };
}

function setStrokeTranslation(stroke, x, y) {
  stroke.dataset.lassoX = String(x);
  stroke.dataset.lassoY = String(y);
  stroke.setAttribute("transform", `translate(${x} ${y})`);
}

function sampleStrokePoints(stroke, sampleCount = 28) {
  const translation = strokeTranslation(stroke);
  if (stroke.tagName.toLowerCase() === "line") {
    const x1 = Number(stroke.getAttribute("x1")) || 0;
    const y1 = Number(stroke.getAttribute("y1")) || 0;
    const x2 = Number(stroke.getAttribute("x2")) || 0;
    const y2 = Number(stroke.getAttribute("y2")) || 0;
    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const ratio = index / sampleCount;
      return {
        x: x1 + (x2 - x1) * ratio + translation.x,
        y: y1 + (y2 - y1) * ratio + translation.y
      };
    });
  }
  try {
    const length = stroke.getTotalLength();
    if (!Number.isFinite(length) || length <= 0) return [];
    const count = Math.max(8, Math.min(56, Math.ceil(length / 14)));
    return Array.from({ length: count + 1 }, (_, index) => {
      const point = stroke.getPointAtLength(length * index / count);
      return { x: point.x + translation.x, y: point.y + translation.y };
    });
  } catch (_) {
    return [];
  }
}

function pointInsidePolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index], b = polygon[previous];
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || Number.EPSILON) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function lassoSelectionBounds(strokes = state.lassoSelectedStrokes) {
  const points = strokes.flatMap(stroke => sampleStrokePoints(stroke));
  if (!points.length) return null;
  const xs = points.map(point => point.x), ys = points.map(point => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

function ensureLassoSelectionOverlay() {
  if (state.lassoSelectionOverlay?.isConnected) return state.lassoSelectionOverlay;
  const overlay = svgElement("g", { class: "lasso-selection-overlay" });
  overlay.append(
    svgElement("rect", { class: "lasso-selection-hit" }),
    svgElement("rect", { class: "lasso-selection-box" }),
    svgElement("text", { class: "lasso-selection-count" }),
    svgElement("circle", { class: "lasso-copy-hit" }),
    svgElement("circle", { class: "lasso-copy-button" }),
    svgElement("path", { class: "lasso-copy-icon" })
  );
  elements.viewport.append(overlay);
  state.lassoSelectionOverlay = overlay;
  return overlay;
}

function updateLassoSelectionOverlay() {
  state.lassoSelectedStrokes = state.lassoSelectedStrokes.filter(stroke => stroke.isConnected);
  const bounds = lassoSelectionBounds();
  if (!bounds || !state.lassoSelectedStrokes.length || state.mode !== "lasso") {
    state.lassoSelectionOverlay?.remove();
    state.lassoSelectionOverlay = null;
    return;
  }
  const overlay = ensureLassoSelectionOverlay();
  const padding = 7 / Math.max(state.scale, .25);
  const x = bounds.x - padding, y = bounds.y - padding;
  const width = Math.max(1, bounds.width + padding * 2);
  const height = Math.max(1, bounds.height + padding * 2);
  overlay.querySelectorAll(".lasso-selection-hit, .lasso-selection-box").forEach(rectangle => {
    rectangle.setAttribute("x", x);
    rectangle.setAttribute("y", y);
    rectangle.setAttribute("width", width);
    rectangle.setAttribute("height", height);
  });
  const count = overlay.querySelector(".lasso-selection-count");
  count.setAttribute("x", x + 3 / Math.max(state.scale, .25));
  count.setAttribute("y", y - 6 / Math.max(state.scale, .25));
  count.textContent = `${state.lassoSelectedStrokes.length} 笔`;
  const copyX = x + width;
  const copyY = y;
  const copyRadius = 9 / Math.max(state.scale, .25);
  const copyHitRadius = 16 / Math.max(state.scale, .25);
  overlay.querySelector(".lasso-copy-hit").setAttribute("cx", copyX);
  overlay.querySelector(".lasso-copy-hit").setAttribute("cy", copyY);
  overlay.querySelector(".lasso-copy-hit").setAttribute("r", copyHitRadius);
  overlay.querySelector(".lasso-copy-button").setAttribute("cx", copyX);
  overlay.querySelector(".lasso-copy-button").setAttribute("cy", copyY);
  overlay.querySelector(".lasso-copy-button").setAttribute("r", copyRadius);
  const iconSize = 4 / Math.max(state.scale, .25);
  overlay.querySelector(".lasso-copy-icon").setAttribute("d",
    `M ${copyX - iconSize * .55} ${copyY - iconSize} h ${iconSize * 1.5} v ${iconSize * 1.5}`
    + ` M ${copyX - iconSize} ${copyY - iconSize * .45} h ${iconSize * 1.5} v ${iconSize * 1.5} h ${-iconSize * 1.5} Z`);
}

function clearLassoSelection() {
  state.lassoSelectedStrokes = [];
  state.lassoSelectionOverlay?.remove();
  state.lassoSelectionOverlay = null;
}

function cancelLassoPointerInteraction(revert = true) {
  state.lassoOutline?.remove();
  state.lassoOutline = null;
  state.lassoPoints = null;
  const move = state.lassoMoveInteraction;
  if (move && revert) {
    move.items.forEach(item => setStrokeTranslation(item.stroke, item.x, item.y));
    if (move.duplicated) {
      move.items.forEach(item => item.stroke.remove());
      state.lassoSelectedStrokes = move.originalSelection.filter(stroke => stroke.isConnected);
    }
    invalidateDrawingMarkup();
    updateLassoSelectionOverlay();
  }
  state.lassoMoveInteraction = null;
}

function beginLasso(event) {
  event.preventDefault();
  elements.canvasWrap.setPointerCapture(event.pointerId);
  clearLassoSelection();
  const point = toGraphPoint(event);
  state.lassoPoints = { pointerId: event.pointerId, points: [point] };
  state.lassoOutline = svgElement("path", {
    class: "lasso-outline",
    d: `M ${point.x} ${point.y}`
  });
  elements.viewport.append(state.lassoOutline);
  elements.selection.textContent = "拖动绘制圈选区域";
}

function updateLasso(event) {
  const lasso = state.lassoPoints;
  if (!lasso || lasso.pointerId !== event.pointerId) return false;
  event.preventDefault();
  const point = toGraphPoint(event);
  const previous = lasso.points[lasso.points.length - 1];
  if (Math.hypot(point.x - previous.x, point.y - previous.y) < 3 / Math.max(state.scale, .25)) return true;
  lasso.points.push(point);
  state.lassoOutline.setAttribute("d", `M ${lasso.points.map(item => `${item.x} ${item.y}`).join(" L ")} Z`);
  return true;
}

function finishLasso(event) {
  const lasso = state.lassoPoints;
  if (!lasso || lasso.pointerId !== event.pointerId) return false;
  state.lassoPoints = null;
  state.lassoOutline?.remove();
  state.lassoOutline = null;
  if (event.type !== "pointerup" || lasso.points.length < 4) {
    clearLassoSelection();
    elements.selection.textContent = "圈选已取消";
    return true;
  }
  const candidates = [...elements.drawing.querySelectorAll(".canvas-stroke")];
  state.lassoSelectedStrokes = candidates.filter(stroke => {
    const points = sampleStrokePoints(stroke);
    if (!points.length) return false;
    const insideCount = points.reduce((count, point) => count + Number(pointInsidePolygon(point, lasso.points)), 0);
    return insideCount / points.length >= .78;
  });
  updateLassoSelectionOverlay();
  elements.selection.textContent = state.lassoSelectedStrokes.length
    ? `已圈选 ${state.lassoSelectedStrokes.length} 笔 · 拖动移动，Alt 拖动复制，Ctrl+C / Ctrl+V 复制粘贴`
    : "圈内没有完整笔迹";
  return true;
}

function beginLassoMove(event) {
  if (!state.lassoSelectedStrokes.length) return false;
  event.preventDefault();
  event.stopPropagation();
  elements.canvasWrap.setPointerCapture(event.pointerId);
  const snapshot = captureSnapshot();
  const originalSelection = [...state.lassoSelectedStrokes];
  const duplicated = event.altKey;
  if (duplicated) {
    state.lassoSelectedStrokes = originalSelection.map(stroke => {
      const clone = stroke.cloneNode(true);
      elements.drawing.append(clone);
      return clone;
    });
    invalidateDrawingMarkup();
  }
  state.lassoMoveInteraction = {
    pointerId: event.pointerId,
    startPoint: toGraphPoint(event),
    snapshot,
    duplicated,
    originalSelection,
    moved: false,
    items: state.lassoSelectedStrokes.map(stroke => ({ stroke, ...strokeTranslation(stroke) }))
  };
  elements.selection.textContent = duplicated ? "正在复制所选笔迹" : "正在移动所选笔迹";
  return true;
}

function updateLassoMove(event) {
  const move = state.lassoMoveInteraction;
  if (!move || move.pointerId !== event.pointerId) return false;
  event.preventDefault();
  const point = toGraphPoint(event);
  const dx = point.x - move.startPoint.x, dy = point.y - move.startPoint.y;
  move.moved = move.moved || Math.hypot(dx, dy) > 2 / Math.max(state.scale, .25);
  move.items.forEach(item => setStrokeTranslation(item.stroke, item.x + dx, item.y + dy));
  invalidateDrawingMarkup();
  updateLassoSelectionOverlay();
  return true;
}

function finishLassoMove(event) {
  const move = state.lassoMoveInteraction;
  if (!move || move.pointerId !== event.pointerId) return false;
  state.lassoMoveInteraction = null;
  if (event.type !== "pointerup" || !move.moved) {
    move.items.forEach(item => setStrokeTranslation(item.stroke, item.x, item.y));
    if (move.duplicated) {
      move.items.forEach(item => item.stroke.remove());
      state.lassoSelectedStrokes = move.originalSelection.filter(stroke => stroke.isConnected);
    }
    invalidateDrawingMarkup();
    updateLassoSelectionOverlay();
    return true;
  }
  pushUndoSnapshot(move.snapshot);
  invalidateDrawingMarkup();
  updateLassoSelectionOverlay();
  elements.selection.textContent = move.duplicated
    ? `已复制 ${state.lassoSelectedStrokes.length} 笔 · 可撤销`
    : `已移动 ${state.lassoSelectedStrokes.length} 笔 · 可撤销`;
  return true;
}

function copyLassoSelection() {
  if (state.mode !== "lasso" || !state.lassoSelectedStrokes.length) return false;
  state.lassoClipboard = state.lassoSelectedStrokes.map(stroke => stroke.cloneNode(true));
  elements.selection.textContent = `已复制 ${state.lassoClipboard.length} 笔到画布剪贴板`;
  return true;
}

function pasteLassoSelection() {
  if (state.mode !== "lasso" || !state.lassoClipboard.length) return false;
  const snapshot = captureSnapshot();
  const offset = 18 / Math.max(state.scale, .25);
  state.lassoSelectedStrokes = state.lassoClipboard.map(stored => {
    const clone = stored.cloneNode(true);
    const translation = strokeTranslation(clone);
    setStrokeTranslation(clone, translation.x + offset, translation.y + offset);
    elements.drawing.append(clone);
    return clone;
  });
  invalidateDrawingMarkup();
  pushUndoSnapshot(snapshot);
  updateLassoSelectionOverlay();
  updateEmptyState();
  elements.selection.textContent = `已粘贴 ${state.lassoSelectedStrokes.length} 笔 · 可继续 Ctrl+V`;
  return true;
}

function duplicateLassoSelection() {
  if (!copyLassoSelection()) return false;
  return pasteLassoSelection();
}

function beginCanvasAction(event, toolOverride = null) {
  const tool = toolOverride || elements.canvasTool.value;
  const point = toGraphPoint(event);
  if (tool === "text") {
    insertTextAt(point);
    return;
  }
  state.pendingBrushSnapshot = captureSnapshot();
  state.drawingStart = point;
  state.drawingMoved = false;
  let shape;
  if (tool === "table") {
    const outline = svgElement("rect", {
      class: "table-draw-preview-outline",
      x: point.x, y: point.y, width: 0, height: 0
    });
    const grid = svgElement("g", { class: "table-draw-preview-grid" });
    shape = svgElement("g", { class: "table-draw-preview" });
    shape.append(outline, grid);
    state.currentStrokePath = "table";
    state.tablePreview = { outline, grid };
  } else if (tool === "line") {
    shape = svgElement("line", {
      class: "canvas-stroke",
      stroke: elements.brushColor.value,
      x1: point.x, y1: point.y, x2: point.x, y2: point.y
    });
    state.currentStrokePath = tool;
  } else if (tool === "arrow") {
    shape = svgElement("path", {
      class: "canvas-stroke",
      stroke: elements.brushColor.value,
      d: `M ${point.x} ${point.y} L ${point.x} ${point.y}`
    });
    state.currentStrokePath = "arrow";
  } else {
    shape = svgElement("path", {
      class: "canvas-stroke",
      stroke: elements.brushColor.value,
      d: `M ${point.x} ${point.y}`
    });
    state.currentStrokePath = `M ${point.x} ${point.y}`;
  }
  elements.drawing.append(shape);
  invalidateDrawingMarkup();
  state.painting = true;
  state.currentStroke = shape;
}

function continueCanvasAction(event) {
  if (!state.painting || !state.currentStroke) return;
  const point = toGraphPoint(event);
  state.drawingMoved = state.drawingMoved || Math.hypot(point.x - state.drawingStart.x, point.y - state.drawingStart.y) > 2 / state.scale;
  if (state.currentStrokePath === "table") {
    const cellWidth = clampInteger(elements.tableCellWidth.value, 40, 240, 80);
    const cellHeight = clampInteger(elements.tableCellHeight.value, 24, 160, 40);
    const x = Math.min(state.drawingStart.x, point.x);
    const y = Math.min(state.drawingStart.y, point.y);
    const columns = Math.max(1, Math.round(Math.abs(point.x - state.drawingStart.x) / cellWidth));
    const rows = Math.max(1, Math.round(Math.abs(point.y - state.drawingStart.y) / cellHeight));
    const width = columns * cellWidth;
    const height = rows * cellHeight;
    const { outline, grid } = state.tablePreview;
    outline.setAttribute("x", x);
    outline.setAttribute("y", y);
    outline.setAttribute("width", width);
    outline.setAttribute("height", height);
    grid.replaceChildren();
    for (let columnIndex = 0; columnIndex <= columns; columnIndex++) {
      const lineX = x + columnIndex * cellWidth;
      grid.append(svgElement("line", { x1: lineX, y1: y, x2: lineX, y2: y + height }));
    }
    for (let rowIndex = 0; rowIndex <= rows; rowIndex++) {
      const lineY = y + rowIndex * cellHeight;
      grid.append(svgElement("line", { x1: x, y1: lineY, x2: x + width, y2: lineY }));
    }
  } else if (state.currentStroke.tagName.toLowerCase() === "line") {
    state.currentStroke.setAttribute("x2", point.x);
    state.currentStroke.setAttribute("y2", point.y);
  } else if (state.currentStrokePath === "arrow") {
    const angle = Math.atan2(point.y - state.drawingStart.y, point.x - state.drawingStart.x);
    const headLength = 13 / state.scale;
    const leftX = point.x - Math.cos(angle - Math.PI / 6) * headLength;
    const leftY = point.y - Math.sin(angle - Math.PI / 6) * headLength;
    const rightX = point.x - Math.cos(angle + Math.PI / 6) * headLength;
    const rightY = point.y - Math.sin(angle + Math.PI / 6) * headLength;
    state.currentStroke.setAttribute("d", `M ${state.drawingStart.x} ${state.drawingStart.y} L ${point.x} ${point.y} M ${leftX} ${leftY} L ${point.x} ${point.y} L ${rightX} ${rightY}`);
  } else {
    state.currentStrokePath += ` L ${point.x} ${point.y}`;
    state.currentStroke.setAttribute("d", state.currentStrokePath);
  }
}

function insertTextAt(point) {
  const insertionSnapshot = captureSnapshot();
  const foreignObject = svgElement("foreignObject", {
    x: point.x, y: point.y, width: 190, height: 52,
    class: "canvas-editable-object"
  });
  const editor = document.createElementNS(XHTML_NS, "div");
  editor.className = "canvas-text-editor";
  editor.setAttribute("contenteditable", "true");
  editor.style.color = elements.brushColor.value;
  foreignObject.append(editor);
  elements.drawing.append(foreignObject);
  invalidateDrawingMarkup();
  state.pendingTextObject = foreignObject;
  state.pendingTextSnapshot = insertionSnapshot;
  updateEmptyState();
  requestAnimationFrame(() => {
    resizeCanvasTextEditor(editor);
    editor.focus();
  });
}

function resizeCanvasTextEditor(editor) {
  const textObject = editor?.closest?.(".canvas-editable-object");
  if (!textObject) return;
  const context = resizeCanvasTextEditor.context ||
    (resizeCanvasTextEditor.context = document.createElement("canvas").getContext("2d"));
  const style = getComputedStyle(editor);
  if (context) context.font = style.font;
  const text = editor.innerText || editor.textContent || "";
  const hasText = text.trim().length > 0;
  const longestLineWidth = context
    ? Math.max(0, ...text.split(/\r?\n/).map(line => context.measureText(line || " ").width))
    : text.length * 16;
  const canvasWidth = elements.svg.getBoundingClientRect().width / Math.max(state.scale, .25);
  const preferredMaximum = document.body.dataset.mobileStandalone === "true" ? 320 : 480;
  const maximumWidth = Math.max(190, Math.min(preferredMaximum, canvasWidth > 0 ? canvasWidth - 32 : preferredMaximum));
  const minimumWidth = hasText ? 28 : 190;
  const width = Math.max(minimumWidth, Math.min(maximumWidth, Math.ceil(longestLineWidth + 20)));
  const contentHeight = hasText
    ? Math.max(22, Math.ceil(editor.scrollHeight) + 2)
    : 52;
  textObject.setAttribute("width", width);
  textObject.setAttribute("height", contentHeight);
  invalidateDrawingMarkup();
  if (textObject === state.selectedTextObject) updateTextSelectionOverlay();
}

function ensureTextSelectionOverlay() {
  if (state.textSelectionOverlay?.isConnected) return state.textSelectionOverlay;
  const overlay = svgElement("g", { class: "canvas-text-selection-overlay" });
  overlay.append(
    svgElement("rect", { class: "canvas-text-selection-box" }),
    svgElement("circle", { class: "canvas-text-resize-handle-hit" }),
    svgElement("circle", { class: "canvas-text-resize-handle" })
  );
  elements.viewport.append(overlay);
  state.textSelectionOverlay = overlay;
  return overlay;
}

function updateTextSelectionOverlay() {
  const object = state.selectedTextObject;
  if (!object?.isConnected || state.mode !== "touch") {
    clearTextObjectSelection();
    return;
  }
  const overlay = ensureTextSelectionOverlay();
  const x = Number(object.getAttribute("x")) || 0;
  const y = Number(object.getAttribute("y")) || 0;
  const width = Number(object.getAttribute("width")) || 190;
  const height = Number(object.getAttribute("height")) || 52;
  const padding = 2 / Math.max(state.scale, .25);
  const handleRadius = 6 / Math.max(state.scale, .25);
  const hitRadius = 14 / Math.max(state.scale, .25);
  const handleX = x + width + padding;
  const handleY = y + height + padding;
  const box = overlay.querySelector(".canvas-text-selection-box");
  box.setAttribute("x", x - padding);
  box.setAttribute("y", y - padding);
  box.setAttribute("width", width + padding * 2);
  box.setAttribute("height", height + padding * 2);
  overlay.querySelector(".canvas-text-resize-handle-hit").setAttribute("cx", handleX);
  overlay.querySelector(".canvas-text-resize-handle-hit").setAttribute("cy", handleY);
  overlay.querySelector(".canvas-text-resize-handle-hit").setAttribute("r", hitRadius);
  overlay.querySelector(".canvas-text-resize-handle").setAttribute("cx", handleX);
  overlay.querySelector(".canvas-text-resize-handle").setAttribute("cy", handleY);
  overlay.querySelector(".canvas-text-resize-handle").setAttribute("r", handleRadius);
}

function selectTextObject(object) {
  const editor = object?.querySelector?.(".canvas-text-editor");
  if (!editor) return false;
  delete object.dataset.manualTextSize;
  resizeCanvasTextEditor(editor);
  state.selectedTextObject = object;
  updateTextSelectionOverlay();
  elements.selection.textContent = "已选中文本 · 拖动文本移动，拖动右下角圆点调整字号";
  return true;
}

function clearTextObjectSelection() {
  state.selectedTextObject = null;
  state.textSelectionOverlay?.remove();
  state.textSelectionOverlay = null;
  state.textResizeInteraction = null;
}

function beginTextResize(event) {
  const object = state.selectedTextObject;
  const editor = object?.querySelector?.(".canvas-text-editor");
  if (!object || !editor) return;
  event.preventDefault();
  event.stopPropagation();
  elements.canvasWrap.setPointerCapture(event.pointerId);
  const startPoint = toGraphPoint(event);
  const width = Number(object.getAttribute("width")) || 190;
  const height = Number(object.getAttribute("height")) || 52;
  state.textResizeInteraction = {
    pointerId: event.pointerId,
    object,
    editor,
    startPoint,
    originWidth: width,
    originHeight: height,
    originFontSize: editor.style.fontSize,
    computedFontSize: parseFloat(getComputedStyle(editor).fontSize) || 16,
    originDiagonal: Math.hypot(width, height),
    snapshot: captureSnapshot(),
    changed: false
  };
  elements.selection.textContent = "正在调整文本字号";
}

function updateTextResize(event) {
  const resize = state.textResizeInteraction;
  if (!resize || resize.pointerId !== event.pointerId) return false;
  event.preventDefault();
  const point = toGraphPoint(event);
  const width = Math.max(6, Math.min(800,
    resize.originWidth + point.x - resize.startPoint.x));
  const height = Math.max(6, Math.min(800,
    resize.originHeight + point.y - resize.startPoint.y));
  const factor = Math.hypot(width, height) / Math.max(resize.originDiagonal, 1);
  const fontSize = Math.max(5, Math.min(72, resize.computedFontSize * factor));
  resize.editor.style.fontSize = `${fontSize.toFixed(1)}px`;
  resizeCanvasTextEditor(resize.editor);
  resize.changed = resize.changed
    || Math.abs(fontSize - resize.computedFontSize) > .2
    || Math.abs(width - resize.originWidth) > .5
    || Math.abs(height - resize.originHeight) > .5;
  elements.selection.textContent = `文本字号 ${fontSize.toFixed(1)}px`;
  return true;
}

function finishTextResize(event) {
  const resize = state.textResizeInteraction;
  if (!resize || resize.pointerId !== event.pointerId) return false;
  state.textResizeInteraction = null;
  if (event.type !== "pointerup") {
    resize.editor.style.fontSize = resize.originFontSize;
    resize.object.setAttribute("width", resize.originWidth);
    resize.object.setAttribute("height", resize.originHeight);
    updateTextSelectionOverlay();
    return true;
  }
  if (resize.changed) {
    pushUndoSnapshot(resize.snapshot);
    invalidateDrawingMarkup();
    elements.selection.textContent = `已调整文本字号为 ${parseFloat(resize.editor.style.fontSize).toFixed(1)}px · 可撤销`;
  } else {
    resize.editor.style.fontSize = resize.originFontSize;
    resize.object.setAttribute("width", resize.originWidth);
    resize.object.setAttribute("height", resize.originHeight);
  }
  updateTextSelectionOverlay();
  return true;
}

function insertTableAt(region, historySnapshot = null) {
  finalizePendingTableInsertion();
  const cellWidth = clampInteger(elements.tableCellWidth.value, 40, 240, 80);
  const cellHeight = clampInteger(elements.tableCellHeight.value, 24, 160, 40);
  const fontSize = clampInteger(elements.tableFontSize.value, 8, 40, 12);
  const columns = Math.max(1, Math.round(Math.max(0, region.width) / cellWidth));
  const rows = Math.max(1, Math.round(Math.max(0, region.height) / cellHeight));
  const width = columns * cellWidth;
  const height = rows * cellHeight;
  const insertionSnapshot = historySnapshot || captureSnapshot();
  const foreignObject = svgElement("foreignObject", {
    x: region.x, y: region.y, width, height,
    class: "canvas-editable-object"
  });
  const table = document.createElementNS(XHTML_NS, "table");
  table.className = "canvas-table-editor";
  table.style.color = elements.brushColor.value;
  table.style.fontSize = `${fontSize}px`;
  const body = document.createElementNS(XHTML_NS, "tbody");
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const row = document.createElementNS(XHTML_NS, "tr");
    for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
      const cell = document.createElementNS(XHTML_NS, "td");
      cell.setAttribute("contenteditable", "true");
      row.append(cell);
    }
    body.append(row);
  }
  table.append(body);
  foreignObject.append(table);
  elements.drawing.append(foreignObject);
  invalidateDrawingMarkup();
  state.pendingTableObject = foreignObject;
  state.pendingTableSnapshot = insertionSnapshot;
  updateEmptyState();
  elements.selection.textContent = `已插入 ${rows} × ${columns} 表格（单元格 ${cellWidth}×${cellHeight}px · 字号 ${fontSize}px）`;
  requestAnimationFrame(() => table.querySelector("td")?.focus());
}

function finalizePendingTableInsertion(tableObject = state.pendingTableObject) {
  if (!tableObject || tableObject !== state.pendingTableObject) return false;
  const snapshot = state.pendingTableSnapshot;
  state.pendingTableObject = null;
  state.pendingTableSnapshot = null;
  if (state.contentEditSession?.target?.closest?.(".canvas-editable-object") === tableObject) {
    state.contentEditSession = null;
  }
  const hasContent = [...tableObject.querySelectorAll("td")]
    .some(cell => cell.textContent.trim().length > 0);
  if (!hasContent) {
    tableObject.remove();
    invalidateDrawingMarkup();
    updateEmptyState();
    elements.selection.textContent = "表格未输入内容，已取消插入";
    return false;
  }
  if (snapshot) pushUndoSnapshot(snapshot);
  invalidateDrawingMarkup();
  return true;
}

function tableCellPosition(cell) {
  return {
    row: Array.from(cell.parentElement.parentElement.children).indexOf(cell.parentElement),
    column: Array.from(cell.parentElement.children).indexOf(cell)
  };
}

function clearOtherTableSelections(table) {
  elements.drawing.querySelectorAll(".canvas-table-editor").forEach(otherTable => {
    if (otherTable !== table) {
      otherTable.querySelectorAll("td.cell-selected, td.cell-anchor")
        .forEach(candidate => candidate.classList.remove("cell-selected", "cell-anchor"));
    }
  });
}

function applyTableSelectionRange(drag, endCell) {
  const end = drag.cellEntries.find(entry => entry.cell === endCell);
  if (!end) return null;
  const minRow = Math.min(drag.start.row, end.row), maxRow = Math.max(drag.start.row, end.row);
  const minColumn = Math.min(drag.start.column, end.column), maxColumn = Math.max(drag.start.column, end.column);
  let topLeftCell = null;
  let selectedCount = 0;
  drag.cellEntries.forEach(entry => {
    const selected = entry.row >= minRow && entry.row <= maxRow &&
      entry.column >= minColumn && entry.column <= maxColumn;
    entry.cell.classList.toggle("cell-selected", selected);
    entry.cell.classList.remove("cell-anchor");
    if (selected) selectedCount++;
    if (entry.row === minRow && entry.column === minColumn) topLeftCell = entry.cell;
  });
  topLeftCell?.classList.add("cell-anchor");
  drag.endCell = endCell;
  drag.topLeftCell = topLeftCell;
  elements.selection.textContent = `正在框选 ${selectedCount} 个单元格`;
  return topLeftCell;
}

function activateTableSelectionDrag(pending) {
  if (state.tableSelectionPending !== pending) return;
  const cell = pending.cell;
  const table = cell.closest(".canvas-table-editor");
  if (!table) {
    state.tableSelectionPending = null;
    return;
  }
  clearOtherTableSelections(table);
  const cellEntries = [...table.querySelectorAll("td")].map(candidate => {
    const position = tableCellPosition(candidate);
    return { cell: candidate, ...position, rect: candidate.getBoundingClientRect() };
  });
  const startEntry = cellEntries.find(entry => entry.cell === cell);
  if (!startEntry) {
    state.tableSelectionPending = null;
    return;
  }
  state.tableSelectionPending = null;
  state.tableSelectionDrag = {
    table,
    cellEntries,
    start: startEntry,
    endCell: cell,
    topLeftCell: cell,
    startClientX: pending.clientX,
    startClientY: pending.clientY,
    moved: false
  };
  elements.canvasWrap.classList.add("table-selecting");
  applyTableSelectionRange(state.tableSelectionDrag, cell);
  elements.selection.textContent = "已进入表格框选，拖动以选择多个单元格";
}

function beginTableSelectionHold(event, cell) {
  const pending = {
    pointerId: event.pointerId,
    cell,
    tableObject: cell.closest(".canvas-editable-object"),
    clientX: event.clientX,
    clientY: event.clientY,
    timer: null
  };
  event.preventDefault();
  elements.canvasWrap.setPointerCapture(event.pointerId);
  pending.timer = setTimeout(() => activateTableSelectionDrag(pending), TABLE_SELECTION_HOLD_MS);
  state.tableSelectionPending = pending;
  elements.selection.textContent = "短按编辑，直接拖动表格，停留片刻后拖动可多选";
}

function startPendingTableObjectDrag(pending) {
  const canvasObject = pending.tableObject;
  if (!canvasObject) return;
  const rect = elements.svg.getBoundingClientRect();
  const point = {
    x: (pending.clientX - rect.left - state.offsetX) / state.scale,
    y: (pending.clientY - rect.top - state.offsetY) / state.scale
  };
  const objectX = Number(canvasObject.getAttribute("x")) || 0;
  const objectY = Number(canvasObject.getAttribute("y")) || 0;
  state.draggingCanvasObject = canvasObject;
  state.pendingCanvasObjectSnapshot = captureSnapshot();
  state.canvasObjectEditTarget = null;
  state.canvasObjectDragStarted = false;
  state.canvasObjectDragOrigin = {
    x: objectX,
    y: objectY,
    pointerOffsetX: point.x - objectX,
    pointerOffsetY: point.y - objectY
  };
  elements.selection.textContent = "正在拖动表格";
}

function updatePendingTableSelection(event) {
  const pending = state.tableSelectionPending;
  if (!pending || pending.pointerId !== event.pointerId) return false;
  const movement = Math.hypot(event.clientX - pending.clientX, event.clientY - pending.clientY);
  if (movement <= TABLE_SELECTION_MOVE_THRESHOLD) return true;
  clearTimeout(pending.timer);
  state.tableSelectionPending = null;
  startPendingTableObjectDrag(pending);
  return false;
}

function finishPendingTableSelection(event) {
  const pending = state.tableSelectionPending;
  if (!pending || (event && pending.pointerId !== event.pointerId)) return false;
  clearTimeout(pending.timer);
  state.tableSelectionPending = null;
  if (event?.type === "pointerup") {
    requestAnimationFrame(() => focusTableCell(pending.cell));
    elements.selection.textContent = "正在编辑当前单元格";
  }
  return true;
}

function findTableCellAtPoint(drag, clientX, clientY) {
  const directHit = drag.cellEntries.find(entry =>
    clientX >= entry.rect.left && clientX <= entry.rect.right &&
    clientY >= entry.rect.top && clientY <= entry.rect.bottom);
  if (directHit) return directHit.cell;
  const tableRect = drag.table.getBoundingClientRect();
  const clampedX = Math.max(tableRect.left, Math.min(tableRect.right, clientX));
  const clampedY = Math.max(tableRect.top, Math.min(tableRect.bottom, clientY));
  let nearest = null, nearestDistance = Infinity;
  drag.cellEntries.forEach(entry => {
    const centerX = (entry.rect.left + entry.rect.right) / 2;
    const centerY = (entry.rect.top + entry.rect.bottom) / 2;
    const distance = Math.hypot(clampedX - centerX, clampedY - centerY);
    if (distance < nearestDistance) { nearestDistance = distance; nearest = entry.cell; }
  });
  return nearest;
}

function updateTableSelectionDrag(event) {
  const drag = state.tableSelectionDrag;
  if (!drag || !(event.buttons & 1)) return;
  drag.moved = drag.moved || Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY) > 3;
  const cell = findTableCellAtPoint(drag, event.clientX, event.clientY);
  if (cell && cell !== drag.endCell) applyTableSelectionRange(drag, cell);
}

function focusTableCell(cell, selectAll = false) {
  if (!cell?.isConnected) return;
  cell.focus({ preventScroll: true });
  if (!selectAll) return;
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(cell);
  selection.removeAllRanges();
  selection.addRange(range);
}

function orderedSelectedTableCells(table) {
  return [...table.querySelectorAll("td.cell-selected")].sort((a, b) => {
    const first = tableCellPosition(a), second = tableCellPosition(b);
    return first.row - second.row || first.column - second.column;
  });
}

function restoreTableCellSelection(table, cells, anchorCell) {
  const selected = new Set(cells.filter(cell => cell?.isConnected && cell.closest(".canvas-table-editor") === table));
  table.querySelectorAll("td").forEach(cell => {
    cell.classList.toggle("cell-selected", selected.has(cell));
    cell.classList.toggle("cell-anchor", cell === anchorCell && selected.has(cell));
  });
}

function scheduleTableCellFocus(cell, selectAll = false) {
  requestAnimationFrame(() => {
    if (!cell?.isConnected) return;
    focusTableCell(cell, selectAll);
    if (!selectAll) return;
    // foreignObject 内的 contenteditable 在 pointerup/keydown 结束后偶尔会重置 Range，
    // 下一任务再次校准，但仅在焦点仍属于该单元格时执行，避免抢夺用户的新焦点。
    setTimeout(() => {
      if (document.activeElement === cell && cell.classList.contains("cell-anchor")) {
        focusTableCell(cell, true);
      }
    }, 0);
  });
}

function finishTableSelectionDrag(commitSelection = true) {
  const drag = state.tableSelectionDrag;
  if (!drag) return;
  state.tableSelectionDrag = null;
  elements.canvasWrap.classList.remove("table-selecting");
  if (!commitSelection) {
    drag.table.querySelectorAll("td.cell-selected, td.cell-anchor")
      .forEach(cell => cell.classList.remove("cell-selected", "cell-anchor"));
    return;
  }
  const selectedCells = orderedSelectedTableCells(drag.table);
  const count = selectedCells.length;
  const inputCell = selectedCells[0] || drag.topLeftCell || drag.start.cell;
  restoreTableCellSelection(drag.table, selectedCells, inputCell);
  scheduleTableCellFocus(inputCell, count > 1);
  elements.selection.textContent = drag.moved
    ? `已选择 ${count} 个单元格，输入位置为左上角`
    : "正在编辑当前单元格";
}

function fillSelectedTableCells() {
  const activeCell = document.activeElement?.closest?.(".canvas-table-editor td");
  if (!activeCell) return false;
  const table = activeCell.closest(".canvas-table-editor");
  const tableObject = table.closest(".canvas-editable-object");
  if (tableObject === state.pendingTableObject) finalizePendingTableInsertion(tableObject);
  const cells = orderedSelectedTableCells(table);
  if (cells.length < 2) {
    elements.selection.textContent = "请先多选至少两个单元格";
    return true;
  }
  commitContentEditSession(true);
  const rows = new Set(cells.map(cell => tableCellPosition(cell).row));
  const columns = new Set(cells.map(cell => tableCellPosition(cell).column));
  const isSingleLine = rows.size === 1 || columns.size === 1;
  // 输入和填充始终以几何位置上的左上角为准，不依赖可能滞后的 activeElement。
  const sourceCell = cells[0];
  const sourceText = sourceCell.textContent.trim();
  const numericValue = Number(sourceText);
  const fillStep = table.dataset.fillStep || "increment";
  const increment = isSingleLine && fillStep === "increment";
  if (increment && (sourceText === "" || !Number.isFinite(numericValue))) {
    showError("单行或单列首次递增填充时，请在焦点单元格输入数字");
    return true;
  }
  const snapshot = captureSnapshot();

  cells.forEach((cell, index) => {
    cell.textContent = increment ? String(numericValue + index) : sourceText;
  });
  // 修改 textContent 会销毁浏览器文字 Range；立即恢复单元格选区和唯一锚点。
  restoreTableCellSelection(table, cells, sourceCell);
  invalidateDrawingMarkup();
  pushUndoSnapshot(snapshot);
  if (isSingleLine) table.dataset.fillStep = increment ? "copy" : "increment";
  table.dataset.fillUndoReady = "true";
  elements.selection.textContent = increment
    ? `已递增填充 ${cells.length} 个单元格，选区已保留；再次按 Ctrl+Enter 将复制数据`
    : `已复制填充 ${cells.length} 个单元格，选区已保留${isSingleLine ? "；再次按 Ctrl+Enter 将递增数据" : ""}`;
  hideError();
  beginContentEditSession(sourceCell);
  scheduleTableCellFocus(sourceCell, true);
  return true;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function nextNodeId() {
  const ids = new Set((state.graph?.nodes ?? []).map(node => node.label));
  const numericIds = [...ids].filter(isIntegerToken).map(Number);
  const alphabeticIds = [...ids].filter(id => /^[A-Z]+$/.test(id));
  if (ids.size > 0 && alphabeticIds.length === ids.size) {
    let candidateIndex = Math.max(...alphabeticIds.map(alphabeticNodeIndex)) + 1;
    let candidate = alphabeticNodeId(candidateIndex);
    while (ids.has(candidate)) candidate = alphabeticNodeId(++candidateIndex);
    return candidate;
  }
  let candidate = numericIds.length ? Math.max(...numericIds) + 1 : 1;
  while (ids.has(String(candidate))) candidate++;
  return String(candidate);
}

function addNodeAt(point) {
  const autoTree = state.treeAutoArrange && isForestGraph(state.graph);
  const previousCenter = autoTree ? graphCenter(state.graph) : null;
  const existingNodes = [...(state.graph?.nodes ?? [])];
  pushUndoSnapshot();
  if (!state.graph) state.graph = { nodes: [], edges: [] };
  const label = nextNodeId();
  const id = `n${Date.now().toString(36)}_${label}`;
  state.graph.nodes.push({ id, label, x: point.x, y: point.y });
  if (autoTree && existingNodes.length) {
    const aboveNodes = existingNodes.filter(node => node.y < point.y);
    const candidates = aboveNodes.length ? aboveNodes : existingNodes;
    const parent = candidates.reduce((nearest, node) => {
      if (!nearest) return node;
      const nodeDistance = Math.hypot(node.x - point.x, node.y - point.y);
      const nearestDistance = Math.hypot(nearest.x - point.x, nearest.y - point.y);
      return nodeDistance < nearestDistance ? node : nearest;
    }, null);
    const parentDistance = Math.hypot(parent.x - point.x, parent.y - point.y);
    const referenceSpacing = Math.max(...existingNodes.map(node => nodeRadius(node.label)), 17)
      * 2 * GENERATED_EDGE_DIAMETER_MULTIPLIER * TREE_LAYOUT_SPACING_SCALE;
    if (parentDistance > referenceSpacing * NEW_TREE_DISTANCE_FACTOR) {
      commitGraphEdit(`点击位置距离现有树较远，已创建新树根节点 ${label}`);
      return;
    }
    const weightedTree = state.graph.edges.some(edge => edge.weight !== null && edge.weight !== undefined);
    const weight = weightedTree ? String(randomInteger(1, 10)) : null;
    state.graph.edges.push({ source: parent.id, target: id, weight });
    commitGraphEdit(
      weight === null
        ? `已创建节点 ${label}，并自动连接到父节点 ${parent.label}`
        : `已创建节点 ${label}，自动连接到父节点 ${parent.label} · 边权 ${weight}`,
      { treeCenter: previousCenter }
    );
    return;
  }
  commitGraphEdit(`已创建节点 ${label}`);
}

function selectNodeForEdge(nodeId) {
  if (!state.graph) return;
  if (state.edgeStart === null) {
    state.edgeStart = nodeId;
    document.querySelectorAll(".graph-node.selected").forEach(node => node.classList.remove("selected"));
    elements.nodes.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`)?.classList.add("selected");
    elements.selection.textContent = `已选择起点 ${nodeLabelOf(nodeId)}，请点击另一个节点`;
    return;
  }
  if (state.edgeStart === nodeId) {
    showError("请点击另一个节点完成连线");
    return;
  }

  const source = state.edgeStart;
  state.edgeStart = null;
  pushUndoSnapshot();
  const weightedGraph = state.graph.edges.some(edge => edge.weight !== null && edge.weight !== undefined);
  const weight = weightedGraph ? String(randomInteger(1, 10)) : null;
  state.graph.edges.push({ source, target: nodeId, weight });
  const parallelCount = state.graph.edges.filter(edge =>
    (edge.source === source && edge.target === nodeId) ||
    (edge.source === nodeId && edge.target === source)).length;
  commitGraphEdit(weight === null
    ? `已连接节点 ${nodeLabelOf(source)} 和 ${nodeLabelOf(nodeId)}${parallelCount > 1 ? ` · 当前共 ${parallelCount} 条重边` : ""}`
    : `已连接节点 ${nodeLabelOf(source)} 和 ${nodeLabelOf(nodeId)}，随机边权为 ${weight}${parallelCount > 1 ? ` · 当前共 ${parallelCount} 条重边` : ""}`);
}

function handleDrawNodeTap(nodeId) {
  const now = Date.now();
  const previous = state.lastDrawNodeTap;
  if (previous?.nodeId === nodeId && now - previous.time <= 380) {
    state.lastDrawNodeTap = null;
    openNodeIdEditor(nodeId);
    return;
  }
  state.lastDrawNodeTap = { nodeId, time: now };
  selectNodeForEdge(nodeId);
}

function beginDrawNodeHold(event, nodeElement) {
  const node = state.graph?.nodes.find(candidate => candidate.id === nodeElement.dataset.nodeId);
  if (!node) return;
  const startPoint = toGraphPoint(event);
  event.preventDefault();
  elements.canvasWrap.setPointerCapture(event.pointerId);
  const hold = {
    pointerId: event.pointerId,
    node,
    element: nodeElement,
    startClientX: event.clientX,
    startClientY: event.clientY,
    latestClientX: event.clientX,
    latestClientY: event.clientY,
    pointerOffsetX: startPoint.x - node.x,
    pointerOffsetY: startPoint.y - node.y,
    movedBeforeActivation: false,
    activated: false,
    timer: null
  };
  hold.timer = window.setTimeout(() => {
    if (state.drawNodeHold !== hold) return;
    hold.timer = null;
    hold.activated = true;
    state.lastDrawNodeTap = null;
    state.draggingNode = node;
    state.draggingNodeElement = nodeElement;
    state.pendingDragSnapshot = captureSnapshot();
    state.dragOrigin = { x: node.x, y: node.y };
    state.draggingNodeGroup = selectedNodeDragGroupFor(node);
    nodeElement.classList.add("long-press-moving");
    const point = toGraphPoint({ clientX: hold.latestClientX, clientY: hold.latestClientY });
    const nextX = point.x - hold.pointerOffsetX;
    const nextY = point.y - hold.pointerOffsetY;
    const deltaX = nextX - state.dragOrigin.x;
    const deltaY = nextY - state.dragOrigin.y;
    if (state.draggingNodeGroup?.length) {
      state.draggingNodeGroup.forEach(item => {
        item.node.x = item.originX + deltaX;
        item.node.y = item.originY + deltaY;
        item.element?.setAttribute("transform", `translate(${item.node.x} ${item.node.y})`);
      });
    } else {
      node.x = nextX;
      node.y = nextY;
      nodeElement.setAttribute("transform", `translate(${node.x} ${node.y})`);
    }
    updateAllEdges();
    elements.selection.textContent = state.draggingNodeGroup?.length
      ? `长按拖动：正在移动所选的 ${state.draggingNodeGroup.length} 个节点`
      : `长按拖动：正在移动节点 ${node.label}`;
  }, DRAW_NODE_HOLD_MS);
  state.drawNodeHold = hold;
  elements.selection.textContent = `短按节点 ${node.label} 连线，长按可移动`;
}

function updateDrawNodeHold(event) {
  const hold = state.drawNodeHold;
  if (!hold || hold.pointerId !== event.pointerId) return false;
  hold.latestClientX = event.clientX;
  hold.latestClientY = event.clientY;
  const movement = Math.hypot(event.clientX - hold.startClientX, event.clientY - hold.startClientY);
  const threshold = event.pointerType === "touch" ? 12 : event.pointerType === "pen" ? 8 : 4;
  if (!hold.activated) {
    hold.movedBeforeActivation ||= movement > threshold;
    return true;
  }
  event.preventDefault();
  const point = toGraphPoint(event);
  const nextX = point.x - hold.pointerOffsetX;
  const nextY = point.y - hold.pointerOffsetY;
  const deltaX = nextX - state.dragOrigin.x;
  const deltaY = nextY - state.dragOrigin.y;
  if (state.draggingNodeGroup?.length) {
    state.draggingNodeGroup.forEach(item => {
      item.node.x = item.originX + deltaX;
      item.node.y = item.originY + deltaY;
      item.element?.setAttribute("transform", `translate(${item.node.x} ${item.node.y})`);
    });
  } else {
    hold.node.x = nextX;
    hold.node.y = nextY;
    hold.element.setAttribute("transform", `translate(${hold.node.x} ${hold.node.y})`);
  }
  updateAllEdges();
  return true;
}

function finishDrawNodeHold(event) {
  const hold = state.drawNodeHold;
  if (!hold || hold.pointerId !== event.pointerId) return false;
  clearTimeout(hold.timer);
  hold.element.classList.remove("long-press-moving");
  state.drawNodeHold = null;
  if (hold.activated) {
    if (event.type !== "pointerup") {
      cancelPointerInteraction(true);
      return true;
    }
    return false;
  }
  if (event.type === "pointerup" && !hold.movedBeforeActivation) {
    handleDrawNodeTap(hold.node.id);
  } else {
    elements.selection.textContent = "绘制模式：短按节点连线，长按节点移动";
  }
  state.draggingNodeElement?.classList.remove("long-press-moving");
  return true;
}

function beginDrawCanvasInteraction(event) {
  state.lastDrawNodeTap = null;
  event.preventDefault();
  elements.canvasWrap.setPointerCapture(event.pointerId);
  state.drawCanvasPending = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPoint: toGraphPoint(event),
    startOffsetX: state.offsetX,
    startOffsetY: state.offsetY,
    pointerType: event.pointerType
  };
  elements.selection.textContent = "点击空白处创建节点，直接拖动可平移视图";
}

function updateDrawCanvasInteraction(event) {
  const pending = state.drawCanvasPending;
  if (!pending || pending.pointerId !== event.pointerId) return false;
  const movement = Math.hypot(event.clientX - pending.startClientX, event.clientY - pending.startClientY);
  const threshold = pending.pointerType === "touch" ? 10 : pending.pointerType === "pen" ? 7 : 4;
  if (movement <= threshold) return true;
  event.preventDefault();
  state.drawCanvasPending = null;
  state.panning = true;
  state.pointerStart = {
    x: pending.startClientX - pending.startOffsetX,
    y: pending.startClientY - pending.startOffsetY
  };
  state.offsetX = event.clientX - state.pointerStart.x;
  state.offsetY = event.clientY - state.pointerStart.y;
  elements.canvasWrap.classList.add("panning");
  updateTransform();
  elements.selection.textContent = "正在平移视图";
  return true;
}

function finishDrawCanvasInteraction(event) {
  const pending = state.drawCanvasPending;
  if (!pending || pending.pointerId !== event.pointerId) return false;
  state.drawCanvasPending = null;
  if (event.type === "pointerup") addNodeAt(pending.startPoint);
  return true;
}

function deleteNode(nodeId) {
  if (!state.graph) return;
  const deletedLabel = nodeLabelOf(nodeId);
  pushUndoSnapshot();
  state.boxSelectedNodeIds.delete(nodeId);
  if (state.mobileAnimatedSelectedNodeId === nodeId) state.mobileAnimatedSelectedNodeId = null;
  state.graph.nodes = state.graph.nodes.filter(node => node.id !== nodeId);
  state.graph.edges = state.graph.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
  commitGraphEdit(`已删除节点 ${deletedLabel}`);
}

function deleteEdge(edgeIndex) {
  if (!state.graph?.edges[edgeIndex]) return;
  pushUndoSnapshot();
  const edge = state.graph.edges[edgeIndex];
  state.graph.edges.splice(edgeIndex, 1);
  commitGraphEdit(`已删除连线 ${nodeLabelOf(edge.source)} — ${nodeLabelOf(edge.target)}`);
}

function deleteCanvasObject(canvasObject) {
  if (!canvasObject?.isConnected) return;
  if (canvasObject === state.selectedTextObject) clearTextObjectSelection();
  if (canvasObject === state.pendingTableObject) {
    state.pendingTableObject = null;
    state.pendingTableSnapshot = null;
  }
  const isTable = Boolean(canvasObject.querySelector("table"));
  pushUndoSnapshot();
  canvasObject.remove();
  invalidateDrawingMarkup();
  updateEmptyState();
  elements.selection.textContent = isTable ? "已删除表格" : "已删除文本";
}

function deleteCanvasStroke(stroke, snapshot = null) {
  if (!stroke?.isConnected) return;
  pushUndoSnapshot(snapshot || captureSnapshot());
  state.lassoSelectedStrokes = state.lassoSelectedStrokes.filter(candidate => candidate !== stroke);
  stroke.remove();
  invalidateDrawingMarkup();
  updateLassoSelectionOverlay();
  updateEmptyState();
  elements.selection.textContent = "已删除笔迹";
}

function openEdgeWeightEditor(edgeIndex) {
  const edge = state.graph?.edges[edgeIndex];
  if (!edge) return;
  state.edgeStart = null;
  state.editingEdgeIndex = edgeIndex;
  document.querySelectorAll(".graph-node.selected").forEach(node => node.classList.remove("selected"));
  elements.edgeWeightDescription.textContent = `${nodeLabelOf(edge.source)} — ${nodeLabelOf(edge.target)}`;
  elements.edgeWeightInput.value = edge.weight ?? "";
  if (!elements.edgeWeightDialog.open) elements.edgeWeightDialog.showModal();
  requestAnimationFrame(() => {
    elements.edgeWeightInput.focus();
    elements.edgeWeightInput.select();
  });
}

function saveEditedEdgeWeight(event) {
  event.preventDefault();
  const edgeIndex = state.editingEdgeIndex;
  const edge = state.graph?.edges[edgeIndex];
  if (!edge) {
    elements.edgeWeightDialog.close();
    return;
  }
  const weight = elements.edgeWeightInput.value.trim();
  if (/[\s,]/.test(weight)) {
    showError("边权不能包含空格或逗号");
    elements.edgeWeightInput.focus();
    return;
  }
  const nextWeight = weight || null;
  if (edge.weight === nextWeight) {
    elements.edgeWeightDialog.close();
    return;
  }
  pushUndoSnapshot();
  edge.weight = nextWeight;
  if (nextWeight !== null) elements.showWeights.checked = true;
  elements.edgeWeightDialog.close();
  commitGraphEdit(nextWeight === null
    ? `已清除边 ${nodeLabelOf(edge.source)} — ${nodeLabelOf(edge.target)} 的权重`
    : `已将边 ${nodeLabelOf(edge.source)} — ${nodeLabelOf(edge.target)} 的权重改为 ${nextWeight}`);
  saveSettings();
}

function openNodeIdEditor(nodeId) {
  const node = state.graph?.nodes.find(candidate => candidate.id === nodeId);
  if (!node) return;
  state.edgeStart = null;
  state.editingNodeId = nodeId;
  document.querySelectorAll(".graph-node.selected").forEach(element => element.classList.remove("selected"));
  elements.nodeIdDescription.textContent = `当前编号：${node.label}`;
  elements.nodeIdInput.value = node.label;
  elements.nodeIdInput.setCustomValidity("");
  hideError();
  if (elements.edgeWeightDialog.open) elements.edgeWeightDialog.close();
  if (!elements.nodeIdDialog.open) elements.nodeIdDialog.showModal();
  requestAnimationFrame(() => {
    elements.nodeIdInput.focus();
    elements.nodeIdInput.select();
  });
}

function alphabeticNodeId(index) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value--;
    label = String.fromCharCode(65 + value % 26) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function alphabeticNodeIndex(label) {
  return [...label].reduce((value, character) =>
    value * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function applyNodeIdMap(labelMap) {
  state.graph.nodes.forEach(node => {
    node.label = labelMap.get(node.label) ?? node.label;
  });
  const currentRoot = elements.rootInput.value.trim();
  if (labelMap.has(currentRoot)) elements.rootInput.value = labelMap.get(currentRoot);
}

function saveEditedNodeId(event) {
  event.preventDefault();
  const oldId = state.editingNodeId;
  const node = state.graph?.nodes.find(candidate => candidate.id === oldId);
  if (!node) {
    elements.nodeIdDialog.close();
    return;
  }
  const nodeLabel = node.label;
  const nextId = elements.nodeIdInput.value.trim();
  const renameAllToLetters = nodeLabel === "1" && nextId === "A";
  let validationMessage = "";
  if (!nextId) validationMessage = "节点编号不能为空";
  else if (/[\s,]/.test(nextId)) validationMessage = "节点编号不能包含空格或逗号";
  // 允许编号重复：节点编号相同是合法的，因此不再校验「编号已存在」。
  elements.nodeIdInput.setCustomValidity(validationMessage);
  if (validationMessage) {
    elements.nodeIdInput.reportValidity();
    elements.nodeIdInput.focus();
    elements.nodeIdInput.select();
    return;
  }
  if (nextId === nodeLabel) {
    elements.nodeIdDialog.close();
    return;
  }

  pushUndoSnapshot();
  let message;
  if (renameAllToLetters) {
    const orderedOthers = state.graph.nodes
      .filter(candidate => candidate !== node)
      .sort((first, second) => compareNodeIds(first.label, second.label));
    const labelMap = new Map([[nodeLabel, "A"]]);
    orderedOthers.forEach((candidate, index) => {
      labelMap.set(candidate.label, alphabeticNodeId(index + 1));
    });
    applyNodeIdMap(labelMap);
    message = `已将 ${state.graph.nodes.length} 个节点依次重编号为字母`;
  } else {
    applyNodeIdMap(new Map([[nodeLabel, nextId]]));
    message = `已将节点 ${nodeLabel} 的编号修改为 ${nextId}`;
  }
  state.edgeStart = null;
  elements.nodeIdDialog.close();
  commitGraphEdit(message);
  saveSettings();
}

function beginDeleteGesture(event, target) {
  finishDeleteGesture(false);
  if (target.nodeId) {
    const node = state.graph?.nodes.find(candidate => candidate.id === target.nodeId);
    if (node) {
      const point = toGraphPoint(event);
      target.pointerOffsetX = point.x - node.x;
      target.pointerOffsetY = point.y - node.y;
    }
  }
  state.deleteHoldStart = { x: event.clientX, y: event.clientY };
  state.deleteCurrentPoint = { ...state.deleteHoldStart };
  state.deleteGestureTarget = target;
  state.deleteGestureSnapshot = captureSnapshot();
  state.deleteGestureMoved = false;
  state.deletedStrokeCount = 0;
  elements.canvasWrap.setPointerCapture(event.pointerId);
  elements.selection.textContent = target.nodeId
    ? "短按删除节点，长按后可移动节点…"
    : "长按后拖动可批量删除笔迹…";
  state.deleteHoldTimer = window.setTimeout(() => {
    state.deleteHoldTimer = null;
    if (target.nodeId) {
      const node = state.graph?.nodes.find(candidate => candidate.id === target.nodeId);
      const nodeElement = elements.nodes.querySelector(`[data-node-id="${CSS.escape(target.nodeId)}"]`);
      if (!node || !nodeElement) return;
      state.deleteGestureMoved = true;
      state.draggingNode = node;
      state.draggingNodeElement = nodeElement;
      state.pendingDragSnapshot = state.deleteGestureSnapshot;
      state.dragOrigin = { x: node.x, y: node.y };
      target.nodeMoveActive = true;
      nodeElement.classList.add("long-press-moving");
      const current = state.deleteCurrentPoint || state.deleteHoldStart;
      const point = toGraphPoint({ clientX: current.x, clientY: current.y });
      node.x = point.x - (target.pointerOffsetX || 0);
      node.y = point.y - (target.pointerOffsetY || 0);
      nodeElement.setAttribute("transform", `translate(${point.x} ${point.y})`);
      updateAllEdges();
      elements.selection.textContent = `正在移动节点 ${nodeLabelOf(target.nodeId)}`;
      return;
    }
    state.deleteGestureActive = true;
    state.deleteSweepLast = { ...state.deleteHoldStart };
    elements.canvasWrap.classList.add("stroke-sweep-active");
    const current = state.deleteCurrentPoint || state.deleteHoldStart;
    eraseStrokesAlong(current.x, current.y);
    elements.selection.textContent = "笔迹清扫中：拖动经过笔画即可整笔删除";
  }, 420);
}

function eraseStrokesAlong(clientX, clientY) {
  const start = state.deleteSweepLast || { x: clientX, y: clientY };
  const distance = Math.hypot(clientX - start.x, clientY - start.y);
  const steps = Math.max(1, Math.ceil(distance / 8));
  const strokes = [...elements.drawing.querySelectorAll(".canvas-stroke")];
  for (let step = 1; step <= steps; step++) {
    const progress = step / steps;
    eraseStrokesAt(
      start.x + (clientX - start.x) * progress,
      start.y + (clientY - start.y) * progress,
      strokes
    );
  }
  state.deleteSweepLast = { x: clientX, y: clientY };
}

function eraseStrokesAt(clientX, clientY, strokes = null) {
  const point = toGraphPoint({ clientX, clientY });
  const tolerance = 14 / state.scale;
  const candidates = strokes || [...elements.drawing.querySelectorAll(".canvas-stroke")];
  const hits = candidates.filter(stroke => stroke.isConnected && distanceToStroke(stroke, point) <= tolerance);
  if (!hits.length) return;
  if (state.deletedStrokeCount === 0) pushUndoSnapshot(state.deleteGestureSnapshot);
  hits.forEach(stroke => stroke.remove());
  invalidateDrawingMarkup();
  state.deletedStrokeCount += hits.length;
  updateEmptyState();
  elements.selection.textContent = `已清扫 ${state.deletedStrokeCount} 条笔迹`;
}

function distanceToStroke(stroke, point) {
  try {
    const translation = strokeTranslation(stroke);
    if (stroke.tagName.toLowerCase() === "line") {
      return distanceToSegment(point, {
        x: Number(stroke.getAttribute("x1")) + translation.x,
        y: Number(stroke.getAttribute("y1")) + translation.y
      }, {
        x: Number(stroke.getAttribute("x2")) + translation.x,
        y: Number(stroke.getAttribute("y2")) + translation.y
      });
    }
    const totalLength = stroke.getTotalLength();
    const step = Math.max(3, 7 / state.scale);
    const startPoint = stroke.getPointAtLength(0);
    let previous = { x: startPoint.x + translation.x, y: startPoint.y + translation.y };
    let minimum = Math.hypot(point.x - previous.x, point.y - previous.y);
    for (let length = step; length <= totalLength + step; length += step) {
      const localPoint = stroke.getPointAtLength(Math.min(length, totalLength));
      const current = { x: localPoint.x + translation.x, y: localPoint.y + translation.y };
      minimum = Math.min(minimum, distanceToSegment(point, previous, current));
      previous = current;
    }
    return minimum;
  } catch (_) {
    return Infinity;
  }
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < .001) return Math.hypot(point.x - start.x, point.y - start.y);
  const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * projection), point.y - (start.y + dy * projection));
}

function finishDeleteGesture(allowShortClick) {
  clearTimeout(state.deleteHoldTimer);
  const wasActive = state.deleteGestureActive;
  const target = state.deleteGestureTarget;
  const moved = state.deleteGestureMoved;
  const deletedCount = state.deletedStrokeCount;
  const snapshot = state.deleteGestureSnapshot;
  elements.canvasWrap.classList.remove("stroke-sweep-active");
  state.deleteHoldTimer = null;
  state.deleteHoldStart = null;
  state.deleteCurrentPoint = null;
  state.deleteGestureActive = false;
  state.deleteGestureMoved = false;
  state.deleteGestureTarget = null;
  state.deleteGestureSnapshot = null;
  state.deletedStrokeCount = 0;
  state.deleteSweepLast = null;

  if (wasActive) {
    elements.selection.textContent = deletedCount ? `本次共删除 ${deletedCount} 条笔迹` : "清扫路径上没有笔迹";
    return;
  }
  if (!allowShortClick || moved || !target) return;
  if (target.stroke) deleteCanvasStroke(target.stroke, snapshot);
  else if (target.canvasObject) deleteCanvasObject(target.canvasObject);
  else if (target.nodeId) deleteNode(target.nodeId);
  else if (Number.isInteger(target.edgeIndex)) deleteEdge(target.edgeIndex);
}

function commitGraphEdit(message, options = {}) {
  state.treeLayout = null;
  state.edgeStart = null;
  updateDataInput();
  state.lastCommittedInput = elements.input.value;
  const autoArrangeTree = state.treeAutoArrange && isForestGraph(state.graph);
  if (state.treeAutoArrange && !autoArrangeTree) state.treeAutoArrange = false;
  if (autoArrangeTree) {
    if (isTreeGraph(state.graph)) organizeAsTree(false, options.treeCenter || null);
    else organizeTreeForest(false);
  }
  else renderGraph();
  const hasNodes = state.graph?.nodes.length > 0;
  updateEmptyState();
  if (!autoArrangeTree) {
    elements.status.textContent = hasNodes
      ? `${state.graph.nodes.length} 个节点 · ${state.graph.edges.length} 条边`
      : "等待输入数据";
  }
  elements.statusDot.classList.toggle("ready", hasNodes);
  updateGraphCount();
  elements.selection.textContent = autoArrangeTree ? `${message} · 已自动整理` : message;
  updateOrganizeToggleUI();
  hideError();
}

function updateDataInput() {
  if (!state.graph) {
    elements.input.value = "";
    return;
  }
  const nodeLines = state.graph.nodes
    .map(node => node.label)
    .sort(compareNodeIds);
  const edgeLines = state.graph.edges.map(edge =>
    [nodeLabelOf(edge.source), nodeLabelOf(edge.target), edge.weight].filter(value => value !== null && value !== undefined).join(" "));
  if (document.body.dataset.mobileStandalone === "true") {
    // 移动版保持原有逐节点、逐边格式。
    elements.input.value = [...nodeLines, ...edgeLines].join("\n");
    return;
  }
  const connectedNodeIds = new Set(state.graph.edges.flatMap(edge => [nodeLabelOf(edge.source), nodeLabelOf(edge.target)]));
  const isolatedNodeLines = nodeLines.filter(id => !connectedNodeIds.has(id));
  const header = `${state.graph.nodes.length} ${state.graph.edges.length}`;
  elements.input.value = [header, ...edgeLines, ...isolatedNodeLines].join("\n");
}

function nodeLabelOf(uid) {
  return state.graph?.nodes.find(node => node.id === uid)?.label ?? String(uid);
}

function compareNodeUids(a, b) {
  return compareNodeIds(nodeLabelOf(a), nodeLabelOf(b));
}

function compareNodeIds(a, b) {
  const aNumber = Number(a), bNumber = Number(b);
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return aNumber - bNumber;
  return String(a).localeCompare(String(b), "zh-CN", { numeric: true });
}

const TRIANGULAR_LATTICE_DIRECTIONS = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]
];

function latticeKey(q, r) { return `${q},${r}`; }

function latticePoint(q, r, edgeLength) {
  return {
    x: edgeLength * (q + r / 2),
    y: edgeLength * Math.sqrt(3) * r / 2
  };
}

function buildFixedLengthRandomGraph(count, type, treeKind) {
  const uniformNodeRadius = Math.max(...Array.from({ length: count }, (_, index) => naturalNodeRadius(index + 1)));
  // 在原有两个直径的基础上增加 30%，同时仍保持所有生成边严格等长。
  const generatedEdgeLength = uniformNodeRadius * 2 * GENERATED_EDGE_DIAMETER_MULTIPLIER;
  const placements = [];
  const occupied = new Map();
  const edges = [];
  const usedEdges = new Set();
  const childCounts = Array(count).fill(0);

  const place = (q, r) => {
    const point = latticePoint(q, r, generatedEdgeLength);
    const placement = { q, r, ...point };
    occupied.set(latticeKey(q, r), placements.length);
    placements.push(placement);
    return placements.length - 1;
  };
  const addEdge = (sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex) return false;
    const low = Math.min(sourceIndex, targetIndex), high = Math.max(sourceIndex, targetIndex);
    const key = `${low}-${high}`;
    if (usedEdges.has(key)) return false;
    usedEdges.add(key);
    edges.push({
      source: String(sourceIndex + 1),
      target: String(targetIndex + 1),
      weight: String(randomInteger(1, 10))
    });
    return true;
  };
  const findPlacement = maxChildren => {
    const candidates = [];
    placements.forEach((parent, parentIndex) => {
      if (childCounts[parentIndex] >= maxChildren) return;
      TRIANGULAR_LATTICE_DIRECTIONS.forEach(([dq, dr]) => {
        const q = parent.q + dq, r = parent.r + dr;
        if (occupied.has(latticeKey(q, r))) return;
        const point = latticePoint(q, r, generatedEdgeLength);
        candidates.push({
          parentIndex, q, r,
          score: Math.hypot(point.x, point.y) + Math.random() * generatedEdgeLength * .32
        });
      });
    });
    candidates.sort((a, b) => a.score - b.score);
    return candidates[randomInteger(0, Math.min(candidates.length, 8) - 1)];
  };

  place(0, 0);
  if (type === "graph") {
    // 前三个节点组成等边三角形，确保普通图一定有环。
    place(1, 0);
    place(0, 1);
    addEdge(0, 1);
    addEdge(1, 2);
    addEdge(2, 0);
    for (let index = 3; index < count; index++) {
      const candidate = findPlacement(5);
      const nodeIndex = place(candidate.q, candidate.r);
      addEdge(candidate.parentIndex, nodeIndex);
      childCounts[candidate.parentIndex]++;
    }
    // 额外边只连接相邻网格点，因此新增环也不会破坏固定边长。
    const adjacentPairs = [];
    placements.forEach((placement, sourceIndex) => {
      TRIANGULAR_LATTICE_DIRECTIONS.forEach(([dq, dr]) => {
        const targetIndex = occupied.get(latticeKey(placement.q + dq, placement.r + dr));
        if (targetIndex !== undefined && sourceIndex < targetIndex && !usedEdges.has(`${sourceIndex}-${targetIndex}`)) {
          adjacentPairs.push([sourceIndex, targetIndex]);
        }
      });
    });
    adjacentPairs.sort(() => Math.random() - .5);
    const desiredExtraEdges = Math.max(1, Math.floor(count * .4));
    adjacentPairs.slice(0, desiredExtraEdges).forEach(([source, target]) => addEdge(source, target));
  } else {
    const maxChildren = treeKind === "binary" ? 2 : 4;
    for (let index = 1; index < count; index++) {
      const candidate = findPlacement(maxChildren);
      const nodeIndex = place(candidate.q, candidate.r);
      addEdge(candidate.parentIndex, nodeIndex);
      childCounts[candidate.parentIndex]++;
    }
  }

  const nodes = placements.map((placement, index) => ({
    id: `n${Date.now().toString(36)}_${index + 1}`,
    label: String(index + 1),
    x: placement.x,
    y: placement.y,
    latticeQ: placement.q,
    latticeR: placement.r
  }));
  const idByIndex = new Map(nodes.map((node, index) => [String(index + 1), node.id]));
  edges.forEach(edge => {
    edge.source = idByIndex.get(edge.source);
    edge.target = idByIndex.get(edge.target);
  });
  return { nodes, edges, uniformNodeRadius, generatedEdgeLength };
}

function generateRandomGraph() {
  const count = Number(elements.randomNodeCount.value);
  const type = elements.randomType.value;
  const treeKind = type === "tree" ? state.nextTreeKind : null;
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    showError("节点数量应为 1 到 100 之间的整数");
    return;
  }
  if (type === "graph" && count < 3) {
    showError("生成带环图至少需要 3 个节点");
    return;
  }

  cancelPointerInteraction();
  pushUndoSnapshot();
  state.graph = buildFixedLengthRandomGraph(count, type, treeKind);
  state.treeLayout = null;
  state.edgeStart = null;
  state.treeAutoArrange = type === "tree";
  if (type === "tree") elements.rootInput.value = "1";

  const edgeLength = state.graph.generatedEdgeLength;
  const treeKindName = treeKind === "binary" ? "随机二叉树" : "随机多叉树";
  commitGraphEdit(type === "tree" ? `已生成带权${treeKindName}` : "已生成随机连通带环图");

  if (type === "tree") {
    fitGraph();
    elements.selection.textContent = `已生成并整理带权${treeKindName} · 参考边长 ${(edgeLength * TREE_LAYOUT_SPACING_SCALE).toFixed(1)} · 下次生成${treeKind === "multi" ? "随机二叉树" : "随机多叉树"}`;
    state.nextTreeKind = treeKind === "multi" ? "binary" : "multi";
    saveSettings();
  } else {
    fitGraph();
    elements.selection.textContent = `已生成随机连通带环图 · 固定边长 ${edgeLength.toFixed(1)}`;
  }
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toggleSidebar() {
  const collapsed = elements.appShell.classList.toggle("sidebar-collapsed");
  elements.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  elements.sidebarToggle.setAttribute("aria-label", collapsed ? "展开左侧栏" : "收起左侧栏");
  elements.sidebarToggle.setAttribute("title", collapsed ? "展开左侧栏" : "收起左侧栏");
  // 等宽度过渡完成后重新居中，避免图形停留在旧画布中心。
  clearTimeout(state.sidebarFitTimer);
  state.sidebarFitTimer = window.setTimeout(() => {
    state.sidebarFitTimer = null;
    if (state.graph?.nodes.length) fitGraph(1);
  }, 260);
  saveSettings();
}

function saveSettings() {
  if (state.restoringSettings) return;
  const isMobile = mobileStandalone();
  const settings = {
    sidebarCollapsed: elements.appShell.classList.contains("sidebar-collapsed"),
    mode: state.stylusPageDeleteActive ? state.stylusPageDeleteReturnMode : state.mode,
    directed: elements.directed.checked,
    showWeights: elements.showWeights.checked,
    rootId: elements.rootInput.value,
    randomNodeCount: elements.randomNodeCount.value,
    randomType: elements.randomType.value,
    canvasTool: elements.canvasTool.value,
    brushColor: elements.brushColor.value,
    toolColors: { ...state.toolColors },
    tableCellWidth: elements.tableCellWidth.value,
    tableCellHeight: elements.tableCellHeight.value,
    tableFontSize: elements.tableFontSize.value,
    nextTreeKind: state.nextTreeKind,
    treeAutoArrange: state.treeAutoArrange,
    mobilePenOnly: elements.mobilePenOnly?.checked !== false
  };
  try {
    localStorage.setItem(isMobile ? MOBILE_SETTINGS_KEY : DESKTOP_SETTINGS_KEY, JSON.stringify(settings));
  }
  catch (_) { /* 禁止本地存储时仍可正常使用 */ }
  if (isMobile) scheduleMobileWorkspaceSave();
}

function restoreSettings() {
  const compact = window.matchMedia("(max-width: 760px)").matches;
  const isMobile = mobileStandalone();
  const settings = readLocalJSON(isMobile ? MOBILE_SETTINGS_KEY : DESKTOP_SETTINGS_KEY);
  state.restoringSettings = true;
  if (isMobile && !settings) {
    elements.tableCellWidth.value = elements.tableCellWidth.min;
    elements.tableCellHeight.value = elements.tableCellHeight.min;
  }
  if (settings && typeof settings === "object") {
    elements.directed.checked = Boolean(settings.directed);
    elements.showWeights.checked = settings.showWeights !== false;
    if (typeof settings.rootId === "string") elements.rootInput.value = settings.rootId;
    if (settings.randomNodeCount !== undefined) elements.randomNodeCount.value = settings.randomNodeCount;
    if (["graph", "tree"].includes(settings.randomType)) elements.randomType.value = settings.randomType;
    if (["multi", "binary"].includes(settings.nextTreeKind)) state.nextTreeKind = settings.nextTreeKind;
    if (isMobile && elements.mobilePenOnly) elements.mobilePenOnly.checked = settings.mobilePenOnly !== false;
    if (["brush", "line", "arrow", "text", "table"].includes(settings.canvasTool)) elements.canvasTool.value = settings.canvasTool;
    if (settings.toolColors && typeof settings.toolColors === "object") {
      ["brush", "line", "arrow", "text"].forEach(tool => {
        if (/^#[0-9a-f]{6}$/i.test(settings.toolColors[tool] || "")) {
          state.toolColors[tool] = settings.toolColors[tool].toLowerCase();
        }
      });
    } else if (/^#[0-9a-f]{6}$/i.test(settings.brushColor || "")) {
      state.toolColors[activeToolColorKey()] = settings.brushColor.toLowerCase();
    }
    if (settings.tableCellWidth !== undefined) elements.tableCellWidth.value = settings.tableCellWidth;
    if (settings.tableCellHeight !== undefined) elements.tableCellHeight.value = settings.tableCellHeight;
    if (settings.tableFontSize !== undefined) elements.tableFontSize.value = settings.tableFontSize;
  }
  const collapsed = settings ? Boolean(settings.sidebarCollapsed) : compact;
  elements.appShell.classList.toggle("sidebar-collapsed", collapsed);
  elements.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  elements.sidebarToggle.setAttribute("aria-label", collapsed ? "展开左侧栏" : "收起左侧栏");
  elements.sidebarToggle.setAttribute("title", collapsed ? "展开左侧栏" : "收起左侧栏");
  const mode = settings && ["touch", "draw", "delete", "canvas", "lasso"].includes(settings.mode)
    ? settings.mode : "touch";
  let restoredWorkspace = false;
  if (isMobile) {
    const workspace = readLocalJSON(MOBILE_WORKSPACE_KEY);
    const validWorkspace = workspace && typeof workspace === "object"
      && typeof workspace.inputValue === "string"
      && typeof workspace.drawingMarkup === "string"
      && Number.isFinite(workspace.scale)
      && Number.isFinite(workspace.offsetX)
      && Number.isFinite(workspace.offsetY);
    if (validWorkspace) {
      restoreSnapshot(workspace, "已恢复上次移动版内容");
      restoredWorkspace = true;
    }
  }
  state.treeAutoArrange = Boolean(settings?.treeAutoArrange) && isForestGraph(state.graph);
  setMode(mode);
  state.restoringSettings = false;
  syncMobilePenOnlyUI(false);
  updateOrganizeToggleUI();
  if (restoredWorkspace) elements.selection.textContent = "已恢复上次移动版内容";
}

function applyTheme(theme, persist = true) {
  const normalizedTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = normalizedTheme;
  const nextThemeName = normalizedTheme === "dark" ? "浅色" : "深色";
  elements.themeToggle.setAttribute("aria-label", `切换为${nextThemeName}模式`);
  elements.themeToggle.setAttribute("title", `切换为${nextThemeName}模式`);
  if (persist) {
    try { localStorage.setItem(mobileStandalone() ? MOBILE_THEME_KEY : "graph-studio-theme", normalizedTheme); }
    catch (_) { /* 禁止本地存储时仍可切换主题 */ }
  }
}

function initialTheme() {
  try { return localStorage.getItem(mobileStandalone() ? MOBILE_THEME_KEY : "graph-studio-theme") || "dark"; }
  catch (_) { return "dark"; }
}

function toGraphPoint(event) {
  const rect = elements.svg.getBoundingClientRect();
  return { x: (event.clientX - rect.left - state.offsetX) / state.scale, y: (event.clientY - rect.top - state.offsetY) / state.scale };
}

function mobilePenOnlyEnabled() {
  return document.body.dataset.mobileStandalone === "true"
    && elements.mobilePenOnly?.checked;
}

function syncMobilePenOnlyUI(announce = false) {
  const enabled = mobilePenOnlyEnabled();
  elements.canvasWrap.classList.toggle("pen-only-input", enabled);
  if (!announce || document.body.dataset.mobileStandalone !== "true") return;
  elements.selection.textContent = enabled
    ? "已开启仅触控笔绘制 · 触控笔编辑，手指平移或双指缩放"
    : "已关闭仅触控笔绘制 · 手指恢复全部操作";
}

function isStylusPageDownKey(event) {
  return event.key === "PageDown" || event.code === "PageDown" || event.keyCode === 34;
}

function beginStylusPageDelete(event) {
  if (!mobileStandalone() || !isStylusPageDownKey(event)) return false;
  event.preventDefault();
  event.stopPropagation();
  if (state.stylusPageDeleteActive) return true;
  state.stylusPageDeleteActive = true;
  state.stylusPageDeleteReturnMode = state.mode;
  document.activeElement?.blur?.();
  setMode("delete");
  elements.selection.textContent = "触控笔向下翻页键按住 · 临时删除模式；松开返回原模式";
  return true;
}

function finishStylusPageDelete(event = null, announce = true) {
  if (event && (!mobileStandalone() || !isStylusPageDownKey(event))) return false;
  if (!state.stylusPageDeleteActive) return false;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const returnMode = state.stylusPageDeleteReturnMode;
  state.stylusPageDeleteActive = false;
  state.stylusPageDeleteReturnMode = "touch";
  setMode(["touch", "draw", "delete", "canvas", "lasso"].includes(returnMode) ? returnMode : "touch");
  if (announce) elements.selection.textContent = `已松开向下翻页键 · 返回${returnMode === "draw" ? "绘制" : returnMode === "canvas" ? "画布" : returnMode === "lasso" ? "圈选" : returnMode === "delete" ? "删除" : "触摸"}模式`;
  return true;
}

function resetMobileInputState(revert = true) {
  if (document.body.dataset.mobileStandalone !== "true") return;
  cancelPointerInteraction(revert);
  state.activeTouchPointers.clear();
  state.activePenPointerId = null;
  state.pinchGesture = null;
  elements.canvasWrap.classList.remove("pinching");
}

elements.canvasWrap.addEventListener("pointerdown", event => {
  if (event.pointerType === "touch") {
    state.activeTouchPointers.add(event.pointerId);
    if (state.activeTouchPointers.size > 1) {
      event.preventDefault();
      cancelPointerInteraction(true);
      return;
    }
  }
  if (event.pointerType === "pen" && mobilePenOnlyEnabled()) {
    if (state.panning || state.activeTouchPointers.size) cancelPointerInteraction(true);
    state.activePenPointerId = event.pointerId;
  }
  if (event.pointerType === "touch" && event.button === 0 && mobilePenOnlyEnabled()) {
    event.preventDefault();
    if (state.activePenPointerId !== null) return;
    elements.canvasWrap.setPointerCapture(event.pointerId);
    state.panning = true;
    state.panningPointerId = event.pointerId;
    state.pointerStart = {
      x: event.clientX - state.offsetX,
      y: event.clientY - state.offsetY
    };
    elements.canvasWrap.classList.add("panning");
    elements.selection.textContent = "仅触控笔绘制 · 手指正在平移视图";
    return;
  }
  const nodeElement = event.target.closest(".graph-node");
  const edgeElement = event.target.closest(".graph-edge, .graph-edge-hit");
  const canvasStroke = event.target.closest(".canvas-stroke");
  const canvasObject = event.target.closest(".canvas-editable-object");
  const tableCell = event.target.closest(".canvas-table-editor td");
  const textResizeHandle = event.target.closest(".canvas-text-resize-handle, .canvas-text-resize-handle-hit");
  const lassoSelectionHit = event.target.closest(".lasso-selection-hit");
  const lassoCopyHit = event.target.closest(".lasso-copy-hit, .lasso-copy-button, .lasso-copy-icon");

  // 右键在所有模式下都拥有最高优先级，只用于平移画布。
  if (event.button === 2) {
    event.preventDefault();
    elements.canvasWrap.setPointerCapture(event.pointerId);
    state.panning = true;
    state.pointerStart = { x: event.clientX - state.offsetX, y: event.clientY - state.offsetY };
    elements.canvasWrap.classList.add("panning");
    return;
  }
  // 除画布模式支持中键平移外，其余模式只响应左键，避免中键误建点或误拖对象。
  if (event.button !== 0 && state.mode !== "canvas") return;
  if (state.mode === "lasso") {
    if (event.button !== 0) return;
    if (lassoCopyHit) {
      event.preventDefault();
      event.stopPropagation();
      duplicateLassoSelection();
    } else if (lassoSelectionHit) beginLassoMove(event);
    else beginLasso(event);
    return;
  }
  if (event.button === 0 && state.mode === "touch" && textResizeHandle) {
    beginTextResize(event);
    return;
  }
  if (event.button === 0 && tableCell && !event.altKey && ["touch", "canvas"].includes(state.mode)) {
    if (state.mode === "touch") clearTextObjectSelection();
    beginTableSelectionHold(event, tableCell);
    return;
  }
  if (state.mode === "draw") {
    if (nodeElement) beginDrawNodeHold(event, nodeElement);
    else if (edgeElement) openEdgeWeightEditor(Number(edgeElement.dataset.edge));
    else if (canvasObject) event.preventDefault();
    else beginDrawCanvasInteraction(event);
    return;
  }
  if (state.mode === "delete") {
    if (event.button === 0) {
      event.preventDefault();
      beginDeleteGesture(event, {
        stroke: canvasStroke,
        canvasObject,
        nodeId: nodeElement?.dataset.nodeId ?? null,
        edgeIndex: edgeElement ? Number(edgeElement.dataset.edge) : null
      });
    }
    return;
  }
  if (state.mode === "canvas") {
    if (event.target.closest('[contenteditable="true"]')) return;
    event.preventDefault();
    elements.canvasWrap.setPointerCapture(event.pointerId);
    if (event.button !== 0 || event.shiftKey || event.altKey) {
      state.panning = true;
      state.pointerStart = { x: event.clientX - state.offsetX, y: event.clientY - state.offsetY };
      elements.canvasWrap.classList.add("panning");
    } else {
      beginCanvasAction(event, event.ctrlKey || event.metaKey ? "arrow" : null);
    }
    return;
  }

  if (document.body.dataset.mobileStandalone === "true" && state.mode === "touch"
    && event.button === 0 && nodeElement) {
    clearTextObjectSelection();
    event.preventDefault();
    elements.canvasWrap.setPointerCapture(event.pointerId);
    const node = state.graph?.nodes.find(item => item.id === nodeElement.dataset.nodeId);
    if (!node) return;
    state.mobileNodeSelectionPending = {
      pointerId: event.pointerId,
      node,
      element: nodeElement,
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x,
      originY: node.y,
      pointerType: event.pointerType
    };
    return;
  }

  if (state.mode === "touch" && event.button === 0 && edgeElement && !nodeElement) {
    clearTextObjectSelection();
    event.preventDefault();
    elements.canvasWrap.setPointerCapture(event.pointerId);
    state.edgeSelectionPending = {
      pointerId: event.pointerId,
      edgeIndex: Number(edgeElement.dataset.edge),
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: state.offsetX,
      startOffsetY: state.offsetY,
      pointerType: event.pointerType
    };
    return;
  }

  if (state.mode === "touch" && event.button === 0 && nodeElement && (event.ctrlKey || event.metaKey)) {
    clearTextObjectSelection();
    event.preventDefault();
    elements.canvasWrap.setPointerCapture(event.pointerId);
    document.querySelectorAll(".graph-node.selected").forEach(element => element.classList.remove("selected"));
    state.selectedNode = null;
    toggleNodeBoxSelection(nodeElement.dataset.nodeId);
    return;
  }

  elements.canvasWrap.setPointerCapture(event.pointerId);
  if (canvasObject) {
    if (state.mode === "touch") {
      if (!selectTextObject(canvasObject)) clearTextObjectSelection();
    }
    if (!tableCell) event.preventDefault();
    state.draggingCanvasObject = canvasObject;
    state.pendingCanvasObjectSnapshot = captureSnapshot();
    state.canvasObjectEditTarget = tableCell;
    state.canvasObjectDragStarted = false;
    const point = toGraphPoint(event);
    const objectX = Number(canvasObject.getAttribute("x")) || 0;
    const objectY = Number(canvasObject.getAttribute("y")) || 0;
    state.canvasObjectDragOrigin = {
      x: objectX,
      y: objectY,
      pointerOffsetX: point.x - objectX,
      pointerOffsetY: point.y - objectY
    };
    elements.selection.textContent = tableCell
      ? "单击编辑单元格，拖动可移动整个表格"
      : canvasObject.querySelector("table") ? "正在拖动表格" : "正在拖动文本";
  } else if (nodeElement) {
    clearTextObjectSelection();
    const nodeId = nodeElement.dataset.nodeId;
    if (state.mode === "touch") {
      const now = Date.now();
      const previous = state.lastTouchNodeTap;
      if (previous?.nodeId === nodeId && now - previous.time <= 500) {
        state.lastTouchNodeTap = null;
        selectComponentOfNode(nodeId);
        return;
      }
      state.lastTouchNodeTap = { nodeId, time: now };
    }
    state.draggingNode = state.graph.nodes.find(n => n.id === nodeId);
    state.draggingNodeElement = nodeElement;
    state.pendingDragSnapshot = captureSnapshot();
    state.dragOrigin = { x: state.draggingNode.x, y: state.draggingNode.y };
    state.draggingNodeGroup = selectedNodeDragGroupFor(state.draggingNode);
    document.querySelectorAll(".graph-node.selected").forEach(el => el.classList.remove("selected"));
    nodeElement.classList.add("selected");
    state.selectedNode = state.draggingNode.id;
    elements.selection.textContent = `已选择节点 ${nodeLabelOf(state.selectedNode)}`;
  } else {
    clearTextObjectSelection();
    beginCanvasSelectionHold(event);
  }
});

elements.canvasWrap.addEventListener("pointermove", event => {
  if (state.pinchGesture) return;
  if (event.pointerType === "touch" && mobilePenOnlyEnabled() && state.activePenPointerId !== null) {
    if (event.cancelable) event.preventDefault();
    return;
  }
  if (state.panning && state.panningPointerId !== null
    && event.pointerId !== state.panningPointerId) return;
  if (state.lassoMoveInteraction) {
    updateLassoMove(event);
  } else if (state.lassoPoints) {
    updateLasso(event);
  } else if (state.textResizeInteraction) {
    updateTextResize(event);
  } else if (state.mobileNodeSelectionPending) {
    const pending = state.mobileNodeSelectionPending;
    const movement = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
    const threshold = pending.pointerType === "touch" ? 11 : pending.pointerType === "pen" ? 8 : 4;
    if (movement > threshold) {
      state.mobileNodeSelectionPending = null;
      state.draggingNode = pending.node;
      state.draggingNodeElement = pending.element;
      state.pendingDragSnapshot = captureSnapshot();
      state.dragOrigin = { x: pending.originX, y: pending.originY };
      state.draggingNodeGroup = selectedNodeDragGroupFor(pending.node);
      const point = toGraphPoint(event);
      const deltaX = point.x - state.dragOrigin.x;
      const deltaY = point.y - state.dragOrigin.y;
      if (state.draggingNodeGroup?.length) {
        state.draggingNodeGroup.forEach(item => {
          item.node.x = item.originX + deltaX;
          item.node.y = item.originY + deltaY;
          item.element?.setAttribute("transform", `translate(${item.node.x} ${item.node.y})`);
        });
      } else {
        state.draggingNode.x = point.x;
        state.draggingNode.y = point.y;
        state.draggingNodeElement.setAttribute("transform", `translate(${point.x} ${point.y})`);
      }
      updateAllEdges();
      elements.selection.textContent = state.draggingNodeGroup?.length
        ? `正在移动所选的 ${state.draggingNodeGroup.length} 个节点`
        : `正在移动节点 ${state.draggingNode.label}`;
    }
  } else if (state.edgeSelectionPending) {
    const pending = state.edgeSelectionPending;
    const movement = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
    const threshold = pending.pointerType === "touch" ? 10 : pending.pointerType === "pen" ? 7 : 4;
    if (movement > threshold) {
      state.edgeSelectionPending = null;
      state.panning = true;
      state.pointerStart = {
        x: pending.startX - pending.startOffsetX,
        y: pending.startY - pending.startOffsetY
      };
      state.offsetX = event.clientX - state.pointerStart.x;
      state.offsetY = event.clientY - state.pointerStart.y;
      elements.canvasWrap.classList.add("panning");
      updateTransform();
    }
  } else if (state.drawNodeHold) {
    updateDrawNodeHold(event);
  } else if (state.drawCanvasPending) {
    updateDrawCanvasInteraction(event);
  } else if (state.canvasSelectionPending || state.canvasSelectionDrag) {
    updateCanvasSelectionInteraction(event);
  } else if (state.tableSelectionPending) {
    const stillWaiting = updatePendingTableSelection(event);
    if (!stillWaiting && state.draggingCanvasObject && state.canvasObjectDragOrigin) {
      const point = toGraphPoint(event);
      const nextX = point.x - state.canvasObjectDragOrigin.pointerOffsetX;
      const nextY = point.y - state.canvasObjectDragOrigin.pointerOffsetY;
      state.canvasObjectDragStarted = true;
      state.draggingCanvasObject.classList.add("dragging");
      state.draggingCanvasObject.setAttribute("x", nextX);
      state.draggingCanvasObject.setAttribute("y", nextY);
      if (state.draggingCanvasObject === state.selectedTextObject) updateTextSelectionOverlay();
    }
  } else if (state.tableSelectionDrag) {
    updateTableSelectionDrag(event);
  } else if ((state.deleteHoldTimer || state.deleteGestureActive) && state.deleteHoldStart) {
    state.deleteCurrentPoint = { x: event.clientX, y: event.clientY };
    const movement = Math.hypot(event.clientX - state.deleteHoldStart.x, event.clientY - state.deleteHoldStart.y);
    const deleteMoveThreshold = event.pointerType === "touch"
      ? 12
      : event.pointerType === "pen" ? 9 : 2;
    if (state.deleteGestureActive) {
      state.deleteGestureMoved = state.deleteGestureMoved || movement > deleteMoveThreshold;
      eraseStrokesAlong(event.clientX, event.clientY);
    } else if (movement > deleteMoveThreshold) {
      state.deleteGestureMoved = true;
      elements.selection.textContent = "继续按住，进入清扫后将删除经过的整条笔迹";
    }
  } else if (state.painting) {
    continueCanvasAction(event);
  } else if (state.draggingNode) {
    const point = toGraphPoint(event);
    const deleteMoveTarget = state.deleteGestureTarget?.nodeMoveActive
      ? state.deleteGestureTarget
      : null;
    const nextX = point.x - (deleteMoveTarget?.pointerOffsetX || 0);
    const nextY = point.y - (deleteMoveTarget?.pointerOffsetY || 0);
    const deltaX = nextX - state.dragOrigin.x;
    const deltaY = nextY - state.dragOrigin.y;
    if (state.draggingNodeGroup?.length) {
      state.draggingNodeGroup.forEach(item => {
        item.node.x = item.originX + deltaX;
        item.node.y = item.originY + deltaY;
        item.element?.setAttribute("transform", `translate(${item.node.x} ${item.node.y})`);
      });
      elements.selection.textContent = `正在移动所选的 ${state.draggingNodeGroup.length} 个节点`;
    } else {
      state.draggingNode.x = nextX;
      state.draggingNode.y = nextY;
      state.draggingNodeElement?.setAttribute("transform", `translate(${state.draggingNode.x} ${state.draggingNode.y})`);
    }
    updateAllEdges();
  } else if (state.draggingCanvasObject && state.canvasObjectDragOrigin) {
    const point = toGraphPoint(event);
    const nextX = point.x - state.canvasObjectDragOrigin.pointerOffsetX;
    const nextY = point.y - state.canvasObjectDragOrigin.pointerOffsetY;
    const movement = Math.hypot(nextX - state.canvasObjectDragOrigin.x, nextY - state.canvasObjectDragOrigin.y);
    if (state.canvasObjectDragStarted || movement > 3 / state.scale) {
      event.preventDefault();
      state.canvasObjectDragStarted = true;
      state.canvasObjectEditTarget?.blur();
      state.draggingCanvasObject.classList.add("dragging");
      state.draggingCanvasObject.setAttribute("x", nextX);
      state.draggingCanvasObject.setAttribute("y", nextY);
      if (state.draggingCanvasObject === state.selectedTextObject) updateTextSelectionOverlay();
    }
  } else if (state.panning) {
    state.offsetX = event.clientX - state.pointerStart.x;
    state.offsetY = event.clientY - state.pointerStart.y;
    updateTransform();
  }
});

function endPointer(event) {
  if (event?.pointerType === "pen" && state.activePenPointerId === event.pointerId) {
    state.activePenPointerId = null;
  }
  if (event?.pointerType === "touch") {
    const multiTouch = Boolean(state.pinchGesture) || state.activeTouchPointers.size > 1;
    state.activeTouchPointers.delete(event.pointerId);
    if (multiTouch) return;
  }
  if (state.lassoMoveInteraction && finishLassoMove(event)) return;
  if (state.lassoPoints && finishLasso(event)) return;
  if (state.textResizeInteraction && finishTextResize(event)) return;
  if (state.mobileNodeSelectionPending) {
    const pending = state.mobileNodeSelectionPending;
    state.mobileNodeSelectionPending = null;
    if (event?.type === "pointerup" && event.pointerId === pending.pointerId) {
      document.querySelectorAll(".graph-node.selected").forEach(element => element.classList.remove("selected"));
      state.selectedNode = null;
      const now = Date.now();
      const previous = state.lastTouchNodeTap;
      if (previous?.nodeId === pending.node.id && now - previous.time <= 500) {
        state.lastTouchNodeTap = null;
        selectComponentOfNode(pending.node.id);
      } else {
        state.lastTouchNodeTap = { nodeId: pending.node.id, time: now };
        toggleNodeBoxSelection(pending.node.id);
      }
    }
    return;
  }
  if (state.edgeSelectionPending) {
    const pending = state.edgeSelectionPending;
    state.edgeSelectionPending = null;
    if (event?.type === "pointerup" && event.pointerId === pending.pointerId) {
      toggleEdgeSelection(pending.edgeIndex);
    }
    return;
  }
  if (state.drawNodeHold) {
    const consumed = finishDrawNodeHold(event);
    if (consumed) return;
  }
  if (state.drawCanvasPending && finishDrawCanvasInteraction(event)) return;
  if ((state.canvasSelectionPending || state.canvasSelectionDrag) && finishCanvasSelectionInteraction(event)) return;
  if (state.tableSelectionPending && finishPendingTableSelection(event)) return;
  if (state.tableSelectionDrag) finishTableSelectionDrag(event?.type === "pointerup");
  if (state.deleteHoldTimer || state.deleteGestureActive || state.deleteGestureTarget) {
    finishDeleteGesture(event?.type === "pointerup");
  }
  if (state.painting && state.pendingBrushSnapshot) {
    if (state.drawingMoved) {
      if (state.currentStrokePath === "table") {
        const outline = state.tablePreview.outline;
        const region = {
          x: Number(outline.getAttribute("x")),
          y: Number(outline.getAttribute("y")),
          width: Number(outline.getAttribute("width")),
          height: Number(outline.getAttribute("height"))
        };
        state.currentStroke.remove();
        insertTableAt(region, state.pendingBrushSnapshot);
      } else {
        pushUndoSnapshot(state.pendingBrushSnapshot);
      }
    } else {
      state.currentStroke?.remove();
    }
  }
  if (state.draggingNode && state.pendingDragSnapshot && state.dragOrigin) {
    const moved = Math.hypot(state.draggingNode.x - state.dragOrigin.x, state.draggingNode.y - state.dragOrigin.y) > .5;
    if (moved) {
      const movedNodeCount = state.draggingNodeGroup?.length || 1;
      const previousCenter = state.pendingDragSnapshot.graph
        ? graphCenter(state.pendingDragSnapshot.graph)
        : null;
      pushUndoSnapshot(state.pendingDragSnapshot);
      if (state.treeAutoArrange && isForestGraph(state.graph)) {
        if (isTreeGraph(state.graph)) organizeAsTree(false, previousCenter);
        else organizeTreeForest(false);
        elements.selection.textContent = movedNodeCount > 1
          ? `已同时移动 ${movedNodeCount} 个所选节点 · 已恢复自动整理`
          : `已移动节点 ${state.draggingNode.label} · 已恢复自动整理`;
      } else {
        elements.selection.textContent = movedNodeCount > 1
          ? `已同时移动 ${movedNodeCount} 个所选节点`
          : `已移动节点 ${state.draggingNode.label}`;
      }
    }
  }
  if (state.draggingCanvasObject && state.pendingCanvasObjectSnapshot && state.canvasObjectDragOrigin) {
    const finalX = Number(state.draggingCanvasObject.getAttribute("x")) || 0;
    const finalY = Number(state.draggingCanvasObject.getAttribute("y")) || 0;
    const moved = Math.hypot(finalX - state.canvasObjectDragOrigin.x, finalY - state.canvasObjectDragOrigin.y) > .5;
    state.draggingCanvasObject.classList.remove("dragging");
    if (moved) {
      pushUndoSnapshot(state.pendingCanvasObjectSnapshot);
      invalidateDrawingMarkup();
      elements.selection.textContent = state.draggingCanvasObject.querySelector("table") ? "已移动表格" : "已移动文本";
    } else if (state.canvasObjectEditTarget) {
      const editTarget = state.canvasObjectEditTarget;
      requestAnimationFrame(() => editTarget.isConnected && editTarget.focus());
      elements.selection.textContent = "正在编辑表格单元格";
    }
  }
  state.draggingNodeElement?.classList.remove("long-press-moving");
  state.draggingNode = null; state.draggingNodeElement = null; state.draggingNodeGroup = null; state.panning = false; state.panningPointerId = null; state.pointerStart = null;
  state.draggingCanvasObject = null; state.canvasObjectDragOrigin = null; state.pendingCanvasObjectSnapshot = null;
  state.canvasObjectEditTarget = null; state.canvasObjectDragStarted = false;
  state.painting = false; state.currentStroke = null; state.currentStrokePath = "";
  state.drawingStart = null; state.drawingMoved = false;
  state.tablePreview = null;
  state.pendingBrushSnapshot = null; state.pendingDragSnapshot = null; state.dragOrigin = null;
  elements.canvasWrap.classList.remove("panning");
}
elements.canvasWrap.addEventListener("pointerup", endPointer);
elements.canvasWrap.addEventListener("pointercancel", endPointer);
elements.canvasWrap.addEventListener("wheel", event => {
  event.preventDefault();
  zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX, event.clientY);
}, { passive: false });
elements.canvasWrap.addEventListener("contextmenu", event => {
  event.preventDefault();
});
elements.canvasWrap.addEventListener("dblclick", event => {
  if (state.mode !== "draw" || event.button !== 0) return;
  if (mobilePenOnlyEnabled()
    && (event.pointerType === "touch" || event.sourceCapabilities?.firesTouchEvents)) return;
  const nodeElement = event.target.closest(".graph-node");
  if (!nodeElement) return;
  event.preventDefault();
  event.stopPropagation();
  openNodeIdEditor(nodeElement.dataset.nodeId);
});

// 平板浏览器可能在 Pointer Events 之外继续识别下拉刷新、页面平移和缩放手势。
// 画布区域统一接管单指触摸；可编辑文字仍允许系统文字选择操作。
function preventNativeCanvasTouch(event) {
  const editable = event.target instanceof Element &&
    event.target.closest('input, textarea, select, [contenteditable="true"]');
  if ((mobilePenOnlyEnabled() || !editable) && event.cancelable) event.preventDefault();
}

function touchPairMetrics(touches) {
  if (touches.length < 2) return null;
  const first = touches[0], second = touches[1];
  return {
    distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
    centerX: (first.clientX + second.clientX) / 2,
    centerY: (first.clientY + second.clientY) / 2
  };
}

function beginPinchZoom(event) {
  const metrics = touchPairMetrics(event.touches);
  if (!metrics || metrics.distance < 4) return;
  cancelPointerInteraction(true);
  const rect = elements.svg.getBoundingClientRect();
  state.pinchGesture = {
    startDistance: metrics.distance,
    startScale: state.scale,
    graphX: (metrics.centerX - rect.left - state.offsetX) / state.scale,
    graphY: (metrics.centerY - rect.top - state.offsetY) / state.scale
  };
  elements.canvasWrap.classList.add("pinching");
  elements.selection.textContent = "双指缩放画布";
}

function updatePinchZoom(event) {
  const pinch = state.pinchGesture;
  const metrics = touchPairMetrics(event.touches);
  if (!pinch || !metrics) return;
  const rect = elements.svg.getBoundingClientRect();
  const nextScale = Math.max(.25, Math.min(3,
    pinch.startScale * metrics.distance / pinch.startDistance));
  state.scale = nextScale;
  state.offsetX = metrics.centerX - rect.left - pinch.graphX * nextScale;
  state.offsetY = metrics.centerY - rect.top - pinch.graphY * nextScale;
  updateTransform();
}

function finishPinchZoom(event) {
  if (event.touches?.length >= 2) return;
  if (state.pinchGesture) elements.selection.textContent = `画布缩放至 ${Math.round(state.scale * 100)}%`;
  state.pinchGesture = null;
  elements.canvasWrap.classList.remove("pinching");
}

elements.canvasWrap.addEventListener("touchstart", event => {
  if (event.touches.length >= 2) {
    if (event.cancelable) event.preventDefault();
    beginPinchZoom(event);
    return;
  }
  preventNativeCanvasTouch(event);
}, { passive: false });
elements.canvasWrap.addEventListener("touchmove", event => {
  if (event.cancelable) event.preventDefault();
  if (event.touches.length >= 2) {
    if (!state.pinchGesture) beginPinchZoom(event);
    updatePinchZoom(event);
  }
}, { passive: false });
elements.canvasWrap.addEventListener("touchend", finishPinchZoom, { passive: false });
elements.canvasWrap.addEventListener("touchcancel", finishPinchZoom, { passive: false });
elements.canvasWrap.addEventListener("gesturestart", event => {
  if (event.cancelable) event.preventDefault();
}, { passive: false });
elements.canvasWrap.addEventListener("gesturechange", event => {
  if (event.cancelable) event.preventDefault();
}, { passive: false });

elements.input.addEventListener("input", scheduleAutoDraw);
elements.sidebarToggle.addEventListener("click", toggleSidebar);
document.querySelector(".collapsed-shortcuts").addEventListener("click", event => {
  const button = event.target.closest("[data-quick-action]");
  if (!button) return;
  const action = button.dataset.quickAction;
  if (action === "mode") setMode(button.dataset.value);
  else if (action === "tool") {
    elements.canvasTool.value = button.dataset.value;
    setMode("canvas");
    updateCanvasToolUI();
  } else if (action === "organize") organizeLayout();
  else if (action === "escape") {
    if (!elements.edgeWeightDialog.open && !elements.nodeIdDialog.open
      && cancelMobileNodeSelection()) return;
    if (elements.edgeWeightDialog.open) elements.edgeWeightDialog.close();
    document.activeElement?.blur?.();
    setMode("touch");
  } else if (action === "undo") undoLastOperation();
  else if (action === "redo") redoLastOperation();
});
elements.undo.addEventListener("click", undoLastOperation);
elements.redo.addEventListener("click", redoLastOperation);
elements.themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
});
elements.canvasTool.addEventListener("change", () => {
  elements.colorPalette.classList.remove("open");
  updateCanvasToolUI();
  saveSettings();
});
elements.colorPaletteToggle.addEventListener("click", event => {
  event.stopPropagation();
  elements.colorPalette.classList.toggle("open");
});
elements.colorSwatches.forEach(swatch => swatch.addEventListener("click", event => {
  event.stopPropagation();
  setActiveToolColor(swatch.dataset.color);
  elements.colorPalette.classList.remove("open");
}));
elements.brushColor.addEventListener("input", () => setActiveToolColor(elements.brushColor.value, false));
elements.brushColor.addEventListener("change", () => {
  setActiveToolColor(elements.brushColor.value);
  elements.colorPalette.classList.remove("open");
});
document.addEventListener("pointerdown", event => {
  if (!event.target.closest("#colorPalette")) elements.colorPalette.classList.remove("open");
});
elements.drawing.addEventListener("focusin", event => {
  const editable = event.target.closest?.(".canvas-text-editor, .canvas-table-editor td");
  if (!editable) return;
  if (editable.classList.contains("canvas-text-editor")) resizeCanvasTextEditor(editable);
  const isPendingText = editable.classList.contains("canvas-text-editor") &&
    editable.closest(".canvas-editable-object") === state.pendingTextObject;
  const isPendingTable = editable.closest(".canvas-editable-object") === state.pendingTableObject;
  if (!isPendingText && !isPendingTable) beginContentEditSession(editable);
});
elements.drawing.addEventListener("input", event => {
  const textEditor = event.target.closest?.(".canvas-text-editor");
  if (textEditor) resizeCanvasTextEditor(textEditor);
  const table = event.target.closest?.(".canvas-table-editor");
  if (table) delete table.dataset.fillUndoReady;
  scheduleMobileWorkspaceSave();
});
elements.drawing.addEventListener("focusout", event => {
  const editor = event.target.closest?.(".canvas-text-editor");
  const textObject = editor?.closest(".canvas-editable-object");
  if (editor && textObject === state.pendingTextObject) {
    const snapshot = state.pendingTextSnapshot;
    state.pendingTextObject = null;
    state.pendingTextSnapshot = null;
    if (!editor.textContent.trim()) {
      textObject.remove();
      invalidateDrawingMarkup();
      updateEmptyState();
      elements.selection.textContent = "未输入文字，已取消插入文本";
      return;
    }
    if (snapshot) pushUndoSnapshot(snapshot);
    invalidateDrawingMarkup();
    return;
  }
  const tableCell = event.target.closest?.(".canvas-table-editor td");
  const tableObject = tableCell?.closest(".canvas-editable-object");
  if (tableCell && tableObject === state.pendingTableObject) {
    setTimeout(() => {
      if (tableObject !== state.pendingTableObject) return;
      const activeObject = document.activeElement?.closest?.(".canvas-editable-object");
      if (activeObject === tableObject) return;
      finalizePendingTableInsertion(tableObject);
    }, 0);
    return;
  }
  if (state.contentEditSession?.target === event.target) commitContentEditSession(false);
});
elements.edgeWeightForm.addEventListener("submit", saveEditedEdgeWeight);
elements.edgeWeightCancel.addEventListener("click", () => elements.edgeWeightDialog.close());
elements.edgeWeightDialog.addEventListener("close", () => { state.editingEdgeIndex = null; });
elements.nodeIdForm.addEventListener("submit", saveEditedNodeId);
elements.nodeIdCancel.addEventListener("click", () => elements.nodeIdDialog.close());
elements.nodeIdInput.addEventListener("input", () => elements.nodeIdInput.setCustomValidity(""));
elements.nodeIdDialog.addEventListener("close", () => {
  state.editingNodeId = null;
  elements.nodeIdInput.setCustomValidity("");
});
[elements.randomNodeCount, elements.randomType, elements.tableCellWidth, elements.tableCellHeight, elements.tableFontSize]
  .forEach(control => control.addEventListener("change", saveSettings));
elements.tableFontSize.addEventListener("change", () => {
  let tableObject = state.contentEditSession?.target?.closest?.(".canvas-table-editor td")
    ? state.contentEditSession.target.closest(".canvas-editable-object")
    : null;
  if (!tableObject && state.pendingTableObject?.querySelector?.("table")) {
    tableObject = state.pendingTableObject;
  }
  if (tableObject) {
    const size = clampInteger(elements.tableFontSize.value, 8, 40, 12);
    tableObject.querySelector("table").style.fontSize = `${size}px`;
    elements.selection.textContent = `已更新表格字号为 ${size}px`;
    invalidateDrawingMarkup();
  }
});
elements.rootInput.addEventListener("change", () => {
  saveSettings();
  if (state.treeAutoArrange && isForestGraph(state.graph)) {
    organizeTreeForest();
    elements.selection.textContent = `已更换根节点并自动整理`;
  }
});
elements.clearDrawing.addEventListener("click", requestClearAllContent);
elements.example.addEventListener("click", () => {
  elements.input.value = `8 10\n1 2 4\n1 3 2\n2 4 7\n2 5 3\n3 5 6\n3 6 5\n4 7 2\n5 7 4\n5 8 8\n6 8 1`;
  clearTimeout(state.autoDrawTimer);
  draw();
});
elements.directed.addEventListener("change", () => { if (state.graph) renderGraph(); saveSettings(); });
elements.showWeights.addEventListener("change", () => { if (state.graph) renderGraph(); saveSettings(); });
elements.mobilePenOnly.addEventListener("change", () => {
  resetMobileInputState(true);
  syncMobilePenOnlyUI(true);
  saveSettings();
});
elements.zoomIn.addEventListener("click", () => {
  const r = elements.svg.getBoundingClientRect(); zoomAt(1.2, r.left + r.width / 2, r.top + r.height / 2);
});
elements.zoomOut.addEventListener("click", () => {
  const r = elements.svg.getBoundingClientRect(); zoomAt(1 / 1.2, r.left + r.width / 2, r.top + r.height / 2);
});
elements.fit.addEventListener("click", () => fitGraph());
elements.modeButtons.forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
elements.organize.addEventListener("click", organizeLayout);
elements.random.addEventListener("click", generateRandomGraph);
elements.duplicate.addEventListener("click", duplicateSelectedComponent);
elements.randomNodeCount.addEventListener("keydown", event => {
  if (event.key === "Enter") generateRandomGraph();
});
elements.rootInput.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  if (state.treeAutoArrange && isForestGraph(state.graph)) {
    organizeTreeForest();
    elements.selection.textContent = "已更换根节点并自动整理";
  } else {
    organizeLayout();
  }
});
document.addEventListener("keydown", event => {
  if (beginStylusPageDelete(event)) return;
  const editingText = isTypingTarget(event.target);
  const tableFillUndoReady = event.target instanceof Element &&
    event.target.closest(".canvas-table-editor")?.dataset.fillUndoReady === "true";
  if (event.key === "Escape") {
    event.preventDefault();
    finishStylusPageDelete(null, false);
    if (!elements.edgeWeightDialog.open && !elements.nodeIdDialog.open && !editingText
      && cancelMobileNodeSelection()) return;
    if (elements.edgeWeightDialog.open) elements.edgeWeightDialog.close();
    if (elements.nodeIdDialog.open) elements.nodeIdDialog.close();
    document.activeElement?.blur?.();
    setMode("touch");
    elements.selection.textContent = "已退出编辑，切换到触摸模式";
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && fillSelectedTableCells()) {
    event.preventDefault();
    return;
  }
  const redoShortcut = (event.ctrlKey || event.metaKey) &&
    (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"));
  if (redoShortcut) {
    if (editingText) return;
    event.preventDefault();
    redoLastOperation();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
    if (editingText && !tableFillUndoReady) return;
    event.preventDefault();
    undoLastOperation();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && !editingText && event.key.toLowerCase() === "c"
    && copyLassoSelection()) {
    event.preventDefault();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && !editingText && event.key.toLowerCase() === "v"
    && pasteLassoSelection()) {
    event.preventDefault();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && !editingText && event.key.toLowerCase() === "d"
    && copyLassoSelection()) {
    event.preventDefault();
    pasteLassoSelection();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    clearTimeout(state.autoDrawTimer);
    draw();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
  const key = event.key.toLowerCase();
  const modeShortcuts = { v: "touch", d: "draw", x: "delete", p: "canvas", q: "lasso" };
  if (modeShortcuts[key]) {
    event.preventDefault();
    setMode(modeShortcuts[key]);
    return;
  }
  if (key === "r") {
    event.preventDefault();
    organizeLayout();
    return;
  }
  const toolShortcuts = { b: "brush", l: "line", a: "arrow", t: "text", g: "table" };
  if (toolShortcuts[key]) {
    event.preventDefault();
    elements.canvasTool.value = toolShortcuts[key];
    setMode("canvas");
    updateCanvasToolUI();
    saveSettings();
  }
});
document.addEventListener("keyup", event => {
  finishStylusPageDelete(event, true);
});

function isTypingTarget(target) {
  return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

restoreSettings();
applyTheme(initialTheme(), false);
syncMobilePenOnlyUI(false);
window.addEventListener("blur", () => {
  finishStylusPageDelete(null, false);
  resetMobileInputState(true);
});
window.addEventListener("pagehide", persistMobileWorkspaceNow);
window.addEventListener("beforeunload", persistMobileWorkspaceNow);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    persistMobileWorkspaceNow();
    finishStylusPageDelete(null, false);
    resetMobileInputState(true);
  }
});
