import {
  PythonScopeExtractionParser,
  type ScopeFileAnalysis,
} from "@luciformresearch/codeparsers";

let parserInstance: PythonScopeExtractionParser | null = null;
let initPromise: Promise<void> | null = null;

async function getParser(): Promise<PythonScopeExtractionParser> {
  if (parserInstance) return parserInstance;

  parserInstance = new PythonScopeExtractionParser();
  initPromise ??= parserInstance.initialize();
  await initPromise;
  return parserInstance;
}

export async function initParser(): Promise<void> {
  await getParser();
}

export async function parseFile(
  filePath: string,
  content: string,
): Promise<ScopeFileAnalysis> {
  const parser = await getParser();
  return parser.parseFile(filePath, content);
}

export function resetParser(): void {
  parserInstance = null;
  initPromise = null;
}
