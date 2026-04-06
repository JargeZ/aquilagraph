/** Минимальный API svg-pan-zoom, нужный для центрирования узла. */
export type SvgPanZoomFocusApi = {
  getPan(): { x: number; y: number };
  pan(p: { x: number; y: number }): unknown;
};

/**
 * Сдвигает панораму так, чтобы узел оказался у центра видимой области.
 * Масштаб не меняется.
 */
export function focusSvgNodeInPanZoom(
  svg: SVGSVGElement,
  nodeGroup: SVGGElement,
  panZoom: SvgPanZoomFocusApi,
): void {
  const bbox = nodeGroup.getBBox();
  if (!Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) return;

  const svgRect = svg.getBoundingClientRect();
  const nodeRect = nodeGroup.getBoundingClientRect();
  const pan = panZoom.getPan();
  const nodeCx = nodeRect.left + nodeRect.width / 2;
  const nodeCy = nodeRect.top + nodeRect.height / 2;
  const svgCx = svgRect.left + svgRect.width / 2;
  const svgCy = svgRect.top + svgRect.height / 2;
  panZoom.pan({
    x: pan.x + (svgCx - nodeCx),
    y: pan.y + (svgCy - nodeCy),
  });
}
