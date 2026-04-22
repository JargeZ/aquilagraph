import type { RootGraphModel } from "ts-graphviz";
import { attribute, digraph, toDot } from "ts-graphviz";

/** Лимит узлов AST в @ts-graphviz/ast при сериализации (дефолт библиотеки — 100 000). */
const TO_DOT_MAX_AST_NODES = 1_000_000;

const TO_DOT_OPTIONS = {
  convert: { maxASTNodes: TO_DOT_MAX_AST_NODES },
} as const;

/** Сериализация графа в DOT с повышенным лимитом AST для очень больших графов. */
export function graphToDot(graph: RootGraphModel): string {
  return toDot(graph, TO_DOT_OPTIONS);
}

import type {
  AnalysisConfig,
  ClassificationConfig,
} from "../config/analysis-config";
import {
  classificationById,
  DEFAULT_ANALYSIS_CONFIG,
} from "../config/analysis-config";
import {
  ExecutableElement,
  UNCLASSIFIED_TYPE,
} from "../model/executable-element";
import { getModuleName } from "../model/reference-builder";

const UNCLASSIFIED_STYLE = {
  color: "#D3D3D3",
  shape: "ellipse",
  style: "filled",
} as const;

function safeGraphId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function nodeVisualStyle(
  el: ExecutableElement,
  config: AnalysisConfig,
): { color: string; shape: string; style: string } {
  if (el.type === UNCLASSIFIED_TYPE) {
    return { ...UNCLASSIFIED_STYLE };
  }
  const c = classificationById(config, el.type);
  if (!c) {
    return { ...UNCLASSIFIED_STYLE };
  }
  return {
    color: c.color,
    shape: "ellipse",
    style: "filled",
  };
}

/** Первый включённый бакет — source, последний — sink (при одном — только source). */
function bucketRankByClassificationId(
  config: AnalysisConfig,
): Map<string, "source" | "sink"> {
  const enabled = config.classifications.filter((c) => c.groupInBucket);
  const m = new Map<string, "source" | "sink">();
  if (enabled.length === 0) return m;
  if (enabled.length === 1) {
    m.set(enabled[0].id, "source");
    return m;
  }
  m.set(enabled[0].id, "source");
  m.set(enabled[enabled.length - 1].id, "sink");
  return m;
}

type GraphContainer = {
  subgraph: (id: string, fn: (sg: GraphContainer) => void) => unknown;
  node: (id: string, attrs: Record<string, unknown>) => void;
  set: (key: unknown, value: unknown) => void;
};

export interface ModuleGroup {
  name: string;
  classes: Map<string, ExecutableElement[]>;
  standalone: ExecutableElement[];
}

export interface CompositeModuleData {
  name: string;
  dot: string;
}

