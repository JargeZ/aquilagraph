Feature("pwa-graph-view");

const fs = require("node:fs");
const path = require("node:path");

type VfsNode =
	| { kind: "file"; name: string; text: string }
	| { kind: "dir"; name: string; children: VfsNode[] };

function readDirAsVfs(absDirPath: string, name: string): VfsNode {
	const entries = fs.readdirSync(absDirPath, { withFileTypes: true });
	/** deterministic order for stable tests */
	entries.sort((a: any, b: any) => a.name.localeCompare(b.name));

	const children: VfsNode[] = [];
	for (const e of entries) {
		const abs = path.join(absDirPath, e.name);
		if (e.isDirectory()) {
			children.push(readDirAsVfs(abs, e.name));
		} else if (e.isFile()) {
			children.push({
				kind: "file",
				name: e.name,
				text: fs.readFileSync(abs, "utf-8"),
			});
		}
	}
	return { kind: "dir", name, children };
}

function initScriptForVirtualDirectoryPicker(root: VfsNode): string {
	return `
(() => {
  try { localStorage.setItem("aquilagraph-locale", "ru"); } catch {}

  // ---- Minimal IndexedDB polyfill (in-memory) ----
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

  // ---- File System Access API shims ----
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

Scenario("pwa: analyze test project, render graph, and validate navigation", async ({ I }) => {
	const testProjectRoot = path.resolve(
		__dirname,
		"../test_python_project/src",
	);
	const vfs = readDirAsVfs(testProjectRoot, "test_python_project_src");

	I.usePlaywrightTo("inject virtual directory picker", async ({ page }: any) => {
		await page.addInitScript(initScriptForVirtualDirectoryPicker(vfs));
	});

	I.amOnPage("/");
	I.waitForText("Новый проект", 10);
	I.click('[aria-label="Язык интерфейса"]');
	I.click('English');
	I.click("New project");

	// Go to Settings from the empty project graph page
	I.waitForText("No folder", 10);
	I.click("Open settings");

	// Apply Django template in analysis settings
	I.waitForText("Analysis settings", 10);
	I.click(locate("button").withText('Django'));

	// Select virtual directory (File System Access API mocked)
	I.click("Choose folder");
	I.waitForText("test_python_project_src", 10);

	// Run analysis and navigate to graph view
	I.click("Analyze");

	// Wait until SVG graph is rendered
	I.waitForText("ViewSet", 30);
	I.saveScreenshot("graph-rendered.png", true);



	// const textCoordinates = await I.executeScript(function() {
	// 	const elem = document.evaluate("//g[contains(text(),'PerformExport')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	// 	const rect = elem.getBoundingClientRect();
	// 	return { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
	// });
	//
	// I.moveCursorTo(textCoordinates.x, textCoordinates.y);
	I.doubleClick("//*[local-name()='text'][contains(., 'PerformExport')]");
	I.waitForText("Debug", 10);
	I.saveScreenshot("subgraph-rendered.png", true);
	I.pressKey("Escape")

	I.doubleClick("//*[local-name()='text'][contains(., 'PerformExport')]");
	I.waitForText("Debug", 10);
	I.click("Debug");
	I.waitForText("Decorators", 10);
	I.click('[aria-label="Add reference to classification"]');
	I.selectOption("Select", "Business")
	I.click("Add");
	I.click("Back");
	I.click("Back");
	I.click("Settings");
	I.waitForText("Analysis settings")
	I.waitForText("export_module.actions.perform_export.PerformExport")

});
