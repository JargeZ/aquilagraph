import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
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

/** When PWA is off, vite-plugin-pwa skips HTML injection; keep manifest + theme-color. When on, the plugin injects the manifest link. */
function pwaHeadMeta(pwaEnabled: boolean): Plugin {
  return {
    name: "pwa-head-meta",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        let out = html;
        if (!out.includes('name="theme-color"')) {
          out = out.replace(
            "</head>",
            `    <meta name="theme-color" content="#000000" />\n  </head>`,
          );
        }
        if (!pwaEnabled && !out.includes('rel="manifest"')) {
          out = out.replace(
            "</head>",
            `    <link rel="manifest" href="/manifest.webmanifest" />\n  </head>`,
          );
        }
        return out;
      },
    },
  };
}

// See: https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const base = process.env.BASE_PATH ?? "/";
  const pwaEnabled = mode === "pwa" && !process.env.TAURI_ENV_PLATFORM;

  return {
    base,
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
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: false,
        manifestFilename: "manifest.webmanifest",
        manifest: {
          name: "AquilaGraph",
          short_name: "AquilaGraph",
          description: "Визуализация структуры кода проекта",
          theme_color: "#000000",
          background_color: "#ffffff",
          display: "standalone",
          icons: [
            {
              src: "favicon.ico",
              sizes: "64x64 32x32 24x24 16x16",
              type: "image/x-icon",
            },
            {
              src: "logo192.png",
              type: "image/png",
              sizes: "192x192",
            },
            {
              src: "logo512.png",
              type: "image/png",
              sizes: "512x512",
            },
          ],
          start_url: base,
          scope: base,
        },
        includeAssets: [
          "favicon.ico",
          "logo192.png",
          "logo512.png",
          "wasm/tree-sitter.wasm",
          "wasm/tree-sitter-python.wasm",
          "wasm/tree-sitter-typescript.wasm",
        ],
        workbox: {
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,woff2,wasm,webmanifest}",
          ],
        },
        disable: !pwaEnabled,
      }),
      pwaHeadMeta(pwaEnabled),
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
  };
});
