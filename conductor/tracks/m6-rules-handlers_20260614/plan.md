# Implementation Plan: M6 Rules Handler Implementations

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Approval before starting task execution; approval before opening PR.

## Risk Classification

**Risk:** High
**Reason:** Modifies game-state mutation paths in the shared rules engine (rally, close combat,
step handlers).

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated if any debt was accepted
- [x] Ready for `/team-review`

---

## Phase 1 — Close combat correctness (#579 + #581)

### Task 1.1 — Gate automatic 1-SP loss on ≥4 attacker SPs (#579) [x]

In `server/src/engine/combat/melee.js`, find the `defenderUnit.sp -= 1` line.
Wrap in `if (attackerSPs >= 4)`. Add `// LOB §7.0 — automatic 1-SP defender loss
requires attacker to have ≥4 SPs engaged`.

### Task 1.2 — Move leader loss check to SP-loss outcome (#581) [x]

Find the leader loss check call in `melee.js`. Confirm it fires unconditionally on every
Closing Roll. Move it inside the block that executes when the losing side actually took
SP loss this step. Add `// LOB §9.1a — leader loss checked on m+ result (SP loss), not
on every Closing Roll`.

### Task 1.3 — Add tests for both fixes [x]

Test 1: 3-SP attacker vs defender — no automatic SP loss.
Test 2: 4-SP attacker vs defender — automatic 1-SP loss occurs.
Test 3: Closing Roll with no SP loss — no leader casualty pending.
Test 4: Closing Roll with SP loss — leader casualty pending created.

---

## Phase 2 — Rally Phase full implementation (#578 + #383)

### Task 2.1 — Implement §6.4 automatic recovery (pre-roll step) [x]

In `server/src/engine/combat/rally.js` (create if not present), implement the §6.4
automatic steps applied to every unit before rally rolls:

- `shaken` units that have `firedThisTurn === false` → automatically set to `normal`
- `disorganized` units → automatically flip to `shaken`
- `routed` units → flag for individual rally-eligibility roll

Add `// LOB §6.4 — automatic recovery applied before per-unit rally rolls`.

### Task 2.2 — Implement §6.3 per-unit rally rolls [x]

After §6.4 automatic steps, process `rallyPhase.unitsPendingRally`. For each unit still
in a degraded morale state, require a dice supply (via `pendingResolution` or inline dice
parameter). On roll ≤ unit's morale rating, improve morale state by one step. On roll >
morale rating, state unchanged. Add `// LOB §6.3 — per-unit rally roll: 2d6 ≤ morale rating`.

### Task 2.3 — Wire rally handler into phase.js [x]

Ensure the `RALLY_PHASE` action type in `phase.js` delegates to `rally.js` and consumes
the `rallyPhase.unitsPendingRally` envelope correctly.

### Task 2.4 — Add tests for rally [x]

Test 1: Shaken unit that did not fire → automatically cleared to normal (§6.4).
Test 2: DG unit → automatically flipped to shaken (§6.4).
Test 3: Normal-morale unit → unaffected by rally phase.
Test 4: Shaken unit, dice ≤ morale rating → improved to normal (§6.3 roll success).
Test 5: Shaken unit, dice > morale rating → remains shaken (§6.3 roll failure).

---

## Phase 3 — Fluke Stoppage handler (#382) [COMPLETE]

### Task 3.1 — Implement FLUKE_STOPPAGE handler in phase.js [x]

Replace the stub. Gather units that are on Attack orders, did not move this activation,
and did not fire this activation. For each, require a 2d6 dice supply. On roll > unit MA,
set `flukeStoppage: true` on the unit state. Add `// LOB §10.7 — Fluke Stoppage: Attack-
order units that did not move or fire roll ≤ MA or are stopped`.

### Task 3.2 — Add tests for Fluke Stoppage [x]

Test 1: Unit on Attack orders, no move/fire, roll ≤ MA → no stoppage.
Test 2: Unit on Attack orders, no move/fire, roll > MA → flukeStoppage set.
Test 3: Unit on Hold orders → not included in Fluke roll.
Test 4: Unit on Attack orders that moved → not included in Fluke roll.

---

## Phase 4 — Attack Recovery handler (#381) [COMPLETE]

### Task 4.1 — Implement ATTACK_RECOVERY handler in phase.js [x]

Replace the stub. Gather all divisions on Attack orders. For each division, require a 2d6
roll. On roll ≤ division MA, division stays on Attack orders. On roll > MA, division reverts
to Hold. Add `// LOB §10.6b — Attack Recovery: division rolls ≤ MA to remain on Attack orders`.

### Task 4.2 — Add tests for Attack Recovery [x]

Test 1: Division on Attack orders, roll ≤ MA → remains on Attack.
Test 2: Division on Attack orders, roll > MA → reverts to Hold.
Test 3: Division on Hold orders → not included in recovery roll.

### Task 4.3 — Run `npm run quality:strict` and fix any issues [x]
