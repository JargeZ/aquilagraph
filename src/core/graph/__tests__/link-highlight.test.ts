import { describe, expect, it } from "vitest";
import {
  computeLinkReachSets,
  reachableDependencies,
  reachableDependents,
} from "../link-highlight";

describe("link-highlight", () => {
  const edges = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "x", target: "a" },
  ];

  it("reachableDependencies follows source→target transitively", () => {
    expect([...reachableDependencies("a", edges)].sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("reachableDependents follows target←source transitively", () => {
    expect([...reachableDependents("c", edges)].sort()).toEqual([
      "a",
      "b",
      "c",
      "x",
    ]);
  });

  it("computeLinkReachSets splits cones from middle node", () => {
    const { forward, backward } = computeLinkReachSets(edges, "b");
    expect(forward.has("b") && forward.has("c") && !forward.has("a")).toBe(
      true,
    );
    expect(backward.has("b") && backward.has("a") && backward.has("x")).toBe(
      true,
    );
  });
});
