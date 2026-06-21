# Specification: Pre-M8 Debt Sprint — Artillery Depletion + Leader Loss (#633 #617)

**Track ID:** pre-m8-debt-sprint_20260621
**Type:** Bug
**Created:** 2026-06-21
**Status:** Draft

## Summary

Fix two open rules-correctness debt items before M8 begins: #633 (artillery depletion band
logic inverted vs the Combat Table) and #617 (leader-loss check scope — verify the PR #632
partial fix covers all LOB §9.1a cases).

## Context

Both issues were deferred from M7 pending domain-expert rulings. #633 is a score-4 item
that corrupts ammunition tracking across the full game — the depletion handler maps whole
column bands unconditionally rather than per-cell color bands as the LOB Charts Combat Table
specifies. #617 is a score-3 item partially fixed in PR #632 (`ovSpLoss > 0` added to the
`leaderLossCheckRequired` condition) but never confirmed as complete or closed.

## Acceptance Criteria

- [ ] Domain-expert ruling obtained on LOB §8.2a/§8.2c depletion: exact per-cell color-band
      map from lob-tables.pdf p.2, and whether depletion applies to the ammo type in use or
      is independently keyed to the cell color
- [ ] `artillery.js` depletion block rewritten to use the correct per-cell color-band lookup;
      `LEFT_DEPLETION_COLUMNS` / `RIGHT_DEPLETION_COLUMNS` in `combat.js` updated or replaced
      if the column-set model is wrong
- [ ] Domain-expert ruling obtained on LOB §9.1a leader-loss scope: does it trigger on any
      SP loss during close-combat resolution, or only the §7.0c automatic loss?
- [ ] `closeCombat.js` updated if the ruling requires it; if the PR #632 fix is confirmed
      sufficient, #617 is closed with no code change
- [ ] All existing artillery and close-combat tests pass; new tests cover the corrected
      depletion logic for both shell and canister across left/right/no-depletion cases
- [ ] `npm run quality:strict` passes

## Dependencies

- Domain-expert agent ruling on LOB §8.2a/§8.2c (artillery depletion color bands)
- Domain-expert agent ruling on LOB §9.1a (leader loss scope)
- `server/src/engine/actions/artillery.js` — depletion block ~line 298–325
- `server/src/engine/tables/combat.js` — `LEFT_DEPLETION_COLUMNS`, `RIGHT_DEPLETION_COLUMNS`
- `server/src/engine/actions/closeCombat.js` — `leaderLossCheckRequired` line ~207

## Out of Scope

- Implementing any M8 features
- Changing the `AmmoState` enum or ammo field schema (related #637 — separate issue)
- Any other open debt items (#562, #563, #634)
- Fixing the Longstreet initiative or SM Errata rule-coverage gaps

## Technical Notes

The depletion fix must treat the (roll, column) cell as the lookup key, not the column alone.
`combatResult()` already returns `depletionBand: 'left'|'right'` at line 224/254 of combat.js
— the fix may only need to change what "left band" and "right band" mean in terms of ammo
type depleted. Domain-expert ruling will clarify the exact mapping.

For #617: `closeCombat.js` line 207 already reads
`leaderLossCheckRequired: defenderSpLoss > 0 || ovSpLoss > 0`. The question is whether
cascade SP losses (from morale checks after the close-combat result) should also trigger
leader loss. That path currently fires in `resolveMorale.js`, not `closeCombat.js`.
