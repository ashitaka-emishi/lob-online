# Implementation Plan: M6 Combat Engine — Fire, Melee, Morale, Rally

**Track ID:** m6-combat-engine_20260614
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-14
**Status:** [~] In Progress

## Overview

Wire the M3 combat/morale/charge/command engine tables into the live game dispatch pipeline.
The work proceeds in six phases: schema prep → fire combat → close combat → morale cascade →
rally + zero rule + fluke/recovery → final wiring and cleanup.

All new handlers follow the M5 pattern: pure reducer (no I/O), validate payload independently,
return a new state object, registered in `ACTION_HANDLERS`, and covered with Vitest tests.
Rule-reference comments required on every game-logic line (coding standards).

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

1. After Phase 1 (schema changes) — review UnitStateSchema and PendingResolutionSchema diffs
   before proceeding. Schema changes touch persistence.
2. After Phase 3 (close combat) — review OOB side-affiliation wiring before proceeding.
   This is a cross-cutting concern that affects `getValidActions` candidate generation.
3. Before any deferred debt scored ≥ 3.

## Risk Classification

**Risk:** High
**Reason:** Touches shared rules-engine dispatch, `GameStateSchema`/`UnitStateSchema` (persistence),
and OOB side-affiliation logic that affects action gating.

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

## Phase 1: Schema Preparation

Audit and extend `GameStateSchema` / `UnitStateSchema` / `PendingResolutionSchema` to support
combat results. **Checkpoint required after this phase.**

### Tasks

- [x] Task 1.1: Audit `UnitStateSchema` for missing combat fields.
  - Confirm `moraleState`, `wrecked`, `ammo` already present (they are — verified pre-plan).
  - Add `depletionMarker: z.boolean()` — LOB §5.8 Shell/Canister Depletion marker on unit.
  - Add `cbfMarker: z.boolean()` — LOB §8.1 Can't Be Fought marker (placed after combat loss).
  - Update `initGameState()` to initialize both fields to `false` for all units.
  - Update schema tests to cover the new fields.
- [x] Task 1.2: Extend `PendingResolutionSchema` type enum to include combat interrupt types.
  - Add `'moraleCheck'` — triggered by m/m+ combat result; context: `{ unitId, roll, modifier }`.
  - Add `'leaderCasualty'` — already present; verify context shape is sufficient for §9.1a.
  - Add `'closingRoll'` — triggered at start of charge sequence; context: `{ attackerId, defenderId }`.
  - Add `'combatResult'` — fire combat result waiting for morale cascade to resolve.
  - Update schema tests.
- [x] Task 1.3: Add `rallyPhase` envelope to `GameStateSchema` (parallel to `activityPhase`/`ordersPhase`).
  - `rallyPhase: z.object({ unitsPendingRally: z.array(z.string()) }).strict().nullable()`
  - Non-null only during Rally Phase. Add `.refine()` biconditional to match existing pattern.
  - Update `drainAutoSteps` stub to set `rallyPhase` on transition into Rally Phase.
  - Update schema tests.

### Verification

- [x] `npm run test` green after schema changes
- [x] `npm run validate-data` passes (no game-state files in repo yet; passes by definition)
- [ ] **CHECKPOINT: human review of schema diffs before Phase 2**

---

## Phase 2: Fire Combat Handler

Implement `FIRE_COMBAT` action — the primary combat mechanism (LOB §5).

### Tasks

- [x] Task 2.1: Create `server/src/engine/actions/fireCombat.js`.
  - Payload schema: `{ attackerHex: HexId, defenderHex: HexId, weaponType: string }`.
  - Validate LOS from `engine/los.js` between attacker and defender hexes.
  - Validate range: compute hex distance, check against weapon max range from `engine/tables/weapons.js`.
  - Validate attacker is in the `currentActivation` stack (LOB §3.0d).
  - Validate defender hex contains an enemy unit (OOB side-affiliation check — see Task 2.2).
  - Compute effective SP: if defender `moraleState === 'DG'`, halve SP (LOB §5.3).
  - Call `tables/combat.js` `resolveFireCombat()` with computed column shifts.
  - Column shifts to apply: range band, weapon type, firepower differential, terrain, flank fire,
    leader present, low-ammo penalty (LOB §5.5–5.6).
  - Return new state with combat result in `pendingResolution` for morale cascade (Phase 4).
  - Update attacker `ammo` if depletion triggered (LOB §5.8).
  - Set attacker `depletionMarker: true` on depletion trigger.
  - Add rule-reference comments for every shift and table call.
