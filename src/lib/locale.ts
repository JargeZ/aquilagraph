import { fromNavigator, fromStorage } from "@lingui/detect-locale";

export const LOCALE_STORAGE_KEY = "aquilagraph-locale";

export const FALLBACK_LOCALE = "en";

export const SOURCE_LOCALE = "ru";

export const SUPPORTED_LOCALES = [
  "ru",
  "en",
  "zh",
  "es",
  "ar",
  "pt",
  "de",
  "fr",
  "ja",
  "ka",
  "vi",
  "th",
  "fa",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const supportedSet = new Set<string>(SUPPORTED_LOCALES);

/** BCP 47 primary subtag → наш код каталога (совпадает с lingui.config). */
export function normalizeLocaleTag(
  tag: string | null | undefined,
): SupportedLocale | null {
  if (!tag) {
    return null;
  }
  const base = tag.split("-")[0]?.toLowerCase();
  if (!base || !supportedSet.has(base)) {
    return null;
  }
  return base as SupportedLocale;
}

export function resolveInitialLocale(): SupportedLocale {
  const stored = normalizeLocaleTag(fromStorage(LOCALE_STORAGE_KEY));
  if (stored) {
    return stored;
  }
  const fromNav = normalizeLocaleTag(fromNavigator());
  if (fromNav) {
    return fromNav;
  }
  return FALLBACK_LOCALE;
}

export function toHtmlLang(locale: SupportedLocale): string {
  if (locale === "ja") {
    return "ja-JP";
  }
  if (locale === "zh") {
    return "zh-CN";
  }
  if (locale === "pt") {
    return "pt-BR";
  }
  return locale;
}

const rtlLocales = new Set<SupportedLocale>(["ar", "fa"]);

export function isRtlLocale(locale: SupportedLocale): boolean {
  return rtlLocales.has(locale);
}

export const LOCALE_NATIVE_LABELS: Record<SupportedLocale, string> = {
  ru: "Русский",
  en: "English",
  zh: "中文",
  es: "Español",
  ar: "العربية",
  pt: "Português",
  de: "Deutsch",
  fr: "Français",
  ja: "日本語",
  ka: "ქართული",
  vi: "Tiếng Việt",
  th: "ไทย",
  fa: "فارسی",
};