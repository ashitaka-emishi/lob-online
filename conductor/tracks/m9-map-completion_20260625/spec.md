# Spec: M9 Map Completion — South Mountain Hex Digitization

**Track ID:** m9-map-completion_20260625
**Issues:** #669

## Goal

Digitize all remaining `terrain: "unknown"` hexes in `map.json` so the South Mountain
map is complete and the rules engine operates on real terrain data for every hex.

## Current State

376/841 hexes (45%) still have `terrain: "unknown"`. Validate-data warns about this on
every build. The incomplete terrain means movement costs, LOS, and VP table lookups fall
back to defaults rather than real SM terrain.

## Deliverables

- `data/modules/south-mountain/map.json` — all hexes have a concrete terrain type
- Road network: all road hexside edges entered (critical for movement cost)
- Stream / stone wall hexside edges complete
- Ford and bridge features at crossing points complete

## Acceptance Criteria

- `npm run validate-data` produces 0 terrain-unknown warnings
- All hexes have `terrain` ≠ `"unknown"`
- Road, stream, stone wall, and ford/bridge hexside features match the SM map image

## How to Work

`MAP_EDITOR_ENABLED=true npm run dev:map-editor` → open `/tools/map-editor` → use Terrain
and Elevation panels to fill in unknown hexes. Cross-reference `docs/reference/south-mountain/sm-map.jpg`.
