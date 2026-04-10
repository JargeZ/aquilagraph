import { describe, expect, it } from "vitest";
import { analyzeProject } from "@/core/analyze";
import type { AnalysisConfig } from "@/core/config/analysis-config";
import { TEST_ANALYSIS_CONFIG } from "@/core/config/test-project-analysis-config";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "@/core/parser/__tests__/test-helpers";
import { buildNodeSubgraphResult } from "./build-node-subgraph-result";

const TEST_PROJECT_CONFIG: AnalysisConfig = TEST_ANALYSIS_CONFIG;

async function getFullAnalysis() {
  const fs = createNodeFsAdapter(getTestProjectRoot());
  return analyzeProject("", TEST_PROJECT_CONFIG, fs);
}

describe("buildNodeSubgraphResult", () => {
  it("returns null for unknown reference", async () => {
    const full = await getFullAnalysis();
    expect(
      buildNodeSubgraphResult(
        full,
        "definitely.missing.ref",
        TEST_PROJECT_CONFIG,
      ),
    ).toBeNull();
  });

  it("includes center node and is a subset of full graph", async () => {
    const full = await getFullAnalysis();
    const center = full.elements[0]?.reference;
    expect(center).toBeDefined();
    if (!center) return;

    const sub = buildNodeSubgraphResult(full, center, TEST_PROJECT_CONFIG);
    expect(sub).not.toBeNull();
    if (!sub) return;
    expect(sub.elements.length).toBeGreaterThan(0);
    expect(sub.elements.length).toBeLessThanOrEqual(full.elements.length);
    expect(sub.elements.some((e) => e.reference === center)).toBe(true);
    expect(sub.dot).toContain("digraph");
  });

  it("PerformExport.execute subgraph DOT (snapshot)", async () => {
    const full = await getFullAnalysis();
    const ref = "export_module.actions.perform_export.PerformExport.execute";
    const sub = buildNodeSubgraphResult(full, ref, TEST_PROJECT_CONFIG);
    expect(sub).not.toBeNull();
    if (!sub) return;

    expect(sub.dot).toMatchSnapshot();
  });

  it("PerformExport.execute subgraph has no isolated nodes", async () => {
    const full = await getFullAnalysis();
    const ref = "export_module.actions.perform_export.PerformExport.execute";
    const sub = buildNodeSubgraphResult(full, ref, TEST_PROJECT_CONFIG);
    expect(sub).not.toBeNull();
    if (!sub) return;

    const lines = sub.dot.split("\n");
    const edgeLines = lines.filter((l) => l.includes("->"));
    const nodeIdsInEdges = new Set<string>();
    for (const l of edgeLines) {
      const m = l.match(/"([^"]+)"\s*->\s*"([^"]+)"/);
      if (m) {
        nodeIdsInEdges.add(m[1]);
        nodeIdsInEdges.add(m[2]);
      }
    }

    const nodeDecls = lines.filter(
      (l) => l.match(/^\s*"[^"]+"\s*\[/) && !l.includes("->"),
    );

    for (const decl of nodeDecls) {
      const m = decl.match(/"([^"]+)"/);
      expect(
        m && nodeIdsInEdges.has(m[1]),
        `Node "${m?.[1]}" is declared but has no edges — it should be removed`,
      ).toBe(true);
    }
  });

  it("PerformExport.execute subgraph has no empty subgraph clusters", async () => {
    const full = await getFullAnalysis();
    const ref = "export_module.actions.perform_export.PerformExport.execute";
    const sub = buildNodeSubgraphResult(full, ref, TEST_PROJECT_CONFIG);
    expect(sub).not.toBeNull();
    if (!sub) return;

    const emptySubgraphPattern =
      /subgraph\s+"[^"]+"\s*\{\s*(?:label\s*=\s*"[^"]*";\s*)?(?:style\s*=\s*"[^"]*";\s*)*\}/;
    expect(sub.dot).not.toMatch(emptySubgraphPattern);
  });
});
