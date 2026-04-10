import type { AnalysisConfig, ClassificationConfig } from "./analysis-config";
import { DEFAULT_ANALYSIS_CONFIG } from "./analysis-config";

function classification(
  id: string,
  name: string,
  color: string,
  selectors: ClassificationConfig["selectors"],
  extra?: Partial<ClassificationConfig>,
): ClassificationConfig {
  return {
    id,
    name,
    color,
    selectors,
    groupInBucket: false,
    exclude: false,
    mute: false,
    ...extra,
  };
}

/** Три категории, совместимые по смыслу со старым тестовым конфигом. */
export function standardTestClassifications(): ClassificationConfig[] {
  return [
    classification("cat_ctrl", "Controlling", "#4A90D9", {
      childsOf: ["ModelViewSet"],
    }),
    classification("cat_biz", "Business Logic", "#50C878", {
      childsOf: ["BaseBusinessAction"],
    }),
    classification("cat_side", "Side Effects", "#FFB347", {
      decoratedWith: ["shared_task"],
    }),
  ];
}

/** Для интеграционных тестов анализа (глубина модулей по умолчанию). */
export const TEST_ANALYSIS_CONFIG: AnalysisConfig = {
  ...DEFAULT_ANALYSIS_CONFIG,
  classifications: standardTestClassifications(),
};

/** Для graph-builder: всегда субграф по классам. */
export const TEST_ANALYSIS_CONFIG_GRAPH: AnalysisConfig = {
  ...DEFAULT_ANALYSIS_CONFIG,
  minMethodsForClassDetail: 0,
  classifications: standardTestClassifications(),
};
