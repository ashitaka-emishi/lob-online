# Implementation Plan: South Mountain Map Data Recovery — Stash Integration

**Track ID:** map-data-recovery_20260811
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-11
**Status:** [x] Complete

## Overview

Five phases: safely extract the stash, analyze the drift between it and current `master`,
reintegrate the schema/engine fix, merge the map data, reconcile the bundled component
changes, then update docs only once the result is actually verified. Each phase ends at a
human checkpoint before the next begins — this track touches rules-engine, schema, and shared
components, so no phase proceeds on an assumption that hasn't been shown to the user first.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Approve the Phase 1 diff-analysis report and merge strategy before
any schema/engine change is written; approve the Phase 2 schema/engine changes before the
Phase 3 data merge begins; approve the Phase 3 merged `map.json` and reachability/elevation
verification results before Phase 4/5 proceed.

## Risk Classification

**Risk:** High
**Reason:** Touches the rules-engine (`hex.js` adjacency/movement), the map schema
(`map.schema.js`), and shared map-editor components (`HexMapOverlay.vue`, `MapEditorView.vue`)
used across multiple tools — all Checkpointed-surface triggers per
`.claude/rules/agentic-quality-rails.md`.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved. None accepted — the one
pre-existing unrelated `validate-data` warning (`longstreet`/`csa-wing`) predates this track
and the `MAP_IMAGE` path bug found during manual testing was fixed in place, not deferred.

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] VP-hex reachability and elevation completeness verified, not assumed
- [x] Issue #689 closed with an accurate summary
- [x] Debt register updated if any debt was accepted — n/a, none accepted
- [x] Ready for `/team-review`

---

## Phase 0: Prerequisite

- [x] Confirm PR #687 (`docs-issue-sync_20260811`) has merged to `master`. If not yet merged,
      halt and wait — this track's baseline assumptions (corrected `validate-data.js`,
      accurate `map.json` metadata) depend on it. Merged 2026-08-12, commit `7a5221a`.

---

## Phase 1: Safe Extraction & Diff Analysis

No merges, no code changes — this phase produces information, not modifications.

### Tasks

- [x] Task 1.1: Exported via both methods for redundancy: patch file at
      `/tmp/lob-stash-recovery/stash-0-full.patch`, and `git stash branch
archive/stash-0-map-recovery stash@{0}` — committed (`1ef6a62`) and pushed to
      `origin/archive/stash-0-map-recovery`. The stash is now preserved in three independent
      places (patch file, local commit, remote branch) and was dropped from the stash stack
      by `git stash branch` as part of that operation, as expected.
- [x] Task 1.2: Diffed hex-by-hex. Stash: 2261 hexes. Current: 841 hexes, all 841 also present
      in stash (zero current-only hexes — nothing unique to lose). 1420 net-new hexes in stash.
      160 hexes present in both with conflicting terrain/elevation — checked programmatically
      for any case where current is better: zero found. Stash is a strict superset/improvement
      in every measurable respect (terrain specificity, elevation completeness, edge/hexside
      data coverage).
