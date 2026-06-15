# Spec: M6 Rules Handler Implementations — Rally §6.4, Close Combat Gate, Leader Loss, Fluke, Attack Recovery

## Overview

Six rules-engine items deferred from M5 and M6 that remain as stubs or have correctness gaps.
These are the engine handlers needed to make a complete turn loop playable: full Rally Phase
resolution, correct close combat SP-loss gating, corrected leader-loss trigger logic, and the
Fluke Stoppage and Attack Recovery step handlers.

## Issues Closed

| Issue | Score | Title                                                                              |
| ----- | ----- | ---------------------------------------------------------------------------------- |
| #578  | 3     | Rally Phase skips §6.4 recovery rules (Sh removal, DG→Sh flip, Routed roll)        |
| #579  | 3     | close combat automatic 1-SP loss not gated on ≥4 attacker SPs (LOB §7.0)           |
| #581  | 2     | leader-loss checks should be loss-driven, not Closing-Roll-driven (LOB §7.0/§9.1a) |
| #383  | 2     | implement Rally Phase handler with per-unit rally rolls (LOB §6.3)                 |
| #382  | 2     | implement Fluke Stoppage step handler (LOB §10.7)                                  |
| #381  | 2     | implement Attack Recovery step handler (LOB §10.6b)                                |

**Total debt score removed:** 14

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Architecture review before task execution; approval before merge.
Touches shared rules-engine logic (rally, close combat, step handlers).

## Risk Classification

**Risk:** High
**Reason:** All items modify game-state mutation paths in the shared rules engine.

## Handler Details

### #578 + #383 — Rally Phase Full Implementation (LOB §6.3 + §6.4)

**Location:** `server/src/engine/combat/rally.js` (new or existing stub).

The current Rally Phase handler clears CBF markers but does not implement per-unit rally rolls.

LOB §6.3 — per-unit rally roll: each unit with a morale state worse than `normal` rolls 2d6
against its morale rating. On success, improve morale state by one step (routed→disorganized,
disorganized→shaken, shaken→normal). On failure, state unchanged.

LOB §6.4 — automatic recovery rules (applied before rally rolls):

- `shaken` units that did not take fire this turn are automatically removed from `shaken` (→ `normal`)
- `disorganized` units flip to `shaken` automatically
- `routed` units roll separately for whether they can attempt a rally roll at all

The `rallyPhase.unitsPendingRally` envelope (added in schema v3) should hold units queued for
rally rolls. The handler should process them in order, applying §6.4 automatic steps first, then
requesting dice for §6.3 rolls via a `pendingResolution` or inline dice supply pattern.

### #579 — Close Combat 1-SP Loss Gate (LOB §7.0)

**Location:** `server/src/engine/combat/melee.js` — automatic SP loss assignment.

LOB §7.0 specifies the automatic 1-SP loss to the defender only applies when the **attacker**
has ≥4 SPs engaged. Below that threshold, no automatic loss occurs.

**Fix:** Gate `defenderUnit.sp -= 1` behind `attackerSPs >= 4`.

### #581 — Leader Loss Trigger Correction (LOB §7.0 + §9.1a)

**Location:** `server/src/engine/combat/melee.js` — leader loss check placement.

LOB §9.1a: leader loss is checked after any **m+** combat result (i.e., when the losing side
takes SP loss). The current implementation checks for leader loss on every Closing Roll regardless
of loss outcome.

**Fix:** Move leader loss check so it fires only when the unit took SP loss in the current combat
step, not unconditionally on every Closing Roll.

### #382 — Fluke Stoppage Step Handler (LOB §10.7)

**Location:** `server/src/engine/phase.js` — `FLUKE_STOPPAGE` action handler (currently a stub
that just advances phase).

LOB §10.7 — Fluke Stoppage: at the end of each Activation, units on Attack orders that did not
move and did not fire must make a 2d6 Fluke roll against their MA rating. On a roll ≤ MA, no effect.
On a roll > MA, the unit is stopped for this activation (cannot act further this turn).

Implement: gather units on Attack orders that neither moved nor fired this activation, request
dice, apply Fluke result per unit, set a `flukeStoppage` flag on stopped units.

### #381 — Attack Recovery Step Handler (LOB §10.6b)

**Location:** `server/src/engine/phase.js` — `ATTACK_RECOVERY` action handler (currently a stub).

LOB §10.6b — Attack Recovery: at the start of each Command Phase, each division on Attack orders
rolls 2d6. On a roll ≤ the division's MA rating, the division recovers (remains on Attack orders
for the next turn). On a roll > MA, the division reverts to Hold orders.

Implement: for each division on Attack orders, request dice, apply recovery result, update order
state. Uses the divisional command structure from `oob.json`.

## Acceptance Criteria

- [ ] Rally Phase processes §6.4 automatic steps before §6.3 rally rolls
- [ ] Per-unit rally rolls request dice and improve morale state on success
- [ ] `rallyPhase.unitsPendingRally` envelope is consumed correctly
- [ ] Close combat 1-SP automatic loss only fires when attacker has ≥4 SPs
- [ ] Leader loss check fires on SP-loss outcome, not on every Closing Roll
- [ ] Fluke Stoppage handler iterates Attack-ordered units, rolls, sets stoppage flag
- [ ] Attack Recovery handler iterates Attack-ordered divisions, rolls, updates orders
- [ ] All implementations have `// LOB §X.X —` citations
- [ ] Each handler has at least one unit test covering the success and failure paths
- [ ] `npm run quality:strict` passes
