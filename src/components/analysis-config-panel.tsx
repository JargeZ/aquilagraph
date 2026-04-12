import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@ui/molecules/button/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui/molecules/popover/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/molecules/tooltip/tooltip";
import { Ban, Box, Plus, Trash2, VolumeX } from "lucide-react";
import { type ReactNode, useCallback, useId, useState } from "react";
import type {
  AnalysisConfig,
  ClassificationConfig,
  SelectorConfig,
} from "@/core/config/analysis-config";
import {
  createNewClassification,
  DEFAULT_ANALYSIS_CONFIG,
  djangoTemplateClassifications,
  MAX_CLASSIFICATIONS,
} from "@/core/config/analysis-config";
import { CLASSIFICATION_COLOR_PALETTE } from "@/core/config/classification-palette";
import { cn } from "@/lib/utils";

interface AnalysisConfigPanelProps {
  config: AnalysisConfig;
  onChange: (config: AnalysisConfig) => void;
}

export function AnalysisConfigPanel({
  config,
  onChange,
}: AnalysisConfigPanelProps) {
  const { t } = useLingui();
  const moduleDepthId = useId();
  const minMethodsId = useId();

  const updateField = useCallback(
    <K extends keyof AnalysisConfig>(key: K, value: AnalysisConfig[K]) => {
      onChange({ ...config, [key]: value });
    },
    [config, onChange],
  );

  const updateClassification = useCallback(
    (id: string, patch: Partial<ClassificationConfig>) => {
      onChange({
        ...config,
        classifications: config.classifications.map((c) =>
          c.id === id ? { ...c, ...patch } : c,
        ),
      });
    },
    [config, onChange],
  );

  const removeClassification = useCallback(
    (id: string) => {
      onChange({
        ...config,
        classifications: config.classifications.filter((c) => c.id !== id),
      });
    },
    [config, onChange],
  );

  const addClassification = useCallback(() => {
    if (config.classifications.length >= MAX_CLASSIFICATIONS) return;
    const next = createNewClassification(config.classifications.length);
    onChange({
      ...config,
      classifications: [...config.classifications, next],
    });
  }, [config, onChange]);

  const applyDjangoTemplate = useCallback(() => {
    onChange({
      ...config,
      classifications: djangoTemplateClassifications(),
    });
  }, [config, onChange]);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">
          <Trans>Настройки анализа</Trans>
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <TextAreaField
            label={t`Include (regex, по строкам)`}
            value={config.include}
            onChange={(v) => updateField("include", v)}
          />
          <TextAreaField
            label={t`Exclude (regex, по строкам)`}
            value={config.exclude}
            onChange={(v) => updateField("exclude", v)}
          />
        </div>

        <div className="flex flex-wrap items-start gap-6">
          <div>
            <label
              htmlFor={moduleDepthId}
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              <Trans>Глубина модуля</Trans>
            </label>
            <input
              id={moduleDepthId}
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
              htmlFor={minMethodsId}
              className="mb-1 block text-xs font-medium text-muted-foreground"
              title={t`Класс будет сгруппирован в субграф, если в классе есть как минимум заданное количество методов, которые ведут к другим нодам`}
            >
              <Trans>Минимально методов для детализации</Trans>
            </label>
            <input
              id={minMethodsId}
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
              <Trans>
                Класс будет сгруппирован в субграф, если в классе есть как
                минимум заданное количество методов, которые ведут к другим
                нодам
              </Trans>
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
              <Trans>Скрыть неклассифицированные</Trans>
            </span>
          </label>
        </div>

        <h3 className="text-xs font-semibold text-muted-foreground">
          <Trans>Классификации</Trans>
        </h3>

        <div className="flex flex-col gap-3">
          {config.classifications.map((c) => (
            <ClassificationCard
              key={c.id}
              classification={c}
              onUpdate={(patch) => updateClassification(c.id, patch)}
              onRemove={() => removeClassification(c.id)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t`Добавить классификацию`}
            disabled={config.classifications.length >= MAX_CLASSIFICATIONS}
            title={
              config.classifications.length >= MAX_CLASSIFICATIONS
                ? t`Не более ${MAX_CLASSIFICATIONS} классификаций`
                : t`Добавить классификацию`
            }
            onClick={addClassification}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyDjangoTemplate}
          >
            <Trans>Template: Django</Trans>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ClassificationCard({
  classification: c,
  onUpdate,
  onRemove,
}: {
  classification: ClassificationConfig;
  onUpdate: (patch: Partial<ClassificationConfig>) => void;
  onRemove: () => void;
}) {
  const { t } = useLingui();
  const updateSelector = (field: keyof SelectorConfig, value: string[]) => {
    onUpdate({
      selectors: { ...c.selectors, [field]: value },
    });
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ColorDotPicker
            color={c.color}
            onPick={(color) => onUpdate({ color })}
          />
          <input
            type="text"
            value={c.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs font-semibold text-foreground shadow-none outline-none focus-visible:ring-0"
            aria-label={t`Название классификации`}
          />
        </div>
        <div className="inline-flex rounded-lg border border-border gap-1 bg-muted/40 p-0.5">
          <ToggleIconButton
            pressed={c.exclude}
            onPressedChange={(exclude) => onUpdate({ exclude })}
            icon={<Ban className="size-3.5" />}
            label={t`Exclude`}
            tooltip={t`Скрывать ноды этой категории из графа`}
          />
          <ToggleIconButton
            pressed={c.mute}
            onPressedChange={(mute) => onUpdate({ mute })}
            icon={<VolumeX className="size-3.5" />}
            label={t`Mute`}
            tooltip={t`Делать цвет нод полупрозрачным`}
          />
          <ToggleIconButton
            pressed={c.groupInBucket}
            onPressedChange={(groupInBucket) => onUpdate({ groupInBucket })}
            icon={<Box className="size-3.5" />}
            label={t`Bucket`}
            tooltip={t`Объединять ноды класса в субграф на графе`}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={t`Удалить классификацию`}
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TextAreaField
          label="references"
          value={c.selectors.references ?? []}
          onChange={(v) => updateSelector("references", v)}
          rows={5}
        />
        <TextAreaField
          label="childsOf"
          value={c.selectors.childsOf ?? []}
          onChange={(v) => updateSelector("childsOf", v)}
          rows={5}
        />
        <TextAreaField
          label="decoratedWith"
          value={c.selectors.decoratedWith ?? []}
          onChange={(v) => updateSelector("decoratedWith", v)}
          rows={5}
        />
      </div>
    </div>
  );
}

function ColorDotPicker({
  color,
  onPick,
}: {
  color: string;
  onPick: (color: string) => void;
}) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={t`Выбрать цвет категории`}
        >
          <span
            className="inline-block size-3.5 rounded-full ring-1 ring-border"
            style={{ backgroundColor: color }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-wrap gap-1.5 border-border p-2">
        {CLASSIFICATION_COLOR_PALETTE.map((hex) => (
          <button
            key={hex}
            type="button"
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              hex === color && "ring-2 ring-ring",
            )}
            onClick={() => {
              onPick(hex);
              setOpen(false);
            }}
            aria-label={t`Цвет ${hex}`}
          >
            <span
              className="inline-block size-5 rounded-full ring-1 ring-border"
              style={{ backgroundColor: hex }}
            />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function ToggleIconButton({
  pressed,
  onPressedChange,
  icon,
  label,
  tooltip,
}: {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  icon: ReactNode;
  label: string;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="switch"
          aria-checked={pressed}
          aria-label={label}
          onClick={() => onPressedChange(!pressed)}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground",
            pressed && "bg-background text-foreground shadow-sm",
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 5,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
}) {
  const { t } = useLingui();
  const fieldId = useId();
  return (
    <div>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        className="w-full resize-y rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/50 focus:outline-none"
        placeholder={t`regex-паттерн...`}
      />
    </div>
  );
}
