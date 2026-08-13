# Specification: Map Data Debt Sprint — Issues #693-696

**Track ID:** map-data-debt-sprint_20260813
**Type:** Chore
**Created:** 2026-08-13
**Status:** Complete

## Summary

Close the four tracked-debt items `/team-review` surfaced on PR #692
(`map-col64-investigation_20260812`): a missing regression test for `gridSpec.cols`, a
non-blocking `validate-data.js` check with no coverage of its own, an undocumented/unenforced
`playable` flag, and map-status documentation duplicated by hand across seven locations.

## Context

PR #692 fixed South Mountain's `gridSpec.cols` from 64 to 63 (issue #691 — column 64 turned
out to be a partial sliver hex at the true physical edge of the printed map, not a genuine
digitization gap). Three `/team-review` dimensions (security, testing, maintainability — two
more, architecture and domain, hit an API session rate limit and didn't complete) converged
independently on the same underlying gaps, filed as #693-696. None were blocking for that PR —
they're cross-cutting, correctly out of scope for a narrow config-value fix to close itself —
but each has a demonstrated cost: #695 in particular is the exact gap that caused
`map-col64-investigation_20260812`'s own initial wrong fix attempt (recording column 64 as
`playable: false`, which would not have actually excluded it from movement, since nothing in
the engine enforces that flag).

Debt register: this track closes 4 items totaling score 8 (net open debt 18 → 10 once merged).

## Acceptance Criteria

- [x] #693: `server/src/engine/map.test.js` has data-invariant regression tests guarding
      `gridSpec.cols` — implemented as `cols` matching the highest recorded column plus a
      per-hex column-bounds check (a `cols x rows == in-grid record count` formula, as
      originally sketched, would have been satisfiable by a map that both under-declares
      `cols` and is missing real columns; the max-column invariant catches that case).
      Asserts the invariant, not the literal `63`, so it fails whether the value regresses to
      64 _or_ someone shrinks it further while deleting real columns. Mutation-tested
      (temporarily reverting `gridSpec.cols` to 64 and confirming the new test fails) before
      considering this closed. Also fixed a live instance of the same drift class:
      `client/src/utils/calibration.js`'s `DEFAULT_CALIBRATION.cols` was still 64.
- [x] #694: `scripts/validate-data.js`'s grid-coverage check promoted from `warn()` to `fail()`.
      New `scripts/validate-data.test.js` exercises the checker functions
      (`checkSetupHexesInMap`, `checkVPHexesInMap`, `checkEntryHexesInMap`, the grid-coverage
      check, `edgeFeatureTypes` registry check) against small in-memory fixtures, not the real
      data file.
- [x] #695: `movement.test.js` has a characterization test documenting that `playable: false`
      does not gate movement (pins current behavior — a deliberate choice to record, not
      silently enforce). `map.schema.js`'s `playable` field gets a scope comment in the same
      style as the neighboring `ELEVATION_TYPES` export.
- [x] #696: a test asserting `docs/library.json`'s `SM_MAP_DATA.hexCount` and `status` fields
      equal `data/modules/south-mountain/map.json`'s actual `hexes.length` and `_status`. HLD's
      risk-register row and `docs/agents/domain-expert/design.md`'s SM_MAP_DATA row reduced to
      short summaries pointing at `docs/library.md` for the counts, rather than independently
      restating them.
- [x] All four issues (#693, #694, #695, #696) closed with a summary of what was done
- [x] Debt register (`docs/tech-debt/report.md`) updated to reflect the four resolved items
- [x] Full quality suite green (`validate-data`, `lint`, `format:check`, `test`, `build`)

## Dependencies

PR #692 merged (done, commit `9f0ef65`) — this track closes the debt it surfaced.

## Out of Scope

- Any _new_ debt discovered during this track's own `/team-review` pass — filed as further
  tracked debt, not folded in here, per the Immediate Debt-Capture Policy
- Actually enforcing `playable: false` as movement-impassable (a behavior change requiring
  domain-expert sign-off on the rules implication, not just a docs/test fix) — #695's fix is
  documentation + a characterization test only, not an engine behavior change
- #685 (hexside-network visual audit + playtest) — unrelated, separate issue

## Technical Notes

- Risk Classification: **Medium-High** — touches `server/src/engine/map.test.js` and
  `movement.test.js` (rules-engine-adjacent), `server/src/schemas/map.schema.js` (a data
  validation schema, comment-only), and `scripts/validate-data.js` (the build-gate script
  itself, promoting a check from warn to fail — verified this doesn't break anything today,
  but it's still a CI-gate behavior change).
- Interaction Mode: **Checkpointed** — matches this repo's own Checkpointed triggers
  ("data validation schemas", "shared rules-engine logic"). Human checkpoint after each
  phase, consistent with the two preceding map-data tracks this week.

---

_Generated by Conductor. Review and edit as needed._
