import type {
  ScopeFileAnalysis,
  ScopeInfo,
} from "@/core/parser/codeparsers-types";
import type { ExecutableElement } from "./executable-element";
import { filePathToModuleRef } from "./reference-builder";

const CODE_EXTENSIONS = /\.(py|pyi|ts|tsx|js|jsx|mts|cts|mjs|cjs)$/;

/**
 * Resolves "uses" relationships between ExecutableElements
 * by analyzing identifier references from parsed scopes.
 *
 * For each method/function element, looks at its identifierReferences
 * to find which other elements it calls, and sets element.uses accordingly.
 */
export function resolveUses(
  elements: ExecutableElement[],
  analyses: ScopeFileAnalysis[],
): void {
  const elementByRef = new Map<string, ExecutableElement>();
  for (const el of elements) {
    elementByRef.set(el.reference, el);
  }

  const importNameToRef = buildImportMap(analyses, elementByRef);
  const scopeMap = buildScopeMap(analyses);

  for (const el of elements) {
    if (el.className && !el.reference.endsWith(`.${el.className}`)) {
      const scope = scopeMap.get(makeScopeKey(el.sourceFile, el.name, el.className));
      if (scope) {
        el.uses = resolveElementUses(scope, el, importNameToRef, elementByRef);
      }
    } else if (!el.className) {
      const scope = scopeMap.get(makeScopeKey(el.sourceFile, el.name, undefined));
      if (scope) {
        el.uses = resolveElementUses(scope, el, importNameToRef, elementByRef);
      }
    }
  }
}

function resolveElementUses(
  scope: ScopeInfo,
  element: ExecutableElement,
  importNameToRef: Map<string, string>,
  elementByRef: Map<string, ExecutableElement>,
): ExecutableElement[] {
  const seen = new Set<string>();
  const uses: ExecutableElement[] = [];

  for (const ref of scope.identifierReferences) {
    if (ref.kind !== "import" || !ref.isLocalImport) continue;

    const importedName = ref.identifier;
    const resolvedRef = importNameToRef.get(
      `${element.sourceFile}::${importedName}`,
    );
    if (!resolvedRef || resolvedRef === element.reference) continue;

    const target = elementByRef.get(resolvedRef);
    if (!target) continue;

    const methodMatch = ref.context?.match(
      new RegExp(`${escapeForRegex(importedName)}\\(\\)\\.([\\w]+)`),
    );
    if (methodMatch) {
      const methodRef = `${resolvedRef}.${methodMatch[1]}`;
      const methodTarget = elementByRef.get(methodRef);
      if (methodTarget && !seen.has(methodRef)) {
        seen.add(methodRef);
        uses.push(methodTarget);
        continue;
      }
    }

    if (!seen.has(resolvedRef)) {
      seen.add(resolvedRef);
      uses.push(target);
    }
  }

  return uses;
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a map: "filePath::importedName" -> element reference
 * by matching file-level imports to known element references.
 */
function buildImportMap(
  analyses: ScopeFileAnalysis[],
  elementByRef: Map<string, ExecutableElement>,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const analysis of analyses) {
    for (const imp of analysis.importReferences) {
      const importedName = imp.imported;
      const sourceModule = normalizeImportSource(
        imp.source,
        analysis.filePath,
      );

      const candidateRef = `${sourceModule}.${importedName}`;
      if (elementByRef.has(candidateRef)) {
        map.set(`${analysis.filePath}::${importedName}`, candidateRef);
      }
    }
  }

  return map;
}

/**
 * Normalize an import source to dot-notation module path.
 * Handles Python (.foo, ..bar), TypeScript (./foo, ../bar), path aliases (@/), and bare imports.
 */
export function normalizeImportSource(
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
  baseParts.pop(); // remove filename segment

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

function makeScopeKey(
  filePath: string,
  name: string,
  parent: string | undefined,
): string {
  return parent ? `${filePath}::${parent}::${name}` : `${filePath}::${name}`;
}

function buildScopeMap(
  analyses: ScopeFileAnalysis[],
): Map<string, ScopeInfo> {
  const map = new Map<string, ScopeInfo>();
  for (const analysis of analyses) {
    for (const scope of analysis.scopes) {
      const key = makeScopeKey(
        analysis.filePath,
        scope.name,
        scope.parent ?? undefined,
      );
      map.set(key, scope);
    }
  }
  return map;
}
