# Specification: Engine Debt Sprint — Issues #676-679, #681

**Track ID:** engine-debt-sprint_20260813
**Type:** Chore
**Created:** 2026-08-13
**Status:** Complete

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

- [x] #676: `getValidActions` hoists a single `loadOob()` call (reused via `ctx.oob` when the
      caller already holds one — dispatch and the route layer both do) instead of re-reading
      per active unit. A module-level cache (the spec's other suggested option) was rejected:
      `loadOob()`'s own docstring documents it as deliberately uncached for OOB-editor
      dev-mode hot-reload, and adding one would have regressed that. Mutation-verified
      regression tests assert both "called once" (fallback path) and "called zero times"
      (when `ctx.oob` is supplied).
- [x] #677: `resolveMovementFormationKey(unit, oobUnit)` (named this, not `resolveFormationKey`
      as originally sketched — collided with an unrelated private function already in
      `movement.js`) extracted into a new shared module `formation.js`. Both `move.js` and
      `activateStack.js` use it; behavior-preserving for all pre-existing inputs, plus a real
      bug fixed in the same pass (see #696-era note below — artillery with unset `formation`
      or no `type` field was misclassified as infantry).
- [x] #678: implemented, scoped to the MOVE action per domain-expert ruling. `resolveMove`
      walks the full submitted path (excluding the starting hex) and calls `updateHexControl`
      for every hex entered. Follow-up for retreat/charge-advance/Skedaddle traversal filed as
      #703, per the ruling's own recommendation to scope this fix narrowly.
- [x] #679: descoped, not implemented. Domain-expert ruling found the original issue
      significantly undersold scope — Column-formation infantry can't fire, can't be Charge
      attackers, and take a Rear-facing combat/morale penalty (LOB §5.2a, §3.3c); a
      movement-only implementation would leave the engine in a _worse_, rules-inconsistent
      state than the current gap. Closed with reasoning recorded; replaced by #704, a
      properly-scoped feature issue (movement + combat + morale together), explicitly not
      labeled `tech-debt` since it's new functionality, not debt.
- [x] #681: `safeFindOobUnit(oob, unitId)` added to `oob.js`. Two call sites replaced
      (`move.js`, and the `index.js` hot path already touched by #676); two of the originally-
      cited four had drifted to a different whole-OOB-resolution pattern by the time this
      track picked the issue up and were left as-is. A `/team-review` pass on this track then
      found a THIRD genuine per-unit match at `activateStack.js:66` that the initial pass
      missed (not wrapped in an IIFE like the others, so easy to overlook) — fixed in the same
      review-response commit.
- [x] All five issues closed with a summary of what was done (or descoped, with reasoning)
- [x] Debt register (`docs/tech-debt/report.md`) updated to reflect resolved/descoped items
- [x] Full quality suite green (`validate-data`, `lint`, `format:check`, `test`, `build`)

## Dependencies

- #675 (real-path-cost tracking) — already merged (`move-debt-sprint_20260627`), a
  prerequisite named in #678's original issue text.
- domain-expert ruling on #678 and #679 (blocking — must complete before those two items'
  implementation tasks begin; #676/#677/#681 have no such dependency and can proceed first).

## Out of Scope

- #698, #699, #700 (auth architecture/dependency/test-coverage debt from PR #701) — separate
  track, unrelated domain.
- ~~Any new debt discovered during this track's own `/team-review` pass — filed as further
  tracked debt, not folded in here.~~ Corrected during implementation: this project's
  coding-standards.md is explicit that debt-cleanup PRs must not generate new deferred debt —
  all findings from this track's own review (including a real correctness bug the review
  found) were fixed in place in the same PR, none deferred.
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