- [x] Task 2.2: Wire OOB side-affiliation into `getValidActions` and `fireCombat.js`.
  - Load OOB data via `engine/oob.js` to resolve unit → side mapping.
  - Remove the `TODO(M6)` comment in `getValidActions` (issue #560).
  - `FIRE_COMBAT` candidates: enumerate enemy units in LOS and range of the active stack.
  - Guard attacker-is-friendly / defender-is-enemy in `fireCombat.js` handler.
- [x] Task 2.3: Implement Opening Volley trigger.
  - Opening Volley fires automatically when: (a) an enemy unit advances into contact with the
    active stack, or (b) the active stack fires immediately after a Move action this activation
    (LOB §5.4).
  - Track whether this activation has included a Move action in `currentActivation` state.
    Extend `activityPhase.currentActivation` from a hex string to
    `{ hex: string, movedThisActivation: boolean }`.
  - If Opening Volley conditions met, call `tables/combat.js` `resolveOpeningVolley()` and
    apply result before the main fire combat resolution.
  - Add `openingVolley: z.boolean()` to `activityPhase.currentActivation` schema shape.
- [x] Task 2.4: Write Vitest tests for `fireCombat.js`.
  - Happy path: valid LOS, valid range, correct column shifts, correct depletion behavior.
  - Error paths: no LOS, out of range, friendly fire attempt, wrong activation.
  - Opening Volley trigger: move-then-fire vs. fire-only.
  - Table coverage: verify at least one known input/output pair from each column shift category.

### Verification

- [x] `npm run test` green with fire combat coverage
- [x] `npm run lint` zero warnings

---

## Phase 3: Close Combat Handler

Implement `CLOSE_COMBAT` action — charge and melee resolution (LOB §7).

### Tasks

- [ ] Task 3.1: Create `server/src/engine/actions/closeCombat.js`.
  - Payload schema: `{ attackerHex: HexId, defenderHex: HexId }`.
  - Validate adjacency (distance = 1) and enemy defender.
  - Opening Volley on advance: fire defender's Opening Volley against charger before Closing Roll
    (LOB §7.0b). Apply Opening Volley result; if charger routed, abort charge.
  - Apply automatic 1 SP defender loss (LOB §7.0c).
  - Call `tables/charge.js` `resolveClosingRoll()` with Additional Charge Modifiers (LOB §7.0g).
  - Resolve retreat: push defender back one hex; check retreat-into-EZOC casualty (LOB §7.0e).
  - Return new state; set `pendingResolution` for morale cascade and leader loss checks.
- [ ] Task 3.2: Add `CLOSE_COMBAT` to `getValidActions`.
  - Generate candidates for each enemy-occupied hex adjacent to the active stack (when unit is
    in Line or Column formation — Open Order units use different rules §9.4).
  - Open Order close combat: automatic Closing Roll success per §9.4.
- [ ] Task 3.3: Write Vitest tests for `closeCombat.js`.
  - Opening Volley abort path (charger routed before Closing Roll).
  - Successful charge with retreat; retreat-into-EZOC loss trigger.
  - Open Order automatic success path.

### Verification

- [ ] `npm run test` green
- [ ] **CHECKPOINT: human review of OOB side-affiliation wiring (Tasks 2.2 and 3.2)**

---

## Phase 4: Morale Cascade

Implement morale check, state transitions, and brigade → division cascade (LOB §6).

### Tasks

- [ ] Task 4.1: Create `server/src/engine/morale.js` (new engine module, not in tables/).
  - `triggerMoraleCheck(state, unitId, combatResult, modifiers)` — rolls on Morale Table §6.1
    via `tables/morale.js`; applies all modifiers (adjacent leader, formation, terrain, current
    morale state, Open Order modifier from §9.4).
  - `applyMoraleTransition(unit, roll)` — applies Additive Morale Effects Chart §6.2a:
    advances state (normal → shaken → DG → routed) or holds.
  - `setWrecked(unit, oobData)` — marks `wrecked: true` when current SP < 50% of printed
    strength (LOB §5.7); printed strength sourced from OOB data.
  - `cascadeMorale(state, unitId, oobData)` — propagates upward through hierarchy:
    if brigade routed → check brigade's parent division morale; if division routed → check
    corps/army (LOB §6.3). Returns fully updated state with all cascade results applied.
  - Add `cbfMarker: true` when unit takes a loss during combat (LOB §8.1).
  - Rule-reference comments on every clause.
- [ ] Task 4.2: Wire morale cascade into `fireCombat.js` and `closeCombat.js`.
  - After combat result resolved, call `cascadeMorale()` and apply returned state.
  - If cascade produces a `leaderCasualty` pending resolution, set in state and halt cascade
    until resolved.
- [ ] Task 4.3: Write Vitest tests for `morale.js`.
  - Normal → shaken → DG → routed transition sequences.
  - Brigade rout → division cascade.
  - Wrecked threshold calculation.
  - CBF marker placement.
  - Open Order modifier.

### Verification

- [ ] `npm run test` green with morale cascade coverage

---

## Phase 5: Rally Phase, Zero Rule, Fluke/Recovery

Replace the three `drainAutoSteps` stubs with real resolution logic.

### Tasks

- [ ] Task 5.1: Replace Rally Phase stub in `drainAutoSteps` (LOB §8).
  - On entry to Rally Phase, build `rallyPhase.unitsPendingRally` from all on-board units
    with `cbfMarker: true`.
  - CBF removal: automatic — clear `cbfMarker` on each unit in `unitsPendingRally` (LOB §8.1).
  - Morale recovery roll: for each DG or Routed unit not wrecked, roll on the Rally die (LOB §6.3).
    A successful rally improves morale state one step. A failed rally leaves state unchanged.
  - Leader Loss check during Rally: if an `m+` result is pending from this turn's combat, trigger
    `leaderCasualty` pending resolution (§9.1a) — normally fires immediately after combat but
    any deferred ones resolve here.
  - After all rally rolls, advance turn, flip active player, transition to next Command Phase.
- [ ] Task 5.2: Replace Fluke Stoppage stub in `drainAutoSteps` (LOB §10.7b).
  - Enumerate divisions whose accepted order is 'attack'.
  - For each, roll Fluke Stoppage Table via `tables/command.js` `rollFlukeStoppage()`.
  - If triggered, set division order status to 'stopped'.
  - Auto-advance to next step after all rolls resolved.
- [ ] Task 5.3: Replace Attack Recovery stub in `drainAutoSteps` (LOB §10.6b).
  - Enumerate divisions with order status 'stopped'.
  - For each, roll Attack Recovery Table via `tables/command.js` `rollAttackRecovery()`.
  - Recovery success: restore order to 'accepted' (no new Command Roll needed per §10.6b).
  - Recovery failure: order remains 'stopped'.
  - Auto-advance to Fluke Stoppage step after all rolls.
- [ ] Task 5.4: Zero Rule — MA roll at brigade activation start (LOB §9.1e).
  - In `activateStack.js`, before any movement or fire actions are enabled, check if the
    activating brigade is under Attack orders.
  - If yes, roll MA via `tables/command.js` `rollZeroRule()`.
  - Zero result: brigade may not attack this activation (set a `zeroRuleFired: boolean` on
    `currentActivation` context).
  - Non-zero: proceed normally.
  - Add `zeroRuleFired` to `activityPhase.currentActivation` schema shape.
- [ ] Task 5.5: Write Vitest tests for all Phase 5 logic.
  - Rally: CBF cleared, DG recovery, Routed recovery, no-change on failed roll.
  - Fluke Stoppage: division stopped correctly; non-attack-order division unaffected.
  - Attack Recovery: stopped → accepted on success; stopped → stopped on failure.
  - Zero Rule: fire/melee blocked when zero; normal when non-zero.

### Verification

- [ ] `npm run test` green
- [ ] `drainAutoSteps` has zero `TODO(M6)` comments remaining

---

## Phase 6: Leader Loss Handler

Implement Leader Loss check and succession (LOB §9.1a).

### Tasks

- [ ] Task 6.1: Create `server/src/engine/actions/resolveLeaderCasualty.js`.
  - Payload schema: `{ leaderId: string, roll: number }` (player supplies dice roll).
  - Validate `pendingResolution.type === 'leaderCasualty'` and `leaderId` matches context.
  - Look up result in `tables/leader-loss.js` `resolveLeaderLoss(roll, context)`.
  - Outcomes: OK / Wounded (morale penalty) / Captured / Killed. Apply each per §9.1a.
  - On Killed/Captured: advance `leaderState[leaderId].replacedBy` to successor per OOB
    succession list (OOB data from `engine/oob.js`).
  - Clear `pendingResolution` after resolution.
  - Re-check for further pending resolutions (cascade may have queued multiple).
- [ ] Task 6.2: Register `RESOLVE_LEADER_CASUALTY` in `ACTION_HANDLERS` and `getValidActions`.
  - When `pendingResolution.type === 'leaderCasualty'`, only `RESOLVE_LEADER_CASUALTY` is valid.
- [ ] Task 6.3: Write Vitest tests for leader casualty resolution.
  - Each outcome (OK / Wounded / Captured / Killed).
  - Succession chain advance.
  - `pendingResolution` cleared after resolution.

### Verification

- [ ] `npm run test` green

---

## Phase 7: Integration and Closeout

Wire everything together, confirm the full game loop plays through a combat turn, and pass all
quality gates.

### Tasks

- [ ] Task 7.1: Integration smoke test — extend `smoke.test.js` to play through a complete
      combat activation: roll initiative → issue order → activate stack → fire combat →
      morale check → end activation → rally → next turn start.
- [ ] Task 7.2: Review all new files for missing rule-reference comments. Add any that are
      absent per coding standards.
- [ ] Task 7.3: Remove all `TODO(M6)` comments from `drainAutoSteps` and `getValidActions`.
      Confirm no `TODO(M5)` comments remain either.
- [ ] Task 7.4: Run `npm run quality:strict` and fix any failures.
- [ ] Task 7.5: Update `conductor/product.md` current phase to reflect M6 engine complete.
- [ ] Task 7.6: Update `docs/designs/high-level-design.md` rule coverage table — mark §5 §6
      §7 §8 §9.1a §9.1e Loop column as ✅ Done.

### Verification

- [ ] `npm run quality:strict` passes with zero warnings
- [ ] Smoke test exercises fire combat + close combat + morale cascade + rally in a single game
- [ ] HLD rule coverage table updated
- [ ] Ready for `/team-review`

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` clean
- [ ] No unexpected warnings in test output
- [ ] Debt register updated (target: zero new debt)
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
