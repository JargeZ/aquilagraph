import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Dev server SPA fallback can serve index.html for unknown paths — WASM then "parses" as HTML. */
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

const host: string | undefined = process.env.TAURI_DEV_HOST;

// See: https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  resolve: {
    alias: {
      path: "path-browserify",
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
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    viteReact(),
  ],

  clearScreen: false,
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
      ignored: ["**/src-tauri/**"],
    },
  },
});
