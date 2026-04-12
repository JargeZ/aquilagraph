import { I18nProvider } from "@lingui/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { LocaleContext } from "@/contexts/locale-context-types";
import { activateLocale } from "@/lib/activate-locale";
import { appI18n } from "@/lib/app-i18n";
import {
  LOCALE_STORAGE_KEY,
  resolveInitialLocale,
  type SupportedLocale,
  toHtmlLang,
} from "@/lib/locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const preferred = resolveInitialLocale();
    void activateLocale(preferred).then((effective) => {
      setLocaleState(effective);
      document.documentElement.lang = toHtmlLang(effective);
      setReady(true);
    });
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    void activateLocale(next).then((effective) => {
      setLocaleState(effective);
      document.documentElement.lang = toHtmlLang(effective);
    });
  }, []);

  const value = useMemo(
    () =>
      locale != null
        ? {
            locale,
            setLocale,
          }
        : null,
    [locale, setLocale],
  );

  if (!ready || value == null) {
    return null;
  }

  return (
    <I18nProvider i18n={appI18n}>
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    </I18nProvider>
  );
}
