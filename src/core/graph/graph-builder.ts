import { digraph, toDot, attribute } from "ts-graphviz";
import type { RootGraphModel } from "ts-graphviz";

/** Лимит узлов AST в @ts-graphviz/ast при сериализации (дефолт библиотеки — 100 000). */
const TO_DOT_MAX_AST_NODES = 1_000_000;

const TO_DOT_OPTIONS = {
  convert: { maxASTNodes: TO_DOT_MAX_AST_NODES },
} as const;

/** Сериализация графа в DOT с повышенным лимитом AST для очень больших графов. */
export function graphToDot(graph: RootGraphModel): string {
  return toDot(graph, TO_DOT_OPTIONS);
}
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

const BUCKET_ELEMENT_TYPES = [
  "controlling",
  "businessLogic",
  "sideEffect",
] as const satisfies readonly ElementType[];

type BucketElementType = (typeof BUCKET_ELEMENT_TYPES)[number];

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

        addModuleClusterContents(
          sg as GraphContainer,
          mod,
          config,
          collapsedClassFullRefs,
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

function bucketFlagForElementType(
  merged: ReturnType<typeof mergedGroupInBucket>,
  type: BucketElementType,
): boolean {
  switch (type) {
    case "controlling":
      return merged.controlling;
    case "businessLogic":
      return merged.businessLogic;
    case "sideEffect":
      return merged.sideEffects;
  }
}

interface ModuleBucketContents {
  standalone: ExecutableElement[];
  byClass: Map<string, ExecutableElement[]>;
}

function collectModuleBucketContents(
  mod: ModuleGroup,
  bucketType: BucketElementType,
  collapsedClassFullRefs: Set<string>,
): ModuleBucketContents {
  const standalone = mod.standalone.filter((el) => el.type === bucketType);
  const byClass = new Map<string, ExecutableElement[]>();

  for (const [className, classElements] of mod.classes) {
    const fullClassRef = fullClassReference(classElements, className);
    if (collapsedClassFullRefs.has(fullClassRef)) {
      const classEl = classElements.find((e) => e.reference === fullClassRef);
      if (classEl && classEl.type === bucketType) {
        byClass.set(className, [classEl]);
      }
      continue;
    }
    const ofType = classElements.filter((el) => el.type === bucketType);
    if (ofType.length > 0) {
      byClass.set(className, ofType);
    }
  }

  return { standalone, byClass };
}

function isModuleBucketEmpty(contents: ModuleBucketContents): boolean {
  if (contents.standalone.length > 0) return false;
  return contents.byClass.size === 0;
}

function setBucketClusterAttrs(
  container: GraphContainer,
  bucketType: BucketElementType,
): void {
  const style = TYPE_STYLES[bucketType];
  container.set(attribute.label, TYPE_CLUSTER_LABEL[bucketType]);
  container.set(attribute.color, style.color);
  container.set(attribute.fontcolor, style.color);
  container.set(attribute.style, "dashed");
  // При rankdir=LR: source — к началу (слева), sink — к концу (справа).
  if (bucketType === "controlling") {
    container.set(attribute.rank, "source");
  } else if (bucketType === "sideEffect") {
    container.set(attribute.rank, "sink");
  }
}

/**
 * Содержимое кластера модуля: при включённых бакетах — один субграф на классификацию,
 * внутри — субграфы классов; остальные ноды — в обычных субграфах класса на уровне модуля.
 */
function addModuleClusterContents(
  sg: GraphContainer,
  mod: ModuleGroup,
  config: AnalysisConfig,
  collapsedClassFullRefs: Set<string>,
): void {
  const merged = mergedGroupInBucket(config);

  for (const bucketType of BUCKET_ELEMENT_TYPES) {
    if (!bucketFlagForElementType(merged, bucketType)) continue;
    const contents = collectModuleBucketContents(
      mod,
      bucketType,
      collapsedClassFullRefs,
    );
    if (isModuleBucketEmpty(contents)) continue;

    sg.subgraph(`cluster_${mod.name}_bucket_${bucketType}`, (bg) => {
      setBucketClusterAttrs(bg, bucketType);
      for (const el of contents.standalone) {
        addNode(bg, el);
      }
      const classEntries = Array.from(contents.byClass.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      for (const [className, els] of classEntries) {
        bg.subgraph(`cluster_${mod.name}_bucket_${bucketType}_${className}`, (csg) => {
          csg.set(attribute.label, className);
          csg.set(attribute.style, "rounded");
          for (const el of els) {
            addNode(csg, el);
          }
        });
      }
    });
  }

  const sortedClasses = Array.from(mod.classes.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  for (const [className, classElements] of sortedClasses) {
    const fullClassRef = fullClassReference(classElements, className);
    if (collapsedClassFullRefs.has(fullClassRef)) {
      const classEl = classElements.find((e) => e.reference === fullClassRef);
      if (!classEl) continue;
      if (elementTypeUsesBucket(classEl.type, config)) {
        continue;
      }
      addNode(sg, classEl);
      continue;
    }
    const nonBucket = classElements.filter(
      (el) => !elementTypeUsesBucket(el.type, config),
    );
    if (nonBucket.length === 0) continue;
    sg.subgraph(`cluster_${mod.name}_${className}`, (csg) => {
      csg.set(attribute.label, className);
      csg.set(attribute.style, "rounded");
      for (const el of nonBucket) {
        addNode(csg, el);
      }
    });
  }

  for (const el of mod.standalone) {
    if (!elementTypeUsesBucket(el.type, config)) {
      addNode(sg, el);
    }
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
  return graphToDot(buildGraph(elements, config));
}
