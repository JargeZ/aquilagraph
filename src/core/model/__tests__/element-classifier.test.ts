import { beforeAll, describe, expect, it } from "vitest";
import type { AnalysisConfig } from "../../config/analysis-config";
import { DEFAULT_ANALYSIS_CONFIG } from "../../config/analysis-config";
import { TEST_ANALYSIS_CONFIG } from "../../config/test-project-analysis-config";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "../../parser/__tests__/test-helpers";
import { scanProject } from "../../parser/project-scanner";
import { initParsers } from "../../parser/universal-parser";
import { classifyElements } from "../element-classifier";
import { createElementsFromAnalyses } from "../element-factory";
import type { ExecutableElement } from "../executable-element";

const ROOT = getTestProjectRoot();

let allElements: ExecutableElement[];

beforeAll(async () => {
  await initParsers();
  const fs = createNodeFsAdapter(ROOT);
  const analyses = await scanProject("", fs);
  allElements = createElementsFromAnalyses(analyses);
}, 60_000);

function freshElements(): ExecutableElement[] {
  return createElementsFromAnalyses.length
    ? allElements.map((el) =>
        Object.assign(Object.create(Object.getPrototypeOf(el)), el, {
          uses: [],
        }),
      )
    : allElements;
}

const TEST_CONFIG: AnalysisConfig = TEST_ANALYSIS_CONFIG;

describe("classifyElements", () => {
  it("classifies controlling elements by childsOf", () => {
    const classified = classifyElements(freshElements(), TEST_CONFIG);
    const controlling = classified.filter((e) => e.type === "cat_ctrl");
    const refs = controlling.map((e) => e.reference);

    expect(refs).toContain("export_module.views.todotask.TodoTaskViewSet");
    expect(refs).toContain("export_module.views.todotask.TodoTaskViewSet.list");
    expect(refs).toContain(
      "export_module.views.todotask.TodoTaskViewSet.export",
    );
  });

  it("classifies business logic elements by childsOf", () => {
    const classified = classifyElements(freshElements(), TEST_CONFIG);
    const biz = classified.filter((e) => e.type === "cat_biz");
    const refs = biz.map((e) => e.reference);

    expect(refs).toContain("core_module.actions.get_tasks_list.GetTasksList");
    expect(refs).toContain(
      "core_module.actions.get_tasks_list.GetTasksList.execute",
    );
    expect(refs).toContain(
      "core_module.actions.add_task_to_list.AddTaskToList.execute",
    );
    expect(refs).toContain(
      "export_module.actions.perform_export.PerformExport.execute",
    );
  });

  it("classifies side effect elements by decoratedWith", () => {
    const classified = classifyElements(freshElements(), TEST_CONFIG);
    const side = classified.filter((e) => e.type === "cat_side");
    const refs = side.map((e) => e.reference);

    expect(refs).toContain("core_module.tasks.run_todo_sync.task_RunTodoSync");
    expect(refs).toContain(
      "export_module.tasks.run_exports.task_ExportAllTasks",
    );
  });

  it("leaves unmatched elements as unclassified", () => {
    const classified = classifyElements(freshElements(), TEST_CONFIG);
    const baseAction = classified.find(
      (e) => e.reference === "utils.base_action.BaseBusinessAction",
    );
    expect(baseAction).toBeDefined();
    expect(baseAction?.type).toBe("unclassified");
  });

  it("classifies by references selector", () => {
    const config: AnalysisConfig = {
      ...DEFAULT_ANALYSIS_CONFIG,
      classifications: [
        {
          id: "cat_refs",
          name: "Controlling",
          color: "#4A90D9",
          selectors: { references: [".*ViewSet.*"] },
          groupInBucket: false,
          exclude: false,
          mute: false,
        },
      ],
    };
    const classified = classifyElements(freshElements(), config);
    const controlling = classified.filter((e) => e.type === "cat_refs");
    const refs = controlling.map((e) => e.reference);
    expect(controlling.every((e) => e.reference.includes("ViewSet"))).toBe(
      true,
    );
    expect(refs).toContain("core_module.views.core.CoreViewSet");
    expect(refs).toContain("export_module.views.todotask.TodoTaskViewSet");
    expect(controlling.length).toBeGreaterThanOrEqual(5);
  });

  it("applies include filter", () => {
    const config: AnalysisConfig = {
      ...TEST_CONFIG,
      include: ["export_module\\..*"],
    };
    const classified = classifyElements(freshElements(), config);

    expect(
      classified.every((e) => e.reference.startsWith("export_module.")),
    ).toBe(true);
    expect(
      classified.some(
        (e) =>
          e.reference === "export_module.views.todotask.TodoTaskViewSet.list",
      ),
    ).toBe(true);
  });

  it("applies exclude filter", () => {
    const config: AnalysisConfig = {
      ...TEST_CONFIG,
      exclude: [".*\\._internal.*"],
    };
    const classified = classifyElements(freshElements(), config);

    expect(classified.some((e) => e.reference.includes("_internal"))).toBe(
      false,
    );
    expect(
      classified.some(
        (e) =>
          e.reference ===
          "core_module.actions.add_task_to_list.AddTaskToList.execute",
      ),
    ).toBe(true);
  });

  it("include and exclude work together", () => {
    const config: AnalysisConfig = {
      ...TEST_CONFIG,
      include: ["core_module\\..*"],
      exclude: [".*\\._internal.*"],
    };
    const classified = classifyElements(freshElements(), config);

    expect(
      classified.every((e) => e.reference.startsWith("core_module.")),
    ).toBe(true);
    expect(classified.some((e) => e.reference.includes("_internal"))).toBe(
      false,
    );
  });
});
