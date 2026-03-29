import { describe, it, expect } from "vitest";
import {
  buildReference,
  getModuleName,
  extractParentClasses,
  filePathToModuleRef,
} from "../reference-builder";

describe("buildReference", () => {
  it("builds reference for a top-level class", () => {
    expect(buildReference("utils/base_action.py", "BaseBusinessAction")).toBe(
      "utils.base_action.BaseBusinessAction",
    );
  });

  it("builds reference for a method in a class", () => {
    expect(
      buildReference(
        "export_module/views/todotask.py",
        "list",
        "TodoTaskViewSet",
      ),
    ).toBe("export_module.views.todotask.TodoTaskViewSet.list");
  });

  it("builds reference for a top-level function", () => {
    expect(
      buildReference(
        "core_module/tasks/run_todo_sync.py",
        "task_RunTodoSync",
      ),
    ).toBe("core_module.tasks.run_todo_sync.task_RunTodoSync");
  });

  it("builds reference for a deeply nested method", () => {
    expect(
      buildReference(
        "export_module/actions/perform_export.py",
        "execute",
        "PerformExport",
      ),
    ).toBe("export_module.actions.perform_export.PerformExport.execute");
  });
});

describe("filePathToModuleRef", () => {
  it("converts file path to module reference", () => {
    expect(filePathToModuleRef("utils/base_action.py")).toBe(
      "utils.base_action",
    );
    expect(filePathToModuleRef("export_module/views/todotask.py")).toBe(
      "export_module.views.todotask",
    );
  });
});

describe("getModuleName", () => {
  it("returns first segment at depth 1", () => {
    expect(
      getModuleName(
        "export_module.views.todotask.TodoTaskViewSet.list",
        1,
      ),
    ).toBe("export_module");
  });

  it("returns first two segments at depth 2", () => {
    expect(
      getModuleName(
        "export_module.views.todotask.TodoTaskViewSet.list",
        2,
      ),
    ).toBe("export_module.views");
  });

  it("returns full reference if depth exceeds segments", () => {
    expect(getModuleName("utils.base_action.BaseBusinessAction", 10)).toBe(
      "utils.base_action.BaseBusinessAction",
    );
  });
});

describe("extractParentClasses", () => {
  it("extracts single parent", () => {
    expect(
      extractParentClasses("class PerformExport(BaseBusinessAction)"),
    ).toEqual(["BaseBusinessAction"]);
  });

  it("extracts dotted parent", () => {
    expect(
      extractParentClasses(
        "class TodoTaskViewSet(viewsets.ModelViewSet)",
      ),
    ).toEqual(["viewsets.ModelViewSet"]);
  });

  it("extracts multiple parents", () => {
    expect(
      extractParentClasses("class Foo(Bar, Baz, Qux)"),
    ).toEqual(["Bar", "Baz", "Qux"]);
  });

  it("returns empty for class without parents", () => {
    expect(extractParentClasses("class BaseBusinessAction")).toEqual([]);
  });

  it("returns empty for non-class signature", () => {
    expect(extractParentClasses("def foo(a, b)")).toEqual([]);
  });
});
