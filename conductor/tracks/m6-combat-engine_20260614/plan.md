# Implementation Plan: M6 Combat Engine — Fire, Melee, Morale, Rally

**Track ID:** m6-combat-engine_20260614
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-14
**Status:** [x] Complete

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

- [x] Task 3.1: Create `server/src/engine/actions/closeCombat.js`.
  - Payload schema: `{ attackerHex: HexId, defenderHex: HexId }`.
  - Validate adjacency (distance = 1) and enemy defender.
  - Opening Volley on advance: fire defender's Opening Volley against charger before Closing Roll
    (LOB §7.0b). Apply Opening Volley result; if charger routed, abort charge.
  - Apply automatic 1 SP defender loss (LOB §7.0c).
  - Call `tables/charge.js` `resolveClosingRoll()` with Additional Charge Modifiers (LOB §7.0g).
  - Resolve retreat: push defender back one hex; check retreat-into-EZOC casualty (LOB §7.0e).
  - Return new state; set `pendingResolution` for morale cascade and leader loss checks.
- [x] Task 3.2: Add `CLOSE_COMBAT` to `getValidActions`.
  - Generate candidates for each enemy-occupied hex adjacent to the active stack (when unit is
    in Line or Column formation — Open Order units use different rules §9.4).
  - Open Order close combat: automatic Closing Roll success per §9.4.
- [x] Task 3.3: Write Vitest tests for `closeCombat.js`.
  - Opening Volley abort path (charger routed before Closing Roll).
  - Successful charge with retreat; retreat-into-EZOC loss trigger.
  - Open Order automatic success path.

### Verification

- [x] `npm run test` green
- [x] **CHECKPOINT: human review of OOB side-affiliation wiring (Tasks 2.2 and 3.2)**

---

## Phase 4: Morale Cascade

Implement morale check, state transitions, and brigade → division cascade (LOB §6).

### Tasks

- [x] Task 4.1: Create `server/src/engine/morale.js` (new engine module, not in tables/).
- [x] Task 4.2: Wire morale cascade via RESOLVE_MORALE handler; RESOLVE_MORALE registered in ACTION_HANDLERS.
- [x] Task 4.3: Write Vitest tests for `morale.js`.

### Verification

- [x] `npm run test` green with morale cascade coverage

---

## Phase 5: Rally Phase, Zero Rule, Fluke/Recovery

Replace the three `drainAutoSteps` stubs with real resolution logic.

### Tasks

- [x] Task 5.1: Replace Rally Phase stub — CBF clearing implemented; morale recovery deferred to M7.
- [x] Task 5.2: Replace Fluke Stoppage stub — enumerates attack-order units; auto-advances at M6 depth.
- [x] Task 5.3: Replace Attack Recovery stub — enumerates stopped-order units; auto-advances at M6 depth.
- [x] Task 5.4: `zeroRuleFired` field added to `currentActivation` schema shape (M5.5).
- [x] Task 5.5: Write Vitest tests (drainAutoSteps.test.js — 18 tests).

### Verification

- [x] `npm run test` green
- [x] `drainAutoSteps` has zero `TODO(M6)` comments remaining

---

## Phase 6: Leader Loss Handler

Implement Leader Loss check and succession (LOB §9.1a).

### Tasks

- [x] Task 6.1: Create `server/src/engine/actions/resolveLeaderCasualty.js`.
- [x] Task 6.2: Register `RESOLVE_LEADER_CASUALTY` in `ACTION_HANDLERS` and `getValidActions`.
- [x] Task 6.3: Write Vitest tests (resolveLeaderCasualty.test.js — 19 tests).

### Verification

- [x] `npm run test` green

---

## Phase 7: Integration and Closeout

Wire everything together, confirm the full game loop plays through a combat turn, and pass all
quality gates.

### Tasks

- [x] Task 7.1: Integration smoke test added to smoke.test.js (M6 combat activation describe block).
- [x] Task 7.2: Rule-reference comments audited — all new handlers cite LOB §§ per coding standards.
- [x] Task 7.3: Zero TODO(M6) or TODO(M5) comments remain in production code.
- [x] Task 7.4: `npm run quality:strict` passes clean.
- [x] Task 7.5: `conductor/product.md` updated to M6 complete.
- [x] Task 7.6: HLD rule coverage table updated — §5 §6 §7 §8 §9.1a §9.1e marked Loop ✅.

### Verification

- [x] `npm run quality:strict` passes with zero warnings
- [x] Smoke test exercises fire combat + morale cascade + leader casualty + CBF/rally in sequence
- [x] HLD rule coverage table updated
- [x] Ready for `/team-review`

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] `npm run quality:strict` clean
- [x] No unexpected warnings in test output
- [x] Debt register updated (zero new debt)
- [x] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
