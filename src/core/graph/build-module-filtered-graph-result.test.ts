import { describe, expect, it } from "vitest";
import { analyzeProject } from "@/core/analyze";
import type { AnalysisConfig } from "@/core/config/analysis-config";
import { TEST_ANALYSIS_CONFIG } from "@/core/config/test-project-analysis-config";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "@/core/parser/__tests__/test-helpers";
import { buildModuleFilteredGraphResult } from "./build-module-filtered-graph-result";

const TEST_PROJECT_CONFIG: AnalysisConfig = { ...TEST_ANALYSIS_CONFIG, moduleDepth: 1 };

async function getFullAnalysis() {
  const fs = createNodeFsAdapter(getTestProjectRoot());
  return analyzeProject("", TEST_PROJECT_CONFIG, fs);
}

describe("buildModuleFilteredGraphResult", () => {
  it("export_module + core_module filtered DOT (snapshot)", async () => {
    const full = await getFullAnalysis();
    const selected = new Set<string>(["export_module", "core_module"]);
    const sub = buildModuleFilteredGraphResult(full, selected, TEST_PROJECT_CONFIG);

    expect(sub.dot).toMatchSnapshot();
  });

  it("removes empty subgraph clusters", async () => {
    const full = await getFullAnalysis();
    const selected = new Set<string>(["export_module", "core_module"]);
    const sub = buildModuleFilteredGraphResult(full, selected, TEST_PROJECT_CONFIG);

    const emptySubgraphPattern =
      /subgraph\s+"[^"]+"\s*\{\s*(?:label\s*=\s*"[^"]*";\s*)?(?:style\s*=\s*"[^"]*";\s*)*\}/;
    expect(sub.dot).not.toMatch(emptySubgraphPattern);
  });
});

