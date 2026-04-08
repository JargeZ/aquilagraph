import { Button } from "@ui/molecules/button/button";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RootGraphModel } from "ts-graphviz";
import { graphModelEdgePairs } from "@/core/graph/graph-model-edge-pairs";
import type { ExecutableElement } from "@/core/model/executable-element";
import { isTauriRuntime } from "@/lib/is-tauri";
import {
  createShortClickPointerRef,
  isShortClick,
  shortClickPointerDown,
  shortClickPointerMove,
  shortClickPointerUpClearDeferred,
} from "@/lib/short-click-gesture";
import { focusSvgNodeInPanZoom } from "@/lib/svg-pan-zoom-focus-node";
import {
  attachSvgPanZoomTrackpadWheel,
  type SvgPanZoomWheelInstance,
} from "@/lib/svg-pan-zoom-trackpad-wheel";
import { getVizInstance } from "@/lib/viz-instance";
import { applyVizSvgHighlight } from "@/lib/viz-svg-highlight";

type WindowWithSavePicker = Window &
  typeof globalThis & {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle>;
  };

interface DotSvgCanvasProps {
  dot: string;
  graph: RootGraphModel;
  elements: ExecutableElement[];
  /** Текущий выбранный узел (reference), для подсветки связей в SVG. */
  selectedRef?: string | null;
  onSelectElement?: (element: ExecutableElement | null) => void;
  onNodeDoubleClick?: (element: ExecutableElement) => void;
  /** Панорамировать и масштабировать к выбранному узлу (например, пока открыт поиск). */
  followSelectionInViewport?: boolean;
}

function findNodeGroup(target: EventTarget | null): SVGGElement | null {
  let el = target as Element | null;
  while (el && el instanceof SVGElement) {
    if (el instanceof SVGGElement && el.classList.contains("node")) return el;
    el = el.parentElement;
  }
  return null;
}

type SvgPanZoomHandle = { destroy(): void };

type SvgPanZoomPublicInstance = SvgPanZoomHandle &
  SvgPanZoomWheelInstance & {
    resize(): unknown;
    getPan(): { x: number; y: number };
    pan(p: { x: number; y: number }): unknown;
  };

/**
 * svg-pan-zoom клампит зум к [minZoom, maxZoom] × начальный масштаб после fit.
 * Дефолт библиотеки maxZoom=10 часто не хватает, чтобы «влезть» в детали большого графа.
 */
const SVG_PAN_ZOOM_MAX_ZOOM = 100;

