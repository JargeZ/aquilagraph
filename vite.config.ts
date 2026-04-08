import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Nitro/TanStack dev can fall through to SPA HTML for unknown paths — WASM then "parses" as HTML. */
function serveTreeSitterWasmFromPublic(projectRoot: string): Plugin {
  const wasmDir = path.join(projectRoot, "public/wasm");
  return {
    name: "serve-tree-sitter-wasm",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? "";
        if (!pathname.startsWith("/wasm/")) {
          next();
          return;
        }
        const rel = pathname.slice("/wasm/".length);
        if (!rel || rel.includes("..")) {
          next();
          return;
        }
        const file = path.join(wasmDir, rel);
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
          next();
          return;
        }
        res.setHeader("Content-Type", "application/wasm");
        res.setHeader("Cache-Control", "no-cache");
        fs.createReadStream(file).on("error", next).pipe(res);
      });
    },
  };
}
const codeparsersPkgRoot = path.resolve(
  __dirname,
  "node_modules/@luciformresearch/codeparsers",
);

type TanStackStartInputConfig = NonNullable<
  Parameters<typeof tanstackStart>[0]
>;
type SpaOptions = NonNullable<TanStackStartInputConfig["spa"]>;
type SpaPrerenderOptions = NonNullable<SpaOptions["prerender"]>;
type RegularPrerenderOptions = NonNullable<SpaOptions["prerender"]>;

const host: string | undefined = process.env.TAURI_DEV_HOST;

// Read from environment variable to pick which prerender mode to use.
// Defaults to false, which will pick the SPA prerender mode
const useSsrPrerenderString: string =
  process.env.USE_SSR_PRERENDER_MODE?.toLowerCase() ?? "false";
const useSsrPrerenderMode: boolean =
  useSsrPrerenderString === "true" || useSsrPrerenderString === "1";

const sharedPrerenderOptions: SpaPrerenderOptions & RegularPrerenderOptions = {
  enabled: true,
  autoSubfolderIndex: true,
};

// See: https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode#prerendering-options
const regularPrerenderOptions: RegularPrerenderOptions = {
  ...sharedPrerenderOptions,
  // Whether to extract links from the HTML and prerender them also
  // See: https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering#crawling-links
  crawlLinks: true,
  // Number of times to retry a failed prerender job
  retryCount: 3,
  // Delay between retries in milliseconds
  retryDelay: 1000,
};

// See: https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode#prerendering-options
const spaWithPrerenderOptions: SpaOptions = {
  prerender: {
    ...sharedPrerenderOptions,
    // Change the root output path for SPA prerendering from /_shell.html to /index.html
    outputPath: "/index.html",
    crawlLinks: false,
    retryCount: 0,
  },
};

// See: https://vite.dev/config/
export default defineConfig(async () => ({
  resolve: {
    alias: {
      // @luciformresearch/codeparsers pulls Node's `path`; map to browser build
      path: "path-browserify",
      // Barrel export loads Node-only `piscina`; use scope-extraction entry (not in package exports)
      "@internal/codeparsers-python-scope": path.join(
        codeparsersPkgRoot,
        "dist/esm/scope-extraction/PythonScopeExtractionParser.js",
      ),
      "@internal/codeparsers-ts-scope": path.join(
        codeparsersPkgRoot,
        "dist/esm/scope-extraction/ScopeExtractionParser.js",
      ),
      "@internal/codeparsers-wasm-loader": path.join(
        codeparsersPkgRoot,
        "dist/esm/wasm/WasmLoader.js",
      ),
    },
  },
  plugins: [
    serveTreeSitterWasmFromPublic(__dirname),
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      spa: (!useSsrPrerenderMode
        ? spaWithPrerenderOptions
        : undefined) satisfies SpaOptions | undefined,
      prerender: (useSsrPrerenderMode
        ? regularPrerenderOptions
        : undefined) satisfies RegularPrerenderOptions | undefined,
    }),
    viteReact(),
  ],

  // Prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 3000,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 3001,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
