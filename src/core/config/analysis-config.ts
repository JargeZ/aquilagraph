import {
  CLASSIFICATION_COLOR_PALETTE,
  defaultColorForIndex,
  isPaletteColor,
} from "./classification-palette";

export interface SelectorConfig {
  references?: string[];
  childsOf?: string[];
  decoratedWith?: string[];
}

export interface ClassificationConfig {
  id: string;
  name: string;
  /** Hex из {@link CLASSIFICATION_COLOR_PALETTE}. */
  color: string;
  selectors: SelectorConfig;
  groupInBucket: boolean;
  exclude: boolean;
  mute: boolean;
}

export interface AnalysisConfig {
  include: string[];
  exclude: string[];
  moduleDepth: number;
  /**
   * Минимум методов с исходящими рёбрами к другим нодам графа, чтобы показать класс субграфом.
   * Значение <= 0 отключает свёртку (всегда субграф с методами, как до этой настройки).
   */
  minMethodsForClassDetail: number;
  hideUnclassified: boolean;
  /** Порядок в массиве = приоритет правил классификации (раньше — выше). */
  classifications: ClassificationConfig[];
}

export const ANALYSIS_CONFIG_STORAGE_PREFIX = "visualizer-analysis-config-";

export const MAX_CLASSIFICATIONS = 10;

export function classificationById(
  config: AnalysisConfig,
  id: string,
): ClassificationConfig | undefined {
  return config.classifications.find((c) => c.id === id);
}

export function getAnalysisConfigKey(projectId: string): string {
  return `${ANALYSIS_CONFIG_STORAGE_PREFIX}${projectId}`;
}

export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  include: [],
  exclude: [],
  moduleDepth: 1,
  minMethodsForClassDetail: 3,
  hideUnclassified: true,
  classifications: [],
};

function clampClassifications(
  list: ClassificationConfig[],
): ClassificationConfig[] {
  return list.slice(0, MAX_CLASSIFICATIONS);
}

function sanitizeClassification(
  raw: unknown,
  fallbackIndex: number,
): ClassificationConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.trim() !== "" ? o.id : null;
  if (!id) return null;
  const name =
    typeof o.name === "string" && o.name.trim() !== ""
      ? o.name
      : "Классификация";
  const colorRaw = typeof o.color === "string" ? o.color : "";
  const color = isPaletteColor(colorRaw)
    ? colorRaw
    : defaultColorForIndex(fallbackIndex);
  const selectors = sanitizeSelectors(o.selectors);
  return {
    id,
    name,
    color,
    selectors,
    groupInBucket: Boolean(o.groupInBucket),
    exclude: Boolean(o.exclude),
    mute: Boolean(o.mute),
  };
}

function sanitizeSelectors(raw: unknown): SelectorConfig {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const arr = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    return v.filter((x): x is string => typeof x === "string");
  };
  return {
    references: arr(o.references),
    childsOf: arr(o.childsOf),
    decoratedWith: arr(o.decoratedWith),
  };
}

/**
 * Приводит произвольный объект к валидному `AnalysisConfig` (без миграции устаревшего формата).
 */
export function normalizeAnalysisConfig(raw: unknown): AnalysisConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ANALYSIS_CONFIG };
  }
  const o = raw as Record<string, unknown>;

  const include = Array.isArray(o.include)
    ? o.include.filter((x): x is string => typeof x === "string")
    : DEFAULT_ANALYSIS_CONFIG.include;
  const exclude = Array.isArray(o.exclude)
    ? o.exclude.filter((x): x is string => typeof x === "string")
    : DEFAULT_ANALYSIS_CONFIG.exclude;

  const moduleDepth =
    typeof o.moduleDepth === "number" && Number.isFinite(o.moduleDepth)
      ? Math.max(1, Math.min(10, Math.floor(o.moduleDepth)))
      : DEFAULT_ANALYSIS_CONFIG.moduleDepth;

  const minMethodsForClassDetail =
    typeof o.minMethodsForClassDetail === "number" &&
    Number.isFinite(o.minMethodsForClassDetail)
      ? Math.max(1, Math.floor(o.minMethodsForClassDetail))
      : DEFAULT_ANALYSIS_CONFIG.minMethodsForClassDetail;

  const hideUnclassified =
    typeof o.hideUnclassified === "boolean"
      ? o.hideUnclassified
      : DEFAULT_ANALYSIS_CONFIG.hideUnclassified;

  let classifications: ClassificationConfig[] = [];
  if (Array.isArray(o.classifications)) {
    let i = 0;
    for (const item of o.classifications) {
      const c = sanitizeClassification(item, i);
      if (c) {
        classifications.push(c);
        i += 1;
      }
    }
    classifications = clampClassifications(classifications);
  }

  return {
    include,
    exclude,
    moduleDepth,
    minMethodsForClassDetail,
    hideUnclassified,
    classifications,
  };
}

export function createEmptyClassification(
  colorIndex: number,
  id: string,
): ClassificationConfig {
  return {
    id,
    name: "Новая классификация",
    color: defaultColorForIndex(colorIndex),
    selectors: {},
    groupInBucket: false,
    exclude: false,
    mute: false,
  };
}

export function createNewClassification(
  existingCount: number,
): ClassificationConfig {
  return createEmptyClassification(existingCount, newClassificationId());
}

function newClassificationId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function djangoTemplateClassifications(): ClassificationConfig[] {
  return [
    {
      id: newClassificationId(),
      name: "Controlling",
      color: CLASSIFICATION_COLOR_PALETTE[0],
      groupInBucket: false,
      exclude: false,
      mute: false,
      selectors: {
        childsOf: [
          "BaseWorkflowController",
          "BaseCommand",
          "BaseViewSet",
          "ViewSet",
          "BaseModelViewset",
          "BaseModelAdmin",
          "ModelAdmin",
        ],
      },
    },
    {
      id: newClassificationId(),
      name: "BusinessLogic",
      color: CLASSIFICATION_COLOR_PALETTE[1],
      groupInBucket: false,
      exclude: false,
      mute: false,
      selectors: {
        childsOf: ["BaseBusinessAction"],
      },
    },
    {
      id: newClassificationId(),
      name: "SideEffects",
      color: CLASSIFICATION_COLOR_PALETTE[2],
      groupInBucket: false,
      exclude: false,
      mute: false,
      selectors: {
        decoratedWith: [".*shared_task.*"],
      },
    },
    {
      id: newClassificationId(),
      name: "Tests",
      color: CLASSIFICATION_COLOR_PALETTE[3],
      groupInBucket: false,
      exclude: false,
      mute: false,
      selectors: {
        references: ["test.*", ".*test"],
        decoratedWith: ["pytest.*"],
      },
    },
  ];
}
