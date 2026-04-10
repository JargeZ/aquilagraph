/**
 * Подсветка узлов и рёбер в SVG, отрендеренном Graphviz (@viz-js/viz).
 * Узлы: <g class="node"><title>id</title>…
 * Рёбра: <g class="edge"><title>tail-&gt;head</title>… (в DOM текст обычно "tail->head")
 */

import { computeLinkReachSets } from "@/core/graph/link-highlight";

const HL_CLASSES = [
  "viz-hl-sel",
  "viz-hl-uses",
  "viz-hl-usedby",
  "viz-hl-both",
  "viz-hl-dim",
  "viz-hl-edge-out",
  "viz-hl-edge-in",
  "viz-hl-edge-both",
  "viz-hl-edge-dim",
] as const;

const VIZ_HIGHLIGHT_CSS = `
  g.node.viz-hl-sel polygon,
  g.node.viz-hl-sel ellipse,
  g.node.viz-hl-sel path {
    paint-order: stroke fill;
    stroke: var(--primary) !important;
    stroke-width: 3px !important;
    filter: drop-shadow(0 0 4px color-mix(in oklch, var(--primary) 50%, transparent))
      drop-shadow(0 0 10px color-mix(in oklch, var(--ring) 35%, transparent));
  }

  g.node.viz-hl-sel text {
    font-weight: 600;
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

  g.node.viz-hl-both polygon,
  g.node.viz-hl-both ellipse,
  g.node.viz-hl-both path {
    stroke: #8b5cf6 !important;
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

  g.edge.viz-hl-edge-both path,
  g.edge.viz-hl-edge-both polyline,
  g.edge.viz-hl-edge-both polygon {
    stroke: #8b5cf6 !important;
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

  const { forward, backward } = computeLinkReachSets(edges, selectedRef);

  for (const g of root.querySelectorAll("g.node")) {
    const id = firstTitleText(g);
    if (!id) continue;
    if (id === selectedRef) g.classList.add("viz-hl-sel");
    else {
      const inF = forward.has(id);
      const inB = backward.has(id);
      if (inF && inB) g.classList.add("viz-hl-both");
      else if (inF) g.classList.add("viz-hl-uses");
      else if (inB) g.classList.add("viz-hl-usedby");
      else g.classList.add("viz-hl-dim");
    }
  }

  for (const g of root.querySelectorAll("g.edge")) {
    const parsed = parseVizEdgeTitle(firstTitleText(g));
    if (!parsed) continue;
    const { from, to } = parsed;
    const inF = forward.has(from) && forward.has(to);
    const inB = backward.has(from) && backward.has(to);
    if (!inF && !inB) {
      g.classList.add("viz-hl-edge-dim");
      continue;
    }
    if (inF && inB) g.classList.add("viz-hl-edge-both");
    else if (inF) g.classList.add("viz-hl-edge-out");
    else g.classList.add("viz-hl-edge-in");
  }
}
