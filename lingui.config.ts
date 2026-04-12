import { defineConfig } from "@lingui/cli";

export default defineConfig({
  sourceLocale: "ru",
  locales: ["ru", "en", "ja", "ka", "de", "fr", "vi", "th", "fa"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
});