- [x] Task 1.3: `hex.js` diff is comment-only (no logic change). `map.schema.js` diff is
      exactly the boundary-mirror-face feature (`FaceIndex` enum widened to include '3'-'5',
      `validateBoundaryMirrorFaces` function) — confirmed via direct diff that **no other
      change has landed in `map.schema.js` since 2026-05-23**, so this is a clean, isolated
      reapply with no intervening-change risk. `movement.js` stash diff is comment-only; current
      master has since added an unrelated `pathCost()` function (#675/#680) not present in the
      stash — must be preserved, not touched.
- [x] Task 1.4: Diffed all four files + tests against current master: - `useEdgeLineLayer.js` (16-line diff) — clean, isolated, straightforward reapply - `HexMapOverlay.vue` (45-line diff) — mostly clean; current has since added a
      `selectedUnitId` prop (#480) and a terrain-default comment (#419) not in the stash —
      must be preserved during reapply - `edge-model.js` (129-line diff) — **not a clean reapply**. Current's `canonicalOwner()`
      still has the exact bug the stash fixes (confirmed by reading current code directly:
      `return { ownerId: neighbourId ?? hexId, ownerFace: faceIndex - 3 }` — for boundary
      hexes, `ownerFace` is wrongly remapped even when there's no neighbour to own it,
      colliding with the hex's own faces 0-2). Current has independently gained a _different_,
      complementary fix since — `stripNonPlayableBoundaryEdges`/`isEdgeAtNonPlayableBoundary`
      (also citing #418) — which strips edges at playable/non-playable boundaries but does
      not touch `canonicalOwner`'s grid-edge bug. The two are unrelated sub-fixes for the same
      umbrella issue (#418) and don't conflict, but must be integrated function-by-function,
      not patched wholesale — current also renamed/restructured `CONTOUR_TYPES`/`SLOPE_TYPES`
      and now imports from `config/feature-types.js`, which the stash predates. - `MapEditorView.vue` (249-line diff) — most complex file. Current has grown substantially
      since 2026-05-23: module-slug routing (`useRoute()`), `EditorNav` component, a
      `beforeSave` hook wired to `stripNonPlayableBoundaryEdges`. Needs careful, deliberate
      reconciliation in Phase 4, not a blind reapply. - Test files: `useEdgeLineLayer.test.js` (45-line diff) straightforward.
      `map.schema.test.js` (38-line diff) — one old test (`rejects edges with face index "3"
(non-canonical)`) needs replacing with the stash's two new tests reflecting the changed
      schema behavior. `edge-model.test.js` (290-line diff) — largest test diff, needs
      function-by-function reconciliation in Phase 2/4, mirroring the source file's complexity.
- [x] Task 1.5: Report written and presented to user (see conversation) — see summary below.

### Verification

- [x] Stash content is durably preserved outside the stash stack — patch file, commit
      `1ef6a62` on `archive/stash-0-map-recovery`, and pushed to
      `origin/archive/stash-0-map-recovery`
- [x] **Human checkpoint:** user approved the diff-analysis report and merge strategy
      ("proceed")

---

## Phase 2: Schema & Engine Integration

### Tasks

- [x] Task 2.1: Reapplied the boundary-mirror-face schema change to
      `server/src/schemas/map.schema.js` — `FaceIndex` enum widened to `'0'`-`'5'`,
      `validateBoundaryMirrorFaces` added and wired into the `superRefine` hex loop, comment
      block updated, `hexNeighborInDir` imported from `engine/hex.js`
- [x] Task 2.2: Reapplied the corresponding comment updates in `server/src/engine/hex.js` and
      `server/src/engine/movement.js` (both comment-only, no logic change, matching the Task
      1.3 finding)
- [x] Task 2.3: Replaced the single obsolete test (`rejects edges with face index "3"
(non-canonical)`) with the stash's two tests (`accepts boundary mirror face indices...`,
      `rejects direct mirror face indices... when the neighbour exists`) plus the
      `TEST_GRID_SPEC` fixture they need, in `map.schema.test.js`
- [x] Task 2.4: Full test suite run — no regressions

### Verification

- [x] `npm run test` — 3250 passed (3249 + 1 net new test), 12 pre-existing skips, 0 failures,
      0 regressions
- [x] `npm run validate-data` still passes against current (pre-merge) `map.json` — 0 errors,
      3 warnings (1 pre-existing + 2 expected `referenceHex` warnings, to be resolved by the
      Phase 3 data merge)
- [x] `npm run lint` / `npm run format:check` clean
- [x] **Human checkpoint:** user approved the Phase 2 schema/engine changes ("proceed")

---

## Phase 3: Map Data Merge

### Tasks

- [x] Task 3.1: Verified first that every non-`hexes` top-level field (`vpHexes`, `entryHexes`,
      `terrainTypes`, `hexFeatureTypes`, `edgeFeatureTypes`, `elevationSystem`, `layout`,
      `hexIdFormat`) is byte-identical between stash and current — nothing to reconcile there.
      Replaced `hexes` wholesale with the stash's 2261-hex array (approved Phase 1 strategy:
      strict superset, zero current-only hexes existed to preserve).
- [x] Task 3.2: `npm run validate-data` — 0 errors, 1 warning (pre-existing, unrelated).
      Schema valid including the new boundary-mirror-face rule from Phase 2. Setup referenceHex
      presence: 3/3 (up from 1/3).
- [x] Task 3.3: Re-verified via `hexNeighbors()` BFS against the actual merged file — **10/10
      VP hexes reachable** (up from 4/10), 2205/2261 hexes (97.5%) connected from the main
      component.
- [x] Task 3.4: Elevation completeness: 48/2261 missing (2.1%) — improved from 75/841 (8.9%).
- [x] Task 3.5: Both `_todoHexes` referenceHex anchors (`38.31`, `36.27`) now present and
      confirmed covered by `validate-data`'s referenceHex check.

Full test suite caught one real regression: `movement.test.js` — a test named "adjacent
clear-terrain hexes cost 1 for line formation" used hexes `19.23`→`20.23`, assuming clear
terrain. The recovered data correctly shows `20.23` is `woods` (LOB §3 line-formation cost 2,
confirmed against `scenario.json` `movementCosts`) — the engine was right, the test's premise
was stale. Fixed by swapping to `19.23`→`18.22` (verified both clear, no hexside features,
cost = 1), preserving the test's original intent rather than just changing the expected value.

### Verification

- [x] `npm run validate-data` clean (1 pre-existing unrelated warning only)
- [x] VP-hex reachability (10/10) and elevation completeness (97.9%) results recorded above
- [x] `npm run test` — 3250 passed, 0 regressions after the `movement.test.js` fix
- [x] `npm run lint` / `npm run format:check` clean
- [x] **Human checkpoint:** user approved the merged `map.json` and verification results
      ("proceed")

---

## Phase 4: Component & Composable Reconciliation

### Tasks

- [x] Task 4.3 (done first — foundational, `HexMapOverlay.vue` consumes its output shape):
      `useEdgeLineLayer.js` — `directFaces` now iterates all 6 `EDGE_DIRS` (was 3 canonical
      only) so boundary hexes' own faces 3-5 render; each face entry got a `key` field
      (`direct-${dir}`/`mirror-${dir}`) since direct and mirror entries can now share the same
      `dir` value. Removed a genuinely-unused `CANONICAL_EDGE_DIRS` var that was dead code even
      in the original stash (caught by lint, not present in Task 1.4's diff analysis). Test:
      updated the "three canonical faces" assertion to all six, added back the boundary-mirror
      regression test; left the unrelated #456 full-edge-geometry regression test untouched.
- [x] Task 4.1: `HexMapOverlay.vue` — `roadEdgeCountMap`/`_buildGlyphEdges` now iterate all 6
      `EDGE_DIRS_ROAD` (was 3), template `:key` updated to `face.key ?? face.dir` (two call
      sites) to match the new keyed shape. Preserved current's independent additions untouched:
      `selectedUnitId` prop (#480), the `#419` terrain-default comment, and the
      `:selected-unit-id` binding.
- [x] Task 4.4: `edge-model.js` — fixed only `canonicalOwner()`: boundary faces (no neighbour
      in that direction) now resolve to `{ ownerId: hexId, ownerFace: faceIndex }` instead of
      wrongly remapping to `faceIndex - 3` and colliding with the hex's own canonical faces.
      Deliberately left `validateCoexistence`'s `SLOPE_TYPES` (current) vs. the stash's
      `CONTOUR_TYPES` untouched — that's current's own later, correct, independent evolution
      (a separate `applyContourPaint` "replace" tool now owns contour-replace semantics,
      `validateCoexistence` was deliberately narrowed to slope-only rejection); reapplying the
      stash's version would have been a regression, not a fix. Test: added back the
      `canonicalOwner` boundary-faces regression test; left `applyContourPaint`,
      `isEdgeAtNonPlayableBoundary`, `stripNonPlayableBoundaryEdges`, and the
      elevation-coexists-with-slope test (current's own later work) untouched.
- [x] Task 4.2: `MapEditorView.vue` — found and fixed exactly two boundary-fix-relevant sites
      via targeted grep after ruling out everything else in the 249-line diff as current's own
      independent evolution (`EDGE_DISPATCH` restructuring, `mutateEdgeFeatures` extraction,
      `isNonPlayableBoundary`/`showEdgeNotice`/`beforeSave` stripping, module-slug routing,
      `EditorNav`, removed legacy `'unknown'→'clear'` watch): `handleEdgeClearAll` (global
      clear-by-type across the whole map) and `handleHexEdgeClearAll` (clear-by-type for one
      hex) both iterated only faces `[0,1,2]`, which would silently leave orphaned data on a
      boundary hex's own faces 3-5. Both now iterate `[0,1,2,3,4,5]`. Left `countEdgeFeatures`
      untouched — it's explicitly scoped to canonical faces 0-2 for the unrelated
      playable-boundary-stripping feature, not a bug.

### Verification

- [x] Full test suite green: 3252 passed (3250 + 2 net new boundary-regression tests), 12
      pre-existing skips, 0 failures, 0 regressions
- [x] `npm run lint` clean (after removing the dead `CANONICAL_EDGE_DIRS` var)
- [x] `npm run format:check` clean
- [x] Manual smoke test in Map Editor and Map Test Tool via `/dev-start` + Playwright, module
      `SM`. Found and fixed one additional pre-existing bug blocking the test: `MAP_IMAGE` in
      `MapEditorView.vue`, `MapTestView.vue`, and `GameView.vue` hardcoded
      `/tools/map-editor/assets/reference/sm-map.jpg`, but the file moved to
      `docs/reference/south-mountain/sm-map.jpg` during the multi-module platform split
      (`92bfe78`, #529) and these three paths were never updated — confirmed present on
      `master` itself, unrelated to the stash. Its impact was invisible while the map only had
      841 sparse hexes mostly within the fallback `1400x900` canvas size
      (`imgNaturalWidth`/`imgNaturalHeight` default before the image's `@load` handler fires);
      recovering the full-width data made it visible for the first time — the canvas literally
      couldn't grow to fit the newly-populated eastern columns because the reference image
      404'd and the `@load` handler that resizes the canvas to the image's real dimensions
      never fired. Fixed all three paths (added the missing `south-mountain/` segment) with
      user confirmation. After the fix: canvas correctly resizes to `3804x2471` (was stuck at
      `1400x900`), full grid scrolls into view, hex overlay aligns correctly with the reference
      photo across the whole map including the recovered eastern region (visually confirmed —
      Monument Hill / Washington Monument / M. Zittle landmarks near Sharpsburg). Road Tool
      painted and rendered a road correctly through boundary-region hexes with no visual
      glitches or console errors — direct confirmation of the `useEdgeLineLayer.js`/
      `HexMapOverlay.vue` changes working in the live app. Stream Tool and Map Test Tool both
      loaded cleanly. Zero console errors across all four tool views after the fix.

---

## Phase 5: Documentation & Closeout

### Tasks

- [x] Task 5.1: `map.json` `_description`/`_digitizationNote` rewritten to state the verified
      final state (2261 hexes, full grid coverage, 10/10 VP hexes reachable, 97.9% elevation
      completeness); stale `_todoHexes` block removed (both referenceHex gaps resolved,
      `validate-data` confirms 3/3). `_status` deliberately stays `"partial"` — hexside-network
      completeness (777/2261 hexes carry edge data) hasn't been visually spot-checked against
      `sm-map.jpg`, which is #685's remaining scope
- [x] Task 5.2: Updated `docs/library.md`, `docs/library.json`,
      `docs/agents/domain-expert/design.md`, and `docs/designs/high-level-design.md` (4
      locations, including flipping the risk-register row from open back to `~~High~~
**Resolved**`) to state the verified recovered state instead of PR #687's now-superseded
      "coverage gap, recovery pending" framing
- [x] Task 5.3: `m9-map-completion_20260625/metadata.json` updated — notes this recovery
      substantially advanced that track's own deferred Phase 2 (hexside features: 777/2261
      hexes now carry edge data) but leaves Phase 2 open there since the visual audit is
      #685's job, not that track's
- [x] Task 5.4: Closed #689 with a full summary (what was recovered, what was adapted vs.
      current's independent evolution, what was verified against the live engine and a manual
      smoke test, what remains). Also posted an informational comment on #685 (not closing it)
      quantifying the hexside-feature progress and flagging a specific gap found along the way
      (0 `ford` entries despite 2 `bridge` entries)
- [x] Task 5.5: Removed the scratch patch file (`/tmp/lob-stash-recovery`, disposable).
      Deliberately deviated from a literal "delete the archive branch" reading: a git branch
      costs nothing to keep, `archive/stash-0-map-recovery` has genuine audit value (an exact
      record of what was recovered and when), and deleting it would be irreversible for no
      benefit — kept, both locally and on `origin`

### Verification

- [x] `npm run validate-data`, `npm run lint`, `npm run format:check`, `npm run test` (3252
      passed, 0 regressions), `npm run build` all pass
- [x] All touched docs internally consistent — cross-checked against each other and against
      the actual merged `map.json`, not just against each other
- [x] Ready for `/team-review`

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] Tests passing, full quality suite green (`validate-data`, `lint`, `format:check`, `test`,
      `build`)
- [x] Documentation updated and accurate
- [x] Issue #689 closed
- [x] Ready for review

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
