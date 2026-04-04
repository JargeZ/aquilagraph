import { describe, it, expect } from "vitest";
import {
  ExecutableElement,
  type ElementType,
} from "../../model/executable-element";
import { filterIsolatedNodes, filterUnclassifiedNodes } from "../graph-filter";

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
    const a = makeElement("a", "controlling");
    const b = makeElement("b", "businessLogic");
    const c = makeElement("c", "sideEffect");

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
    const c = makeElement("c", "controlling");
    u.uses = [c];

    const result = filterUnclassifiedNodes([u, c]);
    expect(result).toHaveLength(2);
    expect(result).toContain(u);
    expect(result).toContain(c);
  });

  it("keeps unclassified node that transitively reaches a classified node", () => {
    const u1 = makeElement("u1");
    const u2 = makeElement("u2");
    const c = makeElement("c", "businessLogic");
    u1.uses = [u2];
    u2.uses = [c];

    const result = filterUnclassifiedNodes([u1, u2, c]);
    expect(result).toHaveLength(3);
  });

  it("removes unclassified dead-end even if referenced by classified", () => {
    const c = makeElement("c", "controlling");
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
    const c = makeElement("c", "sideEffect");
    a.uses = [b];
    b.uses = [a, c];

    const result = filterUnclassifiedNodes([a, b, c]);
    expect(result).toHaveLength(3);
  });

  it("ignores uses targets outside the element set", () => {
    const u = makeElement("u");
    const external = makeElement("ext", "controlling");
    u.uses = [external];

    const result = filterUnclassifiedNodes([u]);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(filterUnclassifiedNodes([])).toHaveLength(0);
  });
});