export function DotSvgCanvas({
  dot,
  graph,
  elements,
  selectedRef = null,
  onSelectElement,
  onNodeDoubleClick,
  followSelectionInViewport = false,
}: DotSvgCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panZoomRef = useRef<SvgPanZoomHandle | null>(null);
  const shortClickRef = useRef(createShortClickPointerRef());
  const [error, setError] = useState<string | null>(null);
  const [svgReady, setSvgReady] = useState(false);

  const edgePairs = useMemo(() => graphModelEdgePairs(graph), [graph]);

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
    let detachTrackpadWheel: (() => void) | null = null;
    setSvgReady(false);

    const zoomScaleSensitivity = 0.3;

    getVizInstance()
      .then(async (viz) => {
        if (cancelled) return;

        const { default: svgPanZoom } = await import("svg-pan-zoom");
        if (cancelled) return;

        const svg = viz.renderSVGElement(dot, { engine: "dot" });
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.position = "absolute";
        svg.style.inset = "0";

        container.replaceChildren(svg);
        setError(null);
        setSvgReady(true);

        if (cancelled) return;

        const panZoom = svgPanZoom(svg, {
          zoomEnabled: true,
          controlIconsEnabled: true,
          fit: true,
          center: true,
          minZoom: 0.05,
          maxZoom: SVG_PAN_ZOOM_MAX_ZOOM,
          zoomScaleSensitivity,
        }) as SvgPanZoomPublicInstance;
        panZoomRef.current = panZoom;

        if (cancelled) {
          panZoom.destroy();
          panZoomRef.current = null;
          return;
        }

        detachTrackpadWheel = attachSvgPanZoomTrackpadWheel(svg, panZoom, {
          zoomScaleSensitivity,
        });

        // Flex/вкладки: если fit посчитан при нулевых размерах, зум и границы ломаются — один пересчёт после layout.
        if (svg.clientWidth < 4 || svg.clientHeight < 4) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (cancelled) return;
              panZoom.resize();
            });
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setSvgReady(false);
        }
      });

    return () => {
      cancelled = true;
      setSvgReady(false);
      detachTrackpadWheel?.();
      detachTrackpadWheel = null;
      panZoomRef.current?.destroy();
      panZoomRef.current = null;
    };
  }, [dot]);

  useEffect(() => {
    if (!svgReady) return;
    const svg = containerRef.current?.querySelector("svg");
    if (!(svg instanceof SVGSVGElement)) return;

    const ref = shortClickRef.current;
    const onPointerDown = (e: PointerEvent) => shortClickPointerDown(ref, e);
    const onPointerMove = (e: PointerEvent) => shortClickPointerMove(ref, e);
    const onPointerEnd = () => shortClickPointerUpClearDeferred(ref);

    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", onPointerEnd);
    svg.addEventListener("pointercancel", onPointerEnd);
    svg.addEventListener("lostpointercapture", onPointerEnd);

    return () => {
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerup", onPointerEnd);
      svg.removeEventListener("pointercancel", onPointerEnd);
      svg.removeEventListener("lostpointercapture", onPointerEnd);
    };
  }, [svgReady]);

  useLayoutEffect(() => {
    if (!svgReady) return;
    const svg = containerRef.current?.querySelector("svg");
    if (!svg || !(svg instanceof SVGSVGElement)) return;
    applyVizSvgHighlight(svg, selectedRef, edgePairs);
  }, [svgReady, selectedRef, edgePairs]);

  useEffect(() => {
    if (!followSelectionInViewport || !svgReady || !selectedRef) return;
    const panZoom = panZoomRef.current as SvgPanZoomPublicInstance | null;
    if (!panZoom) return;
    const svg = containerRef.current?.querySelector("svg");
    if (!(svg instanceof SVGSVGElement)) return;

    let target: SVGGElement | null = null;
    for (const g of svg.querySelectorAll("g.node")) {
      if (!(g instanceof SVGGElement)) continue;
      const t = g.querySelector("title")?.textContent?.trim();
      if (t === selectedRef) {
        target = g;
        break;
      }
    }
    if (!target) return;

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        focusSvgNodeInPanZoom(svg, target as SVGGElement, panZoom);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [followSelectionInViewport, svgReady, selectedRef]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const group = findNodeGroup(e.target);
      if (!group) {
        if (!isShortClick(shortClickRef.current)) return;
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

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onNodeDoubleClick) return;
      const group = findNodeGroup(e.target);
      if (!group) return;
      const title = group.querySelector("title");
      if (!title?.textContent) return;
      const ref = title.textContent.trim();
      const el = elementsByRef.get(ref);
      if (el) {
        e.preventDefault();
        e.stopPropagation();
        onNodeDoubleClick(el);
      }
    },
    [elementsByRef, onNodeDoubleClick],
  );

  const handleDownloadSvg = useCallback(async () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    let source = new XMLSerializer().serializeToString(svg);
    if (!/^<svg\b[^>]*xmlns=/.test(source)) {
      source = source.replace(
        "<svg",
        '<svg xmlns="http://www.w3.org/2000/svg"',
      );
    }
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });

    if (isTauriRuntime()) {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        title: "Сохранить граф как SVG",
        defaultPath: "graph.svg",
        filters: [{ name: "SVG", extensions: ["svg"] }],
      });
      if (path === null) return;
      await writeTextFile(path, source);
      return;
    }

    const w = window as WindowWithSavePicker;
    if (typeof w.showSaveFilePicker === "function") {
      try {
        const handle = await w.showSaveFilePicker({
          suggestedName: "graph.svg",
          types: [
            {
              description: "SVG",
              accept: { "image/svg+xml": [".svg"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graph.svg";
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-destructive">
        <p>Ошибка рендеринга графа: {error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Клик по пустому месту SVG: цель — жест short-click, не отдельная кнопка. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: контейнер под inline-SVG Graphviz */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: навигация по графу — указатель/тач */}
      <div
        ref={containerRef}
        className="h-full w-full"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />
      <div className="pointer-events-none absolute top-2 right-2 z-10">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="pointer-events-auto shadow-sm"
          disabled={!svgReady}
          onClick={() => void handleDownloadSvg()}
        >
          Скачать SVG
        </Button>
      </div>
    </div>
  );
}
