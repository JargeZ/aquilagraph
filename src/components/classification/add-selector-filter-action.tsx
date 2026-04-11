import { Link } from "@tanstack/react-router";
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
import { Plus } from "lucide-react";
import { useCallback, useId, useMemo, useState } from "react";
import { useProjectAnalysis } from "@/contexts/use-project-analysis";
import { cn } from "@/lib/utils";

export type AddSelectorFilterKind = "reference" | "decorator" | "parentClass";

function selectorKeyForKind(
  kind: AddSelectorFilterKind,
): "references" | "decoratedWith" | "childsOf" {
  switch (kind) {
    case "reference":
      return "references";
    case "decorator":
      return "decoratedWith";
    case "parentClass":
      return "childsOf";
  }
}

function titleForKind(kind: AddSelectorFilterKind): string {
  switch (kind) {
    case "reference":
      return "Добавить reference в классификацию";
    case "decorator":
      return "Добавить декоратор в классификацию";
    case "parentClass":
      return "Добавить родительский класс в классификацию";
  }
}

export function AddSelectorFilterAction({
  kind,
  value,
  className,
  onAdded,
}: {
  kind: AddSelectorFilterKind;
  value: string;
  className?: string;
  onAdded?: () => void;
}) {
  const { projectId, analysisConfig, setAnalysisConfig } = useProjectAnalysis();
  const selectId = useId();
  const inputId = useId();

  const [open, setOpen] = useState(false);
  const [classificationId, setClassificationId] = useState<string>("");
  const [draft, setDraft] = useState(value);

  const classifications = analysisConfig.classifications;
  const selectorKey = useMemo(() => selectorKeyForKind(kind), [kind]);

  const canSubmit = useMemo(() => {
    if (!classificationId) return false;
    if (draft.trim() === "") return false;
    return true;
  }, [classificationId, draft]);

  const add = useCallback(() => {
    if (!canSubmit) return;
    const nextValue = draft.trim();
    const targetId = classificationId;
    const key = selectorKey;
    setAnalysisConfig((prev) => {
      const next = { ...prev };
      next.classifications = prev.classifications.map((c) => {
        if (c.id !== targetId) return c;
        const existing = c.selectors?.[key] ?? [];
        if (existing.includes(nextValue)) return c;
        return {
          ...c,
          selectors: {
            ...c.selectors,
            [key]: [...existing, nextValue],
          },
        };
      });
      return next;
    });
    setOpen(false);
    onAdded?.();
  }, [
    canSubmit,
    classificationId,
    draft,
    onAdded,
    selectorKey,
    setAnalysisConfig,
  ]);

  const emptyState = classifications.length === 0;

  return (
    <TooltipProvider>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            setDraft(value);
            setClassificationId("");
          }
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className={className}
                aria-label={titleForKind(kind)}
              >
                <Plus className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{titleForKind(kind)}</TooltipContent>
        </Tooltip>

        <PopoverContent
          align="end"
          className={cn(
            "w-[min(92vw,26rem)] p-3",
            emptyState && "w-[min(92vw,22rem)]",
          )}
        >
          <div className="flex flex-col gap-3">
            <div className="text-xs font-medium text-foreground">
              {titleForKind(kind)}
            </div>

            {emptyState ? (
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">
                  Классификаций пока нет.
                </div>
                <div className="mt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/$projectId/settings" params={{ projectId }}>
                      Создать в настройках
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-1.5">
                  <label
                    htmlFor={selectId}
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Классификация
                  </label>
                  <select
                    id={selectId}
                    className={cn(
                      "h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
                    )}
                    value={classificationId}
                    onChange={(e) => setClassificationId(e.target.value)}
                  >
                    <option value="" disabled>
                      Выберите…
                    </option>
                    {classifications.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label
                    htmlFor={inputId}
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Значение
                  </label>
                  <input
                    id={inputId}
                    className={cn(
                      "h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
                    )}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Введите строку…"
                    autoComplete="off"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canSubmit}
                    onClick={add}
                  >
                    Добавить
                  </Button>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
