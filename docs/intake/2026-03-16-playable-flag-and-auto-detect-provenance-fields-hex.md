---
issue: 53
title: Add playable and auto-detect provenance fields to HexEntry schema
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

The auto-detect feature requires three new fields on `HexEntry` in `map.json`: `playable` marks off-map partial hexes along the map boundary; `autoDetected` and `detectionConfidence` track whether data came from auto-detect and how confident the classification was.

On the South Mountain map the boundary partial hexes are row 00 (even columns only — top-half hexes along the bottom edge) and row 36 (even columns only — bottom-half hexes along the top edge). All side hexes are full and remain playable. Adding these fields now unblocks all subsequent auto-detect issues (C–J).

See design spec: `docs/map-editor-auto-detect-design.md §9`

## Acceptance criteria

- [ ] `HexEntry` gains `playable: z.boolean().optional()` — omitted means playable (default true), `false` = off-map
- [ ] `HexEntry` gains `autoDetected: z.boolean().optional()`
- [ ] `HexEntry` gains `detectionConfidence: z.number().min(0).max(1).optional()` — present when `autoDetected` is true
- [ ] Row 00 even-column hexes and row 36 even-column hexes pre-seeded with `playable: false` in `map.json`
- [ ] All existing `map.json` entries without the new fields validate successfully (additive, no breakage)
- [ ] New `map.schema.test.js` cases: valid `HexEntry` with `playable: false`; valid with all three fields present; valid with all three omitted
- [ ] `npm run test` passes

## Files to create/modify

- `server/src/schemas/map.schema.js`
- `server/src/schemas/map.schema.test.js`
- `data/scenarios/south-mountain/map.json`

## Tests required

Vitest unit tests in `map.schema.test.js` covering the three new fields.

## Rules / data dependencies

None — purely additive schema change.

## Depends on

None

## Milestone

v1.0 — MVP
