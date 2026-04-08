import type {
  ScopeFileAnalysis,
  ScopeInfo,
} from "@/core/parser/codeparsers-types";
import { ExecutableElement } from "./executable-element";
import {
  buildReference,
  extractParentClassesFromScope,
  filePathToModuleRef,
  normalizeSymbolRef,
} from "./reference-builder";

const RELEVANT_SCOPE_TYPES = new Set(["class", "function", "method"]);

export function createElementsFromAnalyses(
  analyses: ScopeFileAnalysis[],
): ExecutableElement[] {
  const elements: ExecutableElement[] = [];

  for (const analysis of analyses) {
    const fileRef = filePathToModuleRef(analysis.filePath);
    const classParentMap = buildClassParentMap(analysis);
    const importRefs = analysis.importReferences;

    for (const scope of analysis.scopes) {
      if (!RELEVANT_SCOPE_TYPES.has(scope.type)) continue;

      const parentName =
        scope.type === "method" ? scope.parent ?? undefined : undefined;
      const reference = buildReference(
        analysis.filePath,
        scope.name,
        parentName,
      );

      const className = resolveClassName(scope);
      const rawParentClasses = resolveParentClasses(scope, classParentMap);
      const parentClasses = rawParentClasses.map((pc) =>
        normalizeSymbolRef(pc, importRefs, analysis.filePath),
      );

      const decoratorNames = extractDecoratorNames(scope);
      const decorators = decoratorNames.map((d) =>
        normalizeSymbolRef(d, importRefs, analysis.filePath),
      );

      elements.push(
        new ExecutableElement({
          reference,
          module: fileRef,
          className,
          name: scope.name,
          type: "unclassified",
          decorators,
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

function resolveClassName(scope: ScopeInfo): string | null {
  if (scope.type === "class") return scope.name;
  if (scope.type === "method" && scope.parent) return scope.parent;
  return null;
}

function buildClassParentMap(
  analysis: ScopeFileAnalysis,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const scope of analysis.scopes) {
    if (scope.type === "class") {
      map.set(scope.name, extractParentClassesFromScope(scope));
    }
  }
  return map;
}

/**
 * For a method, inherit parent classes from its owning class.
 * For a class, extract from scope data.
 * For a function, return empty.
 */
function resolveParentClasses(
  scope: ScopeInfo,
  classParentMap: Map<string, string[]>,
): string[] {
  if (scope.type === "class") {
    return extractParentClassesFromScope(scope);
  }
  if (scope.type === "method" && scope.parent) {
    return classParentMap.get(scope.parent) ?? [];
  }
  return [];
}

/**
 * Extract clean decorator names, preferring decoratorDetails
 * (which has structured `name` field) over raw decorator strings.
 */
function extractDecoratorNames(scope: ScopeInfo): string[] {
  if (scope.decoratorDetails?.length) {
    return scope.decoratorDetails.map((d) => d.name);
  }
  if (!scope.decorators?.length) return [];
  return scope.decorators.map((d) =>
    d.replace(/^@/, "").replace(/\(.*\)$/, ""),
  );
}
