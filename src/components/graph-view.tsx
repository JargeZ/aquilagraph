import { Digraph, Edge, Node, renderToDot, Subgraph } from "@ts-graphviz/react";
import { Button } from "@ui/molecules/button/button";
import { useEffect, useId, useState } from "react";
import type { AnalysisConfig } from "@/core/config/analysis-config";
import type {
  ElementType,
  ExecutableElement,
} from "@/core/model/executable-element";
import { getModuleName } from "@/core/model/reference-builder";

const TYPE_STYLES: Record<ElementType, { color: string; shape: string }> = {
  controlling: { color: "#4A90D9", shape: "box" },
  businessLogic: { color: "#50C878", shape: "ellipse" },
  sideEffect: { color: "#FFB347", shape: "hexagon" },
  unclassified: { color: "#D3D3D3", shape: "ellipse" },
};

interface ModuleGroup {
  name: string;
  classes: Map<string, ExecutableElement[]>;
  standalone: ExecutableElement[];
}

interface GraphViewProps {
  elements: ExecutableElement[];
  config: AnalysisConfig;
}

function groupElements(
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

    if (el.className) {
      if (!mod.classes.has(el.className)) {
        mod.classes.set(el.className, []);
      }
      mod.classes.get(el.className)?.push(el);
    } else {
      mod.standalone.push(el);
    }
  }

  return Array.from(moduleMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function ProjectGraphComponent({ elements, config }: GraphViewProps) {
  const digraphId = useId().replaceAll(":", "");
  const modules = groupElements(elements, config.moduleDepth);
  const elementSet = new Set(elements);

  const edges: { from: string; to: string }[] = [];
  for (const el of elements) {
    for (const target of el.uses) {
      if (elementSet.has(target)) {
        edges.push({ from: el.reference, to: target.reference });
      }
    }
  }

  return (
    <Digraph
      id={digraphId}
      rankdir="LR"
      fontname="Helvetica"
      node={{ fontname: "Helvetica", fontsize: 10 }}
    >
      {modules.map((mod) => (
        <Subgraph
          key={mod.name}
          id={`cluster_${mod.name}`}
          label={mod.name}
          style="dashed"
        >
          {Array.from(mod.classes.entries()).map(([className, classEls]) => (
            <Subgraph
              key={className}
              id={`cluster_${mod.name}_${className}`}
              label={className}
              style="rounded"
            >
              {classEls.map((el) => {
                const s = TYPE_STYLES[el.type];
                return (
                  <Node
                    key={el.reference}
                    id={el.reference}
                    label={el.name}
                    color={s.color}
                    fillcolor={s.color}
                    shape={s.shape}
                    style="filled"
                    fontcolor="#FFFFFF"
                  />
                );
              })}
            </Subgraph>
          ))}
          {mod.standalone.map((el) => {
            const s = TYPE_STYLES[el.type];
            return (
              <Node
                key={el.reference}
                id={el.reference}
                label={el.name}
                color={s.color}
                fillcolor={s.color}
                shape={s.shape}
                style="filled"
                fontcolor="#FFFFFF"
              />
            );
          })}
        </Subgraph>
      ))}
      {edges.map((e) => (
        <Edge key={`${e.from}->${e.to}`} targets={[e.from, e.to]} />
      ))}
    </Digraph>
  );
}

export function GraphView({ elements, config }: GraphViewProps) {
  const [copied, setCopied] = useState(false);
  const [dot, setDot] = useState<string | null>(null);
  const [dotPending, setDotPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDotPending(true);
    setDot(null);
    void renderToDot(
      <ProjectGraphComponent elements={elements} config={config} />,
    )
      .then((d) => {
        if (!cancelled) {
          setDot(d);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDot(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDotPending(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [elements, config]);

  if (dotPending) {
    return <p className="text-sm text-muted-foreground">Генерируем граф…</p>;
  }

  if (!dot) {
    return (
      <p className="text-sm text-muted-foreground">
        Не удалось сгенерировать граф.
      </p>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(dot);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Граф ({elements.length} элементов)
        </h2>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Скопировано" : "Копировать DOT"}
        </Button>
      </div>
      <pre className="max-h-150 overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs text-foreground">
        {dot}
      </pre>
      <p className="text-xs text-muted-foreground">
        Вставьте DOT в{" "}
        <a
          href="https://dreampuf.github.io/GraphvizOnline/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Graphviz Online
        </a>{" "}
        для визуализации.
      </p>
    </div>
  );
}
