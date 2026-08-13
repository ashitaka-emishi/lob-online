# Specification: Documentation, Data-Metadata, and Issue-Tracker Sync

**Track ID:** docs-issue-sync_20260811
**Type:** Chore
**Created:** 2026-08-11
**Status:** Complete

## Summary

Reconcile project documentation, `map.json` internal metadata, Conductor track records, and
GitHub issue state with the actual current state of the codebase. Surfaced while auditing
South Mountain map/OOB/leaders data completeness: several docs still described the pre-M9
"scaffold" state even though M9 had moved the ball forward (though, per Phase 3 below, not
nearly as far as those same docs went on to claim once "fixed" the first time), one track
registry row disagreed with the track's own `metadata.json`, and 13 open GitHub issues were
already fixed by commits merged to `master` but never closed.

## Context

South Mountain terrain-_typing_ completed in M9 (`m9-map-completion_20260625`, PR #684,
closing issue #669): all 841 then-recorded hexes have concrete terrain (0 `unknown`). This is
**not** the same as map completion — see Phase 3 / #689: real hex coverage is only ~37% of
the 2240-cell grid, and 6 of 10 VP hexes are unreachable by the movement engine. Hexside
features (roads/streams/stone walls/fords) are separately, correctly tracked in open issue
#685. OOB (`oob.json`) and leaders (`leaders.json`) data are complete and their docs already
say so correctly; no changes needed there.

Separately, a broader open-issue sweep (all 21 open issues, cross-referenced against
`git log --all --grep` and `gh pr view --json mergedAt`) found 14 candidate issues whose
fixing commits exist in git history but were never closed. Re-verification against
`origin/master` (not just the locally checked-out branch) found that 13 of the 14 are
genuinely merged and closable. The 14th, **#668** (Discord OAuth identity layer), is not:
its fixing commits (`36445b3`, `2082908`, `d013176`) exist only on the local
`feat/m9-discord-oauth` branch, which has never been opened as a PR or merged. #668 must
stay open until that branch is merged — this track does not merge it. #410 is unaffected:
its four items are resolved by commits already on `origin/master` independent of the
OAuth branch (session-fixation guard, faction-binding-on-rejoin, `MAP_EDITOR_ENABLED` DELETE
gate, `sameSite: 'lax'` cookie).

**Update after `/team-review` (Phase 3):** the first pass at this track repeated the same
class of error it set out to fix — see Phase 3 in `plan.md` for the full account, including
the discovery of a forgotten git stash (`stash@{0}`) holding a much more complete map dataset,
now tracked in #689.

## Acceptance Criteria

- [x] `data/modules/south-mountain/map.json`: `_description`/`_digitizationNote` accurately
      state that the 841 recorded hexes are all typed (0 unknown) but real grid coverage is
      only ~37% of the 2240-cell map, 6/10 VP hexes are unreachable, hexside features are
      pending (#685), and a recoverable fuller dataset exists in a git stash (#689); `_todoHexes`
      restored with corrected content (the two genuinely-missing referenceHex anchors, not the
      stale original block); `_status` stays `"partial"`
- [x] `docs/library.md` SM_MAP_DATA row (line 51) updated to state the real coverage gap and
      point to #689, not "digitization complete"
- [x] `docs/library.json` SM_MAP_DATA entry (`description`/`status`) updated to match
- [x] `docs/agents/domain-expert/design.md` SM_MAP_DATA row (line 45) updated to state the real
      coverage gap; also fixes a pre-existing `hexsideTypes` → `terrainTypes` typo
- [x] `docs/designs/high-level-design.md` — three locations (line ~96 status blockquote, line
      ~619 M9 deliverables list, line ~2184 risk register) reverted from "Resolved"/"complete"
      framing to state the real coverage gap and point to #689; line ~2211 SVG-performance risk
      row's stale "~600 hexes" corrected to 841
- [x] `conductor/tracks.md` line 160: `m9-map-completion_20260625` checkbox reverted to `[ ]`
      — its own `metadata.json` (`phases: 1/2`, `tasks: 3/7`) and `plan.md` (7 unchecked boxes)
      never actually supported `[x] Complete`; that file's own `status` field is now corrected
      to `"partial"` too, and its `plan.md`'s stale `#669` hexside-feature pointer fixed to
      `#685`/`#689`
- [x] `conductor/tracks/m9-discord-oauth_20260625/metadata.json` kept in sync with the
      `plan.md` that actually exists in this tree (on `origin/master` / this branch): that
      `plan.md` reads `[ ] Not Started`, 0/34 boxes checked — because the OAuth implementation
      isn't in this tree, only on the unmerged `feat/m9-discord-oauth` branch. `metadata.json`
      stays `"pending"`, `0/3` phases, `0/10` tasks, with a note pointing at the real completion
      state on the other branch. (An earlier draft of this fix wrongly set `status: "complete"`
      by reading `plan.md` while that other branch was checked out — caught and corrected via
      `/code-review` before merge.)
- [x] 13 stale GitHub issues closed, each with a comment citing the PR/commit that resolved it
      on `origin/master`: #344, #410, #506, #550, #554, #556, #627, #628, #629, #650, #651,
      #652, #680
- [x] Remaining open issues (#653, #668, #676, #677, #678, #679, #681, #685) reconfirmed as
      genuinely unresolved (or, for #668, unmerged) and left open — no action. #668 explicitly
      flagged for the user: its implementation is complete on `feat/m9-discord-oauth` but that
      branch has no PR and is not merged
- [x] `npm run validate-data`, `npm run lint`, `npm run format:check` all pass after edits

## Dependencies

Mostly documentation/metadata/JSON-comment-field and GitHub issue-state corrections. Two small
exceptions surfaced by `/team-review` (Phase 3): one non-functional security comment in
`server/src/routes/games.js` (no logic change), and one additive `warn`-level check in
`scripts/validate-data.js` (`checkSetupHexesInMap`, referenceHex coverage) — neither changes
runtime behavior.

## Out of Scope

- Implementing the deferred hexside-feature work itself (#685) — doc sync only
- Implementing DO Droplet deployment (#653)
- Implementing or triaging the open engine tech-debt items (#676, #677, #678, #679, #681) —
  verification that they're still unresolved only, not implementation
- A full audit/rewrite of `conductor/index.md`'s Active/All Tracks tables, which have their
  own pre-existing drift (duplicate rows, stale "Pending" statuses) unrelated to this session's
  findings — flagged for a future track, not fixed here
- Any change to `oob.json`, `leaders.json`, or their docs (already accurate)
- Implementing the DELETE-route ownership check described in #688 — comment + issue only
- Recovering/integrating the stashed 2261-hex map dataset and boundary-face schema fix (#689)
  — this PR documents the gap and the recovery path accurately; the recovery itself is a
  separate, dedicated Checkpointed/High-risk track (rules-engine + schema + shared components)

## Technical Notes

- `map.json` is schema-validated (`server/src/schemas/map.schema.js`) — run
  `npm run validate-data` after edits. `docs/library.json` is an unvalidated documentation
  manifest kept in sync with `docs/library.md` by hand; no script or server module reads it.
- Issue closing follows the existing repo convention (see prior track
  `issue-closeout_20260504`): `gh issue close <n> --comment "<citation>"`.
- Verification method used for each "already resolved" issue: `git log --all --grep="#<n>"`
  to find the fixing commit, `git merge-base --is-ancestor <sha> origin/master` to confirm it
  shipped, then a targeted code read to confirm the described fix is actually present (not
  just referenced in a commit message).

---

_Generated by Conductor. Review and edit as needed._
