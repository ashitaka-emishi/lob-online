# Specification: Map Editor Bug Fixes — #416, #418, #419

**Track ID:** map-editor-bugs_20260524
**Type:** Bug
**Created:** 2026-05-24
**Status:** Draft

## Summary

Three map editor bugs: (1) elevation/slope hex-side lines are too faint to read — update
stroke widths and colors per user spec; (2) hex edges must not be set between playable and
non-playable hexes — block the interaction and strip any existing boundary edges on save;
(3) terrain should never default to `unknown` — eliminate the type from the editor UI, data
model, and stub fallback.

## Context

The map editor is a dev tool guarded by MAP_EDITOR_ENABLED=true. Edge features are stored by
face index 0–2 in canonical JSON. Playable status is a `playable: boolean` field on hex
entries. The `resolveHexOrStub` utility creates stubs with `terrain: 'unknown'` for hexes
not yet in the map index; `useMapPersistence.migrateUnknownTerrain` normalises these on load
but the upstream source still emits `unknown`.

## Acceptance Criteria

### #416 — Slope visibility

- [ ] `extremeSlope` renders as thick black (strokeWidth 7, color #000000)
- [ ] `slope` renders as thick medium-grey (strokeWidth 5, color #666666)
- [ ] `elevation` contour renders as medium-thick 35%-gray (strokeWidth 3, color #595959)
- [ ] `verticalSlope` is unchanged (red)
- [ ] Changes apply in both the map editor overlay and any tool panel legend swatches

### #418 — Disallow edges at playable/non-playable boundary

- [ ] Clicking an edge where either adjacent hex has `playable: false` is a no-op (silent)
- [ ] This guard applies to all edge tools (road, stream, contour) and the legacy toggle path
- [ ] On save (push to server), any edge features stored on a face at a
      playable/non-playable boundary are stripped from the map data before the PUT request
- [ ] Stripped edges do not appear in saved `map.json`

### #419 — Default terrain is `clear`, not `unknown`

- [ ] `resolveHexOrStub` returns `{ terrain: 'clear' }` stubs instead of `{ terrain: 'unknown' }`
- [ ] `HexMapOverlay` falls back to `'clear'` when terrain is absent, not `'unknown'`
- [ ] `TerrainToolPanel` does not list `unknown` as a selectable terrain type
- [ ] `TERRAIN_COLORS` in `feature-types.js` does not include an `unknown` entry
- [ ] `migrateUnknownTerrain` comment updated (unknown is no longer produced at source)
- [ ] Saved/exported map data contains no `unknown` terrain values

## Dependencies

- `client/src/config/feature-types.js` — CONTOUR_GROUPS, TERRAIN_COLORS
- `client/src/utils/hexGeometry.js` — resolveHexOrStub
- `client/src/composables/useEdgeToggle.js` — legacy onEdgeClick
- `client/src/views/tools/MapEditorView.vue` — onEdgeClick dispatch, save flow
- `client/src/composables/useMapPersistence.js` — \_executePush, migrateUnknownTerrain
- `client/src/components/HexMapOverlay.vue` — terrain fallback
- `client/src/components/TerrainToolPanel.vue` — terrain type lists
- `client/src/formulas/edge-model.js` — strip helper for pre-save cleanup

## Out of Scope

- Fixing `los.js` `unknown: 0` entry (harmless dead code; tracked separately if needed)
- Any changes to `verticalSlope` rendering
- Other edge rendering correctness bugs not mentioned above
- Changing how `playable: false` hexes render (fill, label, etc.)

## Technical Notes

**#418 guard:** `onEdgeClick` in `MapEditorView.vue` is the single dispatch point for all
edge clicks. Add an `isNonPlayableBoundary(hexId, dir)` helper there using `hexIndex` and
`mapData` to check `hex.playable === false` on either side. Return early before routing to
either EDGE_DISPATCH or `legacyOnEdgeClick`.

**#418 pre-save strip:** Add `stripNonPlayableBoundaryEdges(hexes, gridSpec)` to
`edge-model.js` as a pure exported function. It walks canonical faces 0–2 per hex, uses
`adjacentHexId` to find the neighbor, and deletes the face array when either side has
`playable: false`. Wire it into a `handleSave()` wrapper in `MapEditorView.vue` that strips
then calls `save()`.

**#419:** The `unknown` terrain type is currently emitted by `resolveHexOrStub` (hexGeometry)
and used as a fallback in `HexMapOverlay`. After this fix, `migrateUnknownTerrain` becomes
a migration-only safety net for legacy persisted data and no longer fires in normal use.
