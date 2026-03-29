import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeProject } from "@/core/analyze";
import {
  type AnalysisConfig,
  DEFAULT_ANALYSIS_CONFIG,
} from "@/core/config/analysis-config";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "@/core/parser/__tests__/test-helpers";
import { GraphView } from "./graph-view";

const TEST_PROJECT_CONFIG: AnalysisConfig = {
  ...DEFAULT_ANALYSIS_CONFIG,
  selectors: {
    controlling: { childsOf: ["ModelViewSet"] },
    businessLogic: { childsOf: ["BaseBusinessAction"] },
    sideEffects: { decoratedWith: ["shared_task"] },
  },
};

afterEach(() => {
  cleanup();
});

describe("GraphView + analyze pipeline", () => {
  it("parses the test Python project and renders a digraph DOT preview", async () => {
    const fs = createNodeFsAdapter(getTestProjectRoot());
    const result = await analyzeProject("", TEST_PROJECT_CONFIG, fs);

    expect(result.elements.length).toBeGreaterThan(0);
    expect(result.dot).toContain("digraph");

    const { container } = render(
      <GraphView elements={result.elements} config={TEST_PROJECT_CONFIG} />,
    );

    await screen.findByRole("heading", { name: /Граф \(\d+ элементов\)/ });

    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.textContent ?? "").toContain("digraph");
    expect(pre?.textContent ?? "").toMatch(/digraph|subgraph|->/);
  }, 60_000);
});
