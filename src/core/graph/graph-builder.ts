import { digraph, toDot, attribute } from "ts-graphviz";
import type { RootGraphModel } from "ts-graphviz";
import type { AnalysisConfig } from "../config/analysis-config";
import { DEFAULT_ANALYSIS_CONFIG } from "../config/analysis-config";
import type { ExecutableElement, ElementType } from "../model/executable-element";
import { getModuleName } from "../model/reference-builder";

const TYPE_STYLES: Record<
  ElementType,
  { color: string; shape: string; style: string }
> = {
  controlling: { color: "#4A90D9", shape: "box", style: "filled" },
  businessLogic: { color: "#50C878", shape: "ellipse", style: "filled" },
  sideEffect: { color: "#FFB347", shape: "hexagon", style: "filled" },
  unclassified: { color: "#D3D3D3", shape: "ellipse", style: "filled" },
};

/** Подписи кластеров-бакетов на графе (как в панели настроек). */
const TYPE_CLUSTER_LABEL: Record<
  "controlling" | "businessLogic" | "sideEffect",
  string
> = {
  controlling: "Controlling",
  businessLogic: "Business Logic",
  sideEffect: "Side Effects",
};

type GraphContainer = {
  subgraph: (
    id: string,
    fn: (sg: GraphContainer) => void,
  ) => unknown;
  node: (id: string, attrs: Record<string, unknown>) => void;
  set: (key: unknown, value: unknown) => void;
};

interface ModuleGroup {
  name: string;
  classes: Map<string, ExecutableElement[]>;
  standalone: ExecutableElement[];
}

export function buildGraph(
  elements: ExecutableElement[],
  config: AnalysisConfig,
): RootGraphModel {
  const modules = groupByModule(elements, config.moduleDepth);
  const elementSet = new Set(elements);
  const threshold =
    config.minMethodsForClassDetail ??
    DEFAULT_ANALYSIS_CONFIG.minMethodsForClassDetail;
  const collapsedClassFullRefs = computeCollapsedClassRefs(
    modules,
    elementSet,
    threshold,
  );

  return digraph("G", (g) => {
    g.set(attribute.rankdir, "LR");
    g.set(attribute.fontname, "Helvetica");
    g.node({ [attribute.fontname]: "Helvetica", [attribute.fontsize]: 10 });

    for (const mod of modules) {
      g.subgraph(`cluster_${mod.name}`, (sg) => {
        sg.set(attribute.label, mod.name);
        sg.set(attribute.style, "dashed");

        for (const [className, classElements] of mod.classes) {
          const fullClassRef = fullClassReference(classElements, className);
          if (collapsedClassFullRefs.has(fullClassRef)) {
            const classEl = classElements.find(
              (e) => e.reference === fullClassRef,
            );
            if (classEl) {
              addElementsWithOptionalTypeBuckets(
                sg as GraphContainer,
                [classEl],
                `cluster_${mod.name}_${className}`,
                config,
              );
            }
          } else {
            sg.subgraph(`cluster_${mod.name}_${className}`, (csg) => {
              csg.set(attribute.label, className);
              csg.set(attribute.style, "rounded");

              addElementsWithOptionalTypeBuckets(
                csg as GraphContainer,
                classElements,
                `cluster_${mod.name}_${className}`,
                config,
              );
            });
          }
        }

        addElementsWithOptionalTypeBuckets(
          sg as GraphContainer,
          mod.standalone,
          `cluster_${mod.name}_standalone`,
          config,
        );
      });
    }

    const edgeSeen = new Set<string>();
    for (const el of elements) {
      for (const target of el.uses) {
        if (!elementSet.has(target)) continue;
        const from = canonicalReference(el, collapsedClassFullRefs);
        const to = canonicalReference(target, collapsedClassFullRefs);
        if (from === to) continue;
        const key = `${from}\0${to}`;
        if (edgeSeen.has(key)) continue;
        edgeSeen.add(key);
        g.edge([from, to]);
      }
    }
  });
}

function fullClassReference(
  classElements: ExecutableElement[],
  className: string,
): string {
  const mod = classElements[0]?.module ?? "";
  return `${mod}.${className}`;
}

function isMethodElement(el: ExecutableElement): boolean {
  return (
    el.className != null &&
    el.reference !== `${el.module}.${el.className}`
  );
}

function countConnectingMethods(
  classElements: ExecutableElement[],
  elementSet: Set<ExecutableElement>,
): number {
  let n = 0;
  for (const el of classElements) {
    if (!isMethodElement(el)) continue;
    if (el.uses.some((t) => elementSet.has(t))) n += 1;
  }
  return n;
}

