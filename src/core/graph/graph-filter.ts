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
 * Removes unclassified nodes that cannot reach any classified node
 * through their `uses` chain. Preserves unclassified nodes that are
 * on a path leading to a classified node.
 */
export function filterUnclassifiedNodes(
  elements: ExecutableElement[],
): ExecutableElement[] {
  const elementSet = new Set(elements);
  const cache = new Map<ExecutableElement, boolean>();

  function reachesClassified(
    el: ExecutableElement,
    visited: Set<ExecutableElement>,
  ): boolean {
    if (cache.has(el)) return cache.get(el) ?? false;
    if (el.type !== UNCLASSIFIED_TYPE) return true;
    if (visited.has(el)) return false;

    visited.add(el);
    for (const target of el.uses) {
      if (elementSet.has(target) && reachesClassified(target, visited)) {
        cache.set(el, true);
        return true;
      }
    }
    cache.set(el, false);
    return false;
  }

  return elements.filter(
    (el) => el.type !== UNCLASSIFIED_TYPE || reachesClassified(el, new Set()),
  );
}
