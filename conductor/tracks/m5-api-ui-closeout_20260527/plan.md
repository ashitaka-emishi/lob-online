# Implementation Plan: M5 Closeout — Game Action API, GameView Design, and Info Panel Fix

**Track ID:** m5-api-ui-closeout_20260527
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-27
**Status:** [~] In Progress

## Overview

Three phases in dependency order: (1) game action API + Socket.io wiring on the server,
(2) GameView architecture design document + follow-up ticket creation, (3) unit info panel
bug fixes on the client. The design phase (2) is independent of phase 1 and can proceed
in parallel if desired, but the follow-up implementation tickets it produces are out of
scope for this track.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** After Phase 1 architecture notes (Socket.io wiring approach),
and before any deferred debt is accepted.

## Risk Classification

**Risk:** High
**Reason:** Phase 1 touches the auth/session boundary and wires Socket.io into the Express
server; Phase 2 defines the API/client contract that all future UI work depends on.

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

## Phase 1: Game Action API + Socket.io (#356, #387)

Wire `dispatch()` to an authenticated HTTP route and attach Socket.io for room
notifications. `playerSide` must be sourced from `req.session.side` here, closing #387.

### Tasks

- [x] Task 1.1: Write route integration tests for `POST /api/v1/games/:id/actions` —
      authorized submit, unauthorized submit, invalid body, version conflict, ActionError
      mapping, and `game:state-updated` emission (TDD first).
- [x] Task 1.2: Write Socket.io room tests — `game:join` accepts valid session,
      `game:leave` cleans up, unauthorized join rejected.
- [x] Task 1.3: Attach Socket.io to the Express server in `server/src/server.js`
      (or a `server/src/socket/index.js` helper) and expose `io` to route handlers.
- [x] Task 1.4: Implement `POST /api/v1/games/:id/actions` in `server/src/routes/games.js`:
      session guard → body validation → load state → `dispatch(state, {…, playerSide: req.session.side})`
      → version check → save → emit `game:state-updated` → return result.
- [x] Task 1.5: Map `ActionError` codes to HTTP status codes (`INVALID_ACTION` → 422,
      `INVALID_STATE` → 500, `DRAIN_LOOP` → 500) without leaking stack traces.
- [x] Task 1.6: Implement `game:join` and `game:leave` socket events with session/side
      authorization guard.

### Verification

- [ ] All Phase 1 tests green; `npm run test` passes; no lint or format warnings.
- [ ] Manual smoke: start server, submit a valid `END_PHASE` action via curl/Postman,
      confirm state advances and `game:state-updated` fires on the socket.

---

## Phase 2: GameView Architecture Design (#357)

Author `docs/designs/m5-game-ui-detail.md` and open follow-up implementation tickets.
This phase is decision-complete work, not component implementation.

### Tasks

- [ ] Task 2.1: Read the existing `docs/designs/m5-turn-structure-orders-game-map-ui.md`
      §4 and current `client/src/views/GameView.vue` / `client/src/stores/game.js` to
      understand what already exists.
- [ ] Task 2.2: Draft `docs/designs/m5-game-ui-detail.md` covering component
      responsibilities (`GameView`, `MapCanvas`, `UnitCounter`, `InfoPanel`, `ActionPanel`),
      Pinia store boundary, API/socket client contract, `MapCanvas` reuse strategy, and
      M5 visual treatment decisions.
- [ ] Task 2.3: Create follow-up GitHub issues in milestone M5 for each implementation
      slice identified in the design (store, MapCanvas, UnitCounter, InfoPanel, ActionPanel).
- [ ] Task 2.4: Update `docs/designs/m5-turn-structure-orders-game-map-ui.md` issue list
      with the new follow-up issue numbers.

### Verification

- [ ] `docs/designs/m5-game-ui-detail.md` exists and covers all acceptance criteria from spec.
- [ ] Follow-up issues created and linked in the M5 design doc.

---

## Phase 3: Unit Info Panel Bug (#408)

Fix the client-side info panel to show counter images, weapon type, faction header colors,
and multi-unit paging for stacked hexes.

### Tasks

- [ ] Task 3.1: Write component tests for the info panel: counter image renders, weapon
      type displays, header color matches faction, paging controls appear for stacked hexes,
      paging updates unit without changing hex selection.
- [ ] Task 3.2: Add counter image to the info panel — source the image path from
      `oob.json` counter linkage via the game store / unit data.
- [ ] Task 3.3: Display weapon type for the selected unit.
- [ ] Task 3.4: Apply faction-specific header colors (CSA red / Union light blue) driven
      by `unit.side` or equivalent field.
- [ ] Task 3.5: Implement previous/next arrow controls when `hexUnits.length > 1`;
      paging state is local to the panel (does not affect selected hex).

### Verification

- [ ] All Phase 3 tests green; `npm run test` passes.
- [ ] Manual smoke: open GameView, click a hex with multiple units, confirm counter
      image, weapon type, faction color, and paging arrows all work correctly.

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes (validate-data, lint, format:check, test, build)
- [ ] No unexpected warnings in test output
- [ ] Issues #356, #357, #387, #408 ready to close
- [ ] Ready for `/team-review`
