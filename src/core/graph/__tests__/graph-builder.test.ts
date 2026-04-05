import { describe, it, expect, beforeAll } from "vitest";
import type { ScopeFileAnalysis } from "@/core/parser/codeparsers-types";
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
import { ExecutableElement } from "../../model/executable-element";

const ROOT = getTestProjectRoot();

let analyses: ScopeFileAnalysis[];

const TEST_CONFIG: AnalysisConfig = {
  ...DEFAULT_ANALYSIS_CONFIG,
  /** 0 — всегда субграф по классам (поведение до порога). */
  minMethodsForClassDetail: 0,
  selectors: {
    controlling: { childsOf: ["ModelViewSet"] },
    businessLogic: { childsOf: ["BaseBusinessAction"] },
    sideEffects: { decoratedWith: ["shared_task"] },
  },
};

const ADD_TASK_CLASS =
  "core_module.actions.add_task_to_list.AddTaskToList";
const ADD_TASK_EXECUTE = `${ADD_TASK_CLASS}.execute`;
const GET_TASKS_CLASS =
  "core_module.actions.get_tasks_list.GetTasksList";

beforeAll(async () => {
  await initParser();
  const fs = createNodeFsAdapter(ROOT);
  analyses = await scanProject("", fs);
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

  it("collapses AddTaskToList to a single class node when minMethodsForClassDetail is 3", () => {
    const config: AnalysisConfig = {
      ...TEST_CONFIG,
      minMethodsForClassDetail: 3,
    };
    const elements = prepareElements(config);
    const dot = buildDot(elements, config);

    expect(dot).toContain(`"${ADD_TASK_CLASS}"`);
    expect(dot).not.toContain(`"${ADD_TASK_EXECUTE}"`);
    expect(dot).toContain(
      `"${ADD_TASK_CLASS}" -> "${GET_TASKS_CLASS}"`,
    );
  });

  it("expands AddTaskToList with method nodes when minMethodsForClassDetail is 2", () => {
    const config: AnalysisConfig = {
      ...TEST_CONFIG,
      minMethodsForClassDetail: 2,
    };
    const elements = prepareElements(config);
    const dot = buildDot(elements, config);

    expect(dot).toContain(`"${ADD_TASK_EXECUTE}"`);
  });

  it("wraps nodes in dashed bucket clusters when groupInBucket is enabled", () => {
    const base = {
      decorators: [] as string[],
      parentClasses: [] as string[],
      sourceFile: "x.py",
      startLine: 1,
      endLine: 2,
    };
    const elements = [
      new ExecutableElement({
        ...base,
        reference: "mod.A",
        module: "mod",
        className: "A",
        name: "A",
        type: "controlling",
      }),
      new ExecutableElement({
        ...base,
        reference: "mod.A.foo",
        module: "mod",
        className: "A",
        name: "foo",
        type: "businessLogic",
      }),
    ];
    const config: AnalysisConfig = {
      ...DEFAULT_ANALYSIS_CONFIG,
      minMethodsForClassDetail: 0,
      groupInBucket: {
        controlling: true,
        businessLogic: true,
        sideEffects: true,
      },
    };
    const dot = buildDot(elements, config);

    expect(dot).toContain('subgraph "cluster_mod_bucket_controlling"');
    expect(dot).toContain('subgraph "cluster_mod_bucket_controlling_A"');
    expect(dot).toContain('subgraph "cluster_mod_bucket_businessLogic"');
    expect(dot).toContain('subgraph "cluster_mod_bucket_businessLogic_A"');
    expect(dot).toContain('label = "Controlling"');
    expect(dot).toContain('label = "Business Logic"');
    expect(dot).toMatch(
      /subgraph "cluster_mod_bucket_controlling"[\s\S]*style = "dashed"/,
    );
    expect(dot).toMatch(
      /subgraph "cluster_mod_bucket_businessLogic"[\s\S]*color = "#50C878"/,
    );
  });
});
