import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import svgPanZoom from "svg-pan-zoom";
import type { ExecutableElement } from "@/core/model/executable-element";
import { getVizInstance } from "@/lib/viz-instance";

interface DotSvgCanvasProps {
  dot: string;
  elements: ExecutableElement[];
  onSelectElement?: (element: ExecutableElement | null) => void;
}

function findNodeGroup(target: EventTarget | null): SVGGElement | null {
  let el = target as Element | null;
  while (el && el instanceof SVGElement) {
    if (el instanceof SVGGElement && el.classList.contains("node")) return el;
    el = el.parentElement;
  }
  return null;
}

export function DotSvgCanvas({
  dot,
  elements,
  onSelectElement,
}: DotSvgCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<ReturnType<typeof svgPanZoom> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const elementsByRef = useMemo(() => {
    const map = new Map<string, ExecutableElement>();
    for (const el of elements) {
      map.set(el.reference, el);
    }
    return map;
  }, [elements]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    getVizInstance()
      .then((viz) => {
        if (cancelled) return;

        const svg = viz.renderSVGElement(dot, { engine: "dot" });
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.position = "absolute";
        svg.style.inset = "0";

        container.replaceChildren(svg);
        setError(null);

        panZoomRef.current = svgPanZoom(svg, {
          zoomEnabled: true,
          controlIconsEnabled: true,
          fit: true,
          center: true,
          minZoom: 0.1,
          maxZoom: 10,
          zoomScaleSensitivity: 0.3,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });

    return () => {
      cancelled = true;
      panZoomRef.current?.destroy();
      panZoomRef.current = null;
    };
  }, [dot]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const group = findNodeGroup(e.target);
      if (!group) {
        onSelectElement?.(null);
        return;
      }
      const title = group.querySelector("title");
      if (!title?.textContent) return;
      const ref = title.textContent.trim();
      const el = elementsByRef.get(ref);
      onSelectElement?.(el ?? null);
    },
    [elementsByRef, onSelectElement],
  );

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-destructive">
        <p>Ошибка рендеринга графа: {error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onClick={handleClick}
    />
  );
}
