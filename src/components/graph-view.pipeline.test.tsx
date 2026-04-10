import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProject } from "@/core/analyze";
import type { AnalysisConfig } from "@/core/config/analysis-config";
import { TEST_ANALYSIS_CONFIG } from "@/core/config/test-project-analysis-config";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "@/core/parser/__tests__/test-helpers";
import { GraphView } from "./graph-view";

const TEST_PROJECT_CONFIG: AnalysisConfig = TEST_ANALYSIS_CONFIG;

afterEach(() => {
  cleanup();
});

describe("GraphView + analyze pipeline", () => {
  it("parses the test Python project and renders graph tabs", async () => {
    const fs = createNodeFsAdapter(getTestProjectRoot());
    const result = await analyzeProject("", TEST_PROJECT_CONFIG, fs);

    expect(result.elements.length).toBeGreaterThan(0);
    expect(result.dot).toContain("digraph");

    render(
      <GraphView
        elements={result.elements}
        graph={result.graph}
        dot={result.dot}
      />,
    );

    expect(screen.getByRole("tab", { name: /Граф/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /DOT/ })).toBeDefined();
  }, 60_000);
});
