import { describe, expect, it } from "vitest";
import type {
  AnalysisConfig,
  ClassificationConfig,
} from "../../config/analysis-config";
import {
  type ElementType,
  ExecutableElement,
} from "../../model/executable-element";
import {
  filterExcludedClassificationNodes,
  filterIsolatedNodes,
  filterUnclassifiedNodes,
} from "../graph-filter";

function classification(
  id: string,
  exclude: boolean,
): ClassificationConfig {
  return {
    id,
    name: id,
    color: "#000000",
    selectors: {},
    groupInBucket: false,
    exclude,
    mute: false,
  };
}

function mockAnalysisConfig(
  classifications: ClassificationConfig[],
): AnalysisConfig {
  return {
    include: [],
    exclude: [],
    moduleDepth: 1,
    minMethodsForClassDetail: 3,
    hideUnclassified: true,
    classifications,
  };
}

function makeElement(
  name: string,
  type: ElementType = "unclassified",
): ExecutableElement {
  return new ExecutableElement({
    reference: `mod.${name}`,
    module: "mod",
    className: null,
    name,
    type,
    decorators: [],
    parentClasses: [],
    sourceFile: "mod.py",
    startLine: 1,
    endLine: 10,
  });
}

describe("filterIsolatedNodes", () => {
  it("removes nodes with no edges", () => {
    const a = makeElement("a");
    const b = makeElement("b");
    const isolated = makeElement("isolated");

    a.uses = [b];

    const result = filterIsolatedNodes([a, b, isolated]);

    expect(result).toHaveLength(2);
    expect(result).toContain(a);
    expect(result).toContain(b);
    expect(result).not.toContain(isolated);
  });

  it("keeps a node that only has outgoing edges", () => {
    const a = makeElement("a");
    const b = makeElement("b");
    a.uses = [b];

    const result = filterIsolatedNodes([a, b]);
    expect(result).toContain(a);
  });

  it("keeps a node that only has incoming edges", () => {
    const a = makeElement("a");
    const b = makeElement("b");
    a.uses = [b];

    const result = filterIsolatedNodes([a, b]);
    expect(result).toContain(b);
  });

  it("returns empty array when all nodes are isolated", () => {
    const a = makeElement("a");
    const b = makeElement("b");

    const result = filterIsolatedNodes([a, b]);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(filterIsolatedNodes([])).toHaveLength(0);
  });

  it("ignores uses targets that are not in the elements list", () => {
    const a = makeElement("a");
    const external = makeElement("external");
    a.uses = [external];

    const result = filterIsolatedNodes([a]);
    expect(result).toHaveLength(0);
  });

  it("keeps all nodes in a connected graph", () => {
    const a = makeElement("a");
    const b = makeElement("b");
    const c = makeElement("c");

    a.uses = [b];
    b.uses = [c];

    const result = filterIsolatedNodes([a, b, c]);
    expect(result).toHaveLength(3);
  });
});

describe("filterUnclassifiedNodes", () => {
  it("keeps all classified nodes regardless of edges", () => {
    const a = makeElement("a", "cat_a");
    const b = makeElement("b", "cat_b");
    const c = makeElement("c", "cat_c");

    const result = filterUnclassifiedNodes([a, b, c]);
    expect(result).toHaveLength(3);
  });

  it("removes unclassified nodes that do not reach any classified node", () => {
    const a = makeElement("a");
    const b = makeElement("b");
    a.uses = [b];

    const result = filterUnclassifiedNodes([a, b]);
    expect(result).toHaveLength(0);
  });

  it("keeps unclassified node that directly uses a classified node", () => {
    const u = makeElement("u");
    const c = makeElement("c", "cat_c");
    u.uses = [c];

    const result = filterUnclassifiedNodes([u, c]);
    expect(result).toHaveLength(2);
    expect(result).toContain(u);
    expect(result).toContain(c);
  });

  it("keeps unclassified node that transitively reaches a classified node", () => {
    const u1 = makeElement("u1");
    const u2 = makeElement("u2");
    const c = makeElement("c", "cat_c");
    u1.uses = [u2];
    u2.uses = [c];

    const result = filterUnclassifiedNodes([u1, u2, c]);
    expect(result).toHaveLength(3);
  });

  it("removes unclassified dead-end even if referenced by classified", () => {
    const c = makeElement("c", "cat_c");
    const u = makeElement("u");
    c.uses = [u];

    const result = filterUnclassifiedNodes([c, u]);
    expect(result).toHaveLength(1);
    expect(result).toContain(c);
  });

  it("handles cycles among unclassified nodes without classified target", () => {
    const a = makeElement("a");
    const b = makeElement("b");
    a.uses = [b];
    b.uses = [a];

    const result = filterUnclassifiedNodes([a, b]);
    expect(result).toHaveLength(0);
  });

  it("handles cycles among unclassified nodes that reach a classified node", () => {
    const a = makeElement("a");
    const b = makeElement("b");
    const c = makeElement("c", "cat_c");
    a.uses = [b];
    b.uses = [a, c];

    const result = filterUnclassifiedNodes([a, b, c]);
    expect(result).toHaveLength(3);
  });

  it("ignores uses targets outside the element set", () => {
    const u = makeElement("u");
    const external = makeElement("ext", "cat_x");
    u.uses = [external];

    const result = filterUnclassifiedNodes([u]);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(filterUnclassifiedNodes([])).toHaveLength(0);
  });
});

describe("filterExcludedClassificationNodes", () => {
  it("removes excluded nodes even when they reach a kept classification", () => {
    const cfg = mockAnalysisConfig([
      classification("exc", true),
      classification("keep", false),
    ]);
    const exc = makeElement("e", "exc");
    const keep = makeElement("k", "keep");
    exc.uses = [keep];

    const result = filterExcludedClassificationNodes([exc, keep], cfg);
    expect(result).toEqual([keep]);
  });

  it("removes all nodes whose classification has exclude", () => {
    const cfg = mockAnalysisConfig([
      classification("a", true),
      classification("b", true),
      classification("c", false),
    ]);
    const result = filterExcludedClassificationNodes(
      [
        makeElement("x", "a"),
        makeElement("y", "b"),
        makeElement("z", "c"),
      ],
      cfg,
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("c");
  });

  it("keeps nodes with unknown type (no classification entry)", () => {
    const cfg = mockAnalysisConfig([classification("known", false)]);
    const stale = makeElement("s", "removed_from_config");
    const result = filterExcludedClassificationNodes([stale], cfg);
    expect(result).toEqual([stale]);
  });

  it("does not remove unclassified nodes", () => {
    const cfg = mockAnalysisConfig([classification("cat", true)]);
    const u = makeElement("u");
    const result = filterExcludedClassificationNodes([u], cfg);
    expect(result).toEqual([u]);
  });

  it("returns same array when no classification has exclude", () => {
    const cfg = mockAnalysisConfig([
      classification("a", false),
      classification("b", false),
    ]);
    const elements = [makeElement("x", "a")];
    const result = filterExcludedClassificationNodes(elements, cfg);
    expect(result).toBe(elements);
  });

  it("handles empty classifications list", () => {
    const elements = [makeElement("x", "anything")];
    const result = filterExcludedClassificationNodes(
      elements,
      mockAnalysisConfig([]),
    );
    expect(result).toBe(elements);
  });
});
