# Implementation Plan: South Mountain Map Data Recovery — Stash Integration

**Track ID:** map-data-recovery_20260811
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-11
**Status:** [ ] Not Started

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

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] VP-hex reachability and elevation completeness verified, not assumed
- [ ] Issue #689 closed with an accurate summary
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

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
- [x] **Human checkpoint:** pending — presenting Phase 2 changes for approval before Phase 3's
      data merge begins

---

## Phase 3: Map Data Merge

### Tasks

- [ ] Task 3.1: Merge recovered hex records into current `data/modules/south-mountain/map.json`,
      applying the categorization from Task 1.2 (add net-new hexes, resolve conflicts per the
      approved strategy, preserve post-stash edits)
- [ ] Task 3.2: Re-run `npm run validate-data`; address any new schema or referential-integrity
      violations surfaced by the merged data
- [ ] Task 3.3: Re-verify VP-hex reachability using `hexNeighbors()` BFS (the same method used
      to discover the original gap) — record the result
- [ ] Task 3.4: Re-verify elevation completeness — record the result
- [ ] Task 3.5: Re-verify the two `_todoHexes` referenceHex anchors (`38.31`, `36.27`) are now
      covered, if the stash includes them

### Verification

- [ ] `npm run validate-data` clean or near-clean (documented exceptions only)
- [ ] VP-hex reachability and elevation results recorded and reviewed
- [ ] **Human checkpoint:** user approves the merged `map.json` and verification results before
      Phase 4/5 proceed

---

## Phase 4: Component & Composable Reconciliation

### Tasks

- [ ] Task 4.1: Reconcile `HexMapOverlay.vue` per the Task 1.4 analysis
- [ ] Task 4.2: Reconcile `MapEditorView.vue`
- [ ] Task 4.3: Reconcile `useEdgeLineLayer.js` + test
- [ ] Task 4.4: Reconcile `edge-model.js` + test

### Verification

- [ ] Full test suite green
- [ ] Manual smoke test in Map Editor (`npm run dev:map-editor`) and Map Test Tool — map
      renders correctly across the newly-recovered eastern region

---

## Phase 5: Documentation & Closeout

### Tasks

- [ ] Task 5.1: Update `map.json` `_status`/`_description`/`_digitizationNote`/`_todoHexes`
      to reflect the true, verified final state
- [ ] Task 5.2: Update `docs/library.md`, `docs/library.json`,
      `docs/agents/domain-expert/design.md`, `docs/designs/high-level-design.md` (the locations
      touched in PR #687) to reflect genuine completion or the real remaining gap
- [ ] Task 5.3: Update `conductor/tracks/m9-map-completion_20260625` records if this closes
      that track's remaining scope, or note the relationship if it doesn't
- [ ] Task 5.4: Close issue #689 with a summary of what was recovered, what was adapted, and
      what (if anything) remains
- [ ] Task 5.5: Delete the durable stash export (patch file / archive branch) only after
      confirming the merge is complete and correct — not before

### Verification

- [ ] `npm run quality:strict` passes
- [ ] All touched docs internally consistent
- [ ] Ready for `/team-review`

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] Tests passing, `npm run quality:strict` green
- [ ] Documentation updated and accurate
- [ ] Issue #689 closed
- [ ] Ready for review

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
