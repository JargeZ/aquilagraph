export interface SelectorConfig {
  references?: string[];
  childsOf?: string[];
  decoratedWith?: string[];
}

export interface AnalysisConfig {
  include: string[];
  exclude: string[];
  moduleDepth: number;
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
  selectors: {
    controlling: {},
    businessLogic: {},
    sideEffects: {},
  },
};
