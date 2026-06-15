# Spec: M6 Domain Bug Fixes

## Overview

Fix four critical domain correctness bugs introduced in the M6 combat engine (PR #582).
All four bugs were identified during the team-review of `m6-combat-engine_20260614` and
deferred to this track because they touch shared rules-engine logic.

## Issues Closed

| Issue | Score | Title                                                                           |
| ----- | ----- | ------------------------------------------------------------------------------- |
| #574  | 5     | fire combat column uses defender SPs instead of attacker SPs (LOB §5.1/§5.6)    |
| #575  | 5     | Opening Volley direction reversed — firer and target backwards (LOB §5.4a)      |
| #576  | 4     | CBF marker set on all SP loss instead of artillery-vs-artillery only (LOB §5.8) |
| #577  | 4     | morale cascade uses hex scope instead of brigade hierarchy (LOB §6.3)           |

**Total debt score removed:** 18

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Architecture review before task execution; approval before merging.
Touches shared rules-engine logic (combat, morale handlers).

## Risk Classification

**Risk:** High
**Reason:** All four fixes modify production combat/morale resolution paths that affect game outcomes.

## Bug Details

### #574 — Fire Combat SP Column

**Location:** `server/src/engine/combat/fire.js` — `computeCombatColumn()` or equivalent.
**Bug:** Column lookup uses defender's SP count. LOB §5.1 specifies the column is determined by
the **attacker's** effective SPs (after any halving for DG status). Defender SPs are irrelevant to column selection.
**Fix:** Pass and use `attackerSPs` (with DG ×½ already applied) as the column index argument.

### #575 — Opening Volley Direction Reversed

**Location:** `server/src/engine/combat/fire.js` and `server/src/engine/combat/melee.js`.
**Bug:** Code models the attacker firing an Opening Volley. LOB §5.4a specifies that Opening Volley
is fired **by the inactive defender** against the moving attacker as the attacker enters range/adjacency.
**Fix:** Swap firer/target roles in OV resolution. The defender fires; the attacker absorbs the result.
The OV check on `movedThisActivation` logic is correct — only the direction needs reversing.

### #576 — CBF Trigger Too Broad

**Location:** `server/src/engine/combat/fire.js` — CBF marker assignment after combat resolution.
**Bug:** CBF (Canister By Fire) marker is set whenever any SP loss occurs. LOB §5.8 specifies CBF
only applies when **artillery** takes SP loss from **artillery fire** (arty-vs-arty only).
**Fix:** Gate the `cbfMarker = true` assignment behind a check that both the firing unit and the
target unit have `weaponClass === 'artillery'` (or equivalent artillery flag in the OOB data).

### #577 — Morale Cascade Hex Scope vs Brigade Hierarchy

**Location:** `server/src/engine/morale.js` — cascade logic after a morale check triggers.
**Bug:** When a unit's morale result propagates, the code cascades to all units in the same hex.
LOB §6.3 specifies cascade travels up the **OOB brigade hierarchy** — to the parent brigade commander
and then optionally to division — not to hex co-occupants.
**Fix:** Replace the hex-scope gather with an OOB parent-lookup. Given a unit's `brigadeId`, find
all sibling units in the same brigade (from `oob.json`), then cascade to the brigade commander.
Use `findOobUnit` / the deduplicated OOB helpers once Track 2 (#573) lands (or inline equivalently).

## Acceptance Criteria

- [ ] Fire combat column is computed from attacker SPs (halved if attacker is DG)
- [ ] Opening Volley is resolved with the inactive defender as firer and attacker as target
- [ ] CBF marker is set only when artillery unit takes SP loss from an artillery attack
- [ ] Morale cascade walks OOB brigade hierarchy, not hex co-occupants
- [ ] All four rule changes have `// LOB §X.X —` citations at the point of change
- [ ] Existing combat and morale tests remain green; new regression tests added for each fix
- [ ] `npm run quality:strict` passes
