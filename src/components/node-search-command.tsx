import { Trans, useLingui } from "@lingui/react/macro";
import { Dialog } from "radix-ui";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ExecutableElement } from "@/core/model/executable-element";
import { createNodeSearchIndex } from "@/lib/node-search-index";
import { cn } from "@/lib/utils";

const LIST_LIMIT = 80;

/** Уникальный суффикс для DOM id по полному reference. */
function refToDomIdPart(reference: string): string {
  const bytes = new TextEncoder().encode(reference);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function primarySearchLabel(el: ExecutableElement): string {
  return el.className ? `${el.className}.${el.name}` : el.name;
}

interface NodeSearchCommandProps {
  elements: ExecutableElement[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActiveElementChange: (element: ExecutableElement | null) => void;
}

export function NodeSearchCommand({
  elements,
  open,
  onOpenChange,
  onActiveElementChange,
}: NodeSearchCommandProps) {
  const { t } = useLingui();
  const reactId = useId().replace(/:/g, "");
  const listDomId = `${reactId}-node-search-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const index = useMemo(() => createNodeSearchIndex(elements), [elements]);

  const filtered = useMemo(
    () => index.search(query, LIST_LIMIT),
    [index, query],
  );

  const byRef = useMemo(() => {
    const m = new Map<string, ExecutableElement>();
    for (const e of elements) m.set(e.reference, e);
    return m;
  }, [elements]);

  const optionDomIdForRef = useCallback(
    (reference: string) => `${reactId}-opt-${refToDomIdPart(reference)}`,
    [reactId],
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlightIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  /** Текст изменился — снова с первого пункта. */
  const handleQueryChange = useCallback((next: string) => {
    setQuery(next);
    setHighlightIndex(0);
  }, []);

  /** Список укоротился — индекс не выходит за границы. */
  useLayoutEffect(() => {
    if (filtered.length === 0) {
      setHighlightIndex(0);
      return;
    }
    setHighlightIndex((i) => Math.min(Math.max(0, i), filtered.length - 1));
  }, [filtered.length]);

  const activeReference =
    filtered.length > 0 ? (filtered[highlightIndex]?.reference ?? null) : null;

  useLayoutEffect(() => {
    const root = listScrollRef.current;
    if (!open || !root || !activeReference) return;
    const id = optionDomIdForRef(activeReference);
    const node = root.querySelector(`#${CSS.escape(id)}`);
    (node as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
  }, [open, activeReference, optionDomIdForRef]);

  useEffect(() => {
    if (!open) return;
    if (!activeReference) {
      onActiveElementChange(null);
      return;
    }
    onActiveElementChange(byRef.get(activeReference) ?? null);
  }, [open, activeReference, byRef, onActiveElementChange]);

  const commitChoice = useCallback(
    (el: ExecutableElement) => {
      onActiveElementChange(el);
      onOpenChange(false);
    },
    [onActiveElementChange, onOpenChange],
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setHighlightIndex(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setHighlightIndex(filtered.length - 1);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const el = filtered[highlightIndex];
        if (el) commitChoice(el);
      }
    },
    [filtered, highlightIndex, commitChoice],
  );

  const activeDescendantId =
    activeReference != null ? optionDomIdForRef(activeReference) : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn("fixed inset-0 z-[199] bg-black/40")} />
        <Dialog.Content
          className={cn(
            "fixed top-[12%] left-1/2 z-[200] flex max-h-[min(480px,72vh)] w-[min(100vw-1.5rem,42rem)] max-w-[calc(100vw-1.5rem)] flex-col",
            "-translate-x-1/2 overflow-hidden p-0 shadow-lg outline-none",
            "rounded-xl border border-border bg-popover text-popover-foreground",
          )}
          onCloseAutoFocus={(ev) => ev.preventDefault()}
        >
          <Dialog.Title className="sr-only">
            <Trans>Поиск узлов графа</Trans>
          </Dialog.Title>
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            aria-controls={listDomId}
            aria-activedescendant={activeDescendantId}
            aria-autocomplete="list"
            placeholder={t`Класс, метод, путь к файлу…`}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className={cn(
              "h-11 w-full shrink-0 border-0 border-b border-border bg-transparent px-3 text-sm",
              "placeholder:text-muted-foreground",
              "outline-none focus-visible:ring-0",
            )}
          />
          <div
            ref={listScrollRef}
            id={listDomId}
            role="listbox"
            aria-label={t`Результаты поиска`}
            className="max-h-[min(380px,55vh)] overflow-y-auto p-1"
          >
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {query.trim() ? (
                  <Trans>Ничего не найдено</Trans>
                ) : (
                  <Trans>Нет узлов</Trans>
                )}
              </p>
            ) : (
              filtered.map((el, i) => {
                const selected = i === highlightIndex;
                return (
                  <div
                    key={el.reference}
                    id={optionDomIdForRef(el.reference)}
                    role="option"
                    tabIndex={-1}
                    aria-selected={selected}
                    className={cn(
                      "cursor-pointer rounded-md px-2 py-2",
                      selected && "bg-accent text-accent-foreground",
                    )}
                    onMouseEnter={() => setHighlightIndex(i)}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => commitChoice(el)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        commitChoice(el);
                      }
                    }}
                  >
                    <span className="block font-mono text-xs">
                      {primarySearchLabel(el)}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {el.sourceFile}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
