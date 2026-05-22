# Implementation Plan: Game Map Viewport Fix — Scrolling, Grid Config, Counter Size

**Track ID:** game-view-viewport_20260521
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-21
**Status:** [x] Complete

## Overview

Three areas of change: (1) CSS to prevent document overflow, (2) a new `GET
/api/v1/games/:id/map-config` endpoint that serves `gridSpec` from `map.json`, and (3) wiring
`gridSpec` through the game store to `GameView` so calibration is derived from canonical
scenario data instead of localStorage. No schema changes; no new components.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals

## Risk Classification

**Risk:** Medium
**Reason:** New games API endpoint + game store change + `App.vue` global style edit. Auth
surface is not touched (map-config endpoint intentionally has no `requireSide`).

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

---

## Phase 1: Document Overflow Fix

Prevent the browser document from scrolling on any route. The `<body>` in `App.vue` has
`min-height: 100vh` and no overflow constraint. Also add `min-width: 0` to `.map-area` in
`GameView.vue` to allow the flex child to shrink below content width, enabling `overflow: auto`
to show the horizontal scrollbar.

### Tasks

- [ ] Task 1.1: In `client/src/App.vue` global `<style>`, add `html { height: 100%; overflow:
hidden; }` and add `overflow: hidden` to the existing `body` rule. Remove `display:
flex`, `justify-content: center`, `align-items: center`, and `min-height: 100vh` from
      `body` — that centering is lobby-oriented and conflicts with the game view's full-height
      layout. Check `LobbyView` and add self-centering to its own root element if the body
      centering was relied upon.
- [ ] Task 1.2: In `client/src/views/GameView.vue` scoped styles, add `min-width: 0` to
      `.map-area`. Without it the flex child defaults to `min-width: auto` and expands instead
      of scrolling, making the horizontal scrollbar invisible.

### Verification

- [ ] `npm run test` — all existing tests pass.

---

## Phase 2: Serve gridSpec via Games API

Add a lightweight `GET /api/v1/games/:id/map-config` endpoint in the games router that returns
`{ gridSpec, hexes }` loaded from `map.json` at startup. No `requireSide` guard — this is
static scenario data. Wire it through the game store so `GameView` can derive calibration
without touching localStorage or the dev-tool endpoint. Removing the dev-tool fetch entirely
in the same pass keeps the view production-ready.

### Tasks

- [ ] Task 2.1: In `server/src/routes/games.js`, import `loadMap` from `'../engine/map.js'`.
      Call it once at module load and store the result (mirror the pattern in `mapTest.js`).
      Add `GET /:id/map-config` **before** the `GET /:id` catch-all. Returns
      `{ gridSpec: mapData.gridSpec, hexes: mapData.hexes }`. No `requireSide` guard. If
      `loadMap()` failed at startup, respond 503.
- [ ] Task 2.2: In `client/src/composables/useCalibration.js`, change `const
DEFAULT_CALIBRATION` to `export const DEFAULT_CALIBRATION` and `function
sanitizeCalibration` to `export function sanitizeCalibration`. No other changes.
- [ ] Task 2.3: In `client/src/stores/useGameStore.js`, add `gridSpec` and `hexes` refs
      (both default `null`). In `loadGame(id)`, fetch `GET /api/v1/games/${id}/map-config` in
      parallel with the game state fetch. On success populate `gridSpec` and `hexes`. On
      fetch error leave both null (non-fatal).
- [ ] Task 2.4: In `client/src/views/GameView.vue`: - Remove `useCalibration` import. - Import `DEFAULT_CALIBRATION` and `sanitizeCalibration` from
      `'../composables/useCalibration.js'`. - Replace `const { calibration } = useCalibration()` with:
      `js
const calibration = computed(() =>
  sanitizeCalibration({ ...DEFAULT_CALIBRATION, ...(gameStore.gridSpec ?? {}) })
);
` - Remove the `fetch('/api/tools/map-test/data')` block and its `mapData`/`mapError`
      refs entirely. - Change the `hexes` computed to read from `gameStore.hexes ?? []`.

### Verification

- [ ] `npm run test` — all existing tests pass.
- [ ] `npm run lint` — zero warnings.

---

## Phase 3: Tests

### Tasks

- [ ] Task 3.1: In `server/src/routes/games.test.js` (or equivalent), add a test for `GET
/api/v1/games/:id/map-config` verifying a `200` response with `gridSpec` containing at
      least `cols`, `rows`, `hexWidth`, `hexHeight`, and a non-empty `hexes` array.
- [ ] Task 3.2: In `client/src/views/GameView.test.js`, update `makeGameStore` stub to
      include `gridSpec` and `hexes` fields. Add a test verifying the `calibration` prop
      passed to `HexMapOverlay` reflects the stubbed `gridSpec` values (e.g. `cols`/`rows`
      match). Remove or update the `map-test/data` fetch assertion since that fetch is gone.
- [ ] Task 3.3: In `client/src/stores/useGameStore.test.js`, add a test verifying that
      `loadGame()` populates `gridSpec` and `hexes` from the `/map-config` response.

### Verification

- [ ] `npm run test` — full suite green, new tests pass.
- [ ] `npm run quality:strict` exits 0.

---

## Phase 4: Closeout

### Tasks

- [ ] Task 4.1: Run `npm run quality:strict` and confirm all gates pass.
- [ ] Task 4.2: Close issue #406 with a summary comment once the PR is merged (via
      `/issue-close`).

### Verification

- [ ] `npm run quality:strict` exits 0.
- [ ] No unexpected console warnings in the test run.

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] Tests passing at ≥ 70% line coverage
- [ ] No regressions to existing map interaction behavior
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
