import { describe, it, expect, beforeAll } from "vitest";
import { initParsers } from "../../parser/universal-parser";
import { scanProject } from "../../parser/project-scanner";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "../../parser/__tests__/test-helpers";
import { createElementsFromAnalyses } from "../element-factory";

const ROOT = getTestProjectRoot();

let elements: ReturnType<typeof createElementsFromAnalyses>;

beforeAll(async () => {
  await initParsers();
  const fs = createNodeFsAdapter(ROOT);
  const analyses = await scanProject("", fs);
  elements = createElementsFromAnalyses(analyses);
}, 60_000);

describe("createElementsFromAnalyses", () => {
  it("creates elements for all expected references", () => {
    const refs = elements.map((e) => e.reference);

    expect(refs).toContain("utils.base_action.BaseBusinessAction");
    expect(refs).toContain(
      "core_module.actions.get_tasks_list.GetTasksList",
    );
    expect(refs).toContain(
      "core_module.actions.get_tasks_list.GetTasksList.execute",
    );
    expect(refs).toContain(
      "core_module.actions.add_task_to_list.AddTaskToList",
    );
    expect(refs).toContain(
      "core_module.actions.add_task_to_list.AddTaskToList.execute",
    );
    expect(refs).toContain(
      "core_module.actions.add_task_to_list.AddTaskToList._internal_preconditions_check",
    );
    expect(refs).toContain(
      "core_module.actions.add_task_to_list.AddTaskToList._internal_empty",
    );
    expect(refs).toContain(
      "core_module.tasks.run_todo_sync.task_RunTodoSync",
    );
    expect(refs).toContain(
      "export_module.actions.perform_export.PerformExport",
    );
    expect(refs).toContain(
      "export_module.actions.perform_export.PerformExport.execute",
    );
    expect(refs).toContain(
      "export_module.tasks.run_exports.task_ExportAllTasks",
    );
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

  it("assigns correct className for methods", () => {
    const listMethod = elements.find(
      (e) => e.reference === "export_module.views.todotask.TodoTaskViewSet.list",
    );
    expect(listMethod).toBeDefined();
    expect(listMethod!.className).toBe("TodoTaskViewSet");
  });

  it("assigns className to the class itself", () => {
    const cls = elements.find(
      (e) =>
        e.reference === "export_module.views.todotask.TodoTaskViewSet",
    );
    expect(cls).toBeDefined();
    expect(cls!.className).toBe("TodoTaskViewSet");
  });

  it("methods inherit normalized parentClasses from their class", () => {
    const execute = elements.find(
      (e) =>
        e.reference ===
        "core_module.actions.get_tasks_list.GetTasksList.execute",
    );
    expect(execute).toBeDefined();
    expect(execute!.parentClasses).toContain(
      "utils.base_action.BaseBusinessAction",
    );
  });

  it("class has normalized parentClasses", () => {
    const cls = elements.find(
      (e) =>
        e.reference === "export_module.views.todotask.TodoTaskViewSet",
    );
    expect(cls!.parentClasses).toEqual([
      "rest_framework.viewsets.ModelViewSet",
    ]);
  });

  it("extracts normalized decorators on functions", () => {
    const task = elements.find(
      (e) =>
        e.reference === "core_module.tasks.run_todo_sync.task_RunTodoSync",
    );
    expect(task).toBeDefined();
    expect(task!.decorators.some((d) => d.includes("shared_task"))).toBe(
      true,
    );
  });

  it("top-level functions have null className", () => {
    const task = elements.find(
      (e) =>
        e.reference === "core_module.tasks.run_todo_sync.task_RunTodoSync",
    );
    expect(task!.className).toBeNull();
  });

  it("all elements start as unclassified", () => {
    for (const el of elements) {
      expect(el.type).toBe("unclassified");
    }
  });
});
