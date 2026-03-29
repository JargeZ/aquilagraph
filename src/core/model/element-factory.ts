import type { ScopeFileAnalysis, ScopeInfo } from "@luciformresearch/codeparsers";
import { ExecutableElement } from "./executable-element";
import {
  buildReference,
  extractParentClasses,
  filePathToModuleRef,
} from "./reference-builder";

const RELEVANT_SCOPE_TYPES = new Set(["class", "function", "method"]);

export function createElementsFromAnalyses(
  analyses: ScopeFileAnalysis[],
): ExecutableElement[] {
  const elements: ExecutableElement[] = [];

  for (const analysis of analyses) {
    const fileRef = filePathToModuleRef(analysis.filePath);
    const classParentMap = buildClassParentMap(analysis.scopes);

    for (const scope of analysis.scopes) {
      if (!RELEVANT_SCOPE_TYPES.has(scope.type)) continue;

      const parentName =
        scope.type === "method" ? scope.parent ?? undefined : undefined;
      const reference = buildReference(
        analysis.filePath,
        scope.name,
        parentName,
      );

      const className = resolveClassName(scope, analysis.scopes);
      const parentClasses = resolveParentClasses(
        scope,
        classParentMap,
      );

      elements.push(
        new ExecutableElement({
          reference,
          module: fileRef,
          className,
          name: scope.name,
          type: "unclassified",
          decorators: scope.decorators ?? [],
          parentClasses,
          sourceFile: analysis.filePath,
          startLine: scope.startLine,
          endLine: scope.endLine,
        }),
      );
    }
  }

  return elements;
}

function resolveClassName(
  scope: ScopeInfo,
  allScopes: ScopeInfo[],
): string | null {
  if (scope.type === "class") return scope.name;
  if (scope.type === "method" && scope.parent) return scope.parent;
  return null;
}

function buildClassParentMap(scopes: ScopeInfo[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const scope of scopes) {
    if (scope.type === "class") {
      map.set(scope.name, extractParentClasses(scope.signature));
    }
  }
  return map;
}

/**
 * For a method, inherit parent classes from its owning class.
 * For a class, extract from its own signature.
 * For a function, return empty.
 */
function resolveParentClasses(
  scope: ScopeInfo,
  classParentMap: Map<string, string[]>,
): string[] {
  if (scope.type === "class") {
    return extractParentClasses(scope.signature);
  }
  if (scope.type === "method" && scope.parent) {
    return classParentMap.get(scope.parent) ?? [];
  }
  return [];
}
