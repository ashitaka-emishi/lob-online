# 2026-02-20 19:15 — Vitest 4 / Dependabot upgrade

## What happened

Dependabot opened a PR bumping three packages together:

| Package               | Before  | After   |
| --------------------- | ------- | ------- |
| `esbuild`             | 0.21.5  | 0.27.3  |
| `vitest`              | 2.1.9   | 4.0.18  |
| `@vitest/coverage-v8` | 2.1.9   | 4.0.18  |

The esbuild bump is indirect (pulled in by Vite). The vitest major version jump
from 2→4 introduced two breaking changes that caused all 6 client-side test suites
to fail with _"Install @vitejs/plugin-vue to handle .vue files"_.

## Root cause

**Vitest 4 vendors Vite 7 internally** (in `node_modules/vitest/node_modules/vite`).
When running tests, Vitest uses its own Vite instance — not the project's. This
broke the Vue plugin registration in two ways:

1. **`@vitejs/plugin-vue@5` dropped** — peer dep was `^5 || ^6` only; Vite 7 not
   in range, so the plugin silently failed to transform `.vue` files.

2. **`defineWorkspace` removed from `vitest/config`** — Vitest 4 dropped this
   export. The `vitest.workspace.js` approach still ran (convention-based file
   discovery survived), but the `plugins: [vue()]` in the workspace project config
   was no longer applied by the new isolated-Vite-per-project architecture.

## Fix

Two changes:

1. `client/package.json`: `@vitejs/plugin-vue` `^5.2.0` → `^6.0.0`
   (v6 declares peer dep `^5 || ^6 || ^7`)

2. Deleted `vitest.workspace.js`; merged its projects into `vitest.config.js`
   using the Vitest 4 `test.projects` array. The `plugins: [vue()]` now applies
   correctly in the client project context. Coverage config stayed in the same
   file.

## Outcome

All 53 tests pass. Lint and format clean. The HLD.md comment in section 11
(`vitest.workspace.js`) is now stale but updating it is a low-priority docs
cleanup; the code is correct.

## Branch

`fix/dependabot-vitest4-upgrade` — ready to PR against `main`.
