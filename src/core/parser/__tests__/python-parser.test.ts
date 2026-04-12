import { beforeAll, describe, expect, it } from "vitest";
import { initParser, parseFile } from "../python-parser";
import { readTestFile } from "./test-helpers";

beforeAll(async () => {
  await initParser();
}, 30_000);

describe("python-parser", () => {
  it("parses a class with no methods", async () => {
    const content = readTestFile("utils/base_action.py");
    const result = await parseFile("utils/base_action.py", content);

    expect(result.scopes.length).toBeGreaterThanOrEqual(1);
    const cls = result.scopes.find(
      (s) => s.type === "class" && s.name === "BaseBusinessAction",
    );
    expect(cls).toBeDefined();
    expect(cls?.type).toBe("class");
  });

  it("parses a class with methods and parent in signature", async () => {
    const content = readTestFile("export_module/views/todotask.py");
    const result = await parseFile("export_module/views/todotask.py", content);

    const cls = result.scopes.find(
      (s) => s.type === "class" && s.name === "TodoTaskViewSet",
    );
    expect(cls).toBeDefined();
    expect(cls?.signature).toContain("viewsets.ModelViewSet");

    const methods = result.scopes.filter(
      (s) => s.type === "method" && s.parent === "TodoTaskViewSet",
    );
    const methodNames = methods.map((m) => m.name);
    expect(methodNames).toContain("list");
    expect(methodNames).toContain("export");
  });

  it("parses a function with decorators", async () => {
    const content = readTestFile("core_module/tasks/run_todo_sync.py");
    const result = await parseFile(
      "core_module/tasks/run_todo_sync.py",
      content,
    );

    const fn = result.scopes.find(
      (s) => s.type === "function" && s.name === "task_RunTodoSync",
    );
    expect(fn).toBeDefined();
    expect(fn?.decorators).toBeDefined();
    expect(fn?.decorators?.some((d) => d.includes("shared_task"))).toBe(true);
  });

  it("parses method identifier references for uses resolution", async () => {
    const content = readTestFile("export_module/actions/perform_export.py");
    const result = await parseFile(
      "export_module/actions/perform_export.py",
      content,
    );

    const execute = result.scopes.find(
      (s) => s.name === "execute" && s.parent === "PerformExport",
    );
    expect(execute).toBeDefined();
    expect(execute?.identifierReferences.length).toBeGreaterThan(0);

    const importedRefs =
      execute?.identifierReferences.filter(
        (r) => r.kind === "import" && r.isLocalImport,
      ) ?? [];
    const identifiers = importedRefs.map((r) => r.identifier);
    expect(identifiers).toContain("GetTasksList");
    expect(identifiers).toContain("task_RunTodoSync");
    expect(identifiers).toContain("task_ExportAllTasks");
  });

  it("parses file-level import references", async () => {
    const content = readTestFile("core_module/actions/add_task_to_list.py");
    const result = await parseFile(
      "core_module/actions/add_task_to_list.py",
      content,
    );

    expect(result.importReferences.length).toBeGreaterThan(0);
    const sources = result.importReferences.map((ir) => ir.source);
    expect(sources.some((s) => s.includes("base_action"))).toBe(true);
    expect(sources.some((s) => s.includes("get_tasks_list"))).toBe(true);
  });
});
