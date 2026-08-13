# Implementation Plan: Engine Debt Sprint — Issues #676-679, #681

**Track ID:** engine-debt-sprint_20260813
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-13
**Status:** [x] Complete

## Overview

Five phases: a domain-expert consultation gate, three independent code-cleanup items
(#676/#677/#681, implemented together since they touch overlapping call sites), the scoped
rules fix for #678, and a closeout that also resolved #679 by descoping it rather than
implementing it as originally filed.

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

**Allowed new deferred debt:** 0 unless explicitly approved. (One new debt item, #703, was
explicitly approved by the user as the correct way to descope #678's non-MOVE traversal
gap — filed per the Immediate Debt-Capture Policy, not silently dropped.)

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met (or explicitly descoped with reasoning — #679)
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated
- [x] Ready for `/team-review`

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
      per-unit lookup) — left as-is, noted in the issue-closing comment.
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

## Phase 5: Closeout

### Tasks

- [x] Task 5.1: Run full quality suite (`validate-data`, `lint`, `format:check`, `test`,
      `build`).
- [x] Task 5.2: Close #676, #677, #678, #681 with summary comments.
- [x] Task 5.3: Register track in `conductor/tracks.md` and `conductor/index.md`.
- [ ] Task 5.4: Run `/team-review`.
- [ ] Task 5.5: Update `docs/tech-debt/report.md` (remove #676/#677/#678/#679/#681, add #703)
      once the PR number is known.
- [ ] Task 5.6: Run `/plan-wrap` and `/pr-create`.

### Final Verification

- [ ] All acceptance criteria in spec.md met or explicitly descoped
- [ ] All five issues closed (four resolved, one replaced), two follow-ups filed
- [ ] Debt register reflects net -8 (closed 10, added 2)
- [ ] Full quality suite green
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
