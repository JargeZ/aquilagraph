import type { ScopeFileAnalysis } from "./codeparsers-types";
import { parseFile } from "./python-parser";

export interface FileSystemAdapter {
  readFile: (path: string) => Promise<string>;
  listDir: (path: string) => Promise<{ name: string; isDirectory: boolean }[]>;
}

export async function discoverPythonFiles(
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
        queue.push(fullPath);
      } else if (entry.name.endsWith(".py") && entry.name !== "__init__.py") {
        result.push(fullPath);
      }
    }
  }

  return result.sort();
}

export async function scanProject(
  rootPath: string,
  fs: FileSystemAdapter,
): Promise<ScopeFileAnalysis[]> {
  const files = await discoverPythonFiles(rootPath, fs);
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
