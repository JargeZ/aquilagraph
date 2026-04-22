/**
 * Two-pass composite layout:
 *   Pass 1 — each module rendered independently with dot (hierarchical LR layout,
 *             correct cluster boxes, fast even for many modules).
 *   Pass 2 — a meta-graph with one node per module rendered with neato to position
 *             modules in 2D based on inter-module connectivity.
 * The per-module SVGs are then translated to the meta-graph positions and combined
 * into a single composite SVG. Inter-module edges are drawn as bezier paths.
 */

import type { Viz } from "@viz-js/viz";
import type { AnalysisConfig } from "../config/analysis-config";
import type { ExecutableElement } from "../model/executable-element";
import { buildCompositeInputs } from "./graph-builder";

const SVG_NS = "http://www.w3.org/2000/svg";
const PADDING = 20;
const GV_MARGIN = 4; // Graphviz default graph margin in points

/** Minimum number of modules required to activate composite layout. */
export const COMPOSITE_MODULE_THRESHOLD = 4;

interface Pt {
  x: number;
  y: number;
}
interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function parseBb(bb: string): Rect {
  const [x0, y0, x1, y1] = bb.split(",").map(Number);
  return { x0, y0, x1, y1 };
}

function parsePos(pos: string): Pt {
  const [x, y] = pos.split(",").map(Number);
  return { x, y };
}

function safeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

function buildMetaGraphDot(
  modules: Array<{ name: string; svgW: number; svgH: number }>,
  edgeCounts: Map<string, number>,
): string {
  const lines = ["graph META {", "  layout=neato", '  overlap="false"'];
  for (const { name, svgW, svgH } of modules) {
    lines.push(
      `  "${safeId(name)}" [width=${(svgW / 72).toFixed(2)}, height=${(svgH / 72).toFixed(2)}, shape=box, fixedsize=true, label="${name}"]`,
    );
  }
  const seen = new Set<string>();
  for (const [key, count] of edgeCounts) {
    const sep = key.indexOf("\0");
    const a = safeId(key.slice(0, sep));
    const b = safeId(key.slice(sep + 1));
    const pair = [a, b].sort().join("\0");
    if (seen.has(pair)) continue;
    seen.add(pair);
    const rev = edgeCounts.get(`${key.slice(sep + 1)}\0${key.slice(0, sep)}`) ?? 0;
    const w = Math.max(1, Math.round(Math.log2(count + rev + 1)));
    lines.push(`  "${a}" -- "${b}" [weight=${w}]`);
  }
  lines.push("}");
  return lines.join("\n");
}

function prefixIds(el: Element, prefix: string): void {
  const id = el.getAttribute("id");
  if (id) el.setAttribute("id", `${prefix}_${id}`);
  for (const child of el.children) prefixIds(child, prefix);
}

// biome-ignore lint/suspicious/noExplicitAny: Graphviz JSON schema is untyped
type GvJsonObject = any;

function clusterBbForModule(objects: GvJsonObject[], modName: string): Rect | null {
  const obj = objects.find((o: GvJsonObject) => o.name === `cluster_${modName}`);
  return obj?.bb ? parseBb(obj.bb) : null;
}

/**
 * Renders a composite SVG using two-pass layout (dot per module + neato meta-graph).
 * Returns null when there is only one module (fall through to normal dot rendering).
 */
