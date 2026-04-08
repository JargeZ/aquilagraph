declare module "@internal/codeparsers-python-scope" {
  import type { ScopeFileAnalysis } from "./core/parser/codeparsers-types";

  export class PythonScopeExtractionParser {
    constructor(language?: string);
    initialize(): Promise<void>;
    parseFile(filePath: string, content: string): Promise<ScopeFileAnalysis>;
  }
}

declare module "@internal/codeparsers-ts-scope" {
  import type { ScopeFileAnalysis } from "./core/parser/codeparsers-types";

  export class ScopeExtractionParser {
    constructor(language?: string);
    initialize(): Promise<void>;
    parseFile(
      filePath: string,
      content: string,
      resolver?: { isPathAlias: (path: string) => boolean },
    ): Promise<ScopeFileAnalysis>;
  }
}
