# Specification: M7 — Special Rules + Victory Conditions

**Track ID:** m7-special-rules_20260617
**Type:** Feature
**Created:** 2026-06-17
**Status:** Draft

## Summary

Wire all remaining LOB v2.0 and SM rules into the live game loop: artillery special rules, loss
recovery, attack recovery, interactive rally dice, retreat resolution, random events, variable
reinforcements, VP tracking, and victory condition evaluation. After M7 a full 45-turn South
Mountain game can be played to completion with all rules enforced.

## Context

M6 delivered the fire combat, close combat, and morale action handlers, plus the Rally Phase CBF
clearing and §6.4 auto-recovery. The engine has pure-JS table modules for all rules sections
(M3), but several are still unlooped:

- **Artillery** (LOB §9.1): limbering/unlimbering, canister vs shell, battery depletion, artillery
  leaders — engine stubs exist in `tables/` but are not wired to action handlers.
- **Loss Recovery** (LOB §9.3): midnight Rally Phase SP restoration — not implemented.
- **Attack Recovery** (LOB §10.8c): divisional check at start of Command Phase — engine table exists
  (`tables/attackRecovery.js`), not wired.
- **Interactive Rally Dice** (LOB §6.4 step 3 / §6.3): `drainAutoSteps` currently auto-advances
  through routed-unit rally rolls without actual dice — M7 must pause for player input.
- **Retreat Resolution** (LOB §6.1): morale checks produce retreat hex counts and SP losses that
  are not yet applied to unit positions or strength — they are recorded but not executed.
- **Random Events** (SM §4+): 2d6 roll + table lookup each Command Phase — engine tables exist,
  not wired.
- **Variable Reinforcements** (SM Reinforcements): Force A/B arrival dice not wired.
- **VP Tracking** (LOB §11 / SM VP): no VP state, no end-of-turn tally, no victory check.
- **Leader Loss bug** (#617): `leaderLossCheckRequired` in `closeCombat.js` fires only on the
  §7.0a(e) automatic 1-SP defender loss, missing Opening Volley losses to the defender. Ruling
  confirms §9.1a requires a check on any Combat Table OR Opening Volley loss.

## User Story

As a player, I want to play a full South Mountain scenario from setup to victory determination so
that I experience a complete, rules-correct wargame.

## Acceptance Criteria

- [ ] Artillery units can limber/unlimber and fire with canister or shell per LOB §9.1; supply
      trace to Wing Wagon or west-edge road hex enforced (SM §3.6); Pelham/Pleasonton replenish
      from any friendly ammo reserve.
- [ ] At midnight (turn-based), regiments and batteries recover 1 SP or 25% of losses per LOB §9.3.
- [ ] Attack Recovery divisional check runs at Command Phase start per LOB §10.8c.
- [ ] Routed units in the Rally Phase pause for player dice input; rally roll applies §6.4 step 3
      (1d6 + leader MV ≥ 5 → DG); result applied to unit state.
- [ ] Retreat results from morale checks apply unit position changes and SP losses to game state.
- [ ] Random event tables roll each Command Phase for both sides; results surfaced to players.
- [ ] Variable reinforcements (Force A/B) resolve via 1d6 roll; units enter on the determined turn.
- [ ] VP tally computed end-of-turn: terrain hex VP + wreck VP per formation (SM VP table).
- [ ] Game correctly identifies all 7 SM victory outcome labels when VP threshold is crossed.
- [ ] Leader loss check fires on any defender SP loss in close combat (OV loss OR §7.0a(e) loss),
      per §9.1a ruling for #617.
- [ ] All new engine functions have unit tests at ≥70% line coverage.
- [ ] `npm run quality:strict` passes.

## Dependencies

- `server/src/engine/tables/` — existing pure-JS table modules (artillery, attackRecovery, rally,
  random events, reinforcements, VP) — engine-complete from M3, now being looped.
- `server/src/engine/actions/` — existing action handler framework (fireCombat, closeCombat,
  resolveMorale, index.js turn reducer) — M7 extends this.
- `server/src/engine/oob.js` — `findOobUnit`, `buildUnitSideMap` already present; `sumCurrentSPs`
  and `buildUnitIndex` added in Sprint B.
- `client/src/stores/useGameStore.js` — existing Pinia store with `loadGame`, `submitAction`.
- Vue Router, GameView — existing UI scaffold; M7 adds VP panel and game-complete screen.

## Out of Scope

- M8 production persistence (DO Spaces, SQLite), multiplayer, Discord webhooks.
- Full movement animation or step-by-step retreat path display (retreat hex count applied to
  position; visual path display deferred to M8+).
- AI opponent.
- Additional scenarios beyond South Mountain full-battle.

## Technical Notes

M7 is **Checkpointed** (rules-engine and schema changes on every phase). Phases:

1. **Bug + pre-wire fixes** — #617 leader-loss scope fix; retreat/SP-loss application skeleton;
   verify artillery engine stubs compile and have correct citations.
2. **Interactive rally dice** — pause `drainAutoSteps` when `unitsPendingRallyRoll.length > 0`;
   new `RALLY_ROLL` action handler; update `getValidActions` gate; wire to ActionPanel.
3. **Artillery actions** — `LIMBER`, `UNLIMBER`, `FIRE_ARTILLERY` action handlers backed by
   §9.1 engine; supply trace validation; SM §3.6 replenishment.
4. **End-of-turn accounting** — Loss Recovery (LOB §9.3), Attack Recovery (LOB §10.8c), Random
   Events (SM §4+), Variable Reinforcements — all fire in the appropriate turn-phase step.
5. **VP and victory** — `engine/vp.js`, end-of-turn VP tally, game-complete detection, frontend
   VP panel and result screen.

---

_Generated by Conductor. Review and edit as needed._
