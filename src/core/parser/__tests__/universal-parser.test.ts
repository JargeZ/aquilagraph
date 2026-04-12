import * as fs from "node:fs";
import * as path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { initParsers, parseFile } from "../universal-parser";
import { getTestTypeScriptProjectRoot, readTestFile } from "./test-helpers";

beforeAll(async () => {
  await initParsers();
}, 60_000);

describe("universal-parser", () => {
  it("parses Python files", async () => {
    const content = readTestFile("utils/base_action.py");
    const result = await parseFile("utils/base_action.py", content);

    expect(result.scopes.length).toBeGreaterThanOrEqual(1);
    const cls = result.scopes.find((s) => s.name === "BaseBusinessAction");
    expect(cls).toBeDefined();
    expect(cls!.type).toBe("class");
  });

  it("parses TypeScript files", async () => {
    const tsRoot = getTestTypeScriptProjectRoot();
    const content = fs.readFileSync(
      path.join(tsRoot, "utils/base_action.ts"),
      "utf-8",
    );
    const result = await parseFile("utils/base_action.ts", content);

    expect(result.scopes.length).toBeGreaterThanOrEqual(1);
    const cls = result.scopes.find((s) => s.name === "BaseBusinessAction");
    expect(cls).toBeDefined();
    expect(cls!.type).toBe("class");
  });

  it("auto-detects language from extension", async () => {
    const pyContent = readTestFile("core_module/tasks/run_todo_sync.py");
    const pyResult = await parseFile(
      "core_module/tasks/run_todo_sync.py",
      pyContent,
    );
    expect(
      pyResult.scopes.find((s) => s.name === "task_RunTodoSync"),
    ).toBeDefined();

    const tsRoot = getTestTypeScriptProjectRoot();
    const tsContent = fs.readFileSync(
      path.join(tsRoot, "core_module/tasks/run_todo_sync.ts"),
      "utf-8",
    );
    const tsResult = await parseFile(
      "core_module/tasks/run_todo_sync.ts",
      tsContent,
    );
    expect(
      tsResult.scopes.find((s) => s.name === "task_RunTodoSync"),
    ).toBeDefined();
  });
});
