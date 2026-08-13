# Implementation Plan: Engine Debt Sprint — Issues #676-679, #681

**Track ID:** engine-debt-sprint_20260813
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-13
**Status:** [x] Complete (PR #705 open, awaiting merge)

## Overview

Eight phases: a domain-expert consultation gate, three independent code-cleanup items
(#676/#677/#681, implemented together since they touch overlapping call sites), the scoped
rules fix for #678, resolving #679 by descoping it rather than implementing it as originally
filed, a full `/team-review` pass, fixing everything that review found (including one real
correctness bug), closeout, and a mandatory targeted second-pass review (triggered because the
review-fix diff itself touched rules-engine paths) that found and fixed a second real bug.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Domain-expert ruling reviewed with the user before any #678/#679
implementation began; user chose the exact scope for each (#678: scoped to MOVE action,
follow-up filed; #679: descoped entirely, replacement feature issue filed) before proceeding.

## Risk Classification

**Risk:** High
**Reason:** Shared rules-engine logic — movement formation resolution, VP hex control,
`getValidActions` dispatch hot path.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved. Two new debt items were filed
under the Immediate Debt-Capture Policy, not silently dropped: #703 (user-approved way to
descope #678's non-MOVE traversal gap) and #706 (UNLIMBER MP-deduction gap, discovered during
the mandatory second-pass review of Phase 6 — pre-existing, not caused by this branch, so filed
rather than fixed in place; see Phase 8).

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met (or explicitly descoped with reasoning — #679)
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated (Task 7.3 — `/tech-debt-report` run against PR #705)
- [x] Ready for `/team-review` — complete, findings fixed in place (Phase 6, Phase 8)

---

## Phase 1: Domain-Expert Consultation

`#678` and `#679` are rules-mechanics gaps, not pure code cleanup — per this project's
convention, `domain-expert` was consulted before any implementation scoping.

### Tasks

- [x] Task 1.1: Ask domain-expert to rule on SM §5.1's exact scope for #678 (which units
      qualify, path semantics, interaction with retreat/charge/Skedaddle).
- [x] Task 1.2: Ask domain-expert to rule on LOB §3's column-formation mechanics for #679
      (movement cost, combat-side effects, formation-change mechanics, whether a
      movement-only implementation is rules-accurate).
- [x] Task 1.3: Present the ruling to the user and get an explicit scoping decision for each
      issue before proceeding.

### Verification

- [x] Ruling obtained with exact rule citations for both questions
- [x] User confirmed scope for #678 (implement now, MOVE-only) and #679 (descope, replace
      with a properly-scoped feature issue)

---

## Phase 2: #676, #677, #681 — Code Cleanup (No Rules Ambiguity)

### Tasks

- [x] Task 2.1: #676 — hoist the single `loadOob()` call in `getValidActions`'s mid-activation
      branch and reuse it for both `buildUnitSideMap` and the per-unit artillery-candidate
      lookup, eliminating N+1 disk reads. `loadOob()` itself left uncached (its own docstring:
      deliberately re-reads so OOB-editor dev-mode edits take effect without a restart) —
      the module-level-cache option from the issue was rejected as it would have regressed
      that hot-reload behavior.
- [x] Task 2.2: #677 — extract `resolveFormationKey(unit, oobUnit)` into a new shared module
      `server/src/engine/actions/formation.js`; update `move.js`'s `resolveMovementFormation`
      and `activateStack.js`'s `resolveUnitMPs` to derive from it.
- [x] Task 2.3: #681 — add `safeFindOobUnit(oob, unitId)` to `oob.js`; replace the two call
      sites that still matched the exact IIFE pattern (move.js, and the index.js hot path
      already touched by Task 2.1). Two other originally-cited locations had drifted to a
      different pattern (`ctx.oob ?? loadOob()`, resolving the whole OOB object, not a
      per-unit lookup) — left as-is, noted in the issue-closing comment. **Correction (Phase
      6):** the "left as-is" call was only half right — `activateStack.js:56-62` really is the
      whole-OOB pattern, but `activateStack.js:66` (`loadedOob ? findOobUnit(loadedOob,
unit.id) : null`) is the same per-unit lookup #681 was filed against, just not wrapped
      in an IIFE like the others. `/team-review` caught this; fixed in Phase 6.
- [x] Task 2.4: Add regression tests — `formation.test.js` for `resolveFormationKey`,
      `safeFindOobUnit` tests in `oob.test.js`, and a spy-based test in `index.test.js`
      asserting `loadOob()` is called exactly once regardless of active-unit count.

### Verification

- [x] All three are pure behavior-preserving refactors — existing `move.test.js`,
      `activateStack.test.js`, `index.test.js` pass unmodified
- [x] New regression tests mutation-verified (each fails when its target fix is reverted)
- [x] `npm run test` green

---

## Phase 3: #678 — SM §5.1 VP Hex Control (Scoped to MOVE)

### Tasks

- [x] Task 3.1: In `resolveMove`, walk `path.slice(1)` (excluding the starting hex) and call
      `updateHexControl` for every hex entered, not just the destination.
- [x] Task 3.2: Confirm no additional artillery/Routed exclusion logic is needed —
      `updateHexControl`'s existing `isVpControlEligible` gate already handles it correctly
      (a moving unit can never be eligible-unlimbered-artillery per LOB §3.6a).
- [x] Task 3.3: Add regression tests: intermediate-VP-hex transfer, starting-hex
      non-disturbance, cavalry exclusion, Routed-unit exclusion. Mutation-verify against the
      destination-only behavior.
- [x] Task 3.4: File a follow-up issue (#703) for the descoped retreat/charge-advance/
      Skedaddle traversal, citing the domain-expert ruling.

### Verification

- [x] `move.test.js` passes (36 tests, including 4 new)
- [x] Mutation-verified: reverting to destination-only breaks the new intermediate-hex test
- [x] #703 filed with `tech-debt` label, score 2, milestone M9

---

## Phase 4: #679 — Descope and Replace

### Tasks

- [x] Task 4.1: Close #679 with a comment explaining the descope reasoning (domain-expert
      found movement-only implementation would leave the engine in a worse,
      rules-inconsistent state than the current gap).
- [x] Task 4.2: File a properly-scoped replacement issue (#704) capturing the full ruling —
      SM-specific movement-allowance override, fire/charge ineligibility, Rear-facing
      combat/morale penalties — explicitly flagged as needing its own Checkpointed track, not
      a debt-sprint item.

### Verification

- [x] #679 closed with reasoning recorded
- [x] #704 filed, not labeled `tech-debt` (it's a feature, not debt, per the ruling)

---

## Phase 5: Pre-Review Closeout

### Tasks

- [x] Task 5.1: Run full quality suite (`validate-data`, `lint`, `format:check`, `test`,
      `build`).
- [x] Task 5.2: Close #676, #677, #678, #681 with summary comments.
- [x] Task 5.3: Register track in `conductor/tracks.md` and `conductor/index.md`.
- [x] Task 5.4: Run `/team-review` (5 dimensions — security, architecture, testing,
      maintainability, domain, given this track touches shared rules-engine logic).

### Verification

- [x] All 5 reviewers ran; security and domain came back clean (no findings), the other three
      found real, verified issues (see Phase 6)

---

## Phase 6: Review-Fix Response

`/team-review` found one real correctness bug (independently confirmed by two reviewers,
verified by me before fixing) plus several architecture/testing/doc issues. Per this project's
coding-standards.md rule that debt-cleanup PRs must not generate new deferred debt, all
findings were fixed in place — none deferred.

### Tasks

- [x] Task 6.1: Fix the real bug — `resolveMovementFormationKey` misclassified artillery as
      infantry `'line'` whenever `unit.formation` was unset (every battery's state at game
      setup — `init.js` never sets it) or the OOB record had no `type` field (true for every
      real SM battery, which carries `gunType` instead). Combined with Phase 3's own path-walk
      change, this would have let such a unit illegally move using infantry costs AND claim
      every VP hex along that illegal path. Fixed to check `gunType` and apply the
      `unit.formation ?? 'unlimbered'` default used at every other artillery call site in this
      codebase; kept `unit.formation` authoritative independent of OOB availability
      (degraded-mode safe — this ordering detail caused one self-caught regression before the
      fix was correct). Mutation-verified; added `move.js`-level integration tests with
      real-shaped (gunType, no type) artillery fixtures.
- [x] Task 6.2: Fix `activateStack.js:66` — the #681 duplicate the initial pass missed (see
      Phase 2 correction note above).
- [x] Task 6.3: Rename `resolveFormationKey` → `resolveMovementFormationKey` — collided with
      an unrelated private function already in `movement.js` and with `tables/formations.js`'s
      combat-effects lookup. Header comment now disambiguates both.
- [x] Task 6.4: Thread `ctx` through `getValidActions`, reusing `ctx.oob` when the caller
      already holds one (dispatch and the route layer both do) instead of always calling
      `loadOob()` — closes the DI inconsistency Phase 2's #676 fix left behind. Added a test
      proving zero `loadOob()` calls when `ctx.oob` is supplied.
- [x] Task 6.5: Strengthen three under-specified regression tests (each mutation-verified to
      have been vacuous before, and to correctly fail after): `move.js`'s unlimbered-artillery
      test asserted only the error code, which stayed green even with the LOB §3.6a guard
      deleted; the `#676` `loadOob`-call-count test never confirmed the per-unit loop it exists
      to protect was actually reached; `formation.test.js`'s artillery fixtures used a shape no
      real SM battery has (`type: 'artillery'` instead of `gunType`).
- [x] Task 6.6: Doc fixes — `oob.js`'s `loadOob` docstring corrected (the dev-mode hot-reload
      rationale doesn't hold for route-served requests, which already cache at module-init);
      `vp.js`'s `updateHexControl` docstring was stale (predated even #635); `safeFindOobUnit`
      now warns on a genuinely malformed OOB tree instead of silently collapsing it into the
      same null return as the two normal-and-silent cases.

### Verification

- [x] Full suite green (169 files / 3387 tests, zero unexpected warnings — including a leaked
      `console.warn` from Task 6.6 that a test needed to spy on rather than let leak)
- [x] Every strengthened/added test mutation-verified against its target fix

---

## Phase 7: Closeout

### Tasks

- [x] Task 7.1: Reconcile `spec.md`, `plan.md`, `metadata.json`, `index.md` with the actual
      delivered state (`/team-review`'s maintainability pass found the same conductor
      metadata-drift bug class this project has hit before — task counts and completion
      status had drifted from `plan.md`'s real checkbox count).
- [x] Task 7.2: Remove the `tech-debt` label from #704 (maintainability finding — it was
      labeled `tech-debt` on filing, contradicting the recorded "not debt, a feature" ruling).
- [x] Task 7.3: Update `docs/tech-debt/report.md` (removed #676/#677/#678/#679/#681, added #703
      and #706) via `/tech-debt-report` against PR #705.
- [x] Task 7.4: Run `/pr-create` — PR #705 opened against `master`.

### Final Verification

- [x] All acceptance criteria in spec.md met or explicitly descoped
- [x] All five issues closed (four resolved, one replaced), two follow-ups filed
- [x] Debt register reflects net -5 in score (5 items closed, score 10; 2 items added, #703
      score 2 + #706 score 3 = 5) — net open debt 17 → 12
- [x] Full quality suite green (169 files / 3390 tests, zero unexpected warnings)
- [x] `/team-review` complete, all findings fixed in place (Phase 6, Phase 8)

---

## Phase 8: Second-Pass Review Response

Per this project's quality rails, a review-fix diff that touches rules-engine/domain-critical
paths (Phase 6 touched formation resolution and `getValidActions`'s dispatch hot path) requires
a targeted second-pass review before closeout. Ran two agents against Phase 6's fix commit
(`8f8ca68`): a `domain-expert` rules check on the artillery-classification fix, and a
correctness/maintainability reviewer on the diff itself.

### Tasks

- [x] Task 8.1: Domain-expert confirmed the artillery-classification fix (Task 6.1) is
      rules-accurate — Unlimbered-by-default for unset `formation` matches LOB §3.6a, and the
      `gunType` discriminator has zero false positives/negatives against the real SM OOB. One
      caveat noted (not a defect): no scenario data captures a battery's starting formation —
      out of scope for this fix.
- [x] Task 8.2: Correctness reviewer mutation-verified all three Phase 6 claims independently
      and confirmed the `ctx.oob` threading and `activateStack.js:66` fix are non-breaking, but
      found one real MEDIUM bug: correctly classifying unset-formation batteries as Unlimbered
      (0 MP) left `handleLimber` with no mechanism to restore `remainingMPs`, since it only ever
      flipped `unit.formation` and never touched MPs — permanently blocking limber-then-move
      within one activation for every real battery (previously masked by the artillery
      misclassification bug accidentally supplying a nonzero, if wrong, MP pool).
- [x] Task 8.3: Consulted domain-expert on the exact LOB §3.6a mechanic — confirmed limbering
      grants the Limbered movement allowance (7) less the 3 MP formation-change cost (net 4 MP),
      not a cost on top of 0. Fixed `handleLimber` to compute
      `remainingMPs = movementAllowances.limbered - FORMATION_CHANGE_MP_COST` on success (falls
      back to leaving `remainingMPs` untouched when `scenario.movementCosts` is absent, matching
      `activateStack.js`'s existing test-stub convention). Verified end-to-end against the real
      South Mountain OOB/scenario (0 MP → LIMBER → 4 MP) and mutation-verified.
- [x] Task 8.4: Identified the symmetric UNLIMBER gap (no MP deducted when unlimbering) but
      determined it is NOT a regression from this branch — a battery starting an activation
      already Limbered was already correctly initialized with nonzero MPs regardless of the
      classification fix, so this was already reachable pre-PR #705. Filed as #706
      (`tech-debt`, score 3, milestone M9) rather than fixed here, per the distinction between
      "caused by this PR" (fix in place) and "discovered incidentally, pre-existing" (file it).
- [x] Task 8.5: Fixed three LOW test-quality findings from the correctness reviewer: a vacuous
      `e.code`-only assertion in `move.test.js` (the exact pattern Phase 6 fixed elsewhere in
      the same file), an orphaned comment left behind by a describe-block split in
      `index.test.js`, and a dropped formation-vs-conflicting-oobUnit precedence test case in
      `formation.test.js`.

### Verification

- [x] Full suite green (169 files / 3390 tests, zero unexpected warnings)
- [x] New/strengthened tests mutation-verified against their target fix
- [x] #706 filed with `tech-debt` label, score 3, milestone M9

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
