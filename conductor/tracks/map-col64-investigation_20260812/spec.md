# Specification: South Mountain Map — Column 64 Investigation

**Track ID:** map-col64-investigation_20260812
**Type:** Chore
**Created:** 2026-08-12
**Status:** Complete

## Summary

Resolve whether South Mountain's declared 64-column grid (`gridSpec.cols: 64`) genuinely has
a real, undigitized column 64, or whether `gridSpec.cols` is a calibration artifact that should
be 63 — a question raised as issue #691 during `/agent-teams:team-review` on PR #690.

## Context

`data/modules/south-mountain/map.json`'s `gridSpec` declares `cols: 64, rows: 35` (2240 cells),
but column 64 has **zero hex records** — not sparse, literally none — in every version of this
data going back to the original 2026-05-23 stash (`archive/stash-0-map-recovery`) that
`map-data-recovery_20260811` (#689) recovered. This predates that recovery entirely; it was
never digitized by anyone, at any point in this project's history. Real in-grid coverage is
2205/2240 cells (98.4%).

This is distinct from the row `00`/`36` margin, which _does_ have explicit hex records (56 of
them, all `playable: false`) — column 64 has no records of any kind, not even placeholder
markers. `scripts/validate-data.js` now has a grid-coverage check (added in #690) that reports
this as an expected warning:

```
⚠ 2205/2240 in-grid cells (64x35) have a hex record — grid coverage incomplete
```

Two possibilities, not yet distinguished:

1. **Calibration artifact** — `gridSpec.cols` should be `63`, not `64`. The printed map
   (`docs/reference/south-mountain/sm-map.jpg`) genuinely only has 63 columns, and 64 was an
   off-by-one in the original grid calibration (from the very earliest map-editor work,
   `4b2a0ff feat: add South Mountain map calibration (gridSpec) to map.json (#60)`). If so, the
   grid overlay at the calibrated column-64 position should fall visibly past the right edge of
   the printed map image.
2. **Genuine gap** — column 64 exists on the printed map but was never digitized. If so, the
   grid overlay at column 64 should land on real printed hex content.

## Acceptance Criteria

- [x] Grid overlay at column 64's calibrated pixel position visually inspected against
      `sm-map.jpg` — the live app's own computed geometry directly, plus precise pixel-marked
      crops of the raw reference image across 4 rows spanning the full map height (more
      rigorous than the originally-planned single Map Editor screenshot, since the first check
      surfaced an ambiguous result that needed cross-validation)
- [x] Ground truth determined: **neither** of the two originally-hypothesized outcomes exactly
      — column 64 is a partial "sliver" hex at the true physical edge of the printed map. Real
      terrain exists for ~21% of the hex (17px of 81px width); the remaining ~79% has no source
      pixels because the physical scan ends at x=3804. Not a pure calibration overshoot (there
      is real content), not a normal digitizable gap (there isn't enough content for a full hex)
- [x] Resolution applied: `gridSpec.cols` fixed to `63` — the same reachability-exclusion
      mechanism already used for rows 00/36 (bounds-check in `hexNeighborInDir`, not a
      `playable: false` flag, which the engine doesn't actually enforce for movement). Initial
      recommendation (record 35 `playable: false` hex entries, keep `cols: 64`) was caught and
      corrected before implementation — it would have left column 64 reachable by the movement
      engine despite the flag. Every "2240-cell"/"64x35" reference updated across `map.json`
      internal metadata, `docs/library.md`, `docs/library.json`,
      `docs/agents/domain-expert/design.md`, `docs/designs/high-level-design.md` (3 locations),
      `CLAUDE.md`
- [x] Issue #691 closed with the resolution and the evidence from the investigation
- [x] `npm run validate-data` grid-coverage check passes cleanly — `2205/2205` (100%)
- [x] Full quality suite green (`validate-data`, `lint`, `format:check`, `test` — 3259 passed,
      0 regressions, `build`)

## Dependencies

PR #690 (`map-data-recovery_20260811`) merged — this track builds on its corrected
understanding of the map's real coverage and the `validate-data.js` grid-coverage check it
added.

## Out of Scope

- #685's hexside-network visual audit (roads/streams/walls against `sm-map.jpg`) and the full
  playtest — separate issue, not this track's job
- Any map data change beyond resolving the column-64 question specifically

## Technical Notes

- Risk Classification: **High** — if the resolution is "genuine gap," this touches
  `data/modules/south-mountain/map.json` (game-state-adjacent data) the same way
  `map-data-recovery_20260811` did. Classified High upfront since the outcome isn't known
  before Phase 1 completes.
- Interaction Mode: **Checkpointed** — human checkpoint after Phase 1's visual investigation,
  before Phase 2 applies either resolution path. Which path to take is a domain/data decision,
  not a pure technical one.
- Reference image: `docs/reference/south-mountain/sm-map.jpg`, natural dimensions 3804×2471px
  (confirmed during `map-data-recovery_20260811` Phase 4 manual testing). `gridSpec`:
  `dx: 39.75, dy: 36, hexWidth: 40.5, hexHeight: 40.7, imageScale: 1`.

---

_Generated by Conductor. Review and edit as needed._
