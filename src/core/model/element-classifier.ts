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

function applyFilters(
  elements: ExecutableElement[],
  include: string[],
  exclude: string[],
): ExecutableElement[] {
  let result = elements;

  if (include.length > 0) {
    const includePatterns = include.map((p) => new RegExp(p));
    result = result.filter((el) =>
      includePatterns.some((re) => re.test(el.reference)),
    );
  }

  if (exclude.length > 0) {
    const excludePatterns = exclude.map((p) => new RegExp(p));
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
  if (
    selector.references?.length &&
    selector.references.some((p) => new RegExp(p).test(el.reference))
  ) {
    return true;
  }

  if (
    selector.childsOf?.length &&
    selector.childsOf.some((p) => {
      const re = new RegExp(p);
      return el.parentClasses.some((pc) => re.test(pc));
    })
  ) {
    return true;
  }

  if (
    selector.decoratedWith?.length &&
    selector.decoratedWith.some((p) => {
      const re = new RegExp(p);
      return el.decorators.some((d) => re.test(d));
    })
  ) {
    return true;
  }

  return false;
}
