import { WasmLoader } from "@internal/codeparsers-wasm-loader";
import { isTauriRuntime } from "@/lib/is-tauri";

/**
 * Vite injects `globalThis.process` without `versions`. web-tree-sitter does
 * `globalThis.process?.versions.node` — if `versions` is missing, that evaluates
 * to `undefined.node` and throws in WebKit ("undefined is not an object").
 */
function ensureProcessVersionsForWebTreeSitter(): void {
  const proc = globalThis.process;
  if (typeof proc !== "object" || proc === null) {
    return;
  }
  const p = proc as typeof proc & {
    versions?: Record<string, string | undefined>;
  };
  if (typeof p.versions !== "object" || p.versions === null) {
    p.versions = {};
  }
}

/**
 * PythonScopeExtractionParser always requests `environment: 'node'`, which
 * breaks in the Tauri webview. Force browser loading against /wasm/* assets
 * (populated by scripts/sync-tree-sitter-wasm.mjs).
 */
function resolveWasmBaseUrl(): string {
  const prefix = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
  const relative = `${prefix}/wasm`.replace(/\/{2,}/g, "/");
  if (typeof window === "undefined") {
    return relative;
  }
  return new URL(relative, window.location.origin).href.replace(/\/+$/, "");
}

function install(): void {
  const base = resolveWasmBaseUrl();
  WasmLoader.configure({
    forceEnvironment: "browser",
    wasmBaseUrl: base,
  });
  const original = WasmLoader.loadParser.bind(WasmLoader);
  WasmLoader.loadParser = async (
    language: string,
    config?: {
      environment?: string;
      treeSitterWasmUrl?: string;
      languageWasmUrl?: string;
    },
  ) => {
    const merged = config ? { ...config } : {};
    merged.environment = "browser";
    merged.treeSitterWasmUrl = base;
    return original(language, merged);
  };
}

// Always patch — Vite/bundlers can inject `process` without `versions` in any browser env
ensureProcessVersionsForWebTreeSitter();

if (isTauriRuntime()) {
  install();
}
