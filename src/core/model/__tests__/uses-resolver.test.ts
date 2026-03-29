import { describe, it, expect, beforeAll } from "vitest";
import type { ScopeFileAnalysis } from "@/core/parser/codeparsers-types";
import { initParser } from "../../parser/python-parser";
import { scanProject } from "../../parser/project-scanner";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
} from "../../parser/__tests__/test-helpers";
import { createElementsFromAnalyses } from "../element-factory";
import { resolveUses } from "../uses-resolver";
import type { ExecutableElement } from "../executable-element";

const ROOT = getTestProjectRoot();

let elements: ExecutableElement[];
let analyses: ScopeFileAnalysis[];

beforeAll(async () => {
  await initParser();
  const fs = createNodeFsAdapter(ROOT);
  analyses = await scanProject("", fs);
  elements = createElementsFromAnalyses(analyses);
  resolveUses(elements, analyses);
}, 30_000);

function findEl(ref: string): ExecutableElement {
  const el = elements.find((e) => e.reference === ref);
  if (!el) throw new Error(`Element not found: ${ref}`);
  return el;
}

describe("resolveUses", () => {
  it("PerformExport.execute uses GetTasksList.execute", () => {
    const el = findEl(
      "export_module.actions.perform_export.PerformExport.execute",
    );
    const usesRefs = el.uses.map((u) => u.reference);
    expect(usesRefs).toContain(
      "core_module.actions.get_tasks_list.GetTasksList.execute",
    );
  });

  it("PerformExport.execute uses task_RunTodoSync", () => {
    const el = findEl(
      "export_module.actions.perform_export.PerformExport.execute",
    );
    const usesRefs = el.uses.map((u) => u.reference);
    expect(usesRefs).toContain(
      "core_module.tasks.run_todo_sync.task_RunTodoSync",
    );
  });

  it("PerformExport.execute uses task_ExportAllTasks", () => {
    const el = findEl(
      "export_module.actions.perform_export.PerformExport.execute",
    );
    const usesRefs = el.uses.map((u) => u.reference);
    expect(usesRefs).toContain(
      "export_module.tasks.run_exports.task_ExportAllTasks",
    );
  });

  it("AddTaskToList.execute uses GetTasksList.execute", () => {
    const el = findEl(
      "core_module.actions.add_task_to_list.AddTaskToList.execute",
    );
    const usesRefs = el.uses.map((u) => u.reference);
    expect(usesRefs).toContain(
      "core_module.actions.get_tasks_list.GetTasksList.execute",
    );
  });

  it("AddTaskToList._internal_preconditions_check uses GetTasksList.execute", () => {
    const el = findEl(
      "core_module.actions.add_task_to_list.AddTaskToList._internal_preconditions_check",
    );
    const usesRefs = el.uses.map((u) => u.reference);
    expect(usesRefs).toContain(
      "core_module.actions.get_tasks_list.GetTasksList.execute",
    );
  });

  it("elements without calls have empty uses", () => {
    const el = findEl("utils.base_action.BaseBusinessAction");
    expect(el.uses).toEqual([]);
  });

  it("top-level tasks have no uses", () => {
    const el = findEl(
      "core_module.tasks.run_todo_sync.task_RunTodoSync",
    );
    expect(el.uses).toEqual([]);
  });
});
