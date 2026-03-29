import { describe, it, expect, beforeAll } from "vitest";
import type { ScopeFileAnalysis } from "@luciformresearch/codeparsers";
import { toDot } from "ts-graphviz";
import { initParser } from "../../parser/python-parser";
import { scanProject } from "../../parser/project-scanner";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "../../parser/__tests__/test-helpers";
import { createElementsFromAnalyses } from "../../model/element-factory";
import { classifyElements } from "../../model/element-classifier";
import { resolveUses } from "../../model/uses-resolver";
import { buildGraph, buildDot } from "../graph-builder";
import type { AnalysisConfig } from "../../config/analysis-config";
import { DEFAULT_ANALYSIS_CONFIG } from "../../config/analysis-config";
import type { ExecutableElement } from "../../model/executable-element";

const ROOT = getTestProjectRoot();

let analyses: ScopeFileAnalysis[];
let rawElements: ExecutableElement[];

const TEST_CONFIG: AnalysisConfig = {
  ...DEFAULT_ANALYSIS_CONFIG,
  selectors: {
    controlling: { childsOf: ["ModelViewSet"] },
    businessLogic: { childsOf: ["BaseBusinessAction"] },
    sideEffects: { decoratedWith: ["shared_task"] },
  },
};

beforeAll(async () => {
  await initParser();
  const fs = createNodeFsAdapter(ROOT);
  analyses = await scanProject("", fs);
  rawElements = createElementsFromAnalyses(analyses);
}, 30_000);

function prepareElements(config: AnalysisConfig): ExecutableElement[] {
  const fresh = createElementsFromAnalyses(analyses);
  const classified = classifyElements(fresh, config);
  resolveUses(classified, analyses);
  return classified;
}

describe("buildGraph", () => {
  it("produces a valid DOT graph with depth=1 (snapshot)", () => {
    const elements = prepareElements(TEST_CONFIG);
    const graph = buildGraph(elements, TEST_CONFIG);
    const dot = toDot(graph);

    expect(dot).toMatchSnapshot();
  });

  it("produces a valid DOT graph with depth=2 (snapshot)", () => {
    const config: AnalysisConfig = {
      ...TEST_CONFIG,
      moduleDepth: 2,
    };
    const elements = prepareElements(config);
    const graph = buildGraph(elements, config);
    const dot = toDot(graph);

    expect(dot).toMatchSnapshot();
  });

  it("DOT contains module subgraphs", () => {
    const elements = prepareElements(TEST_CONFIG);
    const dot = buildDot(elements, TEST_CONFIG);

    expect(dot).toContain("cluster_utils");
    expect(dot).toContain("cluster_core_module");
    expect(dot).toContain("cluster_export_module");
  });

  it("DOT contains class subgraphs", () => {
    const elements = prepareElements(TEST_CONFIG);
    const dot = buildDot(elements, TEST_CONFIG);

    expect(dot).toContain("TodoTaskViewSet");
    expect(dot).toContain("GetTasksList");
    expect(dot).toContain("AddTaskToList");
    expect(dot).toContain("PerformExport");
  });

  it("DOT contains edges for uses relationships", () => {
    const elements = prepareElements(TEST_CONFIG);
    const dot = buildDot(elements, TEST_CONFIG);

    expect(dot).toContain(
      '"export_module.actions.perform_export.PerformExport.execute" -> "core_module.actions.get_tasks_list.GetTasksList.execute"',
    );
    expect(dot).toContain(
      '"export_module.actions.perform_export.PerformExport.execute" -> "core_module.tasks.run_todo_sync.task_RunTodoSync"',
    );
  });

  it("DOT with include filter only shows matching elements (snapshot)", () => {
    const config: AnalysisConfig = {
      ...TEST_CONFIG,
      include: ["export_module\\..*"],
    };
    const elements = prepareElements(config);
    const dot = buildDot(elements, config);

    expect(dot).not.toContain("cluster_utils");
    expect(dot).not.toContain("cluster_core_module");
    expect(dot).toContain("cluster_export_module");
    expect(dot).toMatchSnapshot();
  });
});
