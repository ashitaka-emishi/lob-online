# Plan — M7: Special Rules + Victory Conditions

**Track ID:** m7-special-rules_20260617
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-17
**Status:** [~] In Progress

## Overview

Wire the remaining LOB v2.0 and SM rules into the live game loop across five phased checkpoints.
Phase 1 fixes the confirmed #617 bug and establishes the retreat/SP-loss application skeleton.
Phase 2 delivers interactive rally dice (the first M7 player-facing mechanic). Phase 3 adds
artillery actions. Phase 4 wires end-of-turn accounting (Loss Recovery, Attack Recovery, Random
Events, Variable Reinforcements). Phase 5 delivers VP tracking and victory condition evaluation
with a game-complete UI screen.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** After each phase (5 checkpoints total) — M7 touches rules-engine
handlers, game-state schema compatibility, shared Pinia store, and action pipeline on every phase.

## Risk Classification

**Risk:** High
**Reason:** Every phase touches shared rules-engine logic (action handlers, `getValidActions`,
`drainAutoSteps`) and most phases also touch game-state schema or the client action pipeline —
both Checkpointed surfaces per the quality rails.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved. Domain-verification debt items
#613 #617 #621 are resolved by ruling before implementation; no new unverified rule code.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Issue #343 (M7 implementation tickets) closed
- [ ] Ready for `/team-review`

---

## Phase 1 — Bug Fix + Retreat Skeleton

Fix the confirmed #617 leader-loss scope bug and add the retreat/SP-loss application layer that
morale results have been recording but not yet executing. Low-risk but a prerequisite for all
later phases — retreat must apply before artillery fire or VP can be meaningful.

### Tasks

- [x] Task 1.1: Fix #617 — extend `leaderLossCheckRequired` in `closeCombat.js` to fire on
      Opening Volley defender SP loss in addition to the §7.0a(e) automatic 1-SP loss. Add test
      covering OV-loss-only path (attacker < 4 SPs, OV inflicts loss → leader check required).
- [x] Task 1.2: Add `applyRetreat(state, unitId, hexCount)` engine helper in
      `engine/movement.js` or new `engine/retreat.js` — moves a unit `hexCount` hexes away from
      the combat hex following LOB §6.1 retreat rules (toward friendly edge; no ZOC crossing).
      Unit tests for basic retreat path and impassable-terrain fallback.
- [x] Task 1.3: Wire morale resolution to apply retreat and SP losses from `moraleResult` to
      game state in `handleResolveMorale` — currently these are recorded in `pendingResolution`
      but the position/SP changes are not committed.
- [x] Task 1.4: Run `npm run test` — all green.

**Verification:** `npm run test` green; `leaderLossCheckRequired` fires on OV losses; retreat
application commits position + SP to `state.units`.

> **CHECKPOINT 1** — Pause for human approval before Phase 2.

---

## Phase 2 — Interactive Rally Dice

Wire the §6.4 step 3 rally roll into the action pipeline so routed units require actual player
dice rather than auto-advancing. This is the first M7 action visible to the player.

### Tasks

- [ ] Task 2.1: Add `RALLY_ROLL` action type to `engine/actions/index.js` and
      `engine/actions/rallyRoll.js` handler. Payload: `{ unitId, dice: [d1] }`. Applies
      `rallyRollResult(die, leaderMV)` → updates `unit.moraleState` to `'disorganized'` on
      success or leaves `'routed'` on failure.
- [ ] Task 2.2: Extend `drainAutoSteps` to pause (return current state) when
      `unitsPendingRallyRoll.length > 0` instead of auto-advancing. Store
      `pendingRallyRoll: { unitIds: [...] }` on state.
- [ ] Task 2.3: Update `getValidActions` to return `RALLY_ROLL` candidates (one per pending
      routed unit) when `pendingRallyRoll` is non-null.
- [ ] Task 2.4: Add `rallyRoll.test.js` — unit tests for handler (success/failure/invalid
      unit), `getValidActions` gate, and the auto-drain pause behavior.
- [ ] Task 2.5: Wire `RALLY_ROLL` into `ActionPanel.vue` — renders a die-input form for
      each pending routed unit; submits `RALLY_ROLL` with the rolled value.
- [ ] Task 2.6: Run `npm run test` — all green.

**Verification:** `npm run test` green; a routed unit in Rally Phase pauses the loop and
requires a `RALLY_ROLL` action before the phase can advance.

> **CHECKPOINT 2** — Pause for human approval before Phase 3.

---

## Phase 3 — Artillery Actions

Wire artillery-specific actions into the game loop, backed by the §9.1 engine stubs already
present in `tables/`. Includes supply trace and SM §3.6 Pelham/Pleasonton replenishment.

### Tasks

- [ ] Task 3.1: Consult domain-expert to confirm artillery limber/unlimber MP costs, canister
      vs shell range threshold, and second/third shot eligibility rules (LOB §9.1) before coding.
