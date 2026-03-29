import { describe, it, expect, beforeAll } from "vitest";
import { initParser } from "../../parser/python-parser";
import { scanProject } from "../../parser/project-scanner";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "../../parser/__tests__/test-helpers";
import { createElementsFromAnalyses } from "../element-factory";
import { classifyElements } from "../element-classifier";
import type { AnalysisConfig } from "../../config/analysis-config";
import { DEFAULT_ANALYSIS_CONFIG } from "../../config/analysis-config";
import type { ExecutableElement } from "../executable-element";

const ROOT = getTestProjectRoot();

let allElements: ExecutableElement[];

beforeAll(async () => {
  await initParser();
  const fs = createNodeFsAdapter(ROOT);
  const analyses = await scanProject("", fs);
  allElements = createElementsFromAnalyses(analyses);
}, 30_000);

function freshElements(): ExecutableElement[] {
  return createElementsFromAnalyses.length
    ? allElements.map((el) => Object.assign(Object.create(Object.getPrototypeOf(el)), el, { uses: [] }))
    : allElements;
}

const TEST_CONFIG: AnalysisConfig = {
  ...DEFAULT_ANALYSIS_CONFIG,
  selectors: {
    controlling: {
      childsOf: ["ModelViewSet"],
    },
    businessLogic: {
      childsOf: ["BaseBusinessAction"],
    },
    sideEffects: {
      decoratedWith: ["shared_task"],
    },
  },
};

describe("classifyElements", () => {
  it("classifies controlling elements by childsOf", () => {
    const classified = classifyElements(freshElements(), TEST_CONFIG);
    const controlling = classified.filter((e) => e.type === "controlling");
    const refs = controlling.map((e) => e.reference);

    expect(refs).toContain(
      "export_module.views.todotask.TodoTaskViewSet",
    );
    expect(refs).toContain(
      "export_module.views.todotask.TodoTaskViewSet.list",
    );
    expect(refs).toContain(
      "export_module.views.todotask.TodoTaskViewSet.export",
    );
  });

  it("classifies business logic elements by childsOf", () => {
    const classified = classifyElements(freshElements(), TEST_CONFIG);
    const biz = classified.filter((e) => e.type === "businessLogic");
    const refs = biz.map((e) => e.reference);

    expect(refs).toContain(
      "core_module.actions.get_tasks_list.GetTasksList",
    );
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
    const side = classified.filter((e) => e.type === "sideEffect");
    const refs = side.map((e) => e.reference);

    expect(refs).toContain(
      "core_module.tasks.run_todo_sync.task_RunTodoSync",
    );
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
    expect(baseAction!.type).toBe("unclassified");
  });

  it("classifies by references selector", () => {
    const config: AnalysisConfig = {
      ...DEFAULT_ANALYSIS_CONFIG,
      selectors: {
        controlling: {
          references: [".*ViewSet.*"],
        },
        businessLogic: {},
        sideEffects: {},
      },
    };
    const classified = classifyElements(freshElements(), config);
    const controlling = classified.filter((e) => e.type === "controlling");
    expect(
      controlling.every((e) => e.reference.includes("ViewSet")),
    ).toBe(true);
    expect(controlling.length).toBe(3);
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
          e.reference ===
          "export_module.views.todotask.TodoTaskViewSet.list",
      ),
    ).toBe(true);
  });

  it("applies exclude filter", () => {
    const config: AnalysisConfig = {
      ...TEST_CONFIG,
      exclude: [".*\\._internal.*"],
    };
    const classified = classifyElements(freshElements(), config);

    expect(
      classified.some((e) => e.reference.includes("_internal")),
    ).toBe(false);
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
    expect(
      classified.some((e) => e.reference.includes("_internal")),
    ).toBe(false);
  });
});
