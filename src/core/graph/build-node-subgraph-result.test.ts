import { describe, expect, it } from "vitest";
import { analyzeProject } from "@/core/analyze";
import {
  type AnalysisConfig,
  DEFAULT_ANALYSIS_CONFIG,
} from "@/core/config/analysis-config";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "@/core/parser/__tests__/test-helpers";
import { buildNodeSubgraphResult } from "./build-node-subgraph-result";

const TEST_PROJECT_CONFIG: AnalysisConfig = {
  ...DEFAULT_ANALYSIS_CONFIG,
  selectors: {
    controlling: { childsOf: ["ModelViewSet"] },
    businessLogic: { childsOf: ["BaseBusinessAction"] },
    sideEffects: { decoratedWith: ["shared_task"] },
  },
};

describe("buildNodeSubgraphResult", () => {
  it("returns null for unknown reference", async () => {
    const fs = createNodeFsAdapter(getTestProjectRoot());
    const full = await analyzeProject("", TEST_PROJECT_CONFIG, fs);
    expect(
      buildNodeSubgraphResult(
        full,
        "definitely.missing.ref",
        TEST_PROJECT_CONFIG,
      ),
    ).toBeNull();
  });

  it("includes center node and is a subset of full graph", async () => {
    const fs = createNodeFsAdapter(getTestProjectRoot());
    const full = await analyzeProject("", TEST_PROJECT_CONFIG, fs);
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
});