- [ ] Task 3.2: Add `LIMBER` and `UNLIMBER` action handlers in `engine/actions/artillery.js`.
      Validate formation transition costs against unit MP allowance. Unit tests.
- [ ] Task 3.3: Add `FIRE_ARTILLERY` handler — selects canister or shell based on range; applies
      §9.1 depletion; gate on supply trace to Wing Wagon or west-edge road hex (SM §3.6). Unit tests.
- [ ] Task 3.4: Add `REPLENISH_ARTILLERY` handler for Pelham/Pleasonton special replenishment
      (SM §3.6: replenish from any friendly ammo reserve). Unit tests.
- [ ] Task 3.5: Update `getValidActions` to return `LIMBER`, `UNLIMBER`, `FIRE_ARTILLERY`, and
      `REPLENISH_ARTILLERY` candidates for eligible artillery units.
- [ ] Task 3.6: Wire new actions into `ActionPanel.vue`.
- [ ] Task 3.7: Run `npm run test` — all green.

**Verification:** `npm run test` green; artillery units can limber, fire with correct
ammunition type, and are blocked when supply trace fails.

> **CHECKPOINT 3** — Pause for human approval before Phase 4.

---

## Phase 4 — End-of-Turn Accounting

Wire Loss Recovery, Attack Recovery, Random Events, and Variable Reinforcements into the
appropriate turn-phase steps in the action dispatcher.

### Tasks

- [ ] Task 4.1: Consult domain-expert to confirm Loss Recovery timing (midnight turn number
      in SM), exact 1 SP vs 25% calculation, and which unit types are eligible (LOB §9.3).
- [ ] Task 4.2: Implement `engine/lossRecovery.js` — `applyLossRecovery(units, loadedOob)`
      returns updated units map with SP restoration. Unit tests.
- [ ] Task 4.3: Wire `applyLossRecovery` into the turn reducer at the midnight Rally Phase
      step in `index.js`.
- [ ] Task 4.4: Wire `attackRecovery` table check into Command Phase start in `index.js`.
      The engine table (`tables/attackRecovery.js`) already exists — wire it as an auto-step
      that sets a `pendingAttackRecovery` flag when a division fails its check.
- [ ] Task 4.5: Wire random event resolution — roll 2d6 + lookup in SM random event tables
      for both sides each Command Phase; store results in `state.randomEventLog`.
- [ ] Task 4.6: Wire variable reinforcement arrival — Force A/B 1d6 roll at the scheduled
      turn; set `isOnBoard: true` and place units at entry hex when arrival confirmed.
- [ ] Task 4.7: Run `npm run test` — all green.

**Verification:** `npm run test` green; Loss Recovery applies at midnight; Attack Recovery
check gates divisional activation; random events and reinforcements fire at correct turns.

> **CHECKPOINT 4** — Pause for human approval before Phase 5.

---

## Phase 5 — VP Tracking + Victory Conditions

Implement VP state, end-of-turn tally, and victory condition evaluation with a game-complete
UI screen.

### Tasks

- [ ] Task 5.1: Consult domain-expert to confirm SM VP hex list, terrain VP values, wreck VP
      per formation type, and all 7 victory outcome label thresholds (SM VP / LOB §11).
- [ ] Task 5.2: Create `server/src/engine/vp.js` — `computeVP(state, scenario)` returns
      `{ union: N, confederate: N, vpLog: [...] }`. Unit tests covering terrain hex VP, wreck VP,
      and boundary thresholds.
- [ ] Task 5.3: Add `state.vp` to `GameStateSchema` (Zod) — `{ union: number, confederate:
number, vpLog: array }`. Validate-data green.
- [ ] Task 5.4: Wire `computeVP` into the end-of-turn step in `index.js`; store result on
      `state.vp`; emit `game:state-updated` via Socket.io.
- [ ] Task 5.5: Add `evaluateVictory(vp, scenario)` — returns one of the 7 SM outcome labels
      or `null` if game continues. Wire into end-of-turn after VP compute; set `state.gameOver`
      and `state.victoryResult` when a condition is met.
- [ ] Task 5.6: Add `VpPanel.vue` — displays current VP totals for both sides with a
      per-turn sparkline or log. Wire into `GameView`.
- [ ] Task 5.7: Add game-complete screen — when `state.gameOver` is true, render a
      full-screen result overlay in `GameView` showing outcome label and final VP totals.
- [ ] Task 5.8: Run `npm run quality:strict` — all gates green.
- [ ] Task 5.9: Close GitHub issue #343 (M7 implementation tickets placeholder).

**Verification:** `npm run quality:strict` green; VP tally matches manual calculation; game
correctly terminates with the correct SM outcome label when a victory threshold is crossed.

> **CHECKPOINT 5** — Pause for human approval before PR creation.

---

## Final Verification

- [ ] All 5-phase checkpoints approved
- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes
- [ ] No unexpected warnings in test output
- [ ] Debt register updated if any debt was accepted
- [ ] Issue #343 closed
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
