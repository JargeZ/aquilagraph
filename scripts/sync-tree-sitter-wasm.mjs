/**
 * Copies tree-sitter runtime + language grammar WASMs into public/wasm so the
 * Tauri webview can fetch them (browser loader). Without this, requests hit
 * the SPA router and return HTML → "doesn't start with \\0asm".
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public/wasm");
const grammarsDir = path.join(
  root,
  "node_modules/@luciformresearch/codeparsers/dist/esm/wasm/grammars",
);

const grammars = ["tree-sitter-python.wasm", "tree-sitter-typescript.wasm"];

function findTreeSitterRuntimeWasm() {
  const direct = path.join(
    root,
    "node_modules/web-tree-sitter/tree-sitter.wasm",
  );
  if (fs.existsSync(direct)) {
    return direct;
  }
  const pnpmDir = path.join(root, "node_modules/.pnpm");
  if (fs.existsSync(pnpmDir)) {
    for (const name of fs.readdirSync(pnpmDir)) {
      if (!name.startsWith("web-tree-sitter@")) continue;
      const candidate = path.join(
        pnpmDir,
        name,
        "node_modules/web-tree-sitter/tree-sitter.wasm",
      );
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  throw new Error(
    "tree-sitter.wasm not found under node_modules; run pnpm install",
  );
}

function copyWasm(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing source WASM: ${src}`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(src, dest);
}

const runtime = findTreeSitterRuntimeWasm();
copyWasm(runtime, path.join(outDir, "tree-sitter.wasm"));

for (const grammar of grammars) {
  copyWasm(path.join(grammarsDir, grammar), path.join(outDir, grammar));
}
