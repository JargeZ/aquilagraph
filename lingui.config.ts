import { defineConfig } from "@lingui/cli";

export default defineConfig({
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
