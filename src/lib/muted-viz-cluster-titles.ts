import type { AnalysisConfig } from "@/core/config/analysis-config";
import { classificationById } from "@/core/config/analysis-config";
import type { ExecutableElement } from "@/core/model/executable-element";
import { getModuleName } from "@/core/model/reference-builder";

/** Как в graph-builder: безопасный id субграфа из id классификации. */
function safeGraphId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Имена субграфов Graphviz (`<title>` у `g.cluster`), которые нужно приглушить
 * для данного элемента с уже известным `mute` у классификации.
 */
function clusterTitlesForMutedElement(
  el: ExecutableElement,
  config: AnalysisConfig,
): string[] {
  const modName = getModuleName(el.reference, config.moduleDepth);
  const c = classificationById(config, el.type);
  const inBucket = Boolean(c?.groupInBucket);

  if (inBucket && c) {
    const bucketKey = safeGraphId(c.id);
    const out: string[] = [`cluster_${modName}_bucket_${bucketKey}`];
    if (el.className) {
      out.push(`cluster_${modName}_bucket_${bucketKey}_${el.className}`);
    }
    return out;
  }

  if (el.className) {
    return [`cluster_${modName}_${el.className}`];
  }
  return [];
}

/** Все `cluster_*` заголовки, связанные с элементами в режиме mute. */
export function mutedClusterTitlesForMutedElements(
  elements: readonly ExecutableElement[],
  config: AnalysisConfig,
): ReadonlySet<string> {
  const titles = new Set<string>();
  for (const el of elements) {
    if (!classificationById(config, el.type)?.mute) continue;
    for (const t of clusterTitlesForMutedElement(el, config)) {
      titles.add(t);
    }
  }
  return titles;
}
