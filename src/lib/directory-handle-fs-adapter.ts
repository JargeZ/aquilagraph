import type { FileSystemAdapter } from "@/core/parser/project-scanner";

async function resolveDirectory(
  root: FileSystemDirectoryHandle,
  relativeDir: string,
): Promise<FileSystemDirectoryHandle> {
  if (!relativeDir) return root;
  const parts = relativeDir.split("/").filter(Boolean);
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part);
  }
  return dir;
}

async function readFileFromRoot(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<File> {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Empty file path");
  }
  const fileName = parts.pop() as string;
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part);
  }
  const fh = await dir.getFileHandle(fileName);
  return fh.getFile();
}

/** Адаптер для сканера проекта поверх File System Access API (только чтение). */
export function createDirectoryHandleFsAdapter(
  root: FileSystemDirectoryHandle,
): FileSystemAdapter {
  return {
    readFile: async (filePath: string) => {
      const file = await readFileFromRoot(root, filePath);
      return file.text();
    },
    listDir: async (dirPath: string) => {
      const dir = await resolveDirectory(root, dirPath);
      const out: { name: string; isDirectory: boolean }[] = [];
      for await (const [name, handle] of dir.entries()) {
        out.push({
          name,
          isDirectory: handle.kind === "directory",
        });
      }
      return out;
    },
  };
}

export type DirectoryPickerWindow = Window &
  typeof globalThis & {
    showDirectoryPicker?: (
      options?: DirectoryPickerOptions,
    ) => Promise<FileSystemDirectoryHandle>;
  };

export async function pickProjectDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof window === "undefined") return null;
  const w = window as DirectoryPickerWindow;
  if (typeof w.showDirectoryPicker !== "function") return null;
  try {
    return await w.showDirectoryPicker({ mode: "read" });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    try {
      return await w.showDirectoryPicker();
    } catch (e2) {
      if (e2 instanceof DOMException && e2.name === "AbortError") return null;
      throw e2;
    }
  }
}
