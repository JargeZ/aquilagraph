import { digraph, toDot, attribute } from "ts-graphviz";
import type { Digraph } from "ts-graphviz";
import type { AnalysisConfig } from "../config/analysis-config";
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

interface ModuleGroup {
  name: string;
  classes: Map<string, ExecutableElement[]>;
  standalone: ExecutableElement[];
}

export function buildGraph(
  elements: ExecutableElement[],
  config: AnalysisConfig,
): Digraph {
  const modules = groupByModule(elements, config.moduleDepth);

  return digraph("G", (g) => {
    g.set(attribute.rankdir, "LR");
    g.set(attribute.fontname, "Helvetica");
    g.node({ [attribute.fontname]: "Helvetica", [attribute.fontsize]: 10 });

    for (const mod of modules) {
      g.subgraph(`cluster_${mod.name}`, (sg) => {
        sg.set(attribute.label, mod.name);
        sg.set(attribute.style, "dashed");

        for (const [className, classElements] of mod.classes) {
          sg.subgraph(`cluster_${mod.name}_${className}`, (csg) => {
            csg.set(attribute.label, className);
            csg.set(attribute.style, "rounded");

            for (const el of classElements) {
              addNode(csg, el);
            }
          });
        }

        for (const el of mod.standalone) {
          addNode(sg, el);
        }
      });
    }

    for (const el of elements) {
      for (const target of el.uses) {
        if (elements.includes(target)) {
          g.edge([el.reference, target.reference]);
        }
      }
    }
  });
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
