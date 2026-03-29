import { homeDir, join } from "@tauri-apps/api/path";
import { BaseDirectory, readDir } from "@tauri-apps/plugin-fs";

const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/$/, "");

function isUnderRoot(root: string, abs: string): boolean {
  const r = norm(root);
  const a = norm(abs);
  return a === r || a.startsWith(`${r}/`);
}

async function readDirAtAbsolute(absPath: string) {
  const home = await homeDir();
  const h = norm(home);
  const abs = norm(absPath);
  if (isUnderRoot(h, abs)) {
    const rel = abs.length === h.length ? "." : abs.slice(h.length + 1);
    return readDir(rel, { baseDir: BaseDirectory.Home });
  }
  return readDir(absPath);
}

/** Recursively counts regular files under `rootAbsolute` (Tauri + plugin-fs; scope must allow the path). */
export async function countFilesRecursive(
  rootAbsolute: string,
): Promise<number> {
  const entries = await readDirAtAbsolute(rootAbsolute);
  let count = 0;
  for (const entry of entries) {
    const childAbs = await join(rootAbsolute, entry.name);
    if (entry.isFile) {
      count += 1;
    } else if (entry.isDirectory) {
      count += await countFilesRecursive(childAbs);
    }
  }
  return count;
}
