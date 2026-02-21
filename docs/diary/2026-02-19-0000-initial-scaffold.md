# 2026-02-19 — Initial scaffold

Stood the project up from scratch today. The goal was to get a working skeleton with all the tooling in place and the game data in a validated state before any rules engine work begins. No shortcuts — it's easier to enforce conventions from the start than retrofit them later.

### Project structure and tooling

The repo is organised as an npm workspace with two sub-packages: `server` (Express + Socket.io) and `client` (Vue 3 + Vite). The root `package.json` owns all the dev tooling — ESLint, Prettier, Vitest, the build scripts — so neither sub-package carries its own lint or test config.

ESLint uses the flat config format (`eslint.config.js` at the root). Server files get `eslint-plugin-n` for Node.js-specific rules (no missing imports, no extraneous imports) and `eslint-plugin-import` for import ordering. Client files get `eslint-plugin-vue` with `flat/recommended`, which applies the correct processor for `.vue` SFCs. Test files get a separate override that relaxes the `n/no-extraneous-import` rule — Vitest and Supertest are root-level dev dependencies, not server-package dependencies, and the resolver would otherwise complain. Prettier runs last via `eslint-config-prettier` to disable any formatting rules that would conflict.

Vitest is split across two config files. `vitest.workspace.js` defines the two test environments: `server` tests run in Node, `client` tests run in jsdom with `@vitejs/plugin-vue` to compile SFCs. `vitest.config.js` handles coverage separately — provider v8, 70% lines threshold, excludes entry points (`server.js`, `main.js`, `App.vue`) and the three data-only schemas that have no logic to test (leaders, oob, scenario). The map schema gets tested because it's the one used by the map editor's live write path.

CI runs on every push and PR: checkout → Node 20 with npm cache → `npm ci` → lint → format check → test with coverage → client build. The coverage step enforces the 70% threshold; if it drops, CI fails.

### Server bootstrap

`server/src/server.js` creates an Express app, attaches Socket.io to the same HTTP server, and wires the standard middleware stack: `helmet`, `cors`, `morgan`, `express.json`. There's a health check at `GET /api/health` that returns uptime. The map editor guard is also in this file (described above, even though it shipped in the next commit). Port defaults to 3000, client origin to `http://localhost:5173` — both overridable via env vars.

Socket.io is connected but not yet doing anything meaningful beyond logging connect/disconnect events. That's intentional — the real-time coordination model is a Phase 1 concern; right now the socket server just needs to exist so the client can establish a connection and the architecture is proven.

### Client bootstrap

The Vue 3 client is minimal: `App.vue` with `<router-view>`, a `StatusView.vue` at `/` that polls `GET /api/health` and displays the server's uptime, and the `MapEditorView` route registered at `/tools/map-editor`. Vue Router uses `createWebHistory`. Vite's dev server proxies `/api`, `/auth`, and `/socket.io` to the Express server so CORS is never an issue in development.

### Game data

The four JSON data files live in `data/scenarios/south-mountain/` and were all authored from the source documents in this session.

**`oob.json`** encodes the full South Mountain order of battle — 219 unit records across the Union's I Corps, IX Corps, and cavalry division, and the Confederate forces under D.H. Hill (three divisions plus Longstreet's wing). Each regiment carries its LoB stats: strength, morale class, fire factors, movement allowance, wreck threshold, and special rule flags. The hierarchy goes army → corps → division → brigade → regiment, plus separate artillery structures keyed by group type. The errata corrections are already applied: Chicago Dragoons as 2/K/9, E/2 US Artillery rated HvR, 28 Ohio with 15 loss boxes, 5th Virginia Cavalry morale C.

**`leaders.json`** covers 48 leaders across both sides — army, corps, cavalry, division, and brigade level. Each has a rating, command radius, morale bonus, and a `commandsId` that links to their formation in the OOB. Special rule flags are encoded where needed (Longstreet as army commander with no initiative requirement, Pelham and Pleasonton with the any-reserve artillery replenishment override).

**`scenario.json`** captures the South Mountain scenario parameters: turn structure (14 turns), the random event table (fluke stoppages, weather, etc.), the reinforcement schedule for both sides with entry hex references, VP conditions (terrain control plus elimination VPs), initial unit orders, and the movement cost chart that overrides the standard LoB table per SM rule 8.

**`map.json`** starts as a skeleton. The `gridSpec` calibration object is present (the anchor point and hex geometry to position the overlay over `SM_Map.jpg`), the VP hexes with their union/confederate point values are populated from `SM_Rules.pdf`, and the entry hex lists are set. The `hexes` array has partial data — the terrain digitization work begins properly tomorrow once the calibration tool is running.

### Validation script

`scripts/validate-data.js` is the first thing to run on any data change. It loads all four files, validates each against its Zod schema, and then runs cross-reference checks: leader `commandsId` fields against OOB unit IDs, scenario unit references against the OOB, VP hexes against `map.hexes`, setup hexes against `map.hexes`, and reinforcement entry hexes against `map.hexes`. It also reports the count of hexes with `terrain="unknown"` as a completeness indicator. The script exits non-zero on any schema errors; cross-reference mismatches that might be legitimately structural (corps-level IDs that aren't unit records) are reported as warnings, not errors.

Running `npm run validate-data` with the current files passes all schema checks. The map completeness section reports the expected number of `unknown` terrain hexes — that number will decrease as the map editor work progresses.

### Reference library

All seven source documents are catalogued in `docs/LIBRARY.md` and `docs/library.json`. The two files are kept in sync — the Markdown is human-readable with status indicators, the JSON is for tooling. Everything needed for Phase 1 is marked available: the LoB v2.0 rulebook, the combat/terrain tables, the game-specific updates and SM rule overrides, the South Mountain scenario rules, the regimental roster, the errata sheet, and the map image.
