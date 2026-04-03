import type { ExecutableElement } from "../model/executable-element";

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

  return elements.filter(
    (el) => hasOutgoing.has(el) || referenced.has(el),
  );
}
