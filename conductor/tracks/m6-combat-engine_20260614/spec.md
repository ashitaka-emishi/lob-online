# Specification: M6 Combat Engine — Fire, Melee, Morale, Rally

**Track ID:** m6-combat-engine_20260614
**Type:** Feature
**Created:** 2026-06-14
**Status:** Draft

## Summary

Wire the M3 combat/morale/charge/command engine tables into the live game dispatch pipeline,
adding server-side action handlers for fire combat, close combat, morale cascade, rally, leader
loss, and the zero rule. No combat UI in this track — that ships in the follow-on M6 UI track.

## Context

M3 delivered fully-tested, pure-JS engine modules for every LOB v2.0 combat table. M5 delivered
the turn-phase dispatch infrastructure (`engine/actions/index.js`, `ACTION_HANDLERS` map,
`drainAutoSteps`). Several auto-advance stubs in `drainAutoSteps` carry `TODO(M6)` comments
identifying exactly where M6 logic must be inserted. M6 removes those stubs and replaces them
with real rule resolution.

Engine modules available for import (no rework needed per HLD §M3):

- `engine/tables/combat.js` — Combat Table §5.6, Opening Volley §5.4, all column shifts
- `engine/tables/morale.js` — Morale Table §6.1, Additive Morale Effects Chart §6.2a
- `engine/tables/charge.js` — Closing Roll Table §3.5, Additional Charge Modifiers §7.0g
- `engine/tables/command.js` — Zero Rule §9.1e, Fluke Stoppage §10.7b, Attack Recovery §10.8c
- `engine/tables/leader-loss.js` — Leader Loss Table §9.1a
- `engine/los.js` — LOS validation
- `engine/movement.js` — range / adjacent-hex validation

## User Story

As a player, I want to fire on an enemy unit during the Activity Phase, resolve the combat result
automatically, and have morale checks + cascades applied so that I can play a complete combat
turn with accurate LOB v2.0 rule enforcement.

## Acceptance Criteria

- [ ] `FIRE_COMBAT` action handler resolves fire combat per LOB §5: validates LOS + range,
      computes effective SP (DG units ×½), applies all column shifts (range, weapon type,
      firepower, terrain, flank, leader, ammo state), rolls on the Combat Table, and returns
      a structured `CombatResult` (casualties, morale trigger, depletion flag, ammo state update).
- [ ] Opening Volley (§5.4) is triggered automatically when a unit advances into contact or
      fire is declared after a Move order on the same activation.
- [ ] `CLOSE_COMBAT` action handler resolves melee per LOB §7: Opening Volley on advance,
      automatic 1 SP defender loss, Closing Roll Table with Additional Charge Modifiers, and
      retreat-into-EZOC casualty check.
- [ ] Morale check is triggered by any `m` or `m+` combat result and resolved per LOB §6.1
      with all modifiers (adjacent leader, formation, terrain, morale state, Open Order).
- [ ] Morale cascade propagates up the brigade → division hierarchy: a brigade rout triggers
      a division morale check; a division rout triggers corps/army effects per §6.3.
- [ ] Leader Loss check (§9.1a) fires after any `m+` fire result or any close combat resolution.
- [ ] Zero Rule (§9.1e) MA roll executes automatically at the start of each brigade's
      activation when the brigade is on Attack orders.
- [ ] Fluke Stoppage (§10.7b) and Attack Recovery (§10.8c) stubs in `drainAutoSteps` are
      replaced with real dice rolls against active Attack-order divisions.
- [ ] Rally Phase stub in `drainAutoSteps` is replaced with per-unit CBF removal (automatic)
      and morale recovery roll (§6.3) for each DG/Routed unit.
- [ ] All handlers validate their payloads independently (pattern established by M5 handlers).
- [ ] All new action handlers registered in `ACTION_HANDLERS` map in `engine/actions/index.js`.
- [ ] `getValidActions` returns `FIRE_COMBAT` and `CLOSE_COMBAT` candidates when appropriate
      targets are in range/LOS or adjacent to the activated stack.
- [ ] Full Vitest coverage: each handler tested with known inputs; table-hit paths verified;
      cascade paths exercised.
- [ ] `npm run quality:strict` passes clean.

## Dependencies

- M5 `engine/actions/` dispatch infrastructure (complete)
- M3 `engine/tables/` modules (complete)
- `GameStateSchema` / `UnitStateSchema` Zod schemas — may need `moraleState`, `ammoState`,
  `depletionMarker`, `cbfMarker` fields added if not already present
- `engine/los.js` and `engine/movement.js` for range/LOS validation in fire handler

## Out of Scope

- Combat UI (click to fire, result panel, morale state on counter) — follow-on M6 UI track
- Discord webhook notifications on combat results — M8
- Artillery special rules (§9.1 limbering, supply trace, Pelham/Pleasonton) — M7
- Victory condition checks after combat — M7
- Loss Recovery (§9.3 midnight 25% rule) — M7
- Variable reinforcement arrival (Force A/B roll) — M7

## Technical Notes

- The `GameStateSchema` `UnitStateSchema` likely needs new fields: `moraleState` (normal / dg /
  routed / wrecked), `ammoState` (full / low / depleted), `depletionMarker` (bool), `cbfMarker`
  (bool). Audit schemas before writing handlers. These are **persistence-touching changes** —
  Checkpointed mode required.
- Fire combat and morale results should be returned as structured `pendingResolution` objects in
  game state so that future UI can display them (consistent with the `pendingResolution !== null`
  guard already in `getValidActions`).
- All new game-logic code must carry rule-reference comments per coding standards
  (`// LOB §5.6 — Combat Table column shift for range`).
- OOB side-affiliation filtering deferred in M5 (see `#560` comment in `getValidActions`) must
  be addressed in this track — fire/melee candidates are only valid against enemy units.

---

_Generated by Conductor. Review and edit as needed._
