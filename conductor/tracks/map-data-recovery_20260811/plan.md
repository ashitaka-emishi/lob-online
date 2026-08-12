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

- [ ] Confirm PR #687 (`docs-issue-sync_20260811`) has merged to `master`. If not yet merged,
      halt and wait — this track's baseline assumptions (corrected `validate-data.js`,
      accurate `map.json` metadata) depend on it.

---

## Phase 1: Safe Extraction & Diff Analysis

No merges, no code changes — this phase produces information, not modifications.

### Tasks

- [ ] Task 1.1: Export `stash@{0}` to a durable location: `git stash show -p stash@{0} >
/tmp/stash-0-full.patch` (or a dedicated `archive/stash-0-map-recovery` branch via
      `git stash branch`). Confirm the export is readable independent of the stash stack
      before touching the stash further — do not drop or pop it until this is verified safe.
- [ ] Task 1.2: Extract stashed `map.json`
      (`git show stash@{0}:data/scenarios/south-mountain/map.json`) and diff it hex-by-hex
      against current `data/modules/south-mountain/map.json`. Categorize: hexes present only
      in the stash (net-new coverage), hexes present in both with different terrain/elevation
      (conflicts — current is likely stale, but verify), hexes present only in current
      (post-2026-05-23 edits, e.g. the M9 unknown→clear pass — must not be silently discarded).
- [ ] Task 1.3: Diff `git show stash@{0}:server/src/engine/hex.js` and
      `git show stash@{0}:server/src/schemas/map.schema.js` against current versions of those
      files. Determine whether the boundary-mirror-face validation logic is still structurally
      compatible, or whether intervening changes (e.g. perf work referenced in `hex.js`'s
      module-level caches, #294) require adapting the stashed fix rather than reapplying it
      verbatim.
- [ ] Task 1.4: Diff the stashed `client/src/composables/useEdgeLineLayer.js`,
      `client/src/formulas/edge-model.js`, `client/src/components/HexMapOverlay.vue`,
      `client/src/views/tools/MapEditorView.vue` (plus their tests) against current versions.
      Note what's still relevant vs. superseded by later, unrelated work on those same files.
- [ ] Task 1.5: Write a short diff-analysis report (counts, categories, specific conflicts,
      recommended merge strategy) and present it to the user.

### Verification

- [ ] Stash content is durably preserved outside the stash stack
- [ ] **Human checkpoint:** user approves the diff-analysis report and merge strategy before
      Phase 2 begins

---

## Phase 2: Schema & Engine Integration

### Tasks

- [ ] Task 2.1: Reapply or adapt the boundary-mirror-face schema change to current
      `server/src/schemas/map.schema.js` (`FaceIndex` enum widening, `validateBoundaryMirrorFaces`)
- [ ] Task 2.2: Reapply or adapt the corresponding `server/src/engine/hex.js` doc/comment
      updates
- [ ] Task 2.3: Add/update tests for the boundary-mirror-face validation
      (`map.schema.test.js`), reconciling with the stashed test changes from Task 1.3
- [ ] Task 2.4: Run the full test suite; fix any regressions surfaced by the schema/engine
      change interacting with code written after 2026-05-23

### Verification

- [ ] `npm run test` green, no regressions
- [ ] `npm run validate-data` still passes against current (pre-merge) `map.json`
- [ ] **Human checkpoint:** user approves the schema/engine changes before Phase 3's data
      merge begins

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
