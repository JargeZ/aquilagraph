/**
 * Подсветка узлов и рёбер в SVG, отрендеренном Graphviz (@viz-js/viz).
 * Узлы: <g class="node"><title>id</title>…
 * Рёбра: <g class="edge"><title>tail-&gt;head</title>… (в DOM текст обычно "tail->head")
 */

const HL_CLASSES = [
  "viz-hl-sel",
  "viz-hl-uses",
  "viz-hl-usedby",
  "viz-hl-dim",
  "viz-hl-edge-out",
  "viz-hl-edge-in",
  "viz-hl-edge-dim",
] as const;

const VIZ_HIGHLIGHT_CSS = `
  g.node.viz-hl-sel polygon,
  g.node.viz-hl-sel ellipse,
  g.node.viz-hl-sel path {
    stroke: #ffffff !important;
    stroke-width: 2px !important;
  }
  g.node.viz-hl-sel text {
    fill: #ffffff !important;
  }

  g.node.viz-hl-uses polygon,
  g.node.viz-hl-uses ellipse,
  g.node.viz-hl-uses path {
    stroke: #0ea5e9 !important;
    stroke-width: 2px !important;
  }

  g.node.viz-hl-usedby polygon,
  g.node.viz-hl-usedby ellipse,
  g.node.viz-hl-usedby path {
    stroke: #f59e0b !important;
    stroke-width: 2px !important;
  }

  g.node.viz-hl-dim polygon,
  g.node.viz-hl-dim ellipse,
  g.node.viz-hl-dim path,
  g.node.viz-hl-dim text {
    opacity: 0.32;
  }

  g.edge.viz-hl-edge-out path,
  g.edge.viz-hl-edge-out polyline,
  g.edge.viz-hl-edge-out polygon {
    stroke: #0ea5e9 !important;
    stroke-width: 3.5 !important;
  }

  g.edge.viz-hl-edge-in path,
  g.edge.viz-hl-edge-in polyline,
  g.edge.viz-hl-edge-in polygon {
    stroke: #f59e0b !important;
    stroke-width: 3.5 !important;
  }

  g.edge.viz-hl-edge-dim path,
  g.edge.viz-hl-edge-dim polyline,
  g.edge.viz-hl-edge-dim polygon {
    opacity: 0.12;
  }
`;

function parseVizEdgeTitle(
  text: string | null | undefined,
): { from: string; to: string } | null {
  if (!text) return null;
  const t = text.trim();
  const arrow = "->";
  const idx = t.indexOf(arrow);
  if (idx === -1) return null;
  const from = t.slice(0, idx).trim();
  const to = t.slice(idx + arrow.length).trim();
  if (!from || !to) return null;
  return { from, to };
}

function firstTitleText(g: Element): string | null {
  const t = g.querySelector("title");
  return t?.textContent?.trim() ?? null;
}

export function injectVizHighlightStyles(svg: SVGSVGElement): void {
  if (svg.querySelector("style[data-viz-highlight]")) return;
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.setAttribute("data-viz-highlight", "1");
  style.textContent = VIZ_HIGHLIGHT_CSS;
  svg.insertBefore(style, svg.firstChild);
}

export function applyVizSvgHighlight(
  root: SVGSVGElement | null,
  selectedRef: string | null,
  edges: readonly { source: string; target: string }[],
): void {
  if (!root) return;
  injectVizHighlightStyles(root);

  for (const g of root.querySelectorAll("g.node, g.edge")) {
    for (const c of HL_CLASSES) g.classList.remove(c);
  }

  if (!selectedRef) return;

  const usesTargets = new Set<string>();
  const usedBySources = new Set<string>();
  for (const e of edges) {
    if (e.source === selectedRef) usesTargets.add(e.target);
    if (e.target === selectedRef) usedBySources.add(e.source);
  }

  for (const g of root.querySelectorAll("g.node")) {
    const id = firstTitleText(g);
    if (!id) continue;
    if (id === selectedRef) g.classList.add("viz-hl-sel");
    else if (usesTargets.has(id)) g.classList.add("viz-hl-uses");
    else if (usedBySources.has(id)) g.classList.add("viz-hl-usedby");
    else g.classList.add("viz-hl-dim");
  }

  for (const g of root.querySelectorAll("g.edge")) {
    const parsed = parseVizEdgeTitle(firstTitleText(g));
    if (!parsed) continue;
    const { from, to } = parsed;
    const touches = from === selectedRef || to === selectedRef;
    if (!touches) {
      g.classList.add("viz-hl-edge-dim");
      continue;
    }
    if (from === selectedRef) g.classList.add("viz-hl-edge-out");
    else g.classList.add("viz-hl-edge-in");
  }
}
