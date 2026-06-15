# Spec: M6 Debt Sprint — Small Fixes, Security Headers, Rate Limiting, Register Sync

## Overview

Six discrete debt items that are each small enough to fix in-place, plus registration of all
unregistered M6 team-review findings (#571–#581) in the debt register so the score accurately
reflects reality. Includes two security items (#403, #350) that were deferred to M8 but are
actually self-contained Express middleware additions with no M8 dependency.

## Issues Closed

| Issue | Score | Title                                                                                         |
| ----- | ----- | --------------------------------------------------------------------------------------------- |
| #584  | 2     | a11y: add `<main>` landmark to MenuLayout for screen-reader navigation                        |
| #583  | 2     | refactor: move scenario fetch into useGameStore (scenarioId source of truth)                  |
| #560  | 2     | LOB §10.3 — ROLL_INITIATIVE should filter candidates to friendly units only                   |
| #506  | —     | OOB Editor: four display/data bugs (back-counter, AotP HQ path, Walker phantom, specialRules) |
| #403  | 2     | Add Content-Security-Policy headers to Express server (Helmet.js)                             |
| #350  | 2     | Add rate limiting on POST /api/v1/games routes                                                |

Plus: register #571–#581 in the debt register with correct scores and milestone assignments.

**Total debt score removed (registered):** ≥10 (plus all previously unregistered M6 items become
registered, then immediately closed by Tracks 1–4 — register sync makes the score accurate).

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals. Items are either tiny one-liner fixes
or additive Express middleware with no schema changes.

## Risk Classification

**Risk:** Low–Medium
**Reason:** #583 touches `useGameStore` (shared store boundary) but is a fetch relocation, not
logic change. #403 and #350 add middleware; no existing behavior changes. #506 is client-side
editor only.

## Fix Details

### #584 — `<main>` Landmark in MenuLayout

**File:** `client/src/layouts/MenuLayout.vue`
Change the outermost `<div>` wrapper to `<main>` (or wrap slot content in `<main id="main-content">`).
Verify `HomeView` and `AboutView` now expose a `<main>` landmark.

### #583 — Scenario Fetch into useGameStore

**Files:** `client/src/stores/useGameStore.js`, `client/src/views/GameView.vue`
Move the `fetch('/api/v1/modules/:moduleSlug/scenarios/:scenarioSlug/scenario')` call from
`GameView.vue`'s `onMounted` into `useGameStore.loadGame()`, alongside the existing map-config
fetch. Store scenario as `gameStore.scenario`. `GameView.vue` reads `gameStore.scenario` as a
computed prop and passes to `TurnControl`. Eliminates the route-params dual source-of-truth.

### #560 — ROLL_INITIATIVE Friendly-Unit Filter

**File:** `server/src/engine/phase.js` — `ROLL_INITIATIVE` handler.
The current implementation builds the initiative candidate list from all units in the game state.
LOB §10.3 specifies only the active side's units roll for initiative.
Filter candidates to `unit.side === playerSide` before building the roll list.
Add `// LOB §10.3 — initiative candidates limited to active side's units`.

### #506 — OOB Editor Four Bugs

**Files:** `client/src/views/OobEditorView.vue`, `client/src/components/CounterImageWidget.vue`
(and related).

Four bugs per the issue:

1. **Back-counter slot missing for Supply/HQ nodes:** ensure `CounterImageWidget` renders the
   back-counter slot for all node types, not just `mode="leader"`.
2. **AotP HQ path wrong:** fix the hardcoded path reference for the Army of the Potomac HQ counter.
3. **Walker phantom entry:** remove the erroneous phantom Walker unit from the OOB tree rendering.
4. **specialRules display:** ensure `specialRules` field is displayed in the unit detail panel.

### #403 — Content-Security-Policy (Helmet.js)

**File:** `server/src/server.js`
`helmet` is already a dependency (confirm with `package.json`). Add `app.use(helmet())` before
other middleware. Configure CSP to allow the Vite dev server origin in development and restrict
to self in production. Add a comment: `// Security: CSP headers via helmet (#403)`.

### #350 — Rate Limiting on Game Routes

**File:** `server/src/server.js` or `server/src/routes/games.js`
Install `express-rate-limit` if not present. Apply a limiter to `POST /api/v1/games` (create)
and `POST /api/v1/games/:id/join` — 30 requests per 15-minute window per IP is a reasonable
starting point for a single-user dev deployment. Add a comment: `// Security: rate limit game
create/join to mitigate enumeration (#350)`.

### Debt Register Sync

Add all unregistered issues to `docs/tech-debt/report.md`:

- Register #571–#581 with their scores under the PR #582 row in Debt Over Time
- Add resolution rows immediately for any closed by Tracks 1–4 in this sprint
- Update the Executive Summary net score after all tracks are merged

## Acceptance Criteria

- [ ] `MenuLayout.vue` exposes a `<main>` landmark; axe or manual check confirms WCAG 1.3.1
- [ ] `useGameStore.loadGame()` fetches scenario data; `GameView` reads from store
- [ ] `TurnControl` displays correct scenario data via store (no route-param fallback needed)
- [ ] `ROLL_INITIATIVE` filters candidates to `playerSide` units only
- [ ] All four OOB editor bugs fixed and manually verified in the editor tool
- [ ] `helmet()` applied; response headers include `Content-Security-Policy`
- [ ] Rate limiter applied to create/join routes; confirmed via test or curl
- [ ] Debt register updated with all #571–#581 entries and scores
- [ ] `npm run quality:strict` passes
