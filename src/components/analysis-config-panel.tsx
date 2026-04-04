import { useCallback } from "react";
import type {
  AnalysisConfig,
  SelectorConfig,
} from "@/core/config/analysis-config";
import { DEFAULT_ANALYSIS_CONFIG } from "@/core/config/analysis-config";

interface AnalysisConfigPanelProps {
  config: AnalysisConfig;
  onChange: (config: AnalysisConfig) => void;
}

export function AnalysisConfigPanel({
  config,
  onChange,
}: AnalysisConfigPanelProps) {
  const updateField = useCallback(
    <K extends keyof AnalysisConfig>(key: K, value: AnalysisConfig[K]) => {
      onChange({ ...config, [key]: value });
    },
    [config, onChange],
  );

  const updateSelector = useCallback(
    (
      group: keyof AnalysisConfig["selectors"],
      field: keyof SelectorConfig,
      value: string[],
    ) => {
      onChange({
        ...config,
        selectors: {
          ...config.selectors,
          [group]: { ...config.selectors[group], [field]: value },
        },
      });
    },
    [config, onChange],
  );

  const updateGroupInBucket = useCallback(
    (group: keyof AnalysisConfig["groupInBucket"], checked: boolean) => {
      const prev = {
        ...DEFAULT_ANALYSIS_CONFIG.groupInBucket,
        ...config.groupInBucket,
      };
      onChange({
        ...config,
        groupInBucket: { ...prev, [group]: checked },
      });
    },
    [config, onChange],
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-foreground">
        Настройки анализа
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <TextAreaField
          label="Include (regex, по строкам)"
          value={config.include}
          onChange={(v) => updateField("include", v)}
        />
        <TextAreaField
          label="Exclude (regex, по строкам)"
          value={config.exclude}
          onChange={(v) => updateField("exclude", v)}
        />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Глубина модуля
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={config.moduleDepth}
            onChange={(e) =>
              updateField("moduleDepth", Math.max(1, Number(e.target.value)))
            }
            className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring/50 focus:outline-none"
          />
        </div>

        <div className="max-w-md">
          <label
            className="mb-1 block text-xs font-medium text-muted-foreground"
            title="Класс будет сгруппирован в субграф, если в классе есть как минимум заданное количество методов, которые ведут к другим нодам"
          >
            Минимально методов для детализации
          </label>
          <input
            type="number"
            min={1}
            value={
              config.minMethodsForClassDetail ??
              DEFAULT_ANALYSIS_CONFIG.minMethodsForClassDetail
            }
            onChange={(e) =>
              updateField(
                "minMethodsForClassDetail",
                Math.max(1, Number(e.target.value)),
              )
            }
            className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring/50 focus:outline-none"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Класс будет сгруппирован в субграф, если в классе есть как минимум
            заданное количество методов, которые ведут к другим нодам
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={config.hideUnclassified !== false}
            onChange={(e) =>
              updateField("hideUnclassified", e.target.checked)
            }
            className="size-4 rounded border-border accent-primary"
          />
          <span className="text-xs font-medium text-muted-foreground">
            Скрыть неклассифицированные
          </span>
        </label>
      </div>

      <SelectorSection
        title="Controlling"
        color="#4A90D9"
        groupInBucket={
          config.groupInBucket?.controlling ??
          DEFAULT_ANALYSIS_CONFIG.groupInBucket.controlling
        }
        onGroupInBucketChange={(v) => updateGroupInBucket("controlling", v)}
        selector={config.selectors.controlling}
        onChange={(s) => updateSelector("controlling", ...s)}
      />
      <SelectorSection
        title="Business Logic"
        color="#50C878"
        groupInBucket={
          config.groupInBucket?.businessLogic ??
          DEFAULT_ANALYSIS_CONFIG.groupInBucket.businessLogic
        }
        onGroupInBucketChange={(v) => updateGroupInBucket("businessLogic", v)}
        selector={config.selectors.businessLogic}
        onChange={(s) => updateSelector("businessLogic", ...s)}
      />
      <SelectorSection
        title="Side Effects"
        color="#FFB347"
        groupInBucket={
          config.groupInBucket?.sideEffects ??
          DEFAULT_ANALYSIS_CONFIG.groupInBucket.sideEffects
        }
        onGroupInBucketChange={(v) => updateGroupInBucket("sideEffects", v)}
        selector={config.selectors.sideEffects}
        onChange={(s) => updateSelector("sideEffects", ...s)}
      />
    </div>
  );
}

function SelectorSection({
  title,
  color,
  groupInBucket,
  onGroupInBucketChange,
  selector,
  onChange,
}: {
  title: string;
  color: string;
  groupInBucket: boolean;
  onGroupInBucketChange: (checked: boolean) => void;
  selector: SelectorConfig;
  onChange: (update: [keyof SelectorConfig, string[]]) => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-3 rounded-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        <label className="flex cursor-pointer items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={groupInBucket}
            onChange={(e) => onGroupInBucketChange(e.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
          <span className="text-xs font-medium text-muted-foreground">
            Сгруппировать в бакет
          </span>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <TextAreaField
          label="references"
          value={selector.references ?? []}
          onChange={(v) => onChange(["references", v])}
          rows={2}
        />
        <TextAreaField
          label="childsOf"
          value={selector.childsOf ?? []}
          onChange={(v) => onChange(["childsOf", v])}
          rows={2}
        />
        <TextAreaField
          label="decoratedWith"
          value={selector.decoratedWith ?? []}
          onChange={(v) => onChange(["decoratedWith", v])}
          rows={2}
        />
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <textarea
        rows={rows}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        className="w-full resize-y rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/50 focus:outline-none"
        placeholder="regex-паттерн..."
      />
    </div>
  );
}
