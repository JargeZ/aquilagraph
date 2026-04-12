import { lingui } from "@lingui/vite-plugin";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";
import { mergeConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const stripViteReactPlugins = (plugins: PluginOption[] | undefined) =>
  (plugins ?? []).flat().filter((p) => {
    if (!p || Array.isArray(p)) {
      return true;
    }
    const name = (p as { name?: string }).name ?? "";
    return (
      name !== "vite:react-babel" &&
      name !== "vite:react-refresh" &&
      name !== "vite:react:refresh-wrapper" &&
      name !== "vite:react:config-post" &&
      name !== "vite:react-refresh-fbm" &&
      name !== "@vitejs/plugin-react/preamble"
    );
  });

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  staticDirs: ["../public"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(viteConfig) {
    return mergeConfig(
      { ...viteConfig, plugins: stripViteReactPlugins(viteConfig.plugins) },
      {
        plugins: [
          react({
            babel: {
              plugins: ["@lingui/babel-plugin-lingui-macro"],
            },
          }),
          lingui(),
          tailwindcss(),
          viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
        ],
      },
    );
  },
};

export default config;
