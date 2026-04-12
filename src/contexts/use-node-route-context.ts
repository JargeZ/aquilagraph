import { useMemo } from "react";
import type { ExecutableElement } from "@/core/model/executable-element";
import { useProjectAnalysis } from "./use-project-analysis";

export interface NodeRouteContextValue {
  nodeRefParam: string;
  decodedRef: string;
  elementsByRef: ReadonlyMap<string, ExecutableElement>;
  element: ExecutableElement | null;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function useNodeRouteContext(
  nodeRefParam: string,
): NodeRouteContextValue {
  const { analysisResult } = useProjectAnalysis();

  const decodedRef = useMemo(
    () => safeDecodeURIComponent(nodeRefParam),
    [nodeRefParam],
  );

  const elementsByRef = useMemo(() => {
    const map = new Map<string, ExecutableElement>();
    for (const el of analysisResult?.elements ?? []) {
      map.set(el.reference, el);
    }
    return map;
  }, [analysisResult]);

  const element = useMemo(
    () => elementsByRef.get(decodedRef) ?? null,
    [decodedRef, elementsByRef],
  );

  return { nodeRefParam, decodedRef, elementsByRef, element };
}
