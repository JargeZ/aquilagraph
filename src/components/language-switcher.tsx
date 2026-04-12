import { useLingui } from "@lingui/react/macro";
import { Button } from "@ui/molecules/button/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui/molecules/popover/popover";
import { Languages } from "lucide-react";
import { useAppLocale } from "@/contexts/use-app-locale";
import {
  LOCALE_NATIVE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/locale";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useLingui();
  const { locale, setLocale } = useAppLocale();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={cn("shrink-0", className)}
          aria-label={t`Язык интерфейса`}
        >
          <Languages className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-auto min-w-[10rem] flex-col gap-0.5 p-1"
      >
        {SUPPORTED_LOCALES.map((code: SupportedLocale) => (
          <button
            key={code}
            type="button"
            className={cn(
              "rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
              code === locale && "bg-muted font-medium",
            )}
            onClick={() => setLocale(code)}
          >
            {LOCALE_NATIVE_LABELS[code]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
