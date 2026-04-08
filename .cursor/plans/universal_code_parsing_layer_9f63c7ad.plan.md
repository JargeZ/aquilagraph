---
name: Universal code parsing layer
overview: Replace the Python-only parsing pipeline with a language-agnostic abstraction layer using @luciformresearch/codeparsers, producing normalized ExecutableElement sets from both Python and TypeScript codebases. References, decorators, and parent classes are normalized to dot-notation module paths.
todos:
  - id: test-helpers
    content: "Update test-helpers.ts: add getTestTypeScriptProjectRoot(), universal FS adapter"
    status: completed
  - id: snapshot-tests
    content: Write snapshot tests for element-factory output on both Python and TypeScript test projects (test-first)
    status: completed
  - id: universal-parser
    content: Create universal-parser.ts wrapping Python + TypeScript parsers with auto-language-detection
    status: completed
  - id: vite-aliases
    content: Add @internal/codeparsers-ts-scope alias to vite.config.ts + codeparsers-internal.d.ts
    status: completed
  - id: wasm-sync
    content: Update sync-tree-sitter-wasm.mjs to also copy tree-sitter-typescript.wasm
    status: completed
  - id: scanner-generalize
    content: Generalize project-scanner.ts to discover files of all supported code languages
    status: completed
  - id: reference-builder
    content: "Generalize reference-builder.ts: strip any code extension, add scope-based parent extraction, import-aware symbol normalization"
    status: completed
  - id: element-factory
    content: Update element-factory.ts to use new reference builder for normalized decorators and parentClasses
    status: completed
  - id: uses-resolver
    content: Update uses-resolver.ts normalizeImportSource to handle TypeScript relative imports and path aliases
    status: completed
  - id: update-existing-tests
    content: Update existing tests (element-factory, uses-resolver, analyze) and snapshots for normalized references
    status: completed
  - id: run-verify
    content: Run full test suite, verify all snapshots, fix any regressions
    status: completed
isProject: false
---

# Universal Code Parsing Layer

## Current State

The pipeline is Python-only:

- [python-parser.ts](src/core/parser/python-parser.ts) -- singleton `PythonScopeExtractionParser`
- [project-scanner.ts](src/core/parser/project-scanner.ts) -- discovers only `*.py` files
- [reference-builder.ts](src/core/model/reference-builder.ts) -- `filePathToModuleRef` strips `.py` only, `extractParentClasses` uses Python `class Foo(Bar)` regex
- [element-factory.ts](src/core/model/element-factory.ts) -- creates `ExecutableElement` from `ScopeFileAnalysis`; parent classes extracted from Python-style `signature` regex
- [uses-resolver.ts](src/core/model/uses-resolver.ts) -- resolves import-based `uses` from `identifierReferences`

## Architecture Decision: Low-Level ScopeExtractionParser

Keep using `PythonScopeExtractionParser` + `ScopeExtractionParser('typescript')` (both return `ScopeFileAnalysis`) rather than `ProjectParser` (uses Node-only piscina workers) or universal `LanguageParser` (returns different `FileAnalysis` type). The entire downstream pipeline (`element-factory`, `uses-resolver`, `element-classifier`) already works with `ScopeFileAnalysis`, and the low-level parsers work in browser/Tauri.

## Changes

### 1. Universal Parser (`src/core/parser/`)

**New `universal-parser.ts`** -- wraps both parsers behind a single `parseFile(filePath, content)` that auto-detects language from extension:

```typescript
// Uses PythonScopeExtractionParser for .py
// Uses ScopeExtractionParser('typescript') for .ts/.tsx/.js/.jsx
```

Vite aliases (in [vite.config.ts](vite.config.ts)) -- add:

```
"@internal/codeparsers-ts-scope" -> dist/esm/scope-extraction/ScopeExtractionParser.js
```

New type declaration in [codeparsers-internal.d.ts](src/codeparsers-internal.d.ts) for `@internal/codeparsers-ts-scope`.

**Updated `project-scanner.ts`** -- generalize `discoverPythonFiles` to `discoverCodeFiles` that recognizes all supported extensions (`.py`, `.ts`, `.tsx`, `.js`, `.jsx`). Exclude `__init__.py`, `node_modules`, etc.

### 2. Generalized Reference Builder (`src/core/model/reference-builder.ts`)

