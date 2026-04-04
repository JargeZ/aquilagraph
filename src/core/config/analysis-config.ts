export interface SelectorConfig {
  references?: string[];
  childsOf?: string[];
  decoratedWith?: string[];
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
  selectors: {
    controlling: SelectorConfig;
    businessLogic: SelectorConfig;
    sideEffects: SelectorConfig;
  };
}

export const ANALYSIS_CONFIG_STORAGE_PREFIX = "visualizer-analysis-config-";

export function getAnalysisConfigKey(projectId: string): string {
  return `${ANALYSIS_CONFIG_STORAGE_PREFIX}${projectId}`;
}

export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  include: [],
  exclude: [],
  moduleDepth: 1,
  minMethodsForClassDetail: 3,
  hideUnclassified: true,
  selectors: {
    controlling: {},
    businessLogic: {},
    sideEffects: {},
  },
};
