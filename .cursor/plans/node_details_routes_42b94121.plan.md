---
name: node_details_routes
overview: Add two new per-node routes (debug and placeholder details) and wire navigation links from the existing right-side node card, reusing shared node-from-route context logic already implied by node-sub-graph.
todos:
  - id: add-node-context-hook
    content: Create shared hook/util to decode nodeRef and resolve ExecutableElement from analysisResult (Map lookup) for all node-specific pages.
    status: completed
  - id: refactor-node-sub-graph
    content: Update node-sub-graph route to use the shared node context logic (no behavior change).
    status: completed
  - id: add-node-debug-route
    content: Add /$projectId/node-debug-details/$nodeRef route and render full ExecutableElement debug info with clickable uses links.
    status: completed
  - id: add-node-details-route
    content: Add /$projectId/node-details/$nodeRef placeholder route showing only node name.
    status: completed
  - id: add-card-navigation-links
    content: Add navigation links in NodeDetailsPanel to the two new routes (use encodeURIComponent(element.reference)).
    status: completed
  - id: smoke-check
    content: Manually verify navigation and not-found/loading states across routes.
    status: completed
isProject: false
---

## Goal

- Add new routes:
  - `/$projectId/node-debug-details/$nodeRef`: show full `ExecutableElement` debug information (reference, uses/children as clickable links, decorators, parent classes, source info, and other fields).
  - `/$projectId/node-details/$nodeRef`: placeholder page showing just node name.
- Add navigation links next to the existing right-side node card (currently `NodeDetailsPanel` in `GraphView`).
- Reuse node-page context logic (decode `nodeRef`, lookup `ExecutableElement` by ref) so future node-specific pages don’t duplicate it.

## Current relevant code (baseline)

- The right-side card is `NodeDetailsPanel` in `[/Users/lev/IdeaProjects/visualizer/src/components/graph-view.tsx](/Users/lev/IdeaProjects/visualizer/src/components/graph-view.tsx)` and currently shows `name`, `reference`, `decorators`, `parentClasses`, `sourceFile`, `uses` (as plain list).
- The per-node route pattern already exists at `[/Users/lev/IdeaProjects/visualizer/src/routes/$projectId/node-sub-graph/$nodeRef.tsx](/Users/lev/IdeaProjects/visualizer/src/routes/$projectId/node-sub-graph/$nodeRef.tsx)`, which:
  - reads `nodeRef` param
  - `decodeURIComponent`s it
  - computes a derived view (`buildNodeSubgraphResult`) from `analysisResult`

## Proposed reuse strategy (node context)

- Introduce a reusable helper/hook that every per-node page can use:
  - **Input**: `nodeRefParam` (string from route params)
  - **Output**: `{ decodedRef, element, elementsByRef }` (or similar), where `element` is `ExecutableElement | null`.
  - **Implementation**: uses `useProjectAnalysis()` to access `analysisResult.elements`, builds a `Map<string, ExecutableElement>` for fast lookup, and applies the same `decodeURIComponent` fallback logic currently in `node-sub-graph`.
- Refactor `node-sub-graph/$nodeRef.tsx` to use this shared hook for decoding + lookup (and optionally for “node not found” handling), keeping its current behavior.

## UI changes

- Update `NodeDetailsPanel` in `[/Users/lev/IdeaProjects/visualizer/src/components/graph-view.tsx](/Users/lev/IdeaProjects/visualizer/src/components/graph-view.tsx)`:
  - Add two links (TanStack `Link`) using current `projectId` from `useProjectAnalysis()`:
    - `/$projectId/node-debug-details/$nodeRef`
    - `/$projectId/node-details/$nodeRef`
  - Keep URL encoding consistent with existing behavior (`encodeURIComponent(element.reference)`), matching `node-sub-graph`.

## New pages

- Add route file `[/Users/lev/IdeaProjects/visualizer/src/routes/$projectId/node-debug-details/$nodeRef.tsx](/Users/lev/IdeaProjects/visualizer/src/routes/$projectId/node-debug-details/$nodeRef.tsx)`:
  - Use shared node-context hook to get `element`.
  - Render a debug card/layout:
    - **Full reference** (code block)
    - **Module, className, name, type**
    - **Decorators** (list)
    - **Parent classes** (list)
    - **Source** (`sourceFile:startLine-endLine`)
    - **Children/uses**: render `element.uses` as clickable links to the same debug route (and optionally also to placeholder details route).
  - Handle states:
    - analysis loading → skeleton/loader
    - node not found → “узел не найден” + link back to `/$projectId` and `/$projectId/node-sub-graph/$nodeRef` when applicable.
- Add route file `[/Users/lev/IdeaProjects/visualizer/src/routes/$projectId/node-details/$nodeRef.tsx](/Users/lev/IdeaProjects/visualizer/src/routes/$projectId/node-details/$nodeRef.tsx)`:
  - Placeholder: show only node name (or “узел не найден”).

## Notes/constraints

- Keep routing consistent with TanStack file-based routing (use `$projectId` + `$nodeRef` segments).
- Keep nodeRef encoding/decoding consistent with existing `node-sub-graph` page.
- Avoid adding project-specific dependencies into `GraphView` except reading `projectId` from `useProjectAnalysis()` (GraphView is currently used within `/$projectId/`* where provider exists).

## Verification

- Navigate from existing right-side card to:
  - debug details page for selected node
  - placeholder details page
- On debug page, click a child/use link and confirm navigation works and content updates.
- Confirm `node-sub-graph` route continues to work after refactor.

