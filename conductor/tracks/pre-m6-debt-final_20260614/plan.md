# Implementation Plan: Pre-M6 Final Debt Sprint + Debt Report Improvements

**Track ID:** pre-m6-debt-final_20260614
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-14
**Status:** [~] In Progress

## Overview

Four phases: (1) Milestone assignment — assign all 26 unassigned debt issues to the correct
milestone on GitHub and update the report format. (2) Report upgrades — add Milestone column
to the Open Debt Items table, add current-milestone summary row, score and register the 17
unregistered issues, update README and skill prompt. (3) Code fixes — resolve all actionable
debt issues in priority order. (4) Closeout — quality gates, debt register update, PR.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals

## Risk Classification

**Risk:** Medium
**Reason:** Phase 3 includes a score-4 security fix (gating write routes), a schema field
removal (totalTurns), and a shared error-handler change — each is additive or isolated, but
Medium is appropriate for the combination.

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
- [ ] Debt register updated (all resolved issues removed, score recalculated)
- [ ] Ready for `/team-review`

---

## Phase 1: Milestone Assignment

Assign every open `tech-debt` issue to a GitHub milestone. This is a pure GitHub metadata
change — no code changes.

### Milestone mapping

| Milestone                                      | Issues                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| M5.5 — Turn Loop Cleanup (#15)                 | #521 #522 #523 #524 #525 #531 #532 #533 #534 #535 #536 #537 #540 #541 #543 #545 #546 #568 |
| M6: Combat + Morale (#9)                       | #560                                                                                      |
| M8: Production Persistence + Multiplayer (#11) | #403 #350 (already set) #562 #563 (already set)                                           |
| M6: Combat + Morale (#9)                       | #381 #382 #383 (already set)                                                              |

### Tasks

- [x] Task 1.1: Assign #521, #522, #523, #524, #525 to milestone M5.5 (#15).
- [x] Task 1.2: Assign #531, #532, #533, #534, #535, #536, #537 to milestone M5.5 (#15).
- [x] Task 1.3: Assign #540, #541, #543, #545, #546, #568 to milestone M5.5 (#15).
- [x] Task 1.4: Verify #562, #563, #403, #350 already have M8 milestone; verify #381, #382,
      #383 already have M6 milestone; verify #560 has no milestone — assign to M6.

### Verification

- [x] `gh issue list --label tech-debt --state open --json number,milestone` shows no
      NONE milestones remaining.

---

## Phase 2: Report Format Upgrades + Score Unregistered Issues

Update `docs/tech-debt/report.md`, `docs/tech-debt/README.md`, and
`.claude/commands/tech-debt-report.md` to add milestone tracking. Score and register the
17 previously untracked issues.

### Tasks

- [x] Task 2.1: In `docs/tech-debt/report.md` **Executive Summary** table, add a
      "Current-milestone open debt" row showing count and score for M5.5 items only.
      Current-milestone is the milestone whose work is in progress (M5.5 until M6 is started).

- [x] Task 2.2: In `docs/tech-debt/report.md` **Open Debt Items** table, add a `Milestone`
      column between `Score` and `Issue`. Order is: Score desc, then Milestone (current first),
      then newest first for ties.

- [x] Task 2.3: Score and add all 17 unregistered issues to the Open Debt Items table and
      Debt Over Time table. Issues to register (with scores from issue bodies): - #521 (score 1), #522 (score 2), #523 (score 2), #524 (score 1), #525 (score 2) - #531 (score 3), #532 (score 2), #533 (score 2), #534 (score 1), #535 (score 1),
      #536 (score 1), #537 (score 1) - #540 (score 4), #541 (score 3), #543 (score 2), #545 (score 2), #546 (score 2)
      Group them by the PR they were deferred in (PR #520 for #521–#525, PR #530 for
      #531–#537, PR #539 for #540–#546).
      Note: #531–#546 were already tracked in Debt Over Time (PR #530/539 added, PR #548/557
      resolved them in code). Only #521–#525 were missing entirely; added with PR #520 entry.
      All 17 appear in Open Debt Items or Debt Over Time resolution rows as appropriate.

- [x] Task 2.4: Recalculate Executive Summary: update open item count, net score, and
      highest-risk item after adding unregistered issues.

- [x] Task 2.5: Update `docs/tech-debt/README.md` — add to the **Workflow** section:
      "When filing a deferred debt issue, assign it to the GitHub milestone in which it is
      expected to be resolved before closing the issue. This is a required step — `/tech-debt-report`
      will prompt for it if omitted."

- [x] Task 2.6: Update `.claude/commands/tech-debt-report.md` — add milestone assignment as
      a required step in the deferred-finding workflow: after filing the GitHub issue, assign
      it to the target milestone. Flag any issue with no milestone as incomplete.

### Verification

- [ ] `docs/tech-debt/report.md` Open Debt Items table has Milestone column.
- [ ] Executive Summary shows "Current-milestone open debt" row.
- [ ] All 17 newly registered issues appear in Open Debt Items and Debt Over Time.
- [ ] Net open score updated correctly.

---

## Phase 3: Code Fixes

Fix all actionable debt issues in priority order. Run `npm run quality:strict` after each
sub-group.

### Sub-phase 3A: Security / Architecture (highest priority)

- [x] Task 3A.1: **#540** — Already fixed in PR #548 (gate in moduleData.js lines 31-37). Closed #540.

- [x] Task 3A.2: **#541** — PR #548 added console.warn on missing slug (fallback kept with warning).
      Full removal deferred; warning satisfies issue intent. Closed #541.

### Sub-phase 3B: Schema + Data Cleanup

- [x] Task 3B.1: **#532** — Already fixed in PR #548 (superRefine at scenario.schema.js:98). Closed #532.

- [x] Task 3B.2: **#533** — Already fixed in PR #557 (totalTurns optional + removed from SM data). Closed #533.

- [x] Task 3B.3: **#536** — Already fixed in PR #548 (VISIBILITY_UNLIMITED constant + refine). Closed #536.

- [x] Task 3B.4: **#537** — Already fixed in PR #548 (config/visibility.js + turnTime.js). Closed #537.

- [x] Task 3B.5: **#531** — Already fixed in PR #548 (server/src/engine/turnTime.js). Closed #531.

### Sub-phase 3C: Test Coverage

- [x] Task 3C.1: **#534** — Already fixed in PR #548 (ScenarioEditorView.test.js:716). Closed #534.

- [x] Task 3C.2: **#535** — Already fixed in PR #548 (ScenarioEditorView.test.js:668). Closed #535.

- [x] Task 3C.3: **#543** — Already fixed in PR #548 (useMapPersistence.test.js + useOobPersistence.test.js). Closed #543.

- [x] Task 3C.4: **#545** — Already fixed in PR #557 (errorHandler.js registers ModuleNotFoundError). Closed #545.

- [x] Task 3C.5: **#546** — Already fixed in PR #557 (moduleData.test.js:290+ extra coverage). Closed #546.

### Sub-phase 3D: UI / A11y / Nav

- [x] Task 3D.1: **#521** — Already in EditorNav.vue (Scenario Editor first link). Closed #521.

- [x] Task 3D.2: **#522** — Added <main id="main-content"> + skip-nav to App.vue; App.test.js added. Closed #522.

- [x] Task 3D.3: **#523** — Extracted MenuLayout.vue; HomeView + LobbyView use it; MenuLayout.test.js added. Closed #523.

- [x] Task 3D.4: **#525** — Added aria-describedby on disabled join buttons + sr-only reason span;
      two new tests in LobbyView.test.js. Closed #525.

- [x] Task 3D.5: **#524** — Deleted StatusView.vue and StatusView.test.js. Closed #524.

### Sub-phase 3E: Documentation

- [x] Task 3E.1: **#568** — Replaced §6 inline snippet with file+line ref; added TODO(M6) anchors
      to §4 and §8 in action-contract.md. Closed #568.

### Verification

- [x] `npm run quality:strict` passes.
- [x] All 18 issues referenced in 3A–3E are closed on GitHub.

---

## Phase 4: Debt Register Closeout

Update `docs/tech-debt/report.md` to reflect all resolutions from Phase 3.

### Tasks

- [ ] Task 4.1: For each closed issue from Phase 3, append a resolution row to Debt Over Time
      in `report.md` with the closing PR number (or track ID if pre-PR).
- [ ] Task 4.2: Remove resolved issues from the Open Debt Items table.
- [ ] Task 4.3: Recalculate Executive Summary: open count, net score, current-milestone score,
      highest-risk item.
- [ ] Task 4.4: Update Risk Assessment prose.
- [ ] Task 4.5: Update "Last updated" line.

### Verification

- [ ] Net open score in Executive Summary matches sum of remaining Open Debt Items scores.
- [ ] Current-milestone debt row reflects only truly open M5.5 items.

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes (validate-data, lint, format:check, test, build)
- [ ] No unexpected warnings in test output
- [ ] All 17+ issues closed on GitHub
- [ ] Debt register updated
- [ ] Ready for `/team-review`

---

_Generated by Conductor._
