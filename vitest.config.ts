import { lingui } from "@lingui/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    viteReact({
      babel: {
        plugins: ["@lingui/babel-plugin-lingui-macro"],
      },
    }),
    lingui(),
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
  ],
  test: {
    environment: "jsdom",
    server: {
      deps: {
        inline: ["@luciformresearch/codeparsers"],
      },
    },
  },
});
