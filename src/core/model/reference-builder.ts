import type {
  ScopeInfo,
  ImportReference,
} from "@/core/parser/codeparsers-types";

const CODE_EXTENSIONS = /\.(py|pyi|ts|tsx|js|jsx|mts|cts|mjs|cjs)$/;

/**
 * Builds unique dot-notation references from file paths and scope names.
 *
 * Example: filePath="export_module/actions/perform_export.py", scopeName="execute", parentName="PerformExport"
 * => "export_module.actions.perform_export.PerformExport.execute"
 */
export function buildReference(
  filePath: string,
  scopeName: string,
  parentName?: string,
): string {
  const moduleRef = filePathToModuleRef(filePath);
  const parts = [moduleRef];
  if (parentName) parts.push(parentName);
  parts.push(scopeName);
  return parts.join(".");
}

export function filePathToModuleRef(filePath: string): string {
  return filePath.replace(CODE_EXTENSIONS, "").replace(/\//g, ".");
}

export function getModuleName(reference: string, depth: number): string {
  const parts = reference.split(".");
  return parts.slice(0, depth).join(".");
}

/**
 * Extracts parent class names from a scope, using heritageClauses (TS)
 * or signature regex (Python) depending on what's available.
 */
export function extractParentClassesFromScope(scope: ScopeInfo): string[] {
  if (scope.heritageClauses?.length) {
    const extendsClause = scope.heritageClauses.find(
      (hc) => hc.clause === "extends",
    );
    return extendsClause?.types ?? [];
  }
  return extractParentClassesFromSignature(scope.signature);
}

/**
 * Extracts parent class names from a Python class signature.
 * e.g. "class Foo(Bar, Baz)" => ["Bar", "Baz"]
 * e.g. "class Foo(viewsets.ModelViewSet)" => ["viewsets.ModelViewSet"]
 */
export function extractParentClassesFromSignature(signature: string): string[] {
  const match = signature.match(/^class\s+\w+\s*\(([^)]+)\)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** @deprecated Use extractParentClassesFromScope or extractParentClassesFromSignature */
export const extractParentClasses = extractParentClassesFromSignature;

/**
 * Resolves a symbol name to its full dot-notation module path using
 * the file's import references.
 *
 * Examples:
 *   "BaseBusinessAction" + import from "utils.base_action" => "utils.base_action.BaseBusinessAction"
 *   "shared_task" + import from "celery" => "celery.shared_task"
 *   "viewsets.ModelViewSet" + import "viewsets" from "rest_framework" => "rest_framework.viewsets.ModelViewSet"
 */
export function normalizeSymbolRef(
  symbolName: string,
  importRefs: ImportReference[],
  currentFile: string,
): string {
  const dotIdx = symbolName.indexOf(".");
  const baseName = dotIdx === -1 ? symbolName : symbolName.slice(0, dotIdx);
  const suffix = dotIdx === -1 ? "" : symbolName.slice(dotIdx);

  for (const imp of importRefs) {
    const matchName = imp.alias ?? imp.imported;
    if (matchName !== baseName) continue;

    const resolvedSource = normalizeImportSourceForRef(
      imp.source,
      currentFile,
    );
    return `${resolvedSource}.${imp.imported}${suffix}`;
  }

  return symbolName;
}

/**
 * Normalize an import source to dot-notation module path, handling:
 * - Python relative imports (.foo, ..bar)
 * - TypeScript relative imports (./foo, ../bar)
 * - TypeScript path aliases (@/foo/bar)
 * - Absolute/bare specifiers (returned as-is with / → .)
 */
function normalizeImportSourceForRef(
  source: string,
  currentFile: string,
): string {
  if (source.startsWith("@/")) {
    return source
      .slice(2)
      .replace(/\//g, ".")
      .replace(CODE_EXTENSIONS, "");
  }

  if (source.startsWith("./") || source.startsWith("../")) {
    return resolveTypeScriptRelativeImport(source, currentFile);
  }

  if (source.startsWith(".")) {
    return resolvePythonRelativeImport(source, currentFile);
  }

  return source.replace(/\//g, ".").replace(CODE_EXTENSIONS, "");
}

function resolveTypeScriptRelativeImport(
  source: string,
  currentFile: string,
): string {
  const currentModule = filePathToModuleRef(currentFile);
  const baseParts = currentModule.split(".");
  baseParts.pop(); // remove filename

  const segments = source.replace(CODE_EXTENSIONS, "").split("/");
  let upCount = 0;
  let i = 0;
  for (; i < segments.length; i++) {
    if (segments[i] === "..") {
      upCount++;
    } else if (segments[i] === ".") {
      continue;
    } else {
      break;
    }
  }

  const resolved = baseParts.slice(0, baseParts.length - upCount);
  const tail = segments.slice(i);
  return [...resolved, ...tail].join(".");
}

function resolvePythonRelativeImport(
  source: string,
  currentFile: string,
): string {
  const currentModule = filePathToModuleRef(currentFile);
  const currentParts = currentModule.split(".");
  const baseParts = currentParts.slice(0, -1);

  const sourceParts = source.split(".");
  let leadingDots = 0;
  while (leadingDots < sourceParts.length && sourceParts[leadingDots] === "") {
    leadingDots++;
  }

  const levelsUp = leadingDots - 1;
  const resolved = baseParts.slice(0, baseParts.length - levelsUp);
  const tail = sourceParts.slice(leadingDots);
  return [...resolved, ...tail].join(".");
}