export interface InterModuleEdgeData {
  fromRef: string;
  toRef: string;
  fromModule: string;
  toModule: string;
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
    el.className != null && el.reference !== `${el.module}.${el.className}`
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

function elementTypeUsesBucket(type: string, config: AnalysisConfig): boolean {
  if (type === UNCLASSIFIED_TYPE) return false;
  const c = classificationById(config, type);
  return Boolean(c?.groupInBucket);
}

interface ModuleBucketContents {
  standalone: ExecutableElement[];
  byClass: Map<string, ExecutableElement[]>;
}

function collectModuleBucketContents(
  mod: ModuleGroup,
  classificationId: string,
  collapsedClassFullRefs: Set<string>,
): ModuleBucketContents {
  const standalone = mod.standalone.filter(
    (el) => el.type === classificationId,
  );
  const byClass = new Map<string, ExecutableElement[]>();

  for (const [className, classElements] of mod.classes) {
    const fullClassRef = fullClassReference(classElements, className);
    if (collapsedClassFullRefs.has(fullClassRef)) {
      const classEl = classElements.find((e) => e.reference === fullClassRef);
      if (classEl && classEl.type === classificationId) {
        byClass.set(className, [classEl]);
      }
      continue;
    }
    const ofType = classElements.filter((el) => el.type === classificationId);
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
  classification: ClassificationConfig,
  rank: "source" | "sink" | undefined,
): void {
  container.set(attribute.label, classification.name);
  container.set(attribute.color, classification.color);
  container.set(attribute.fontcolor, classification.color);
  container.set(attribute.style, "dashed");
  if (rank === "source") {
    container.set(attribute.rank, "source");
  } else if (rank === "sink") {
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
  const ranks = bucketRankByClassificationId(config);

  for (const classification of config.classifications) {
    if (!classification.groupInBucket) continue;
    const contents = collectModuleBucketContents(
      mod,
      classification.id,
      collapsedClassFullRefs,
    );
    if (isModuleBucketEmpty(contents)) continue;

    const bucketKey = safeGraphId(classification.id);
    sg.subgraph(`cluster_${mod.name}_bucket_${bucketKey}`, (bg) => {
      setBucketClusterAttrs(bg, classification, ranks.get(classification.id));
      for (const el of contents.standalone) {
        addNode(bg, el, config);
      }
      const classEntries = Array.from(contents.byClass.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      for (const [className, els] of classEntries) {
        bg.subgraph(
          `cluster_${mod.name}_bucket_${bucketKey}_${className}`,
          (csg) => {
            csg.set(attribute.label, className);
            csg.set(attribute.style, "rounded");
            for (const el of els) {
              addNode(csg, el, config);
            }
          },
        );
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
      addNode(sg, classEl, config);
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
        addNode(csg, el, config);
      }
    });
  }

  for (const el of mod.standalone) {
    if (!elementTypeUsesBucket(el.type, config)) {
      addNode(sg, el, config);
    }
  }
}

function addNode(
  container: { node: (id: string, attrs: Record<string, unknown>) => void },
  el: ExecutableElement,
  config: AnalysisConfig,
): void {
  const style = nodeVisualStyle(el, config);
  container.node(el.reference, {
    [attribute.label]: el.name,
    [attribute.color]: style.color,
    [attribute.fillcolor]: style.color,
    [attribute.shape]: style.shape,
    [attribute.style]: style.style,
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
      const methodBucket = mod.classes.get(classRef);
      if (methodBucket) methodBucket.push(el);
    } else if (el.className) {
      // Class node itself -- also goes into the class subgraph
      const classRef = el.className;
      if (!mod.classes.has(classRef)) {
        mod.classes.set(classRef, []);
      }
      const classBucket = mod.classes.get(classRef);
      if (classBucket) classBucket.push(el);
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

export function buildCompositeInputs(
  elements: ExecutableElement[],
  config: AnalysisConfig,
): { modules: CompositeModuleData[]; interModuleEdges: InterModuleEdgeData[] } {
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

  const refToModule = new Map<string, string>();
  for (const el of elements) {
    const ref = canonicalReference(el, collapsedClassFullRefs);
    refToModule.set(ref, getModuleName(el.reference, config.moduleDepth));
  }

  const moduleData: CompositeModuleData[] = [];
  for (const mod of modules) {
    const allModElements = [
      ...mod.standalone,
      ...Array.from(mod.classes.values()).flat(),
    ];
    const modElementSet = new Set(allModElements);
    const modGraph = buildSingleModuleGraph(
      mod,
      config,
      collapsedClassFullRefs,
      elements,
      modElementSet,
    );
    moduleData.push({ name: mod.name, dot: graphToDot(modGraph) });
  }

  const edgeSeen = new Set<string>();
  const interModuleEdges: InterModuleEdgeData[] = [];
  for (const el of elements) {
    for (const target of el.uses) {
      if (!elementSet.has(target)) continue;
      const from = canonicalReference(el, collapsedClassFullRefs);
      const to = canonicalReference(target, collapsedClassFullRefs);
      if (from === to) continue;
      const fromMod = refToModule.get(from);
      const toMod = refToModule.get(to);
      if (!fromMod || !toMod || fromMod === toMod) continue;
      const key = `${from}\0${to}`;
      if (edgeSeen.has(key)) continue;
      edgeSeen.add(key);
      interModuleEdges.push({
        fromRef: from,
        toRef: to,
        fromModule: fromMod,
        toModule: toMod,
      });
    }
  }

  return { modules: moduleData, interModuleEdges };
}

export interface ModuleGraphResult {
  dot: string;
  elements: ExecutableElement[];
  graph: RootGraphModel;
}

/** Builds a module-level directed graph: one node per module, edges weighted by inter-module call count. */
export function buildModuleGraphResult(
  elements: ExecutableElement[],
  config: AnalysisConfig,
): ModuleGraphResult {
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

  const refToModule = new Map<string, string>();
  for (const el of elements) {
    const ref = canonicalReference(el, collapsedClassFullRefs);
    refToModule.set(ref, getModuleName(el.reference, config.moduleDepth));
  }

  // Aggregate inter-module edges: (fromModule, toModule) → { count, sample toRefs }
  const edgeMap = new Map<string, { count: number; toRefs: string[] }>();
  const edgeSeen = new Set<string>();
  for (const el of elements) {
    for (const target of el.uses) {
      if (!elementSet.has(target)) continue;
      const from = canonicalReference(el, collapsedClassFullRefs);
      const to = canonicalReference(target, collapsedClassFullRefs);
      if (from === to) continue;
      const fromMod = refToModule.get(from);
      const toMod = refToModule.get(to);
      if (!fromMod || !toMod || fromMod === toMod) continue;
      const key = `${from}\0${to}`;
      if (edgeSeen.has(key)) continue;
      edgeSeen.add(key);
      const edgeKey = `${fromMod}\0${toMod}`;
      let entry = edgeMap.get(edgeKey);
      if (!entry) {
        entry = { count: 0, toRefs: [] };
        edgeMap.set(edgeKey, entry);
      }
      entry.count++;
      const shortRef = to.split(".").pop() ?? to;
      if (!entry.toRefs.includes(shortRef)) entry.toRefs.push(shortRef);
    }
  }

  // Synthetic elements: one per module, wired with uses for highlight support
  const moduleElements = modules.map(
    (mod) =>
      new ExecutableElement({
        reference: mod.name,
        module: mod.name,
        className: null,
        name: mod.name.split(".").pop() ?? mod.name,
        type: UNCLASSIFIED_TYPE,
        decorators: [],
        parentClasses: [],
        sourceFile: "",
        startLine: 0,
        endLine: 0,
      }),
  );
  const moduleElByName = new Map(
    moduleElements.map((el) => [el.reference, el]),
  );
  for (const [key] of edgeMap) {
    const sep = key.indexOf("\0");
    const fromEl = moduleElByName.get(key.slice(0, sep));
    const toEl = moduleElByName.get(key.slice(sep + 1));
    if (fromEl && toEl && !fromEl.uses.includes(toEl)) fromEl.uses.push(toEl);
  }

  const graph = digraph("MODULES", (g) => {
    g.set(attribute.rankdir, "LR");
    g.set(attribute.fontname, "Helvetica");
    g.node({ [attribute.fontname]: "Helvetica", [attribute.fontsize]: 11 });
    g.edge({ [attribute.fontname]: "Helvetica", [attribute.fontsize]: 9 });

    for (const mod of modules) {
      const shortName = mod.name.split(".").pop() ?? mod.name;
      g.node(mod.name, {
        [attribute.label]: `${shortName}\n${mod.name}`,
        [attribute.shape]: "box",
        [attribute.style]: "filled",
        [attribute.fillcolor]: "#4A90D9",
        [attribute.fontcolor]: "white",
      });
    }

    for (const [key, { count, toRefs }] of edgeMap) {
      const sep = key.indexOf("\0");
      const fromMod = key.slice(0, sep);
      const toMod = key.slice(sep + 1);
      const top3 = toRefs.slice(0, 3);
      const more = toRefs.length - top3.length;
      const labelParts = [`${count}`, ...top3];
      if (more > 0) labelParts.push(`+${more} more`);
      g.edge([fromMod, toMod], {
        [attribute.label]: labelParts.join("\n"),
      });
    }
  });

  return { dot: graphToDot(graph), elements: moduleElements, graph };
}

/**
 * Subgraph centered on a single module:
 * - all elements belonging to that module
 * - elements in other modules that are CALLED BY this module (forward)
 * - elements in other modules that CALL INTO this module (backward)
 */
export function buildModuleSubgraphResult(
  allElements: ExecutableElement[],
  moduleName: string,
  config: AnalysisConfig,
): { elements: ExecutableElement[]; graph: RootGraphModel; dot: string } | null {
  const { moduleDepth } = config;
  const elementSet = new Set(allElements);

  const moduleEls = new Set(
    allElements.filter(
      (el) => getModuleName(el.reference, moduleDepth) === moduleName,
    ),
  );
  if (moduleEls.size === 0) return null;

  // Forward: targets called by module elements that live in other modules
  const forwardEls = new Set<ExecutableElement>();
  for (const el of moduleEls) {
    for (const target of el.uses) {
      if (elementSet.has(target) && !moduleEls.has(target)) {
        forwardEls.add(target);
      }
    }
  }

  // Backward: elements outside module that call at least one element inside
  const backwardEls = new Set<ExecutableElement>();
  for (const el of allElements) {
    if (moduleEls.has(el)) continue;
    for (const target of el.uses) {
      if (moduleEls.has(target)) {
        backwardEls.add(el);
        break;
      }
    }
  }

  const selected = [
    ...Array.from(moduleEls),
    ...Array.from(forwardEls),
    ...Array.from(backwardEls),
  ];

  const graph = buildGraph(selected, config);
  const dot = graphToDot(graph);
  return { elements: selected, graph, dot };
}

function buildSingleModuleGraph(
  mod: ModuleGroup,
  config: AnalysisConfig,
  collapsedClassFullRefs: Set<string>,
  allElements: ExecutableElement[],
  modElementSet: Set<ExecutableElement>,
): RootGraphModel {
  return digraph("G", (g) => {
    g.set(attribute.rankdir, "LR");
    g.set(attribute.fontname, "Helvetica");
    g.node({ [attribute.fontname]: "Helvetica", [attribute.fontsize]: 10 });

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

    const edgeSeen = new Set<string>();
    for (const el of allElements) {
      if (!modElementSet.has(el)) continue;
      for (const target of el.uses) {
        if (!modElementSet.has(target)) continue;
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
