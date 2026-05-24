# Implementation Plan: Pre-M6 Debt Sprint — Issues #461–#464

**Track ID:** pre-m6-debt-sprint_20260524
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-24
**Status:** [ ] Not Started

## Overview

Four phases. Phase 1 refactors MapEditorView.vue (#461: extract mutateEdgeFeatures helper;
#462: normalize EDGE_DISPATCH). Phase 2 resolves the useMapPersistence migration policy (#463).
Phase 3 addresses the activePanelOverlayConfig composable coupling (#464). Phase 4 is closeout.
Checkpointed after preflight and after Phase 1 (before the persistence surface).

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

- HCP 1: Approve preflight notes before implementation begins
- HCP 2: After Phase 1 (MapEditorView diff) before Phase 2 (persistence surface)

## Risk Classification

**Risk:** Medium
**Reason:** Phase 1 touches MapEditorView.vue (shared editor orchestration surface); Phase 2
touches useMapPersistence.js (data-ingress boundary). Both are Checkpointed surfaces per the
agentic quality rails.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 — this is a debt-cleanup sprint.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All 7 acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated (4 items closed, score −10)
- [ ] Ready for `/team-review`

---

## Phase 1: MapEditorView Refactors (#461, #462)

Extract `mutateEdgeFeatures` to eliminate the duplicated hex-setup boilerplate, then normalize
`EDGE_DISPATCH` so every entry has an explicit `paintFn` and a unified clear strategy. Both
tasks operate on MapEditorView.vue.

### Tasks

- [x] Task 1.1: (#461) In `MapEditorView.test.js`, add integration tests for the shared
      hex-setup path exercised by `handleEdgePaint` and `handleContourPaint`: (a) auto-create
      hex stub when hexId is not in the index; (b) init `edges` and `edges[ownerFace]` when
      absent; (c) both handlers produce the same hex-stub result (same `terrain:'unknown'`,
      same edge init). Run red — these will fail until 1.2 lands (or green if the behavior
      already exists). Confirm the tests specifically exercise the shared path.

- [x] Task 1.2: (#461) Extract a private `mutateEdgeFeatures(hexId, faceIndex, mutateFn)`
      helper in `MapEditorView.vue`. It handles: guard `mapData`, resolve `canonicalOwner`,
      look up `hexIndex` (create stub with `terrain:'unknown'` if missing), init `hex.edges`
      and `hex.edges[ownerFace]`, then call `mutateFn(hex, ownerFace)`. Wire
      `handleEdgePaint` and `handleContourPaint` through it (each becomes a one-line body
      calling `mutateEdgeFeatures` with a type-specific mutateFn). Run `npm run test` green.

- [x] Task 1.3: (#462) Normalize `EDGE_DISPATCH`. Add explicit `paintFn: handleEdgePaint` to
      road and stream entries. Replace `clearSingle: boolean` + `clearTypes: string[]` with
      `clear: { mode: 'face', type: () => entry.selectedType() }` (contour) and
      `clear: { mode: 'hex', types: [...] }` (road, stream). Update `onEdgeClick` to use
      `entry.paintFn(...)` directly (remove `?? handleEdgePaint` fallback). Update
      `onEdgeRightClick` to use `entry.clear.mode`. Run `npm run test` green.

### Verification

- [ ] `npm run test` green after each task; no MapEditorView regressions
- [ ] **HCP 2:** Review Phase 1 diff before proceeding to Phase 2

---

## Phase 2: Persistence Migration Policy (#463)

Resolve the `migrateUnknownTerrain` temporal-coupling concern by establishing a documented,
asserted contract that `'unknown'` is a migration-only reserved value with no other producers.

### Tasks

- [x] Task 2.1: (#463) Add a JSDoc block above `migrateUnknownTerrain` in
      `useMapPersistence.js` explicitly stating: "The only producers of `terrain:'unknown'`
      are (a) `handleEdgePaint`/`handleContourPaint` in MapEditorView.vue when auto-creating
      a hex stub (via `mutateEdgeFeatures` after #461 lands), and (b) legacy map data. No
      other code may assign `terrain:'unknown'`." Add a `// MIGRATION-ONLY` sentinel comment
      at the auto-create call site in `mutateEdgeFeatures` in MapEditorView.vue so a grep
      for `terrain.*unknown` surfaces all producers.

- [x] Task 2.2: (#463) In `useMapPersistence.test.js`, add a test that asserts the migration
      is idempotent across two consecutive load cycles: load once (terrain:'unknown' → 'clear'),
      serialize the result, load again — assert no hex terrain changes on the second load.
      Run `npm run test` green.

### Verification

- [ ] `npm run test` green; idempotency test passes
- [ ] `grep -r "terrain.*unknown" client/src` surfaces only the documented producers and tests

---

## Phase 3: Composable Coupling (#464)

Improve the `activePanelOverlayConfig` cross-instance coupling in `useEdgePanelWiring` from
an implicit contract to an explicit, verified invariant.

### Tasks

- [x] Task 3.1: (#464) In `useEdgePanelWiring.js`, update the JSDoc on the
      `activePanelOverlayConfig` parameter to: (a) name the invariant explicitly — "caller
      must guarantee only one panel instance is active at a time"; (b) describe the
      enforcement mechanism — MapEditorView watches `openPanel` and resets
      `activePanelOverlayConfig` to `null` on every panel transition. Add a
      `// INVARIANT: single-panel exclusivity guaranteed by caller` comment on the
      `onOverlayConfig` write line.

- [x] Task 3.2: (#464) In `MapEditorView.test.js`, add a test verifying the single-open
      invariant: open panel A (overlay-config emitted), then open panel B — assert
      `activePanelOverlayConfig` reflects B's config, not A's stale config (last-writer-wins
      is correct when single-open exclusivity holds). Run `npm run test` green.

### Verification

- [ ] `npm run test` green; single-open invariant test passes

---

## Phase 4: Closeout

### Tasks

- [ ] Task 4.1: Run `npm run quality:strict` — all five gates pass with zero warnings.
- [ ] Task 4.2: Close GitHub issues #461, #462, #463, #464.
- [ ] Task 4.3: Run `/tech-debt-report` for this PR to update the debt register.

## Final Verification

- [ ] All 7 acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes with zero unexpected warnings
- [ ] 4 GitHub issues closed (#461 #462 #463 #464)
- [ ] Debt register: 28 → 18 open score
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
