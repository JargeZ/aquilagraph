import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { ExecutableElement } from "@/core/model/executable-element";

type SearchRow = {
  ref: string;
  reference: string;
  sourceFile: string;
  classAndName: string;
  module: string;
};

function rowFromElement(el: ExecutableElement): SearchRow {
  return {
    ref: el.reference,
    reference: el.reference,
    sourceFile: el.sourceFile,
    classAndName: el.className ? `${el.className}.${el.name}` : el.name,
    module: el.module,
  };
}

const FUSE_OPTIONS: IFuseOptions<SearchRow> = {
  keys: [
    { name: "reference", weight: 0.55 },
    { name: "sourceFile", weight: 0.48 },
    { name: "classAndName", weight: 0.4 },
    { name: "module", weight: 0.22 },
  ],
  threshold: 0.32,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 1,
};

export function createNodeSearchIndex(elements: readonly ExecutableElement[]) {
  const byRef = new Map(elements.map((e) => [e.reference, e]));
  const rows = elements.map(rowFromElement);
  const fuse = new Fuse(rows, FUSE_OPTIONS);

  function search(query: string, limit: number): ExecutableElement[] {
    const q = query.trim();
    if (!q) {
      const seen = new Set<string>();
      const out: ExecutableElement[] = [];
      for (const el of [...elements].sort((a, b) =>
        a.reference.localeCompare(b.reference),
      )) {
        if (seen.has(el.reference)) continue;
        seen.add(el.reference);
        out.push(el);
        if (out.length >= limit) break;
      }
      return out;
    }
    const hits = fuse.search(q, { limit: limit * 3 });
    const seen = new Set<string>();
    const out: ExecutableElement[] = [];
    for (const h of hits) {
      const el = byRef.get(h.item.ref);
      if (!el || seen.has(el.reference)) continue;
      seen.add(el.reference);
      out.push(el);
      if (out.length >= limit) break;
    }
    return out;
  }

  return { search, fuse };
}