export function renderCompositeLayout(
  viz: Viz,
  elements: ExecutableElement[],
  config: AnalysisConfig,
): SVGSVGElement | null {
  const { modules, interModuleEdges } = buildCompositeInputs(elements, config);
  if (modules.length <= COMPOSITE_MODULE_THRESHOLD) return null;

  // ── Pass 1: render each module with dot ──────────────────────────────────
  const moduleSvgs = new Map<string, SVGSVGElement>();
  // biome-ignore lint/suspicious/noExplicitAny: Graphviz JSON schema is untyped
  const moduleJsons = new Map<string, any>();
  for (const mod of modules) {
    moduleSvgs.set(mod.name, viz.renderSVGElement(mod.dot, { engine: "dot" }));
    // biome-ignore lint/suspicious/noExplicitAny: Graphviz JSON schema is untyped
    moduleJsons.set(mod.name, viz.renderJSON(mod.dot, { engine: "dot" }) as any);
  }

  // Extract cluster center and bounds from JSON (Graphviz coords, y-up).
  // Convert to SVG pre-transform local coords by negating y.
  const polyCenters = new Map<string, Pt>();
  const polyBounds = new Map<string, Rect>();
  const moduleNodeCenters = new Map<string, Map<string, Pt>>();

  for (const mod of modules) {
    const json = moduleJsons.get(mod.name)!;
    const objects: GvJsonObject[] = json.objects ?? [];
    const bb = clusterBbForModule(objects, mod.name);
    if (bb) {
      polyCenters.set(mod.name, { x: (bb.x0 + bb.x1) / 2, y: -(bb.y0 + bb.y1) / 2 });
      // y-flip: Graphviz y0 (bottom) → SVG -y0 (larger), y1 (top) → -y1 (smaller)
      polyBounds.set(mod.name, { x0: bb.x0, y0: -bb.y1, x1: bb.x1, y1: -bb.y0 });
    }
    const nodeCenters = new Map<string, Pt>();
    for (const obj of objects) {
      if (obj.pos) {
        const p = parsePos(obj.pos);
        nodeCenters.set(obj.name as string, { x: p.x, y: -p.y });
      }
    }
    moduleNodeCenters.set(mod.name, nodeCenters);
  }

  // ── Pass 2: meta-graph with neato ─────────────────────────────────────────
  const edgeCounts = new Map<string, number>();
  for (const e of interModuleEdges) {
    const k = `${e.fromModule}\0${e.toModule}`;
    edgeCounts.set(k, (edgeCounts.get(k) ?? 0) + 1);
  }

  const metaNodes = modules.map((m) => {
    const bb = parseBb(moduleJsons.get(m.name)!.bb);
    return { name: m.name, svgW: bb.x1 + 2 * GV_MARGIN, svgH: bb.y1 + 2 * GV_MARGIN };
  });

  const metaDot = buildMetaGraphDot(metaNodes, edgeCounts);
  // biome-ignore lint/suspicious/noExplicitAny: Graphviz JSON schema is untyped
  const metaJson = viz.renderJSON(metaDot, { engine: "neato" }) as any;
  const metaGraphH = parseBb(metaJson.bb).y1;

  // Convert meta node positions: Graphviz (mx, my) → SVG absolute (mx+margin, metaH+margin-my)
  // This matches the transform="translate(GV_MARGIN, metaGraphH+GV_MARGIN)" that Graphviz applies.
  const metaPos = new Map<string, Pt>();
  for (const obj of (metaJson.objects ?? []) as GvJsonObject[]) {
    if (obj.pos) {
      const p = parsePos(obj.pos);
      metaPos.set(obj.name as string, {
        x: p.x + GV_MARGIN,
        y: metaGraphH + GV_MARGIN - p.y,
      });
    }
  }

  // Map safeId → original module name
  const moduleMetaPos = new Map<string, Pt>();
  for (const mod of modules) {
    const pos = metaPos.get(safeId(mod.name));
    if (pos) moduleMetaPos.set(mod.name, pos);
  }

  // ── Compute absolute node positions for inter-module edge routing ─────────
  // Node local SVG coords + module translate = absolute composite coords
  const nodeAbsPos = new Map<string, Pt>();
  for (const mod of modules) {
    const mp = moduleMetaPos.get(mod.name);
    const pc = polyCenters.get(mod.name);
    if (!mp || !pc) continue;
    const dx = mp.x - pc.x;
    const dy = mp.y - pc.y;
    for (const [ref, center] of (moduleNodeCenters.get(mod.name) ?? new Map<string, Pt>())) {
      nodeAbsPos.set(ref, { x: center.x + dx, y: center.y + dy });
    }
  }

  // ── Compute composite bounding box ────────────────────────────────────────
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const mod of modules) {
    const mp = moduleMetaPos.get(mod.name);
    const pc = polyCenters.get(mod.name);
    const b = polyBounds.get(mod.name);
    if (!mp || !pc || !b) continue;
    const dx = mp.x - pc.x;
    const dy = mp.y - pc.y;
    minX = Math.min(minX, b.x0 + dx - PADDING);
    minY = Math.min(minY, b.y0 + dy - PADDING);
    maxX = Math.max(maxX, b.x1 + dx + PADDING);
    maxY = Math.max(maxY, b.y1 + dy + PADDING);
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 600; maxY = 400; }

  const totalW = maxX - minX;
  const totalH = maxY - minY;

  // ── Build composite SVG ───────────────────────────────────────────────────
  const svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("viewBox", `${minX} ${minY} ${totalW} ${totalH}`);
  svg.setAttribute("width", `${totalW}pt`);
  svg.setAttribute("height", `${totalH}pt`);

  const bg = document.createElementNS(SVG_NS, "polygon");
  bg.setAttribute("fill", "white");
  bg.setAttribute("stroke", "none");
  bg.setAttribute("points", `${minX},${minY} ${maxX},${minY} ${maxX},${maxY} ${minX},${maxY}`);
  svg.appendChild(bg);

  const defs = document.createElementNS(SVG_NS, "defs");
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", "composite-arrow");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "6");
  marker.setAttribute("refX", "7");
  marker.setAttribute("refY", "3");
  marker.setAttribute("orient", "auto");
  const arrowPoly = document.createElementNS(SVG_NS, "polygon");
  arrowPoly.setAttribute("points", "0 0, 8 3, 0 6");
  arrowPoly.setAttribute("fill", "#333333");
  marker.appendChild(arrowPoly);
  defs.appendChild(marker);
  svg.appendChild(defs);

  // Append each module's cluster + intra-module nodes/edges
  for (const mod of modules) {
    const mp = moduleMetaPos.get(mod.name);
    const pc = polyCenters.get(mod.name);
    if (!mp || !pc) continue;

    const tx = mp.x - pc.x;
    const ty = mp.y - pc.y;

    const graphG = moduleSvgs.get(mod.name)!.querySelector("g.graph");
    if (!graphG) continue;

    const modGroup = document.createElementNS(SVG_NS, "g");
    modGroup.setAttribute("class", "composite-module");
    modGroup.setAttribute("data-module", mod.name);
    modGroup.setAttribute("transform", `translate(${tx}, ${ty})`);

    // Clone children of g.graph, skipping the white background polygon
    let firstChild = true;
    for (const child of Array.from(graphG.children)) {
      if (
        firstChild &&
        child.tagName.toLowerCase() === "polygon" &&
        child.getAttribute("fill") === "white"
      ) {
        firstChild = false;
        continue;
      }
      firstChild = false;
      const clone = child.cloneNode(true) as Element;
      prefixIds(clone, safeId(mod.name));
      modGroup.appendChild(clone);
    }
    svg.appendChild(modGroup);
  }

  // Draw inter-module edges as cubic bezier paths
  const edgeSeen = new Set<string>();
  for (const edge of interModuleEdges) {
    const fp = nodeAbsPos.get(edge.fromRef);
    const tp = nodeAbsPos.get(edge.toRef);
    if (!fp || !tp) continue;
    const key = `${edge.fromRef}\0${edge.toRef}`;
    if (edgeSeen.has(key)) continue;
    edgeSeen.add(key);

    const edgeG = document.createElementNS(SVG_NS, "g");
    edgeG.setAttribute("class", "edge");
    const titleEl = document.createElementNS(SVG_NS, "title");
    titleEl.textContent = `${edge.fromRef}->${edge.toRef}`;
    edgeG.appendChild(titleEl);

    const dx = tp.x - fp.x;
    const dy = tp.y - fp.y;
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute(
      "d",
      `M ${fp.x},${fp.y} C ${fp.x + dx * 0.35},${fp.y + dy * 0.1} ${tp.x - dx * 0.35},${tp.y - dy * 0.1} ${tp.x},${tp.y}`,
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#333333");
    path.setAttribute("stroke-width", "0.75");
    path.setAttribute("marker-end", "url(#composite-arrow)");
    edgeG.appendChild(path);
    svg.appendChild(edgeG);
  }

  return svg;
}
