import { beforeAll, describe, expect, it } from "vitest";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
  getTestTypeScriptProjectRoot,
} from "../../parser/__tests__/test-helpers";
import { scanProject } from "../../parser/project-scanner";
import { initParsers } from "../../parser/universal-parser";
import { createElementsFromAnalyses } from "../element-factory";
import type { ExecutableElement } from "../executable-element";

function serializeForSnapshot(elements: ExecutableElement[]) {
  return elements
    .sort((a, b) => a.reference.localeCompare(b.reference))
    .map((el) => ({
      reference: el.reference,
      module: el.module,
      className: el.className,
      name: el.name,
      decorators: el.decorators,
      parentClasses: el.parentClasses,
      sourceFile: el.sourceFile,
    }));
}

describe("element-factory snapshots", () => {
  describe("Python test project", () => {
    let elements: ExecutableElement[];

    beforeAll(async () => {
      await initParsers();
      const root = getTestProjectRoot();
      const fs = createNodeFsAdapter(root);
      const analyses = await scanProject("", fs);
      elements = createElementsFromAnalyses(analyses);
    }, 60_000);

    it("produces expected elements", () => {
      expect(serializeForSnapshot(elements)).toMatchSnapshot();
    });
  });

  describe("TypeScript test project", () => {
    let elements: ExecutableElement[];

    beforeAll(async () => {
      await initParsers();
      const root = getTestTypeScriptProjectRoot();
      const fs = createNodeFsAdapter(root);
      const analyses = await scanProject("", fs);
      elements = createElementsFromAnalyses(analyses);
    }, 60_000);

    it("produces expected elements", () => {
      expect(serializeForSnapshot(elements)).toMatchSnapshot();
    });

    it("normalizes references to dot-notation module paths", () => {
      const refs = elements.map((e) => e.reference);
      expect(refs).toContain(
        "core_module.actions.add_task_to_list.AddTaskToList",
      );
      expect(refs).toContain(
        "core_module.actions.add_task_to_list.AddTaskToList.execute",
      );
      expect(refs).toContain("utils.base_action.BaseBusinessAction");
    });

    it("normalizes parentClasses to full module paths", () => {
      const addTask = elements.find(
        (e) =>
          e.reference === "core_module.actions.add_task_to_list.AddTaskToList",
      );
      expect(addTask).toBeDefined();
      expect(addTask?.parentClasses).toContain(
        "utils.base_action.BaseBusinessAction",
      );
    });
  });
});
