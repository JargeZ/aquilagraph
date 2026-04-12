import "./tauri-web-tree-sitter-setup";
import { PythonScopeExtractionParser } from "@internal/codeparsers-python-scope";
import { ScopeExtractionParser } from "@internal/codeparsers-ts-scope";
import type { ScopeFileAnalysis } from "./codeparsers-types";

const PYTHON_EXTENSIONS = new Set([".py", ".pyi"]);
const TYPESCRIPT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

let pythonParser: PythonScopeExtractionParser | null = null;
let tsParser: ScopeExtractionParser | null = null;
let pythonInitPromise: Promise<void> | null = null;
let tsInitPromise: Promise<void> | null = null;

function getExtension(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  return dot === -1 ? "" : filePath.slice(dot).toLowerCase();
}

async function getPythonParser(): Promise<PythonScopeExtractionParser> {
  if (pythonParser) return pythonParser;
  pythonParser = new PythonScopeExtractionParser();
  pythonInitPromise ??= pythonParser.initialize();
  // biome-ignore lint/nursery/useAwaitThenable: initialize() returns Promise<void> (codeparsers-internal.d.ts); Biome does not resolve the internal path alias types.
  await pythonInitPromise;
  return pythonParser;
}

async function getTsParser(): Promise<ScopeExtractionParser> {
  if (tsParser) return tsParser;
  tsParser = new ScopeExtractionParser("typescript");
  tsInitPromise ??= tsParser.initialize();
  // biome-ignore lint/nursery/useAwaitThenable: initialize() returns Promise<void> (codeparsers-internal.d.ts); Biome does not resolve the internal path alias types.
  await tsInitPromise;
  return tsParser;
}

export async function initParsers(): Promise<void> {
  await Promise.all([getPythonParser(), getTsParser()]);
}

export async function parseFile(
  filePath: string,
  content: string,
): Promise<ScopeFileAnalysis> {
  const ext = getExtension(filePath);

  if (PYTHON_EXTENSIONS.has(ext)) {
    const parser = await getPythonParser();
    return parser.parseFile(filePath, content);
  }

  if (TYPESCRIPT_EXTENSIONS.has(ext)) {
    const parser = await getTsParser();
    return parser.parseFile(filePath, content);
  }

  throw new Error(`Unsupported file extension: ${ext} (file: ${filePath})`);
}

export function isSupportedCodeFile(filePath: string): boolean {
  const ext = getExtension(filePath);
  return PYTHON_EXTENSIONS.has(ext) || TYPESCRIPT_EXTENSIONS.has(ext);
}

export function resetParsers(): void {
  pythonParser = null;
  tsParser = null;
  pythonInitPromise = null;
  tsInitPromise = null;
}
