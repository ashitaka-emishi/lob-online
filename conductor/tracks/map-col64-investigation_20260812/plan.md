# Implementation Plan: South Mountain Map — Column 64 Investigation

**Track ID:** map-col64-investigation_20260812
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-12
**Status:** [x] Complete

## Overview

Two phases: visually determine ground truth for column 64, then apply whichever resolution
that finding calls for. The investigation itself is read-only (no map-data risk); the
resolution phase's risk depends entirely on which path Phase 1 finds — hence Checkpointed mode
with a hard gate between the two.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Approve the Phase 1 determination (calibration artifact vs. genuine
gap) and the resulting resolution plan before Phase 2 makes any change.

## Risk Classification

**Risk:** High
**Reason:** Outcome-dependent — if Phase 1 finds a genuine gap, Phase 2 touches
`data/modules/south-mountain/map.json` the same way `map-data-recovery_20260811` did.
Classified High upfront since the branch isn't known before Phase 1 completes.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved. `/team-review` surfaced four
cross-cutting gaps (independently converged on by multiple reviewers) that were correctly
out of scope for this narrow config-value fix to close itself — each filed immediately with a
debt score and written assessment, per the Immediate Debt-Capture Policy:

- #693 (score 2) — no regression test guards `gridSpec.cols=63`; the map editor is a live
  write path that could silently revert it
- #694 (score 2) — `validate-data.js`'s grid-coverage check is a non-blocking `warn()`, and the
  script itself has zero automated test coverage
- #695 (score 2) — `playable: false` has no movement semantics anywhere in the engine,
  undocumented and unenforced (this is the exact gap that caused this track's own initial wrong
  fix attempt — see Phase 1's "Correction found before implementation began")
- #696 (score 2) — South Mountain map-status facts are duplicated by hand across 7 live doc
  locations with no single source of truth; this is the third PR in a row to pay that cost

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] Ground truth determined with documented evidence
- [x] Issue #691 closed with the resolution
- [x] `validate-data`'s grid-coverage check passes cleanly
- [x] Ready for `/team-review`

---

## Phase 1: Visual Investigation

No map-data changes — this phase produces a determination, not a fix.

### Tasks

- [x] Task 1.1: Started the dev server, navigated to the Map Editor for module `SM` via
      Playwright (`http://localhost:5173/modules/SM/tools/map-editor`)
- [x] Task 1.2: Queried the live app's own computed grid geometry (honeycomb-grid library,
      not a hand-derived formula) directly via `page.evaluate`: `gridSpec.cols: 64` puts
      column 64's hex bounding box at `x=3786.75` to `x=3867.75` (width 81px — `hexWidth: 40.5`
      is a radius, confirmed). The reference image (`sm-map.jpg`) has a real natural width of
      **3804px**. Column 64's hex extends **63.75px past the image's right edge** — 78.7% of
      the hex has no corresponding source pixels at all (the file simply ends at x=3804).
      Column 63's hex (`x=3726`–`3807`) fits essentially flush against the edge.
- [x] Task 1.3: Cropped the raw `sm-map.jpg` at the exact computed boundary (not a screenshot
      of the rendered app, to rule out any client-side rendering artifact) across 4 independent
      rows spanning the full map height (near-top, upper-middle, lower, bottom), with the
      column-64 boundary drawn in as a precise marker line. **Consistent finding across all
      four**: real printed terrain (woods, roads, streams, hex grid lines) extends right through
      the marker line — this is not a blank calibration overshoot. But per Task 1.2's
      measurement, only the leftmost ~21% (17.25px of 81px) of column 64's hex has any image
      data; the remaining ~79% is off the physical scan entirely.
- [x] Task 1.4: Determination documented below.

### Determination

