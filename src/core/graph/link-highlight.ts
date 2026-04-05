/** Ребро A → B: A зависит от B (A uses B). */

export type EdgePair = { readonly source: string; readonly target: string };

function buildOutgoing(edges: readonly EdgePair[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of edges) {
    let arr = m.get(e.source);
    if (!arr) {
      arr = [];
      m.set(e.source, arr);
    }
    arr.push(e.target);
  }
  return m;
}

function buildIncoming(edges: readonly EdgePair[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const e of edges) {
    let arr = m.get(e.target);
    if (!arr) {
      arr = [];
      m.set(e.target, arr);
    }
    arr.push(e.source);
  }
  return m;
}

/** Транзитивное замыкание зависимостей: selected и все узлы, достижимые по рёбрам source → target. */
export function reachableDependencies(
  start: string,
  edges: readonly EdgePair[],
): Set<string> {
  const out = buildOutgoing(edges);
  const seen = new Set<string>();
  const stack = [start];
  seen.add(start);
  while (stack.length) {
    const u = stack.pop();
    if (u === undefined) break;
    for (const v of out.get(u) ?? []) {
      if (!seen.has(v)) {
        seen.add(v);
        stack.push(v);
      }
    }
  }
  return seen;
}

/** Транзитивное замыкание зависимых: selected и все узлы, от которых есть путь к selected (рёбра против стрелки). */
export function reachableDependents(
  start: string,
  edges: readonly EdgePair[],
): Set<string> {
  const inc = buildIncoming(edges);
  const seen = new Set<string>();
  const stack = [start];
  seen.add(start);
  while (stack.length) {
    const u = stack.pop();
    if (u === undefined) break;
    for (const v of inc.get(u) ?? []) {
      if (!seen.has(v)) {
        seen.add(v);
        stack.push(v);
      }
    }
  }
  return seen;
}

export function computeLinkReachSets(
  edges: readonly EdgePair[],
  selectedRef: string,
): { forward: Set<string>; backward: Set<string> } {
  return {
    forward: reachableDependencies(selectedRef, edges),
    backward: reachableDependents(selectedRef, edges),
  };
}
