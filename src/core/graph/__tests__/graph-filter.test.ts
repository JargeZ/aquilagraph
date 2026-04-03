import { describe, it, expect } from "vitest";
import { ExecutableElement } from "../../model/executable-element";
import { filterIsolatedNodes } from "../graph-filter";

function makeElement(name: string): ExecutableElement {
  return new ExecutableElement({
    reference: `mod.${name}`,
    module: "mod",
    className: null,
    name,
    type: "unclassified",
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
