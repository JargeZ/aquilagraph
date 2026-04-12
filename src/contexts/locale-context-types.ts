import { createContext } from "react";

import type { SupportedLocale } from "@/lib/locale";

export type LocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (next: SupportedLocale) => void;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);
