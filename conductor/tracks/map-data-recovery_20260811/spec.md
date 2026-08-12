# Specification: South Mountain Map Data Recovery — Stash Integration

**Track ID:** map-data-recovery_20260811
**Type:** Chore
**Created:** 2026-08-11
**Status:** Complete

## Summary

Recover a forgotten, uncommitted map dataset sitting in `stash@{0}` on this machine since
2026-05-23, reconcile it against ~2.5 months of subsequent engine/schema/component drift, and
integrate it into `data/modules/south-mountain/map.json` to close the real coverage gap
documented in issue #689.

## Context

Discovered during `/team-review` on PR #687 (`docs-issue-sync_20260811`): the South Mountain
map's `gridSpec` declares a 2240-cell (64x35) grid, but only 841 cells have any hex record —
almost entirely in columns 1-30. Using `hexNeighbors()` from `server/src/engine/hex.js`, a BFS
from a well-connected hex confirmed 6 of the 10 scenario VP hexes are unreachable by the
movement pathfinder, which treats unrecorded hexes as impassable
(`server/src/engine/movement.js:144`). 75 hexes are also missing `elevation`.

The user recalled having a more complete map checked in at some point. Git history shows
841 hexes at every commit, on every branch, going back to the file's creation — no regression
via any tracked commit. The explanation was `git stash list`:

> `stash@{0}`: `On fix/map-editor-bugs-416-417-419: WIP: boundary face fix (#418) + map
session data — not committed to PR #451`

Created 2026-05-23, never applied, never dropped — sitting untouched for ~2.5 months while the
branch it came from moved on without it, then the multi-module platform split
(`849bc94`/`92bfe78`) and M9's map-completion work (`fbd7c72`/`2210a0f`, #669) both proceeded
from the old, much smaller base, unaware this existed. The stash contains:

- `data/scenarios/south-mountain/map.json` (pre-multi-module-split path): **2,261 hexes, 0
  unknown terrain**, realistic variety (1112 clear, 604 woods, 294 woodedSloping, 219
  slopingGround, 21 orchard, 11 marsh), spanning columns 1-63, only 48 hexes missing elevation
- `server/src/engine/hex.js` + `server/src/schemas/map.schema.js`: a real fix adding
  "boundary mirror faces" — letting map-edge hexes store edge faces 3-5 directly, since they
  have no neighbor hex to canonically own that data under the existing convention. This bug is
  invisible on the current sparse, interior-only map and only surfaces once hexes near the
  map's true boundary are populated — almost certainly why this was mid-fix when something
  else took priority, and why it was never missed until now.
- Matching updates: `client/src/composables/useEdgeLineLayer.js` + test,
  `client/src/formulas/edge-model.js` + test, `client/src/components/HexMapOverlay.vue`,
  `client/src/views/tools/MapEditorView.vue`

**Why this can't be a blind `git stash apply`:** the stash is dated 2026-05-23; current
`master` has since undergone the multi-module platform split (map.json moved from
`data/scenarios/south-mountain/` to `data/modules/south-mountain/`), plus independent changes
to `map.schema.js`, `hex.js`, `HexMapOverlay.vue`, and `MapEditorView.vue`. Applying it
directly will conflict, and even where it doesn't conflict cleanly, silently accepting
2.5-month-old code over current code would be wrong without review.

## Acceptance Criteria

- [x] `stash@{0}` exported to a durable, non-stash location (patch file and/or dedicated
      branch) before any further work, so it cannot be lost to an accidental `git stash drop`
      or GC
- [x] Stashed `map.json` diffed hex-by-hex against current `data/modules/south-mountain/map.json`;
      differences categorized (net-new hexes, changed terrain, changed elevation, any hexes
      present in both with conflicting data)
- [x] Stashed `hex.js`/`map.schema.js` boundary-mirror-face changes reviewed against current
      versions of those files; determined whether the fix is still correct as-is or needs
      adaptation to schema/engine changes made since 2026-05-23
- [x] Recovered hex data merged into current `map.json` (schema-valid; correct path; `_savedAt`
      and internal metadata fields updated accurately — not restating "digitization complete")
- [x] Boundary-mirror-face schema/engine fix reapplied (adapted as needed) with tests
- [x] `npm run validate-data` shows dramatically improved coverage — target: 0 (or a small,
      explicitly-documented remainder) `referenceHex`/coverage warnings
- [x] VP-hex reachability re-verified via the same `hexNeighbors()` BFS method used to find the
      original gap — target: 10/10 reachable, or explicitly documented exceptions with reasons
- [x] Elevation completeness re-verified — target: 0 (or documented remainder) missing
- [x] Stashed component/composable changes (`HexMapOverlay.vue`, `MapEditorView.vue`,
      `useEdgeLineLayer.js`, `edge-model.js`, and their tests) reviewed and reconciled with
      current versions — reapplied if still correct and needed, discarded with reasoning if
      superseded
- [x] Full test suite passes; `npm run quality:strict` passes
- [x] `map.json` `_status`/`_description`/`_digitizationNote`/`_todoHexes` updated to reflect
      the true final state (not reflipped to "complete" without the verification above backing
      it up)
- [x] `docs/library.md`, `docs/library.json`, `docs/agents/domain-expert/design.md`,
      `docs/designs/high-level-design.md` (the locations corrected in PR #687) updated again to
      reflect genuine completion, or the real remaining gap if any
- [x] Issue #689 closed with a summary of what was recovered, what was adapted, and what (if
      anything) remains

## Dependencies

- PR #687 (`docs-issue-sync_20260811`) should merge first — it establishes the accurate
  baseline understanding (and the corrected `validate-data.js` referenceHex check) this track
  builds on.
- `stash@{0}` must still exist on this machine (verified present as of 2026-08-11) —
  Task 1.1 exports it to a durable location specifically to remove this as an ongoing risk.

## Out of Scope

- Hexside features (roads/streams/stone walls/fords/bridges) — remains tracked in #685,
  independent of this track. Recovering the stash does not by itself complete #685; the
  stashed map.json does not appear to include hexside edge-feature data beyond what current
  `map.json` has (to be confirmed during Phase 1 diff analysis).
- DO Droplet deployment (#653)
- Full-map playtesting and the rest of #685's verification checklist
- Broad refactors of the map editor beyond reconciling the stashed changes

## Technical Notes

- Risk Classification: **High** — touches rules-engine (`hex.js` adjacency/movement),
  schema (`map.schema.js`), and shared map-editor components used across multiple tools.
- Interaction Mode: **Checkpointed** — required for High risk per
  `.claude/rules/agentic-quality-rails.md`. Human control points: approve the diff-analysis
  report and merge strategy (end of Phase 1) before any schema/engine changes are made;
  approve the schema/engine changes (end of Phase 2) before the map-data merge; approve the
  final merged `map.json` and reachability/elevation results (end of Phase 3) before docs are
  updated to claim completion.
- The stash's `map.json` path (`data/scenarios/south-mountain/map.json`) predates the
  multi-module split — recovery work must translate hex records into the current schema/path,
  not copy the file wholesale.

---

_Generated by Conductor. Review and edit as needed._
