# Implementation Plan: South Mountain Map — Column 64 Investigation

**Track ID:** map-col64-investigation_20260812
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-12
**Status:** [ ] Not Started

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
- [ ] Ground truth determined with documented evidence
- [ ] Issue #691 closed with the resolution
- [ ] `validate-data`'s grid-coverage check passes cleanly
- [ ] Ready for `/team-review`

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

**Recommended resolution** (for human checkpoint approval): record the 35 column-64 hexes
(rows 1–35) using the same `playable: false` convention as the row-marker hexes — `terrain`
set generically (e.g. `"clear"`, matching the border-marker precedent) rather than attempting
per-hex terrain typing that the source material can't actually support, with a `_note`
documenting the partial-hex reason. Keep `gridSpec.cols: 64` as-is (it's not wrong — the grid
rectangle legitimately needs to extend that far to capture the real 21%-sliver content for
rendering/calibration purposes; only playable _gameplay_ hexes are excluded). Update
`validate-data.js`'s grid-coverage check to also exclude column 64 the same way it (implicitly,
via `playable: false` hexes still counting as "recorded") already handles rows 00/36, so the
check reports true 100% coverage of the _playable_ grid rather than continuing to warn.

### Verification

- [x] Clear, evidenced determination reached: partial edge-sliver hex, not calibration artifact
      or normal genuine gap
- [ ] **Human checkpoint:** user approves the determination and the resulting resolution plan
      before Phase 2 begins

---

## Phase 2: Resolution

Exactly one of the following sub-plans applies, per Phase 1's determination.

### Tasks — if calibration artifact (gridSpec.cols should be 63)

- [ ] Task 2a.1: Fix `gridSpec.cols` to `63` in `data/modules/south-mountain/map.json`
- [ ] Task 2a.2: Update `map.json`'s `_description`/`_digitizationNote` to drop the column-64
      caveat entirely
- [ ] Task 2a.3: Update every "2240-cell"/"64x35" reference: `docs/library.md`,
      `docs/library.json`, `docs/agents/domain-expert/design.md`,
      `docs/designs/high-level-design.md` (including reverting the risk-register row from
      `Reduced — Medium` back to a clean `Resolved`, since the coverage gap that kept it at
      Medium will no longer exist), `CLAUDE.md`
- [ ] Task 2a.4: Confirm `validate-data.js`'s grid-coverage check passes cleanly with no code
      change (it recomputes from `gridSpec.cols × rows`, so fixing the constant alone resolves
      the warning)

### Tasks — if genuine gap (35 hexes need digitizing)

- [ ] Task 2b.1: Digitize the 35 column-64 hexes via the Map Editor (terrain, elevation, and
      any hexside features), cross-referencing `sm-map.jpg`
- [ ] Task 2b.2: Re-verify VP-hex reachability and elevation completeness are unaffected
      (should only improve, never regress)
- [ ] Task 2b.3: Update `map.json`'s `_description`/`_digitizationNote` and the same doc
      locations as 2a.3 to reflect true 100% in-grid coverage (risk register back to
      `Resolved`)
- [ ] Task 2b.4: Confirm `validate-data.js`'s grid-coverage check passes cleanly

### Verification (either path)

- [ ] `npm run validate-data` — grid-coverage check passes, 0 errors
- [ ] Full test suite green, `npm run build` succeeds
- [ ] Issue #691 closed with the resolution and evidence

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] Tests passing, full quality suite green
- [ ] Documentation updated and internally consistent
- [ ] Issue #691 closed
- [ ] Ready for review

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
