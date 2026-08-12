# Specification: Documentation, Data-Metadata, and Issue-Tracker Sync

**Track ID:** docs-issue-sync_20260811
**Type:** Chore
**Created:** 2026-08-11
**Status:** Draft

## Summary

Reconcile project documentation, `map.json` internal metadata, Conductor track records, and
GitHub issue state with the actual current state of the codebase. Surfaced while auditing
South Mountain map/OOB/leaders data completeness: several docs still describe pre-M9 states
that were already resolved, two track records disagree with their own plan.md, and 14 open
GitHub issues are already fixed by commits merged to `master`.

## Context

South Mountain terrain digitization completed in M9 (`m9-map-completion_20260625`, PR #684,
closing issue #669): all 841 hexes now have concrete terrain (0 `unknown`). Hexside features
(roads/streams/stone walls/fords) remain genuinely incomplete and are correctly tracked in
open issue #685 — that follow-up work is explicitly out of scope here. OOB (`oob.json`) and
leaders (`leaders.json`) data are complete and their docs already say so correctly; no changes
needed there.

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

## Acceptance Criteria

- [ ] `data/modules/south-mountain/map.json`: `_description`/`_digitizationNote` rewritten to
      state terrain digitization is complete (841/841, 0 unknown) and hexside features are
      pending (tracked in #685); stale `_todoHexes` block removed (its setup-position zones
      are already resolved in `scenario.json`); `_status` stays `"partial"` (accurate — hexside
      features are still incomplete)
- [ ] `docs/library.md` SM_MAP_DATA row (line 51) updated from "🔧 scaffold, 31 known hexes" to
      reflect terrain-complete/hexside-pending state
- [ ] `docs/library.json` SM_MAP_DATA entry (`description`/`status`) updated to match
- [ ] `docs/agents/domain-expert/design.md` SM_MAP_DATA row (line 45) updated — no longer says
      "partial, digitization in progress"
- [ ] `docs/designs/high-level-design.md` risk-register row (~line 2190) updated — terrain
      digitization is resolved; hexside features tracked separately in #685
- [ ] `conductor/tracks.md` line 160: `m9-map-completion_20260625` checkbox flipped `[ ]` →
      `[x]` to match its own `metadata.json`/`plan.md` (`status: "complete"`)
- [ ] `conductor/tracks/m9-discord-oauth_20260625/metadata.json` updated: `status`
      `"pending"` → `"complete"`, `phases.completed` 0 → 3, `tasks.completed` 0 → 10, `updated`
      timestamp refreshed — to match its own `plan.md` (`[x] Complete`, all tasks checked,
      "Completed 2026-06-28")
- [ ] 13 stale GitHub issues closed, each with a comment citing the PR/commit that resolved it
      on `origin/master`: #344, #410, #506, #550, #554, #556, #627, #628, #629, #650, #651,
      #652, #680
- [ ] Remaining open issues (#653, #668, #676, #677, #678, #679, #681, #685) reconfirmed as
      genuinely unresolved (or, for #668, unmerged) and left open — no action. #668 explicitly
      flagged for the user: its implementation is complete on `feat/m9-discord-oauth` but that
      branch has no PR and is not merged
- [ ] `npm run validate-data`, `npm run lint`, `npm run format:check` all pass after edits

## Dependencies

None. Pure documentation/metadata/JSON-comment-field and GitHub issue-state corrections — no
application code, schema, or engine logic changes.

## Out of Scope

- Implementing the deferred hexside-feature work itself (#685) — doc sync only
- Implementing DO Droplet deployment (#653)
- Implementing or triaging the open engine tech-debt items (#676, #677, #678, #679, #681) —
  verification that they're still unresolved only, not implementation
- A full audit/rewrite of `conductor/index.md`'s Active/All Tracks tables, which have their
  own pre-existing drift (duplicate rows, stale "Pending" statuses) unrelated to this session's
  findings — flagged for a future track, not fixed here
- Any change to `oob.json`, `leaders.json`, or their docs (already accurate)

## Technical Notes

- `map.json` and `library.json` are schema-validated (`server/src/schemas/map.schema.js`) —
  run `npm run validate-data` after edits.
- Issue closing follows the existing repo convention (see prior track
  `issue-closeout_20260504`): `gh issue close <n> --comment "<citation>"`.
- Verification method used for each "already resolved" issue: `git log --all --grep="#<n>"`
  to find the fixing commit, `git merge-base --is-ancestor <sha> origin/master` to confirm it
  shipped, then a targeted code read to confirm the described fix is actually present (not
  just referenced in a commit message).

---

_Generated by Conductor. Review and edit as needed._
