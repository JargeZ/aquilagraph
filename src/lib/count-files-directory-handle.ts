/** Рекурсивно считает все файлы под корневым каталогом (браузер, File System Access API). */
export async function countFilesRecursiveFromDirectoryHandle(
  root: FileSystemDirectoryHandle,
): Promise<number> {
  let count = 0;
  async function walk(dir: FileSystemDirectoryHandle): Promise<void> {
    for await (const [, handle] of dir.entries()) {
      if (handle.kind === "file") {
        count += 1;
      } else {
        await walk(handle);
      }
    }
  }
  await walk(root);
  return count;
}
