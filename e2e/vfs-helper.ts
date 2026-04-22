import * as fs from "node:fs";
import * as path from "node:path";

export type VfsNode =
	| { kind: "file"; name: string; text: string }
	| { kind: "dir"; name: string; children: VfsNode[] };

export function readDirAsVfs(absDirPath: string, name: string): VfsNode {
	const entries = fs.readdirSync(absDirPath, { withFileTypes: true });
	entries.sort((a: any, b: any) => a.name.localeCompare(b.name));

	const children: VfsNode[] = [];
	for (const e of entries) {
		const abs = path.join(absDirPath, e.name);
		if (e.isDirectory()) {
			children.push(readDirAsVfs(abs, e.name));
		} else if (e.isFile()) {
			children.push({ kind: "file", name: e.name, text: fs.readFileSync(abs, "utf-8") });
		}
	}
	return { kind: "dir", name, children };
}

export function initScriptForVirtualDirectoryPicker(root: VfsNode): string {
	return `
(() => {
  try { localStorage.setItem("aquilagraph-locale", "ru"); } catch {}

  const storesByDb = new Map();
  function ensureDb(name) {
    if (!storesByDb.has(name)) storesByDb.set(name, new Map());
    return storesByDb.get(name);
  }

  function makeRequest() {
    return { onsuccess: null, onerror: null, onupgradeneeded: null, result: null, error: null };
  }

  window.indexedDB = {
    open(dbName, _version) {
      const req = makeRequest();
      setTimeout(() => {
        try {
          const dbStores = ensureDb(dbName);
          const objectStoreNames = {
            contains(store) { return dbStores.has(store); },
          };
          const db = {
            objectStoreNames,
            createObjectStore(store) { if (!dbStores.has(store)) dbStores.set(store, new Map()); },
            transaction(store, _mode) {
              const tx = { oncomplete: null, onerror: null, error: null };
              const storeMap = dbStores.get(store) || (dbStores.set(store, new Map()), dbStores.get(store));
              tx.objectStore = () => ({
                put(value, key) {
                  storeMap.set(key, value);
                  setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
                },
                get(key) {
                  const r = makeRequest();
                  setTimeout(() => { r.result = storeMap.get(key); r.onsuccess && r.onsuccess(); }, 0);
                  return r;
                },
                delete(key) {
                  storeMap.delete(key);
                  setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
                },
              });
              return tx;
            },
            close() {},
          };
          req.result = db;
          if (req.onupgradeneeded) req.onupgradeneeded();
          if (req.onsuccess) req.onsuccess();
        } catch (e) {
          req.error = e;
          if (req.onerror) req.onerror();
        }
      }, 0);
      return req;
    },
  };

  class FileSystemDirectoryHandle {}
  class FileSystemFileHandle {}
  window.FileSystemDirectoryHandle = FileSystemDirectoryHandle;
  window.FileSystemFileHandle = FileSystemFileHandle;

  const ROOT = ${JSON.stringify(root)};

  function isDir(node) { return node && node.kind === "dir"; }
  function isFile(node) { return node && node.kind === "file"; }

  function findChild(dirNode, name) {
    if (!isDir(dirNode)) return null;
    return (dirNode.children || []).find(c => c.name === name) || null;
  }

  class VirtualFileHandle extends FileSystemFileHandle {
    constructor(node) { super(); this.kind = "file"; this.name = node.name; this._node = node; }
    async getFile() { return new File([this._node.text], this._node.name, { type: "text/plain" }); }
  }

  class VirtualDirHandle extends FileSystemDirectoryHandle {
    constructor(node) { super(); this.kind = "directory"; this.name = node.name; this._node = node; }
    async queryPermission() { return "granted"; }
    async requestPermission() { return "granted"; }
    async getDirectoryHandle(name) {
      const child = findChild(this._node, name);
      if (!isDir(child)) throw new DOMException("NotFoundError", "NotFoundError");
      return new VirtualDirHandle(child);
    }
    async getFileHandle(name) {
      const child = findChild(this._node, name);
      if (!isFile(child)) throw new DOMException("NotFoundError", "NotFoundError");
      return new VirtualFileHandle(child);
    }
    async *entries() {
      for (const child of (this._node.children || [])) {
        if (isDir(child)) yield [child.name, new VirtualDirHandle(child)];
        else if (isFile(child)) yield [child.name, new VirtualFileHandle(child)];
      }
    }
  }

  window.showDirectoryPicker = async () => new VirtualDirHandle(ROOT);
})();
`.trim();
}
