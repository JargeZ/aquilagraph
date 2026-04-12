import type { AnalysisConfig } from "../config/analysis-config";
import { classificationById } from "../config/analysis-config";
import type { ExecutableElement } from "../model/executable-element";
import { UNCLASSIFIED_TYPE } from "../model/executable-element";

/**
 * Removes elements that have no edges at all:
 * neither outgoing (`uses` is empty) nor incoming (no other element references them).
 */
export function filterIsolatedNodes(
  elements: ExecutableElement[],
): ExecutableElement[] {
  const elementSet = new Set(elements);

  const hasOutgoing = new Set<ExecutableElement>();
  const referenced = new Set<ExecutableElement>();

  for (const el of elements) {
    for (const target of el.uses) {
      if (elementSet.has(target)) {
        hasOutgoing.add(el);
        referenced.add(target);
      }
    }
  }

  return elements.filter((el) => hasOutgoing.has(el) || referenced.has(el));
}

/**
 * Keeps elements that are not `isPruned`, or that can reach some element that
 * is not `isPruned` by following `uses` within `elements`.
 */
function filterUnlessReachesNonPruned(
  elements: ExecutableElement[],
  isPruned: (el: ExecutableElement) => boolean,
): ExecutableElement[] {
  const elementSet = new Set(elements);
  const cache = new Map<ExecutableElement, boolean>();

  function reachesNonPruned(
    el: ExecutableElement,
    visited: Set<ExecutableElement>,
  ): boolean {
    if (cache.has(el)) return cache.get(el) ?? false;
    if (!isPruned(el)) return true;
    if (visited.has(el)) return false;

    visited.add(el);
    for (const target of el.uses) {
      if (elementSet.has(target) && reachesNonPruned(target, visited)) {
        cache.set(el, true);
        return true;
      }
    }
    cache.set(el, false);
    return false;
  }

  return elements.filter(
    (el) => !isPruned(el) || reachesNonPruned(el, new Set()),
  );
}

/**
 * Removes unclassified nodes that cannot reach any classified node
 * through their `uses` chain. Preserves unclassified nodes that are
 * on a path leading to a classified node.
 */
export function filterUnclassifiedNodes(
  elements: ExecutableElement[],
): ExecutableElement[] {
  return filterUnlessReachesNonPruned(
    elements,
    (el) => el.type === UNCLASSIFIED_TYPE,
  );
}

/** True if this element's classification is marked `exclude` (always hidden from graph). */
export function isClassificationExcludedFromGraph(
  el: ExecutableElement,
  config: AnalysisConfig,
): boolean {
  if (el.type === UNCLASSIFIED_TYPE) return false;
  return classificationById(config, el.type)?.exclude === true;
}

/**
 * Drops every node whose classification has `exclude: true`, regardless of `uses`.
 */
export function filterExcludedClassificationNodes(
  elements: ExecutableElement[],
  config: AnalysisConfig,
): ExecutableElement[] {
  if (!config.classifications.some((c) => c.exclude)) {
    return elements;
  }
  return elements.filter((el) => !isClassificationExcludedFromGraph(el, config));
}
