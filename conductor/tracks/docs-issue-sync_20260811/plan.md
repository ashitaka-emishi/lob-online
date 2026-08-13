# Implementation Plan: Documentation, Data-Metadata, and Issue-Tracker Sync

**Track ID:** docs-issue-sync_20260811
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-11
**Status:** [x] Complete

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

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test` — 3249 passed, 12 skipped (pre-existing), 0 failures
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 for the originally-scoped doc-sync work. `/team-review`
(Phase 3) surfaced two previously-unknown, genuine gaps outside this PR's own scope to fix:
a DELETE-route security residual (#688, score 2) and the South Mountain map coverage gap
(#689, score not yet assigned — pending the dedicated recovery track, likely High given
rules-engine/schema impact). Both filed with debt scores and written assessments per the
Immediate Debt-Capture Policy before this PR merges; neither is a debt item _created_ by this
PR's own changes, both pre-existed and were discovered by reviewing this PR's claims against
reality.

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] 13 stale issues closed with citation comments; 8 legitimately-open issues reconfirmed
      (including #668, left open pending merge of `feat/m9-discord-oauth`)
- [x] `conductor/tracks.md` and `m9-discord-oauth_20260625/metadata.json` internally consistent
      with their own plan.md files
- [x] Ready for `/team-review`

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
- [x] Task 1.7: `conductor/tracks/m9-discord-oauth_20260625/metadata.json` — initial edit
      wrongly set `status: "complete"` by going off `plan.md` as it reads on the unmerged
      `feat/m9-discord-oauth` branch. Caught by `/code-review` on the PR: this branch's own
      `plan.md` (same directory, part of `origin/master`) still reads `[ ] Not Started` with
      0/34 boxes checked, since the OAuth implementation isn't in this tree. Corrected to
      `status: "pending"`, `0/3` phases, `0/10` tasks — matching this tree's actual `plan.md` —
      with a note explaining the real completion lives on the unmerged branch and this file
      should flip to `complete` only once that branch is PR'd and merged

### Verification

- [x] `npm run validate-data` — 0 errors (1 pre-existing unrelated warning), map.json and
      library.json still schema-valid
- [x] `npm run lint` / `npm run format:check` pass
- [x] Manual read-through: no remaining "scaffold" / "in progress" / "31 known hexes" language
      describing South Mountain terrain digitization anywhere in `docs/`

---

## Phase 2: GitHub Issue Reconciliation

### Tasks

- [x] Task 2.1: Close #344 — M8 ticket-breakdown scope fully shipped as tracked M8 issues
- [x] Task 2.2: Close #410 — cite the specific fixes for each of its 4 items, all confirmed
      present on `origin/master`: session-fixation guard (`#SEC-M1`), faction-binding +
      stale-token rejection on rejoin (`#563`), DELETE gated by `MAP_EDITOR_ENABLED` (`#648`),
      `sameSite: 'lax'` session cookie
- [x] Task 2.3: Close #506 — cite PR #507
- [x] Task 2.4: Close #550, #554, #556 — cite PR #559 and PR #565
- [x] Task 2.5: Close #627, #628, #629, #650, #651, #652 — cite PR #671
- [x] Task 2.6: Close #680 — cite PR #683
- [x] Task 2.7: Re-verify #653, #676, #677, #678, #679, #681, #685 have no merged fix commit
      (re-run the `git log --all --grep` check against `origin/master` ancestry, not just
      local branches) before leaving them open — do not close. Confirmed: no fix commits found
      for any of the 7.
- [x] Task 2.8: Leave #668 open — its fixing commits exist only on the unmerged
      `feat/m9-discord-oauth` branch (verified via `git merge-base --is-ancestor` against
      `origin/master`: not an ancestor). Comment posted noting implementation is complete and
      closure is pending that branch's PR + merge.

### Verification

