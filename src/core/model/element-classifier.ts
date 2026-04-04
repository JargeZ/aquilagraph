import type { AnalysisConfig, SelectorConfig } from "../config/analysis-config";
import type { ExecutableElement, ElementType } from "./executable-element";

export function classifyElements(
  elements: ExecutableElement[],
  config: AnalysisConfig,
): ExecutableElement[] {
  const filtered = applyFilters(elements, config.include, config.exclude);

  for (const el of filtered) {
    el.type = determineType(el, config.selectors);
  }

  return filtered;
}

function nonBlankPatterns(patterns: string[]): string[] {
  return patterns.filter((p) => p.trim() !== "");
}

function applyFilters(
  elements: ExecutableElement[],
  include: string[],
  exclude: string[],
): ExecutableElement[] {
  let result = elements;

  const includePatterns = nonBlankPatterns(include).map((p) => new RegExp(p));
  if (includePatterns.length > 0) {
    result = result.filter((el) =>
      includePatterns.some((re) => re.test(el.reference)),
    );
  }

  const excludePatterns = nonBlankPatterns(exclude).map((p) => new RegExp(p));
  if (excludePatterns.length > 0) {
    result = result.filter(
      (el) => !excludePatterns.some((re) => re.test(el.reference)),
    );
  }

  return result;
}

function determineType(
  el: ExecutableElement,
  selectors: AnalysisConfig["selectors"],
): ElementType {
  if (matchesSelector(el, selectors.controlling)) return "controlling";
  if (matchesSelector(el, selectors.businessLogic)) return "businessLogic";
  if (matchesSelector(el, selectors.sideEffects)) return "sideEffect";
  return "unclassified";
}

function matchesSelector(
  el: ExecutableElement,
  selector: SelectorConfig,
): boolean {
  const references = nonBlankPatterns(selector.references ?? []);
  if (
    references.length &&
    references.some((p) => new RegExp(p).test(el.reference))
  ) {
    return true;
  }

  const childsOf = nonBlankPatterns(selector.childsOf ?? []);
  if (
    childsOf.length &&
    childsOf.some((p) => {
      const re = new RegExp(p);
      return el.parentClasses.some((pc) => re.test(pc));
    })
  ) {
    return true;
  }

  const decoratedWith = nonBlankPatterns(selector.decoratedWith ?? []);
  if (
    decoratedWith.length &&
    decoratedWith.some((p) => {
      const re = new RegExp(p);
      return el.decorators.some((d) => re.test(d));
    })
  ) {
    return true;
  }

  return false;
}
