import { describe, expect, it } from "vitest";
import { ExecutableElement } from "@/core/model/executable-element";
import { createNodeSearchIndex } from "@/lib/node-search-index";

function el(
  reference: string,
  overrides: Partial<{
    className: string | null;
    name: string;
    sourceFile: string;
  }> = {},
): ExecutableElement {
  return new ExecutableElement({
    reference,
    module: "mod",
    className: overrides.className ?? null,
    name: overrides.name ?? "fn",
    type: "cat_biz",
    decorators: [],
    parentClasses: [],
    sourceFile: overrides.sourceFile ?? "pkg/foo.py",
    startLine: 1,
    endLine: 2,
  });
}

describe("createNodeSearchIndex", () => {
  const elements = [
    el("pkg.views.UserViewSet.list", {
      className: "UserViewSet",
      name: "list",
      sourceFile: "pkg/views/user.py",
    }),
    el("pkg.tasks.run_sync.task_Run", {
      className: null,
      name: "task_Run",
      sourceFile: "pkg/tasks/sync.py",
    }),
  ];

  it("returns sorted list when query empty", () => {
    const { search } = createNodeSearchIndex(elements);
    const r = search("", 10);
    expect(r.map((e) => e.reference)).toEqual([
      "pkg.tasks.run_sync.task_Run",
      "pkg.views.UserViewSet.list",
    ]);
  });

  it("matches fuzzy on class.method style string", () => {
    const { search } = createNodeSearchIndex(elements);
    const r = search("UserViweSet lst", 5);
    expect(r[0]?.reference).toBe("pkg.views.UserViewSet.list");
  });

  it("matches on file path segment", () => {
    const { search } = createNodeSearchIndex(elements);
    const r = search("sync.py", 5);
    expect(r[0]?.reference).toContain("run_sync");
  });

  it("dedupes duplicate references in source list and in fuse hits", () => {
    const dup = el("dup.ref", { name: "a" });
    const { search } = createNodeSearchIndex([dup, dup]);
    const empty = search("", 10);
    expect(empty).toHaveLength(1);
    expect(empty[0]?.reference).toBe("dup.ref");
    const fuzzy = search("dup", 10);
    expect(fuzzy.filter((e) => e.reference === "dup.ref")).toHaveLength(1);
  });
});
