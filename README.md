# AquilaGraph

**AquilaGraph** helps you understand a codebase from a bird’s-eye view. Instead of reading files one by one, you explore structure and relationships in an **interactive graph**—so onboarding, refactors, and architecture reviews start with a clear visual map of how the code fits together.

|                 |                                                                                                                                              |
|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| **Web app PWA** | [Open in browser](https://jargez.github.io/aquilagraph)                                                                                      |
| **Desktop**     | [macOS](YOUR_DOWNLOAD_MACOS_URL) · [Windows](YOUR_DOWNLOAD_WINDOWS_URL) · [Linux](YOUR_DOWNLOAD_LINUX_URL) — *add release or download links* |

You can **tune how code is grouped into layers**: define your own classifications (with priorities, colors, and selectors) so the graph reflects *your* architectural view—whether that is domain slices, infrastructure vs. application, or team-specific boundaries.

**Supported languages (for now):** **Python**, plus **JavaScript**, **TypeScript**, and **TSX**. Other languages may be added later.

![Main view: codebase graph](docs/readme/screenshot-graph-main.png)

---

## What you can do

- **Scan a project folder** and turn it into a navigable graph of meaningful code units and how they connect.
- **Zoom and pan** the graph; **drill into a node** to open a focused subgraph when you need more detail.
- **Customize layer rules** so parts of the codebase are classified, highlighted, grouped, or filtered the way you want—not a fixed taxonomy imposed by the tool.
- **Run in the browser** for quick access or use a **desktop build** when you prefer a native app (see links above once they are set).

## More screenshots

### Graph (alternate view or detail)

![Graph: alternate or zoomed view](docs/readme/screenshot-graph-detail.png)

### Settings

![Project and analysis settings](docs/readme/screenshot-settings.png)

---

## Contributing & development

The UI is a **React** app built with **Vite**; the desktop shell uses **Tauri 2**. Routing is **TanStack Router**; styling **Tailwind CSS 4**. Parsing and scope analysis rely on **Tree-sitter** (WASM) and **@luciformresearch/codeparsers**; analyzers currently cover **Python** and the **JS / TS / TSX** family. Graph layout uses **Graphviz** (`ts-graphviz`, `@viz-js/viz`). **Lingui** handles i18n; **Biome** and **Vitest** support code quality.

**Requirements:** [pnpm](https://pnpm.io/) (see `package.json` for the expected version).

```bash
pnpm install
pnpm dev          # Tauri window + dev server
pnpm dev:vite     # frontend only (e.g. http://localhost:3000)
pnpm build        # desktop release build
pnpm check        # lint, typecheck, tests
pnpm storybook    # UI components
```

| Path | Role |
| --- | --- |
| `src/` | Application code; routes in `src/routes/`; analysis core in `src/core/` |
| `src-tauri/` | Tauri (Rust) backend |
| `public/wasm/` | Tree-sitter WASM artifacts (synced via `pnpm sync:wasm` / `prepare`) |

Release **app identifier**: set `identifier` in `src-tauri/tauri.conf.json` if you ship your own builds.
