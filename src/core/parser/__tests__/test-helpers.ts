import * as fs from "node:fs";
import * as path from "node:path";
import type { FileSystemAdapter } from "../project-scanner";

const TEST_PROJECT_ROOT = path.resolve(
  __dirname,
  "../../../../test_python_project/src",
);

export function getTestProjectRoot(): string {
  return TEST_PROJECT_ROOT;
}

export function readTestFile(relativePath: string): string {
  return fs.readFileSync(path.join(TEST_PROJECT_ROOT, relativePath), "utf-8");
}

export function createNodeFsAdapter(basePath: string): FileSystemAdapter {
  return {
    readFile: async (filePath: string) =>
      fs.readFileSync(path.resolve(basePath, filePath), "utf-8"),
    listDir: async (dirPath: string) => {
      const fullPath = path.resolve(basePath, dirPath);
      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      return entries.map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
      }));
    },
  };
}