function computeCollapsedClassRefs(
  modules: ModuleGroup[],
  elementSet: Set<ExecutableElement>,
  threshold: number,
): Set<string> {
  const collapsed = new Set<string>();
  if (threshold <= 0) {
    return collapsed;
  }
  for (const mod of modules) {
    for (const [className, classElements] of mod.classes) {
      if (classElements.length === 0) continue;
      if (countConnectingMethods(classElements, elementSet) >= threshold) {
        continue;
      }
      const fullRef = fullClassReference(classElements, className);
      const hasClassNode = classElements.some((e) => e.reference === fullRef);
      if (hasClassNode) {
        collapsed.add(fullRef);
      }
    }
  }
  return collapsed;
}

function canonicalReference(
  el: ExecutableElement,
  collapsedClassFullRefs: Set<string>,
): string {
  if (el.className) {
    const classRef = `${el.module}.${el.className}`;
    if (collapsedClassFullRefs.has(classRef)) {
      return classRef;
    }
  }
  return el.reference;
}

function mergedGroupInBucket(config: AnalysisConfig) {
  return {
    ...DEFAULT_ANALYSIS_CONFIG.groupInBucket,
    ...config.groupInBucket,
  };
}

function elementTypeUsesBucket(
  type: ElementType,
  config: AnalysisConfig,
): boolean {
  const g = mergedGroupInBucket(config);
  switch (type) {
    case "controlling":
      return g.controlling;
    case "businessLogic":
      return g.businessLogic;
    case "sideEffect":
      return g.sideEffects;
    default:
      return false;
  }
}

function partitionElementsForBuckets(
  elements: ExecutableElement[],
  config: AnalysisConfig,
): {
  ungrouped: ExecutableElement[];
  bucketed: Map<"controlling" | "businessLogic" | "sideEffect", ExecutableElement[]>;
} {
  const ungrouped: ExecutableElement[] = [];
  const bucketed = new Map<
    "controlling" | "businessLogic" | "sideEffect",
    ExecutableElement[]
  >();
  for (const el of elements) {
    if (!elementTypeUsesBucket(el.type, config)) {
      ungrouped.push(el);
      continue;
    }
    const t = el.type as "controlling" | "businessLogic" | "sideEffect";
    const list = bucketed.get(t);
    if (list) list.push(el);
    else bucketed.set(t, [el]);
  }
  return { ungrouped, bucketed };
}

function addElementsWithOptionalTypeBuckets(
  parent: GraphContainer,
  elements: ExecutableElement[],
  clusterIdPrefix: string,
  config: AnalysisConfig,
): void {
  const { ungrouped, bucketed } = partitionElementsForBuckets(
    elements,
    config,
  );
  for (const el of ungrouped) {
    addNode(parent, el);
  }
  for (const [type, els] of bucketed) {
    if (els.length === 0) continue;
    const style = TYPE_STYLES[type];
    parent.subgraph(`${clusterIdPrefix}_bucket_${type}`, (tg) => {
      tg.set(attribute.label, TYPE_CLUSTER_LABEL[type]);
      tg.set(attribute.color, style.color);
      tg.set(attribute.fontcolor, style.color);
      tg.set(attribute.style, "dashed");
      for (const el of els) {
        addNode(tg, el);
      }
    });
  }
}

function addNode(
  container: { node: (id: string, attrs: Record<string, unknown>) => void },
  el: ExecutableElement,
): void {
  const style = TYPE_STYLES[el.type];
  container.node(el.reference, {
    [attribute.label]: el.name,
    [attribute.color]: style.color,
    [attribute.fillcolor]: style.color,
    [attribute.shape]: style.shape,
    [attribute.style]: style.style,
    [attribute.fontcolor]: "#FFFFFF",
  });
}

function groupByModule(
  elements: ExecutableElement[],
  depth: number,
): ModuleGroup[] {
  const moduleMap = new Map<string, ModuleGroup>();

  for (const el of elements) {
    const moduleName = getModuleName(el.reference, depth);
    let mod = moduleMap.get(moduleName);
    if (!mod) {
      mod = { name: moduleName, classes: new Map(), standalone: [] };
      moduleMap.set(moduleName, mod);
    }

    if (el.className && el.reference !== `${el.module}.${el.className}`) {
      // Method -- group under its class
      const classRef = el.className;
      if (!mod.classes.has(classRef)) {
        mod.classes.set(classRef, []);
      }
      mod.classes.get(classRef)!.push(el);
    } else if (el.className) {
      // Class node itself -- also goes into the class subgraph
      const classRef = el.className;
      if (!mod.classes.has(classRef)) {
        mod.classes.set(classRef, []);
      }
      mod.classes.get(classRef)!.push(el);
    } else {
      mod.standalone.push(el);
    }
  }

  return Array.from(moduleMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function buildDot(
  elements: ExecutableElement[],
  config: AnalysisConfig,
): string {
  return toDot(buildGraph(elements, config));
}
