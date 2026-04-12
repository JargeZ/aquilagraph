import { defineConfig } from "@lingui/cli";

export default defineConfig({
  /** Макросы `t` из `@lingui/core/macro` должны использовать тот же экземпляр, что и `I18nProvider` (`activateLocale` → `appI18n.loadAndActivate`). Путь через алиас `@/`, чтобы импорт был валиден из любого файла под `src/`. */
  runtimeConfigModule: ["@/lib/app-i18n", "appI18n"],
  sourceLocale: "ru",
  locales: [
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
  ],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
});
