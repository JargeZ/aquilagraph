import { useContext } from "react";

import {
  LocaleContext,
  type LocaleContextValue,
} from "@/contexts/locale-context-types";

export function useAppLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useAppLocale must be used within LocaleProvider");
  }
  return ctx;
}
