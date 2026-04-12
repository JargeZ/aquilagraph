import { describe, expect, it } from "vitest";
import type {
  ImportReference,
  ScopeInfo,
} from "@/core/parser/codeparsers-types";
import {
  buildReference,
  extractParentClasses,
  extractParentClassesFromScope,
  extractParentClassesFromSignature,
  filePathToModuleRef,
  getModuleName,
  normalizeSymbolRef,
} from "../reference-builder";

describe("buildReference", () => {
  it("builds reference for a top-level class (.py)", () => {
    expect(buildReference("utils/base_action.py", "BaseBusinessAction")).toBe(
      "utils.base_action.BaseBusinessAction",
    );
  });

  it("builds reference for a method in a class (.py)", () => {
    expect(
      buildReference(
        "export_module/views/todotask.py",
        "list",
        "TodoTaskViewSet",
      ),
    ).toBe("export_module.views.todotask.TodoTaskViewSet.list");
  });

  it("builds reference for a top-level function (.py)", () => {
    expect(
      buildReference("core_module/tasks/run_todo_sync.py", "task_RunTodoSync"),
    ).toBe("core_module.tasks.run_todo_sync.task_RunTodoSync");
  });

  it("builds reference for a TypeScript class (.ts)", () => {
    expect(buildReference("utils/base_action.ts", "BaseBusinessAction")).toBe(
      "utils.base_action.BaseBusinessAction",
    );
  });

  it("builds reference for a TypeScript method (.ts)", () => {
    expect(
      buildReference(
        "core_module/actions/add_task_to_list.ts",
        "execute",
        "AddTaskToList",
      ),
    ).toBe("core_module.actions.add_task_to_list.AddTaskToList.execute");
  });

  it("handles .tsx extension", () => {
    expect(buildReference("app/Component.tsx", "render")).toBe(
      "app.Component.render",
    );
  });
});

describe("filePathToModuleRef", () => {
  it("strips .py extension", () => {
    expect(filePathToModuleRef("utils/base_action.py")).toBe(
      "utils.base_action",
    );
  });

  it("strips .ts extension", () => {
    expect(filePathToModuleRef("utils/base_action.ts")).toBe(
      "utils.base_action",
    );
  });

  it("strips .tsx extension", () => {
    expect(filePathToModuleRef("app/Component.tsx")).toBe("app.Component");
  });

  it("strips .js extension", () => {
    expect(filePathToModuleRef("lib/index.js")).toBe("lib.index");
  });
});

describe("getModuleName", () => {
  it("returns first segment at depth 1", () => {
    expect(
      getModuleName("export_module.views.todotask.TodoTaskViewSet.list", 1),
    ).toBe("export_module");
  });

  it("returns first two segments at depth 2", () => {
    expect(
      getModuleName("export_module.views.todotask.TodoTaskViewSet.list", 2),
    ).toBe("export_module.views");
  });

  it("returns full reference if depth exceeds segments", () => {
    expect(getModuleName("utils.base_action.BaseBusinessAction", 10)).toBe(
      "utils.base_action.BaseBusinessAction",
    );
  });
});

describe("extractParentClasses (legacy)", () => {
  it("extracts single parent from Python signature", () => {
    expect(
      extractParentClasses("class PerformExport(BaseBusinessAction)"),
    ).toEqual(["BaseBusinessAction"]);
  });

  it("extracts dotted parent", () => {
    expect(
      extractParentClasses("class TodoTaskViewSet(viewsets.ModelViewSet)"),
    ).toEqual(["viewsets.ModelViewSet"]);
  });

  it("extracts multiple parents", () => {
    expect(extractParentClasses("class Foo(Bar, Baz, Qux)")).toEqual([
      "Bar",
      "Baz",
      "Qux",
    ]);
  });

  it("returns empty for class without parents", () => {
    expect(extractParentClasses("class BaseBusinessAction")).toEqual([]);
  });

  it("returns empty for non-class signature", () => {
    expect(extractParentClasses("def foo(a, b)")).toEqual([]);
  });
});

describe("extractParentClassesFromScope", () => {
  it("uses heritageClauses when available (TypeScript)", () => {
    const scope = {
      heritageClauses: [
        { clause: "extends" as const, types: ["BaseBusinessAction"] },
      ],
      signature: "class AddTaskToList extends BaseBusinessAction",
    } as ScopeInfo;
    expect(extractParentClassesFromScope(scope)).toEqual([
      "BaseBusinessAction",
    ]);
  });

  it("falls back to signature for Python", () => {
    const scope = {
      signature: "class GetTasksList(BaseBusinessAction)",
    } as ScopeInfo;
    expect(extractParentClassesFromScope(scope)).toEqual([
      "BaseBusinessAction",
    ]);
  });

  it("handles multiple heritage types", () => {
    const scope = {
      heritageClauses: [
        { clause: "extends" as const, types: ["Base"] },
        { clause: "implements" as const, types: ["IFoo", "IBar"] },
      ],
      signature: "",
    } as ScopeInfo;
    expect(extractParentClassesFromScope(scope)).toEqual(["Base"]);
  });
});

describe("normalizeSymbolRef", () => {
  const pythonImports: ImportReference[] = [
    {
      source: "utils.base_action",
      imported: "BaseBusinessAction",
      kind: "named",
      isLocal: true,
    },
    {
      source: "celery",
      imported: "shared_task",
      kind: "named",
      isLocal: false,
    },
    {
      source: "rest_framework",
      imported: "viewsets",
      kind: "named",
      isLocal: false,
    },
  ];

  it("resolves a local Python import to full module path", () => {
    expect(
      normalizeSymbolRef(
        "BaseBusinessAction",
        pythonImports,
        "core_module/actions/get_tasks_list.py",
      ),
    ).toBe("utils.base_action.BaseBusinessAction");
  });

  it("resolves an external import", () => {
    expect(
      normalizeSymbolRef(
        "shared_task",
        pythonImports,
        "core_module/tasks/run_todo_sync.py",
      ),
    ).toBe("celery.shared_task");
  });

  it("resolves dotted symbol via import prefix", () => {
    expect(
      normalizeSymbolRef(
        "viewsets.ModelViewSet",
        pythonImports,
        "export_module/views/todotask.py",
      ),
    ).toBe("rest_framework.viewsets.ModelViewSet");
  });

  it("returns symbol unchanged when no matching import", () => {
    expect(normalizeSymbolRef("UnknownClass", pythonImports, "foo.py")).toBe(
      "UnknownClass",
    );
  });

  const tsImports: ImportReference[] = [
    {
      source: "@/utils/base_action",
      imported: "BaseBusinessAction",
      kind: "named",
      isLocal: false,
    },
    {
      source: "../tasks/run_exports",
      imported: "task_ExportAllTasks_si",
      kind: "named",
      isLocal: true,
    },
  ];

  it("resolves a TypeScript path alias import", () => {
    expect(
      normalizeSymbolRef(
        "BaseBusinessAction",
        tsImports,
        "core_module/actions/add_task_to_list.ts",
      ),
    ).toBe("utils.base_action.BaseBusinessAction");
  });

  it("resolves a TypeScript relative import", () => {
    expect(
      normalizeSymbolRef(
        "task_ExportAllTasks_si",
        tsImports,
        "export_module/actions/perform_export.ts",
      ),
    ).toBe("export_module.tasks.run_exports.task_ExportAllTasks_si");
  });
});