- `filePathToModuleRef` -- strip any code extension (`.py`, `.ts`, `.tsx`, `.js`, `.jsx`), not just `.py`
- Replace `extractParentClasses(signature)` (Python regex) with `extractParentClassesFromScope(scope)` that uses `heritageClauses` for TS and signature regex for Python
- New `normalizeSymbolRef(symbolName, fileAnalysis)` -- resolve a symbol (decorator name, parent class name) to its full module path using `importReferences`:
  - Look up the symbol in file-level imports
  - For local imports: `normalizedSource.importedName` (e.g., `utils.base_action.BaseBusinessAction`)
  - For external imports: `source.importedName` (e.g., `celery.shared_task`, `rest_framework.viewsets.ModelViewSet`)
  - For dotted references like `viewsets.ModelViewSet`: resolve `viewsets` via imports, append `.ModelViewSet`

### 3. Updated Element Factory (`src/core/model/element-factory.ts`)

- Use `extractParentClassesFromScope(scope)` instead of `extractParentClasses(scope.signature)`
- Normalize `parentClasses` via `normalizeSymbolRef`
- Normalize `decorators` via `normalizeSymbolRef`
- Handle TypeScript-specific scope types (keep `class`, `function`, `method` filter)

### 4. Updated Import Normalization (`src/core/model/uses-resolver.ts`)

- `normalizeImportSource` -- handle TypeScript import patterns:
  - Relative `./foo` / `../bar` -- resolve relative to current file, strip extension, `/` to `.`
  - Path aliases like `@/foo/bar` -- strip alias prefix, convert to `foo.bar`
  - Node-style bare specifiers (`hono`, `zod`) -- keep as-is (external)
- Accept optional `pathAliases: Record<string, string>` from project config or auto-detect from tsconfig

### 5. WASM Setup

- [sync-tree-sitter-wasm.mjs](scripts/sync-tree-sitter-wasm.mjs) -- also copy `tree-sitter-typescript.wasm` from codeparsers dist
- [tauri-web-tree-sitter-setup.ts](src/core/parser/tauri-web-tree-sitter-setup.ts) -- no changes needed (WasmLoader handles multiple grammars)

### 6. Test Plan (write first, then implement)

Tests use the same patterns as existing tests: `beforeAll(() => initParser(), 30_000)`, `expect(...).toMatchSnapshot()`, Node FS adapter.

**New test file: `src/core/parser/__tests__/universal-parser.test.ts`**

- Parse files from both test projects
- Snapshot the parsed `ScopeFileAnalysis` structure for key files (1 Python, 1 TypeScript)

**New test file: `src/core/model/__tests__/element-factory.snapshot.test.ts`**

- Snapshot full `ExecutableElement[]` (sans `uses`) for `test_python_project`
- Snapshot full `ExecutableElement[]` for `test_typescript_project`
- Verifies normalized references, decorators, parentClasses in a readable way

**Updated existing tests:**

- [element-factory.test.ts](src/core/model/__tests__/element-factory.test.ts) -- update expected reference format for parentClasses/decorators (now normalized)
- [uses-resolver.test.ts](src/core/model/__tests__/uses-resolver.test.ts) -- still pass (uses references not parentClasses)
- [analyze.test.ts](src/core/__tests__/analyze.test.ts) -- update snapshot (DOT output may change due to normalized refs in selectors)

**Test helpers update:**

- [test-helpers.ts](src/core/parser/__tests__/test-helpers.ts) -- add `getTestTypeScriptProjectRoot()` returning `test_typescript_project/src`, add generic `createNodeFsAdapter`

### Reference Normalization Examples

Python `perform_export.py`:

```
reference: "export_module.actions.perform_export.PerformExport.execute"
parentClasses: ["utils.base_action.BaseBusinessAction"]  // was: ["BaseBusinessAction"]
decorators: []
```

Python `run_todo_sync.py`:

```
reference: "core_module.tasks.run_todo_sync.task_RunTodoSync"
decorators: ["celery.shared_task"]  // was: ["shared_task"]
```

TypeScript `add_task_to_list.ts`:

```
reference: "core_module.actions.add_task_to_list.AddTaskToList.execute"
parentClasses: ["utils.base_action.BaseBusinessAction"]
decorators: []
```

