# Specification: Engine Debt Sprint — Issues #676-679, #681

**Track ID:** engine-debt-sprint_20260813
**Type:** Chore
**Created:** 2026-08-13
**Status:** Draft

## Summary

Close five tracked-debt items deferred from PR #674's `/team-review` (six weeks ago):
a synchronous-I/O performance hazard, a duplicated formation-classification ladder, two
genuine rules-mechanics gaps (SM §5.1 VP control for hexes moved through; LOB §3 column
formation for infantry road movement), and a cosmetic helper-extraction cleanup.

## Context

These five items are the oldest open debt in the register (all filed against PR #674, M1-M5
findings) and, along with #698-700 (filed today against PR #701), make up the full M9 open
debt backlog. Unlike #698-700 (auth architecture/test-coverage follow-ups, a separate track),
these five are rules-engine and performance debt.

#678 and #679 are not pure code-hygiene items — they are missing/incorrect rules mechanics.
Per this project's convention, the `domain-expert` agent was consulted before scoping their
implementation (see track plan.md for the ruling and its implications for scope).

## Acceptance Criteria

- [ ] #676: `loadOob()` gains a module-level cache (mirroring `_mapDataCache` in `map.js`), OR
      `getValidActions` is refactored to call `loadOob()` once and reuse the result for both
      `buildUnitSideMap` and the per-unit lookup loop — eliminating the K+1 synchronous disk
      reads per `dispatch` call during the Activity phase. Regression test proving the cache
      returns a stable/single-load reference, mirroring `map.test.js`'s caching tests.
- [ ] #677: A single `resolveFormationKey(unit, oobUnit)` function is extracted into a shared
      module, returning the same classification currently duplicated across
      `resolveMovementFormation` (move.js) and `resolveUnitMPs` (activateStack.js). Both call
      sites use it; no behavior change. Existing tests for both functions continue to pass
      unmodified in intent (values must be identical).
- [ ] #678: scope per domain-expert ruling (see plan.md) — either implemented per the ruling,
      or explicitly descoped with the ruling's reasoning recorded here and the issue updated/
      closed accordingly if the ruling finds the original claim incorrect.
- [ ] #679: scope per domain-expert ruling (see plan.md) — either implemented per the ruling
      (movement-side only, or movement+combat-side if the ruling finds that necessary for
      rules consistency), or explicitly descoped with reasoning recorded.
- [ ] #681: `safeFindOobUnit(oob, unitId)` added to `oob.js`; all four inline
      IIFE-try/catch call sites (`move.js`, `activateStack.js`, `index.js` x2) replaced.
- [ ] All five issues closed with a summary of what was done (or descoped, with reasoning)
- [ ] Debt register (`docs/tech-debt/report.md`) updated to reflect resolved/descoped items
- [ ] Full quality suite green (`validate-data`, `lint`, `format:check`, `test`, `build`)

## Dependencies

- #675 (real-path-cost tracking) — already merged (`move-debt-sprint_20260627`), a
  prerequisite named in #678's original issue text.
- domain-expert ruling on #678 and #679 (blocking — must complete before those two items'
  implementation tasks begin; #676/#677/#681 have no such dependency and can proceed first).

## Out of Scope

- #698, #699, #700 (auth architecture/dependency/test-coverage debt from PR #701) — separate
  track, unrelated domain.
- Any new debt discovered during this track's own `/team-review` pass — filed as further
  tracked debt per the Immediate Debt-Capture Policy, not folded in here.
- If the domain-expert ruling on #679 finds that rules-accurate column formation requires
  combat-resolution changes (fire modifiers, morale) beyond the movement-side benefit, that
  combat-side work is explicitly out of scope for THIS track unless the ruling states that
  shipping movement-only would leave the engine in a worse, rules-inconsistent state — in
  which case the full scope (or a full descope) will be proposed to the user before proceeding.

## Technical Notes

- Risk Classification: **High** — touches shared rules-engine logic (movement formation
  resolution, VP hex control, `getValidActions` dispatch hot path) — an explicit Checkpointed
  trigger per `.claude/rules/agentic-quality-rails.md`.
- Interaction Mode: **Checkpointed** — human checkpoint after the domain-expert ruling is in
  (to confirm scope for #678/#679 before implementation), and after each phase.
