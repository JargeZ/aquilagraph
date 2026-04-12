import type { Messages } from "@lingui/core";

import { appI18n } from "@/lib/app-i18n";
import { FALLBACK_LOCALE, type SupportedLocale } from "@/lib/locale";

async function importMessages(locale: SupportedLocale): Promise<Messages> {
  const mod = await import(`../locales/${locale}/messages.po`);
  return mod.messages as Messages;
}

function isNonEmptyCatalog(messages: Messages): boolean {
  return messages != null && Object.keys(messages).length > 0;
}

/**
 * Загружает каталог локали; при ошибке или пустом каталоге — en.
 * Сообщения текущей локали поверх en (запасные строки для неполных переводов).
 */
export async function activateLocale(
  locale: SupportedLocale,
): Promise<SupportedLocale> {
  let effective: SupportedLocale = locale;
  let primary: Messages;

  try {
    primary = await importMessages(locale);
    if (!isNonEmptyCatalog(primary)) {
      throw new Error("empty catalog");
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(
        `[i18n] Failed to load locale "${locale}", falling back to "${FALLBACK_LOCALE}"`,
        e,
      );
    }
    effective = FALLBACK_LOCALE;
    primary = await importMessages(FALLBACK_LOCALE);
  }

  let enOverlay: Messages = {};
  if (effective !== FALLBACK_LOCALE) {
    try {
      enOverlay = await importMessages(FALLBACK_LOCALE);
    } catch {
      /* оставляем только primary */
    }
  }

  const merged: Messages = { ...enOverlay, ...primary };
  appI18n.loadAndActivate({ locale: effective, messages: merged });
  return effective;
}
