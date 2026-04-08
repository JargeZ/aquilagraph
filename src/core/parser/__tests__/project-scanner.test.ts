import { describe, it, expect, beforeAll } from "vitest";
import { initParsers } from "../universal-parser";
import {
  discoverCodeFiles,
  scanProject,
} from "../project-scanner";
import {
  createNodeFsAdapter,
  getTestProjectRoot,
  getTestTypeScriptProjectRoot,
} from "./test-helpers";

const PYTHON_ROOT = getTestProjectRoot();
const TS_ROOT = getTestTypeScriptProjectRoot();

beforeAll(async () => {
  await initParsers();
}, 60_000);

describe("discoverCodeFiles", () => {
  it("finds all Python files in test project (excludes __init__.py)", async () => {
    const fs = createNodeFsAdapter(PYTHON_ROOT);
    const files = await discoverCodeFiles("", fs);

    expect(files).toContain("utils/base_action.py");
    expect(files).toContain("core_module/actions/get_tasks_list.py");
    expect(files).toContain("core_module/actions/add_task_to_list.py");
    expect(files).toContain("core_module/tasks/run_todo_sync.py");
    expect(files).toContain("export_module/actions/perform_export.py");
    expect(files).toContain("export_module/tasks/run_exports.py");
    expect(files).toContain("export_module/views/todotask.py");
    expect(files).toContain("core_module/views/core.py");
    expect(files).toContain("export_module/serializers/task_serializer.py");

    expect(files).toContain("core_module/views/reports.py");

    expect(files.every((f) => !f.includes("__init__"))).toBe(true);
    expect(files.length).toBe(10);
  });

  it("finds all TypeScript files in test project (excludes node_modules)", async () => {
    const fs = createNodeFsAdapter(TS_ROOT);
    const files = await discoverCodeFiles("", fs);

    expect(files).toContain("utils/base_action.ts");
    expect(files).toContain("core_module/actions/add_task_to_list.ts");
    expect(files).toContain("core_module/actions/get_tasks_list.ts");
    expect(files).toContain("export_module/actions/perform_export.ts");
    expect(files.every((f) => !f.includes("node_modules"))).toBe(true);
    expect(files.every((f) => f.endsWith(".ts"))).toBe(true);
  });
});

describe("scanProject", () => {
  it("parses all Python files in test project", async () => {
    const fs = createNodeFsAdapter(PYTHON_ROOT);
    const analyses = await scanProject("", fs);

    expect(analyses.length).toBe(10);

    const filePaths = analyses.map((a) => a.filePath);
    expect(filePaths).toContain("utils/base_action.py");
    expect(filePaths).toContain("export_module/views/todotask.py");
  });

  it("parses all TypeScript files in test project", async () => {
    const fs = createNodeFsAdapter(TS_ROOT);
    const analyses = await scanProject("", fs);

    expect(analyses.length).toBeGreaterThan(0);

    const filePaths = analyses.map((a) => a.filePath);
    expect(filePaths).toContain("utils/base_action.ts");
    expect(filePaths).toContain("core_module/actions/add_task_to_list.ts");
  });

  it("every analysis has at least one scope", async () => {
    const fs = createNodeFsAdapter(PYTHON_ROOT);
    const analyses = await scanProject("", fs);

    for (const analysis of analyses) {
      expect(
        analysis.scopes.length,
        `${analysis.filePath} should have scopes`,
      ).toBeGreaterThanOrEqual(1);
    }
  });
});
