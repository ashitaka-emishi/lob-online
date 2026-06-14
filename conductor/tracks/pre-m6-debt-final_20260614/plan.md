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

- [ ] Task 3A.1: **#540** — Gate moduleData PUT routes behind `MAP_EDITOR_ENABLED`.
      In `server/src/server.js`, wrap the `moduleDataRouter` mount so that PUT/write routes
      return 403 when `MAP_EDITOR_ENABLED` is absent. Add an integration test asserting the
      403 response. Close #540.

- [ ] Task 3A.2: **#541** — Remove legacy fallback in `useOobPersistence.js`. Audit all
      callers to confirm they pass `moduleSlug`; remove the fallback branch. Add/update tests
      confirming all callers supply the slug. Close #541.

### Sub-phase 3B: Schema + Data Cleanup

- [ ] Task 3B.1: **#532** — Add `.superRefine()` to `LightingSchedule` in
      `server/src/schemas/scenario.schema.js` to reject duplicate `startTurn` values.
      Add a schema test. Close #532.

- [ ] Task 3B.2: **#533** — Remove `totalTurns` from `scenario.json` data files and from the
      Zod schema (make it fully derived). Run `npm run validate-data`. Close #533.

- [ ] Task 3B.3: **#536** — Add `.max(999)` to `visibilityHexes` in scenario schema. Update
      test. Close #536.

- [ ] Task 3B.4: **#537** — Extract `VISIBILITY_UNLIMITED = 999` constant to a shared
      location (e.g., `server/src/engine/constants.js`) and replace all magic-number
      occurrences. Close #537.

- [ ] Task 3B.5: **#531** — Extract `MINUTES_PER_CONDITION` from `ScenarioEditorView.vue`
      to the shared constants module. Import it in the client. Close #531.

### Sub-phase 3C: Test Coverage

- [ ] Task 3C.1: **#534** — Add night-turn clock test to `ScenarioEditorView.test.js`.
      Close #534.

- [ ] Task 3C.2: **#535** — Add `totalTurns` edge-case tests (empty schedule, lastTurn before
      firstTurn, missing values). Close #535.

- [ ] Task 3C.3: **#543** — Add `useMapPersistence.test.js` and `useOobPersistence.test.js`
      co-located with composables. Cover URL construction, load/save round-trip, error state.
      Close #543.

- [ ] Task 3C.4: **#545** — Register `ModuleNotFoundError` (or `err.status === 404`) in the
      Express error handler in `server.js`. Add test confirming 404 JSON response for unknown
      slug. Close #545.

- [ ] Task 3C.5: **#546** — Expand `moduleData.test.js` to cover unknown-slug 404, nested
      scenario sub-routes, and invalid `scenarioSlug`. Close #546.

### Sub-phase 3D: UI / A11y / Nav

- [ ] Task 3D.1: **#521** — Add scenario-editor link to `EditorNav.vue` nav strip.
      Update `EditorNav.test.js`. Close #521.

- [ ] Task 3D.2: **#522** — Add `<main id="main-content">` landmark and visually-hidden
      skip-navigation link to `App.vue` or the relevant app-shell component.
      Add a11y test asserting `<main>` presence. Close #522.

- [ ] Task 3D.3: **#523** — Extract shared `MenuLayout.vue` (or CSS custom properties for
      palette tokens) from `HomeView.vue` and `LobbyView.vue`. Add component test.
      Close #523.

- [ ] Task 3D.4: **#525** — Add `aria-disabled` and associating `aria-describedby` pointing
      to the status badge to disabled join buttons in `LobbyView.vue`. Add a11y test.
      Close #525.

- [ ] Task 3D.5: **#524** — Delete `StatusView.vue` and `StatusView.test.js`. Confirm no
      router references remain. Close #524.

### Sub-phase 3E: Documentation

- [ ] Task 3E.1: **#568** — In `docs/designs/action-contract.md`, replace the §6 inline
      socket snippet with a file+line reference. Add `<!-- TODO(M6): update when ... -->`
      anchors to §4 ROLL_INITIATIVE and §8 stale-prone paragraphs. Close #568.

### Verification

- [ ] `npm run quality:strict` passes.
- [ ] All 17 issues referenced in 3A–3E are closed on GitHub.

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
