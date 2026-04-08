import type { ScopeFileAnalysis } from "./codeparsers-types";
import { isSupportedCodeFile, parseFile } from "./universal-parser";

export interface FileSystemAdapter {
  readFile: (path: string) => Promise<string>;
  listDir: (path: string) => Promise<{ name: string; isDirectory: boolean }[]>;
}

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "__pycache__",
  ".mypy_cache",
  ".pytest_cache",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".venv",
  "venv",
]);

const IGNORED_FILES = new Set(["__init__.py"]);

export async function discoverCodeFiles(
  rootPath: string,
  fs: FileSystemAdapter,
): Promise<string[]> {
  const result: string[] = [];
  const queue = [rootPath];

  while (queue.length > 0) {
    const dir = queue.pop()!;
    const entries = await fs.listDir(dir);

    for (const entry of entries) {
      const fullPath = dir === "" ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDirectory) {
        if (!IGNORED_DIRS.has(entry.name)) {
          queue.push(fullPath);
        }
      } else if (
        isSupportedCodeFile(entry.name) &&
        !IGNORED_FILES.has(entry.name)
      ) {
        result.push(fullPath);
      }
    }
  }

  return result.sort();
}

/** @deprecated Use discoverCodeFiles instead */
export const discoverPythonFiles = discoverCodeFiles;

export async function scanProject(
  rootPath: string,
  fs: FileSystemAdapter,
): Promise<ScopeFileAnalysis[]> {
  const files = await discoverCodeFiles(rootPath, fs);
  const results: ScopeFileAnalysis[] = [];

  for (const filePath of files) {
    const absolutePath =
      rootPath === "" ? filePath : `${rootPath}/${filePath}`;
    const content = await fs.readFile(absolutePath);
    const analysis = await parseFile(filePath, content);
    results.push(analysis);
  }

  return results;
}