- [x] `gh issue list --state open` dropped from 21 to 8 (#653, #668, #676, #677, #678, #679,
      #681, #685) — confirmed via `gh issue list --state open`
- [x] Each closed issue has exactly one closing comment citing its resolving PR/commit

---

## Phase 3: `/team-review` Findings (Security, Performance, Architecture)

Three parallel `agent-teams:team-reviewer` agents reviewed PR #687 before merge. All
findings were independently re-verified (not taken on the reviewer's word) before acting.

### Tasks

- [x] Task 3.1 (Security): `DELETE /api/v1/games/:id` has no ownership check, relying solely
      on `MAP_EDITOR_ENABLED` never being true in production. Added a residual-risk code
      comment at `server/src/routes/games.js:189` and filed #688 (tech-debt) with the proper
      fix.
- [x] Task 3.2 (Security): `spec.md` wrongly claimed `docs/library.json` is schema-validated
      like `map.json`. Corrected — it's an unvalidated manifest.
- [x] Task 3.3 (Security/Architecture): `_todoHexes` was removed from `map.json` on a false
      premise ("zones already resolved in scenario.json") — the two referenceHex anchors
      (`38.31`, `36.27`) are genuinely absent from `map.hexes`, and `engine/init.js` places
      zone-constrained units directly at `referenceHex`. Restored `_todoHexes` (corrected
      content, not the original stale block) and added a `referenceHex` presence check to
      `scripts/validate-data.js` (as a `warn`, not `fail`, since the gap is real and known) —
      also fixed that function to check `scenario.setup.union`, not just `.confederate`.
- [x] Task 3.4 (Performance): HLD's "SVG performance on large maps" risk row still said
      "~600 hexes" 27 lines from a row this PR already corrected to 841. Fixed.
- [x] Task 3.5 (Architecture, HIGH): "841/841 hexes, 0 unknown" was a self-referential count
      — true of `map.json`'s `hexes` array, false as a claim about the South Mountain map.
      `gridSpec` declares a 2240-cell (64x35) grid; only 841 cells have any record, almost all
      in columns 1-30. Independently verified via `hexNeighbors()`
      (`server/src/engine/hex.js`) with a real BFS: 6 of 10 scenario VP hexes are unreachable
      by the movement pathfinder, which treats unrecorded hexes as impassable
      (`movement.js:144`). 75 hexes are missing `elevation`. Investigated further per user
      request ("I thought I had a more complete map checked in at one point") and found the
      explanation: `stash@{0}` on this machine, created 2026-05-23 and never applied, contains
      a 2261-hex version of `map.json` (0 unknown, real terrain variety, columns 1-63) plus a
      bundled boundary-hex schema fix (`hex.js`/`map.schema.js`) that likely caused the stash
      to be set aside and forgotten. Filed #689 documenting the gap and the recoverable data;
      corrected all five propagated "digitization complete"/"Resolved" claims (`map.json`,
      `library.md`, `library.json`, `domain-expert/design.md`, HLD — 3 locations) to state the
      real coverage gap and point to #689 instead.
- [x] Task 3.6 (Architecture, MEDIUM): `m9-map-completion_20260625`'s `tracks.md` row was
      flipped to `[x]` in Phase 1 based on its `metadata.json` `status: "complete"` field
      alone, without noticing that file's own `phases: 1/2`, `tasks: 3/7` sibling fields (and
      its `plan.md`, 7 unchecked boxes) said otherwise — the same failure mode as the
      `m9-discord-oauth` bug, not yet caught the first time through. Reverted `tracks.md` to
      `[ ]`, corrected `metadata.json` `status` to `"partial"`, and fixed `plan.md`'s stale
      "Tracked in #669" (#669 is closed) to point at #685 and #689.
- [x] Task 3.7 (Architecture, LOW): `domain-expert/design.md`'s SM_MAP_DATA row (rewritten in
      Phase 1) named a nonexistent `hexsideTypes` registry key — pre-existing error, propagated
      instead of fixed. Corrected to `terrainTypes`.
- [x] Task 3.8 (Architecture, LOW): the new `docs-issue-sync_20260811` row in `tracks.md` was
      added after a blank line, breaking the markdown table (pre-existing defect elsewhere in
      the file, not fixed repo-wide — just not repeated here). Fixed for this row.
- [x] Task 3.9 (Architecture, LOW): `spec.md`'s Summary said "14 open GitHub issues" (stale,
      pre-correction draft — actually 13) and mischaracterized the `m9-discord-oauth` drift as
      "two track records disagree with their own plan.md" when only one file (`tracks.md` vs.
      `metadata.json`) actually disagreed by that point. Corrected both.
- [x] Task 3.10: conductor/index.md's pre-existing drift (stale statuses, missing M9 tracks)
      confirmed out of scope per spec.md — no action, disclosed not hidden.

### Verification

- [x] `npm run validate-data` — 0 errors, 3 warnings (1 pre-existing unrelated + 2 new
      `referenceHex` warnings, both expected and explained)
- [x] `npm run lint` / `npm run format:check` / `npm run test` all pass
- [x] #688 and #689 filed with debt scores and written assessments per Immediate
      Debt-Capture Policy

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] `npm run validate-data`, `npm run lint`, `npm run format:check`, `npm run test` all pass
- [x] `gh issue list --state open` matches the expected 8-issue remainder
- [x] Ready for `/team-review`

_Completed 2026-08-11._

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
