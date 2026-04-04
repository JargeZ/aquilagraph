import { describe, it, expect, beforeAll } from "vitest";
import { initParser } from "../python-parser";
import {
  discoverPythonFiles,
  scanProject,
} from "../project-scanner";
import { createNodeFsAdapter, getTestProjectRoot } from "./test-helpers";

const ROOT = getTestProjectRoot();

beforeAll(async () => {
  await initParser();
}, 30_000);

describe("discoverPythonFiles", () => {
  it("finds all non-init Python files in test project", async () => {
    const fs = createNodeFsAdapter(ROOT);
    const files = await discoverPythonFiles("", fs);

    expect(files).toContain("utils/base_action.py");
    expect(files).toContain("core_module/actions/get_tasks_list.py");
    expect(files).toContain("core_module/actions/add_task_to_list.py");
    expect(files).toContain("core_module/tasks/run_todo_sync.py");
    expect(files).toContain("export_module/actions/perform_export.py");
    expect(files).toContain("export_module/tasks/run_exports.py");
    expect(files).toContain("export_module/views/todotask.py");
    expect(files).toContain("core_module/views/core.py");
    expect(files).toContain("export_module/serializers/task_serializer.py");

    expect(files.every((f) => !f.includes("__init__"))).toBe(true);
    expect(files.length).toBe(9);
  });
});

describe("scanProject", () => {
  it("parses all files in test project", async () => {
    const fs = createNodeFsAdapter(ROOT);
    const analyses = await scanProject("", fs);

    expect(analyses.length).toBe(9);

    const filePaths = analyses.map((a) => a.filePath);
    expect(filePaths).toContain("utils/base_action.py");
    expect(filePaths).toContain("export_module/views/todotask.py");
  });

  it("every analysis has at least one scope", async () => {
    const fs = createNodeFsAdapter(ROOT);
    const analyses = await scanProject("", fs);

    for (const analysis of analyses) {
      expect(
        analysis.scopes.length,
        `${analysis.filePath} should have scopes`,
      ).toBeGreaterThanOrEqual(1);
    }
  });
});