**Column 64 is neither a pure calibration artifact nor a normal genuine gap — it's a partial
"sliver" hex at the true physical edge of the printed map**, consistent with the user's
hypothesis mid-investigation ("column 64 may not have been clickable or ever set because it's
a half hex on the map"). Real terrain exists for roughly the leftmost 21% of the hex; the
remaining ~79% has no source pixels because the physical map sheet ends mid-hex. A full,
normally-digitized hex (matching the terrain/elevation quality of the rest of the map) cannot
be produced for column 64 — there isn't enough of the printed map left to represent.

This is architecturally similar to the already-established convention in this same file for
the 56 row-`00`/`36` border-marker hexes (recorded with `playable: false`, `terrain: "clear"`,
outside the real 1–35 row range) — but not identical, since those are fully outside the
declared row range, while column 64 sits partially inside a hex-width of real content.

**Initial recommendation (superseded — see correction below):** record the 35 column-64 hexes
with `playable: false`, matching the row-marker hexes' flag, while keeping `gridSpec.cols: 64`.

**Correction found before implementation began:** `playable` is consulted **only** by
`edge-strip.js` (edge-feature stripping at authoring time) — nothing in `movement.js` or
`hex.js` checks it. Reachability is gated purely by `gridSpec.cols`/`gridSpec.rows` bounds in
`hexNeighborInDir`; that bounds check, not the `playable` flag, is the actual mechanism that
makes rows 00/36 unreachable today (`gridSpec.rows: 35` excludes rows outside 1–35
structurally). Keeping `gridSpec.cols: 64` and adding column-64 hex records would leave column
64 **inside** the bounds check — units could path-find into these partial/phantom hexes despite
`playable: false`, since nothing in the engine actually enforces that flag for movement. That
would be a real latent bug, not just a cosmetic label mismatch.

**Corrected, approved resolution:** set `gridSpec.cols: 63`. This excludes column 64 from the
reachable grid via the same mechanism already used for rows 00/36 (bounds-check exclusion, not
a flag the engine doesn't enforce) — consistent, not divergent. No column-64 hex records are
added. The real-sliver nuance discovered during Phase 1 is preserved in `map.json`'s
`_description` as documentation, not fabricated as hex data the source material can't actually
support. `validate-data.js`'s grid-coverage check requires no code change — recomputing
`cols × rows` with `cols: 63` automatically yields `2205/2205 = 100%`, since all 2205 in-bounds
cells already have records.

### Verification

- [x] Clear, evidenced determination reached: partial edge-sliver hex, not calibration artifact
      or normal genuine gap
- [x] **Human checkpoint:** user approved the determination; a flaw in the initial recommended
      resolution was found and corrected before implementation (see above), then re-approved

---

## Phase 2: Resolution

Corrected approach (see Phase 1's "Correction found before implementation began"): `gridSpec.cols`
should be `63`, matching the reachability-exclusion mechanism already used for rows 00/36. No
column-64 hex records are added.

### Tasks

- [x] Task 2.1: Fixed `gridSpec.cols` to `63` in `data/modules/south-mountain/map.json`
- [x] Task 2.2: Updated `map.json`'s `_description`/`_digitizationNote` — dropped the column-64
      coverage-gap caveat, replaced with a note explaining the excluded partial-sliver edge
      column and why exclusion via `gridSpec.cols` (not a `playable: false` record) was
      necessary for correct reachability
- [x] Task 2.3: Updated every "2240-cell"/"64x35" reference: `docs/library.md`,
      `docs/library.json`, `docs/agents/domain-expert/design.md`,
      `docs/designs/high-level-design.md` (3 locations, including the risk-register row
      reverted from `Reduced — Medium` back to a clean `Resolved`), `CLAUDE.md`
- [x] Task 2.4: Confirmed `validate-data.js`'s grid-coverage check passes cleanly with no code
      change — `All 2205 in-grid cells (63x35) have a hex record`

### Verification

- [x] `npm run validate-data` — grid-coverage check passes, 0 errors, 1 pre-existing unrelated
      warning
- [x] Full test suite green (3259 passed, 0 regressions), `npm run build` succeeds
- [x] VP-hex reachability re-verified against the corrected `gridSpec`: still 10/10, 2205/2261
      connected (column 64's absence never affected reachability — it had no records either way;
      the change tightens the declared bounds to match reality, not a functional fix)
- [x] Issue #691 closed with the resolution and evidence

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] Tests passing, full quality suite green
- [x] Documentation updated and internally consistent
- [x] Issue #691 closed
- [x] Ready for review

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
