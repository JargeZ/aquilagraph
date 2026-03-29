import type {
  ScopeFileAnalysis,
  ScopeInfo,
} from "@/core/parser/codeparsers-types";
import type { ExecutableElement } from "./executable-element";
import { filePathToModuleRef } from "./reference-builder";

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
      // This is a method -- resolve its uses
      const scope = scopeMap.get(makeScopeKey(el.sourceFile, el.name, el.className));
      if (scope) {
        el.uses = resolveElementUses(scope, el, importNameToRef, elementByRef);
      }
    } else if (!el.className) {
      // Top-level function
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

    // If we resolved to a class, check if the context suggests a method call
    const target = elementByRef.get(resolvedRef);
    if (!target) continue;

    // Try to find more specific method from context (e.g. GetTasksList().execute)
    const methodMatch = ref.context?.match(
      new RegExp(`${importedName}\\(\\)\\.([\\w]+)`),
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

function normalizeImportSource(
  source: string,
  currentFile: string,
): string {
  if (!source.startsWith(".")) {
    return source;
  }

  const currentModule = filePathToModuleRef(currentFile);
  const currentParts = currentModule.split(".");
  // Directory of the current file
  const baseParts = currentParts.slice(0, -1);

  const sourceParts = source.split(".");
  // Count leading empty strings = number of dots in the relative prefix
  // In Python: . = current package, .. = parent, ... = grandparent
  // n dots = go up (n - 1) levels from current package
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
