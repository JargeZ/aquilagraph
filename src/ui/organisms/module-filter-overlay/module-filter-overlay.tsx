import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@ui/molecules/button/button";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type ModuleFilterItem = {
  name: string;
  incomingCount: number;
  outgoingCount: number;
};

export function ModuleFilterOverlay({
  items,
  selected,
  onSelectedChange,
  className,
}: {
  items: ModuleFilterItem[];
  selected: ReadonlySet<string>;
  onSelectedChange: (next: Set<string>) => void;
  className?: string;
}) {
  const { t } = useLingui();
  const searchId = useId();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => m.name.toLowerCase().includes(q));
  }, [items, query]);

  const allSelected = selected.size > 0 && selected.size === items.length;
  const noneSelected = selected.size === 0;

  return (
    <div
      className={cn(
        "pointer-events-auto w-[min(92vw,20rem)] rounded-xl border border-border bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="text-xs font-semibold text-foreground">
          <Trans>Модули</Trans>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={items.length === 0}
          onClick={() => {
            if (allSelected) {
              onSelectedChange(new Set());
              return;
            }
            onSelectedChange(new Set(items.map((i) => i.name)));
          }}
          title={
            allSelected
              ? t`Снять выбор со всех`
              : t`Выбрать все`
          }
        >
          {allSelected ? <Trans>Снять всё</Trans> : <Trans>Выбрать всё</Trans>}
        </Button>
      </div>

      <div className="px-3 py-2">
        <label htmlFor={searchId} className="sr-only">
          <Trans>Поиск модулей</Trans>
        </label>
        <input
          id={searchId}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t`Поиск…`}
          className={cn(
            "h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          )}
        />
      </div>

      <div className="max-h-[min(48vh,22rem)] overflow-y-auto px-1 pb-2">
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            <Trans>Нет модулей</Trans>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            <Trans>Ничего не найдено</Trans>
          </div>
        ) : (
          filtered.map((m) => {
            const checked = selected.has(m.name);
            return (
              <label
                key={m.name}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs",
                  "hover:bg-muted/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(m.name);
                    else next.delete(m.name);
                    onSelectedChange(next);
                  }}
                  className="size-4 rounded border-border accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[11px] text-foreground">
                    {m.name}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ArrowDownLeft className="size-3.5" />
                    <span className="tabular-nums">{m.incomingCount}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ArrowUpRight className="size-3.5" />
                    <span className="tabular-nums">{m.outgoingCount}</span>
                  </span>
                </div>
              </label>
            );
          })
        )}
      </div>

      {items.length > 0 && (noneSelected || !allSelected) ? (
        <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <Trans>
            Выбрано
          </Trans>{" "}
          <span className="tabular-nums">
            {selected.size}/{items.length}
          </span>
        </div>
      ) : null}
    </div>
  );
}

