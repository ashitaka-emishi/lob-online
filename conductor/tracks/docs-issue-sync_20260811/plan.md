# Implementation Plan: Documentation, Data-Metadata, and Issue-Tracker Sync

**Track ID:** docs-issue-sync_20260811
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-11
**Status:** [ ] Not Started

## Overview

Two phases: (1) fix stale documentation/metadata fields discovered during a map-data
completeness review, (2) close GitHub issues already resolved by commits on `master`. No
application code changes — this is a doc/metadata/issue-tracker correction pass.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals — findings were pre-verified
(commit ancestry checked against `origin/master`, fixes confirmed by reading the actual code,
not just commit messages) before this track was created.

## Risk Classification

**Risk:** Low
**Reason:** Doc/comment/JSON-metadata edits and GitHub issue closures only; no engine, schema,
route, or UI logic changes. Issue closures are repo-visible but follow the established
`issue-closeout_20260504` convention.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] 13 stale issues closed with citation comments; 8 legitimately-open issues reconfirmed
      (including #668, left open pending merge of `feat/m9-discord-oauth`)
- [ ] `conductor/tracks.md` and `m9-discord-oauth_20260625/metadata.json` internally consistent
      with their own plan.md files
- [ ] Ready for `/team-review`

---

## Phase 1: Documentation + Metadata Sync

### Tasks

- [x] Task 1.1: `data/modules/south-mountain/map.json` — rewrite `_description` and
      `_digitizationNote` to state terrain digitization is complete (841/841 hexes, 0
      `unknown`) and hexside features (roads/streams/walls/fords) are pending, tracked in #685;
      remove the stale `_todoHexes` block (zones already resolved in `scenario.json` setup) and
      the now-obsolete `_digitizationPlan` block
- [x] Task 1.2: `docs/library.md` line 51 — update SM_MAP_DATA status marker and description
- [x] Task 1.3: `docs/library.json` SM_MAP_DATA entry — update `description`/`status` to match
      library.md
- [x] Task 1.4: `docs/agents/domain-expert/design.md` line 45 — update SM_MAP_DATA row
- [x] Task 1.5: `docs/designs/high-level-design.md` risk-register row (line 2184) — update
      map-digitization row to reflect terrain-complete status
- [x] Task 1.6: `conductor/tracks.md` line 160 — flip `m9-map-completion_20260625` checkbox
      `[ ]` → `[x]`
- [x] Task 1.7: `conductor/tracks/m9-discord-oauth_20260625/metadata.json` — update `status`,
      `phases.completed`, `tasks.completed`, `updated` to match its own completed `plan.md`;
      note added explaining the branch is unmerged so #668 stays open

### Verification

- [x] `npm run validate-data` — 0 errors (1 pre-existing unrelated warning), map.json and
      library.json still schema-valid
- [x] `npm run lint` / `npm run format:check` pass
- [x] Manual read-through: no remaining "scaffold" / "in progress" / "31 known hexes" language
      describing South Mountain terrain digitization anywhere in `docs/`

---

## Phase 2: GitHub Issue Reconciliation

### Tasks

- [ ] Task 2.1: Close #344 — M8 ticket-breakdown scope fully shipped as tracked M8 issues
- [ ] Task 2.2: Close #410 — cite the specific fixes for each of its 4 items, all confirmed
      present on `origin/master`: session-fixation guard (`#SEC-M1`), faction-binding +
      stale-token rejection on rejoin (`#563`), DELETE gated by `MAP_EDITOR_ENABLED` (`#648`),
      `sameSite: 'lax'` session cookie
- [ ] Task 2.3: Close #506 — cite PR #507
- [ ] Task 2.4: Close #550, #554, #556 — cite PR #559 and PR #565
- [ ] Task 2.5: Close #627, #628, #629, #650, #651, #652 — cite PR #671
- [ ] Task 2.6: Close #680 — cite PR #683
- [ ] Task 2.7: Re-verify #653, #676, #677, #678, #679, #681, #685 have no merged fix commit
      (re-run the `git log --all --grep` check against `origin/master` ancestry, not just
      local branches) before leaving them open — do not close
- [ ] Task 2.8: Leave #668 open — its fixing commits exist only on the unmerged
      `feat/m9-discord-oauth` branch (verified via `git merge-base --is-ancestor` against
      `origin/master`: not an ancestor). Add a comment noting implementation is complete and
      closure is pending that branch's PR + merge — do not close.

### Verification

- [ ] `gh issue list --state open` drops from 21 to 8 (#653, #668, #676, #677, #678, #679,
      #681, #685)
- [ ] Each closed issue has exactly one closing comment citing its resolving PR/commit

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run validate-data`, `npm run lint`, `npm run format:check`, `npm run test` all pass
- [ ] `gh issue list --state open` matches the expected 8-issue remainder
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
