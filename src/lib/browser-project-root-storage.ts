const DB_NAME = "visualizer-fs";
const STORE = "projectRoots";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("indexedDB.open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function saveProjectRootHandle(
  projectId: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("IDB transaction failed"));
      tx.objectStore(STORE).put(handle, projectId);
    });
  } finally {
    db.close();
  }
}

export async function loadProjectRootHandle(
  projectId: string,
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  try {
    return await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        tx.onerror = () =>
          reject(tx.error ?? new Error("IDB transaction failed"));
        const r = tx.objectStore(STORE).get(projectId);
        r.onsuccess = () => {
          const v = r.result;
          resolve(v instanceof FileSystemDirectoryHandle ? v : null);
        };
        r.onerror = () => reject(r.error);
      },
    );
  } finally {
    db.close();
  }
}

export async function deleteProjectRootHandle(
  projectId: string,
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("IDB transaction failed"));
      tx.objectStore(STORE).delete(projectId);
    });
  } finally {
    db.close();
  }
}

const READ_MODE = { mode: "read" } as const;

/** Только query — без user activation, можно вызывать при загрузке страницы. */
export async function hasDirectoryReadPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const state = await handle.queryPermission(READ_MODE);
  return state === "granted";
}

/**
 * Запрашивает доступ, если ещё не выдан. Вызывать только в обработчике жеста
 * пользователя (клик) или сразу после showDirectoryPicker — иначе SecurityError.
 */
export async function ensureDirectoryReadPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  if (await hasDirectoryReadPermission(handle)) return true;
  const state = await handle.requestPermission(READ_MODE);
  return state === "granted";
}
