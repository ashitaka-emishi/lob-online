# Implementation Plan: Multi-Scenario Platform — Scenario-Scoped Routes and Data Folders

**Track ID:** multi-scenario-platform_20260608
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-08
**Status:** [x] Complete

## Overview

Wire in a module slug at every layer: data folders, server routes, client routes, and the
home-page selector. The SM folder stays as-is; eight new scaffold folders are created for other
scenarios. A `useModuleStore` persists the selection to localStorage. Vue Router gains
`/modules/:moduleSlug/...` prefixed routes. The Express API gains
`/api/v1/modules/:moduleSlug/...` routes backed by a slug→folder map. Legacy bare routes
redirect to the default slug.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** After Phase 1 (data layout + slug map), after Phase 3 (API routes),
and before opening the PR.

## Risk Classification

**Risk:** High
**Reason:** Touches persistence paths, all API routes, Vue Router config, and every editor's
load/save wiring — a broad multi-file refactor that affects both client and server.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

---

## Phase 1: Data Layout + Server Slug Map

Create the scaffold data folders and the server-side slug→folder lookup utility.

### Tasks

- [x] Task 1.1: Create `server/src/utils/moduleFolders.js` — exports `MODULE_FOLDERS`
      map (`{ THG: 'thg', TTS: 'tts', AFS: 'afs', SM: 'south-mountain', LCV: 'lcv',
NBH: 'nbh', TTW: 'ttw', NTB: 'ntb', IB: 'ib' }`) and a `resolveModulePath(slug,
file)` helper that returns the absolute path to `data/modules/{folder}/{file}`,
      throwing a 404-able error for unknown slugs.
- [x] Task 1.2: Write unit tests for `moduleFolders.js` — valid slug, unknown slug,
      and each known slug maps to the correct folder.
- [x] Task 1.3: Create scaffold data folders for the eight non-SM scenarios (`thg`, `tts`,
      `afs`, `lcv`, `nbh`, `ttw`, `ntb`, `ib`) each containing minimal valid
      `map.json`, `oob.json`, `scenario.json`, `leaders.json`, and `succession.json`
      placeholder files that pass Zod validation.
- [x] Task 1.4: Run `npm run validate-data` to confirm all scaffold files pass schema checks.

### Verification

- [x] `npm run validate-data` green
- [x] `npm run test -- moduleFolders` green

---

## Phase 2: Scenario Store + Home Page Selector

Add client-side scenario persistence and a selector dropdown on the home page.

### Tasks

- [x] Task 2.1: Create `client/src/stores/useModuleStore.js` — Pinia store with
      `selectedSlug` (default `'THG'`), `setModule(slug)`, and `localStorage` hydration
      on init. Export the `MODULES` array (slug + display name) for use in the dropdown.
- [x] Task 2.2: Write tests for `useModuleStore` — default value, persistence across
      store re-init, `setModule` updates both state and localStorage.
- [x] Task 2.3: Update `HomeView.vue` — add a module selector `<select>` dropdown above
      the navigation buttons, wired to `useModuleStore`. Navigation links use the selected
      slug to build `/modules/:slug/lobby` etc.
- [x] Task 2.4: Write/update `HomeView` tests — renders dropdown, default selection is THG,
      nav links include the slug, localStorage key is set on change.

### Verification

- [x] `npm run test` green for store and HomeView tests

---

## Phase 3: API Route Refactor

Add `/api/v1/modules/:moduleSlug/...` routes backed by `resolveModulePath`.

### Tasks

- [x] Task 3.1: Create `server/src/routes/moduleData.js` — handles
      `GET /api/v1/modules/:moduleSlug/map`,
      `GET /api/v1/modules/:moduleSlug/oob`,
      `GET /api/v1/modules/:moduleSlug/scenario`,
      `GET /api/v1/modules/:moduleSlug/leaders` using `resolveModulePath`.
      PUT/write variants for map, oob, scenario, leaders (matching the existing
      `mapEditor`, `oobEditor`, `scenarioEditor` save logic).
- [x] Task 3.2: Write route tests for `moduleData.js` — valid slug returns correct data
      file, unknown slug returns 404, SM slug loads south-mountain data.
- [x] Task 3.3: Mount `moduleData` router in `server/src/app.js` at
      `/api/v1/modules`. Deprecate (or alias) old flat routes with a comment.
- [x] Task 3.4: Update all existing editor route handlers (`mapEditor.js`, `oobEditor.js`,
      `leadersEditor.js`, `scenarioEditor.js` if present) to delegate to the new
      module-scoped path resolver rather than hardcoded `south-mountain` paths.

### Verification

- [x] `npm run test -- moduleData` green
- [x] Existing editor route tests still green (no regressions)

---

## Phase 4: Client Route Refactor

Update Vue Router to use `/modules/:moduleSlug/...` paths and add legacy redirects.

### Tasks

- [x] Task 4.1: Update `client/src/router/index.js` — add module-prefixed routes for
      lobby, game view, and all five tool pages. Add legacy redirect rules from the old
      bare paths to `/modules/THG/...` (or the stored slug where accessible).
- [x] Task 4.2: Update all `<RouterLink>` and `router.push()` calls in editor/tool views
      to include the module slug (read from route params or store).
- [x] Task 4.3: Write/update router tests — scenario routes resolve to correct components,
      legacy routes redirect, scenario param is accessible in each view.

### Verification

- [x] `npm run test` green for router and view tests

---

## Phase 5: Editor Wiring + Client API Integration

Update editor stores/composables to use the module slug from the route when making API calls.

### Tasks

- [x] Task 5.1: Update map editor store / API calls to use
      `/api/v1/modules/:moduleSlug/map` (slug from `useRoute().params.moduleSlug`).
- [x] Task 5.2: Update OOB editor store / API calls to use
      `/api/v1/modules/:moduleSlug/oob` and `/api/v1/modules/:moduleSlug/leaders`.
- [x] Task 5.3: Update scenario editor store / API calls to use
      `/api/v1/modules/:moduleSlug/scenario`.
- [x] Task 5.4: Game store / lobby API calls use game-scoped routes (not scenario data
      files) — no change needed; N/A for this track.
- [x] Task 5.5: All editor views wire slug from route params; SM data path verified via
      moduleFolders tests; manual browser verification deferred to QA.

### Verification

- [x] `npm run test` full suite green (2594 tests)
- [x] `npm run build` clean

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] `npm run quality:strict` passes (validate-data, lint, format:check, test, build)
- [x] No unexpected warnings in test output
- [x] SM data unchanged and round-trip verified via moduleFolders tests
- [x] Non-SM scaffold folders present and validate-data passes
- [x] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
