import { describe, expect, it } from "vitest";
import { analyzeProject } from "../analyze";
import { TEST_ANALYSIS_CONFIG } from "../config/test-project-analysis-config";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "../parser/__tests__/test-helpers";

const ROOT = getTestProjectRoot();

const TEST_CONFIG = TEST_ANALYSIS_CONFIG;

describe("analyzeProject (integration)", () => {
  it("produces a complete analysis with DOT output (snapshot)", async () => {
    const fs = createNodeFsAdapter(ROOT);
    const result = await analyzeProject("", TEST_CONFIG, fs);

    expect(result.elements.length).toBeGreaterThan(0);
    expect(result.dot).toContain("digraph");
    expect(result.dot).toMatchSnapshot();
  }, 60_000);

  it("returns classified elements (isolated nodes filtered out)", async () => {
    const fs = createNodeFsAdapter(ROOT);
    const result = await analyzeProject("", TEST_CONFIG, fs);

    const types = new Set(result.elements.map((e) => e.type));
    expect(types).toContain("cat_biz");
    expect(types).toContain("cat_side");

    for (const el of result.elements) {
      const hasOutgoing = el.uses.some((t) => result.elements.includes(t));
      const hasIncoming = result.elements.some(
        (other) => other !== el && other.uses.includes(el),
      );
      expect(hasOutgoing || hasIncoming).toBe(true);
    }
  }, 60_000);

  it("resolves uses relationships", async () => {
    const fs = createNodeFsAdapter(ROOT);
    const result = await analyzeProject("", TEST_CONFIG, fs);

    const performExecEl = result.elements.find(
      (e) =>
        e.reference ===
        "export_module.actions.perform_export.PerformExport.execute",
    );
    expect(performExecEl).toBeDefined();
    expect(performExecEl?.uses.length).toBeGreaterThan(0);
  }, 60_000);
});
