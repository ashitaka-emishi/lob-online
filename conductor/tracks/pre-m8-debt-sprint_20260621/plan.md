# Implementation Plan: Pre-M8 Debt Sprint — Artillery Depletion + Leader Loss

**Track ID:** pre-m8-debt-sprint_20260621
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-21
**Status:** [ ] Not Started

## Overview

Two-phase debt sprint. Phase 1 gets the domain-expert rulings for both issues and
assesses what code changes are needed. Phase 2 implements the fixes, updates tests,
and closes the GitHub issues.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

- After Phase 1: user reviews domain-expert rulings and approves the code change plan
  before any engine code is modified

## Risk Classification

**Risk:** High
**Reason:** Touches shared rules-engine logic — artillery depletion affects every FIRE_ARTILLERY
action; leader-loss check affects every close combat resolution.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated (#633 and #617 removed from Open Debt Items)
- [ ] GitHub issues #633 and #617 closed
- [ ] Ready for `/team-review`

---

## Phase 1: Domain-Expert Rulings

Consult the domain-expert agent for the exact rule interpretation on both issues.
No code is changed in this phase.

### Tasks

- [x] Task 1.1: Consult domain-expert on LOB §8.2a/§8.2c — artillery depletion.
      Question: "The Combat Table (lob-tables.pdf p.2) defines depletion by per-cell
      color bands (blue = canister depletion, orange = deplete ammo type in use). Is this
      correct? What is the exact mapping of (roll, column) cell colors for each column?
      Does 'left band' mean shell depletes and 'right band' mean canister depletes, or is
      depletion always keyed to the ammo type currently in use?"
- [x] Task 1.2: Consult domain-expert on LOB §9.1a — leader loss scope.
      Question: "Does LOB §9.1a trigger a Leader Loss check on _any_ SP loss during
      close-combat resolution (including OV SP loss, cascade morale SP loss), or only on
      the §7.0c automatic 1-SP defender loss? The current code fires on §7.0c loss and OV
      attacker SP loss — is that sufficient, or must cascade losses in resolveMorale also
      trigger the check?"
- [x] Task 1.3: Document both rulings in a comment block at the top of the relevant source
      files (not yet changing logic) so the Phase 2 implementer has the ruling in context

### Verification

- [ ] Both rulings documented; no code logic changed
- [ ] **HUMAN CONTROL POINT** — present rulings + proposed code changes to user before Phase 2

---

## Phase 2: Fix #633 — Artillery Depletion Bands

Rewrite the depletion block in `artillery.js` to match the domain-expert ruling.
Update `combat.js` column-set exports if needed. Add/update tests.

### Tasks

- [x] Task 2.1: Write failing tests for the corrected depletion behavior: - Shell fire, left-band cell → correct depletion state - Canister fire, right-band cell → correct depletion state - Shell fire, right-band cell → no shell depletion (confirm ruling) - Canister fire, left-band cell → depletion behavior per ruling - No-band cell → no depletion
- [x] Task 2.2: Update `combat.js` `LEFT_DEPLETION_COLUMNS` / `RIGHT_DEPLETION_COLUMNS`
      if the column-set boundary is wrong per ruling; add rule comment citing LOB §8.2a/§8.2c
- [x] Task 2.3: Rewrite the depletion block in `artillery.js` (~line 309–323) to use the
      corrected logic; update the rule citation comment
- [x] Task 2.4: Run tests — confirm new tests pass, existing tests still green
- [x] Task 2.5: Close GitHub issue #633 with a comment summarizing the fix

### Verification

- [ ] All depletion test cases pass
- [ ] `npm run test` green

---

## Phase 3: Fix/Close #617 — Leader Loss Scope

Apply the domain-expert ruling on §9.1a. Either confirm the existing fix is sufficient
and close the issue, or extend the check into `resolveMorale.js`.

### Tasks

- [x] Task 3.1: If ruling confirms `closeCombat.js` line 207 is sufficient (OV + §7.0c): - Add a rule comment citing the ruling explicitly - Close GitHub issue #617 with a comment citing the ruling
- [x] Task 3.2: If ruling requires cascade-loss coverage: N/A — ruling confirmed existing code is correct; no code change needed
- [x] Task 3.3: Run `npm run quality:strict` — all gates pass

### Verification

- [ ] #617 closed on GitHub
- [ ] `npm run quality:strict` green

---

## Phase 4: Debt Register + PR

Update the tech-debt report and open a PR.

### Tasks

- [x] Task 4.1: Remove #633 and #617 from `docs/tech-debt/report.md` Open Debt Items;
      add resolution rows to Debt Over Time table; update Executive Summary (10→3 open items,
      score 31→10, reconciling stale closures on master)
- [x] Task 4.2: Run `/pr-create`

### Verification

- [ ] Debt register reflects 3 open items (score 10): #562, #563, #634
- [ ] PR open and CI green

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes
- [ ] #633 and #617 closed on GitHub
- [ ] Debt register updated
- [ ] Ready for `/team-review`
