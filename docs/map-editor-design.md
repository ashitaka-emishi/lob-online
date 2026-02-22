# Map Editor — Detailed Design

**Version:** 1.0
**Date:** 2026-02-21
**Status:** Approved — implementation plans reference this document

---

## Table of Contents

1. [Hex Data Model](#1-hex-data-model)
2. [Grid Calibration Extensions](#2-grid-calibration-extensions)
3. [Editor Component Architecture](#3-editor-component-architecture)
4. [Interaction Modes](#4-interaction-modes)
5. [Visualization Layers](#5-visualization-layers)
6. [Save Model](#6-save-model)

---

## 1. Hex Data Model

The current `hexsides` field is replaced by a richer `edges` field that supports multiple
features per edge, movement modifiers, and LOS properties. Slope direction, wedge-level
elevation offsets, and hex-centred features are added as new optional fields. All 30 hexes
currently in `map.json` have `terrain: 'unknown'`, so the migration is trivial — existing
entries require no transformation.

### Type Definitions

```ts
// Six hex directions, indexed 0–5: N=0, NE=1, SE=2, S=3, SW=4, NW=5
type HexDir = 'N' | 'NE' | 'SE' | 'S' | 'SW' | 'NW';

// Hex-centred feature (e.g. a building, ford, or fortification at the hex interior)
type HexFeature = {
  type: string; // e.g. 'building', 'ford', 'fortification', 'springhouse'
};

// Feature on a shared edge between two adjacent hexes
type EdgeFeature = {
  type: string; // e.g. 'road', 'pike', 'trail', 'fence', 'stoneWall',
  //      'bridge', 'stream', 'slope', 'extremeSlope', 'verticalSlope',
  //      'elevation' (thin contour crossing, +1 MP)
  movementModifier?: number; // added movement point cost crossing this edge (positive = harder)
  losBlocking?: boolean; // true if this edge feature blocks LOS between adjacent hexes
  losHeightBonus?: number; // effective height (feet) added to LOS calculation at this edge
};

type HexEntry = {
  hex: string; // 'col.row' — zero-padded to match gridSpec (e.g. '05.10')

  terrain: string; // validated against map.terrainTypes[] metadata list
  elevation: number; // base elevation at hex centre, in feet (contour interval: 50 ft)

  slope?: number; // 0–5: index into HexDir[], identifies downhill face of hex.
  //   0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW.
  //   Omit entirely for flat hexes.
  wedgeElevations?: [number, number, number, number, number, number];
  // Per-wedge elevation offset relative to `elevation`.
  // Wedge i is the triangular segment adjacent to edge HexDir[i].
  // Positive = higher than hex centre; negative = lower.

  features?: HexFeature[]; // Hex-centred features (not associated with any single edge)

  edges?: Partial<Record<HexDir, EdgeFeature[]>>;
  // Multiple features may exist on each edge.
  // Only edges with features need entries; omit empty directions.

  vpHex?: boolean; // true if this hex is a Victory Point hex
  entryHex?: boolean; // true if units may enter the map through this hex
  side?: 'union' | 'confederate'; // if entryHex, which side may enter here
  setupUnits?: string[]; // unit IDs that start the scenario in this hex

  _note?: string; // editor annotation; stripped from engine export
};
```

### Key Design Decisions

**`terrain` validation via metadata list, not Zod enum.**
The Zod schema accepts `z.string()` for the `terrain` field. The valid terrain names are
stored in `map.terrainTypes[]` — a configurable array in `map.json` metadata. The editor
enforces the list at edit time; the schema remains open to new terrain types without a code
change.

**`slope` as a directional index.**
`slope` identifies the _downhill face_ of the hex, not the uphill direction. Value 0–5
maps to N, NE, SE, S, SW, NW respectively (matching the wedge index). A flat hex omits the
field entirely. The SM Special Slope rule (1.1) uses a 50 ft contour interval; the engine
compares adjacent hex elevations and consults this field to determine slope grade.

**`wedgeElevations` are offsets, not absolute values.**
`wedgeElevations[i]` is the elevation offset (positive or negative, in feet) for wedge `i`
relative to `elevation`. This allows fine-grained elevation modelling within a hex without
changing the base elevation used for LOS calculations at the hex centre.

**Edge data is stored redundantly in both hexes.**
Both hexes sharing an edge store the same `EdgeFeature[]` in their respective `edges` maps,
using mirrored directions (e.g. hex A stores the feature on its `'SE'` edge; hex B stores
the same feature on its `'NW'` edge). When the editor paints an edge feature, it updates
both hexes simultaneously. This avoids canonical-owner complexity and makes per-hex lookups
trivially O(1) — the engine never needs to check the neighbouring hex to determine edge
properties.

**`hexsides` field deprecated (removal deferred).**
The legacy `hexsides` field is deprecated in favour of `edges`. The schema retains it as an
optional field until a dedicated migration plan removes it. All existing hex entries have no
hexside data, so the migration requires no data transformation — just a schema and editor pass
to drop the field and update the save path.

**New metadata fields.**
The `map.json` root metadata gains two arrays alongside `terrainTypes` and `hexsideTypes`:

- `hexFeatureTypes: string[]` — valid values for `HexFeature.type`
- `edgeFeatureTypes: string[]` — valid values for `EdgeFeature.type`

### Example HexEntry

```json
{
  "hex": "12.08",
  "terrain": "woods",
  "elevation": 550,
  "slope": 3,
  "wedgeElevations": [0, 25, 50, 0, -25, -25],
  "features": [],
  "edges": {
    "SE": [
      { "type": "stoneWall", "movementModifier": 1, "losBlocking": false, "losHeightBonus": 0.5 }
    ],
    "S": [{ "type": "stream", "movementModifier": 2, "losBlocking": false }]
  },
  "vpHex": false,
  "_note": "Turner's Gap ridge line — stone wall along SE face"
}
```

---

## 2. Grid Calibration Extensions

Two fields are added to the existing `gridSpec` object in `map.json`:

| Field      | Type      | Range / Default   | Description                                                                                                                                                |
| ---------- | --------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rotation` | `number`  | −15 to +15, def 0 | Grid rotation in degrees, applied as an SVG `rotate` transform around the grid anchor point. Corrects for map images that are not perfectly axis-aligned.  |
| `locked`   | `boolean` | default `false`   | When `true`, `CalibrationControls` disables all inputs and displays a lock indicator. Prevents accidental calibration changes after the grid is finalised. |

### Zod Schema Additions

```js
// server/src/schemas/map.schema.js — additions to GridSpecSchema
rotation: z.number().min(-15).max(15).optional(),
locked: z.boolean().optional(),
```

### Behaviour

- `rotation` is applied as `transform="rotate(deg, anchorX, anchorY)"` on the root `<g>` in
  `HexMapOverlay`. The anchor point is the computed pixel position of hex `(0, 0)` — the
  same origin used for all other grid calculations. Default 0 produces no transform.
- `locked` only affects the UI. A locked `gridSpec` is still validated and saved normally.
  The lock state is stored in `gridSpec` (persisted to `map.json`), not just in localStorage.

---

## 3. Editor Component Architecture

```
MapEditorView.vue              ← orchestrator; owns all editor state
  ├── EditorToolbar.vue        (NEW) ← mode selector, paint terrain/edge picker, layer toggles
  ├── HexMapOverlay.vue        (EXTEND) ← layer rendering, edge overlay, multi-select rect
  ├── CalibrationControls.vue  (EXTEND) ← rotation slider, grid lock toggle
  ├── HexEditPanel.vue         (EXTEND) ← elevation, slope direction, hex features list
  ├── WedgeEditor.vue          (NEW) ← graphical 6-wedge hex diagram with elevation offsets
  └── EdgeEditPanel.vue        (NEW) ← list editor for multiple features on a selected edge
```

### Per-Component Scope

**`CalibrationControls.vue` (extend)**
Add a `rotation` number input (range −15 to +15, step 0.5°) bound to `gridSpec.rotation`.
Add a `locked` toggle button that disables all other calibration inputs when active. All
existing inputs, sliders, and buttons are unchanged.

**`HexMapOverlay.vue` (extend)**
Add props: `layers` (object), `editorMode` (string), `paintTerrain` (string).
Add SVG `<g>` groups for wedge shading, edge feature lines, slope arrows, and rubber-band
selection rect. Replace the cell visibility filter (which currently limits rendering to VP
and selected hexes) with "show all hexes" — unknown terrain hexes appear as grey fills.
Apply `gridSpec.rotation` as an SVG `rotate` transform on the root grid `<g>`.

**`HexEditPanel.vue` (extend)**
Replace the `hexsides` fieldset with an `edges` section: for each of the 6 directions, show
the list of `EdgeFeature` objects with add/remove buttons and inline inputs for `type`,
`movementModifier`, `losBlocking`, `losHeightBonus`. Add a `slope` direction picker (a mini
hex diagram with 6 clickable direction zones). Add a `features` list with add/remove buttons
for hex-centred features.

**`EditorToolbar.vue` (NEW)**
Mode toggle button group: `select` / `paint` / `elevation` / `edge`. Active terrain picker
(colour-coded buttons, one per terrain type from `map.terrainTypes`). Active edge feature
picker (shown in `edge` mode). Layer visibility checkboxes. "Export engine JSON" button.

**`WedgeEditor.vue` (NEW)**
SVG hex diagram divided into 6 wedge triangles. Each wedge shows its elevation offset value.
Click a wedge to open an inline number input for editing the offset. Emits
`update:wedgeElevations` to the parent. Only shown when `wedgeElevations` editing is enabled
in the hex edit panel.

**`EdgeEditPanel.vue` (NEW)**
Shown when `selectedEdge` is non-null (set by edge-mode click). Lists all `EdgeFeature`
objects for the selected edge. Add/remove buttons. Inline inputs for `type` (dropdown from
`map.edgeFeatureTypes`), `movementModifier` (number), `losBlocking` (checkbox),
`losHeightBonus` (number). Edits apply simultaneously to both the clicked hex and the
mirrored adjacent hex.

### State Owned by `MapEditorView`

```js
// Editor mode
const editorMode = ref('select'); // 'select' | 'paint' | 'elevation' | 'edge'
const paintTerrain = ref('clear'); // active terrain type for paint mode
const paintEdgeFeature = ref(null); // { type, movementModifier, ... } | null

// Selection
const selectedHexIds = ref(new Set()); // supports multi-select
const selectedEdge = ref(null); // { hexId, dir } | null; set in edge mode

// Layer visibility (each layer is an independent SVG <g> in HexMapOverlay)
const layers = ref({
  grid: true,
  terrain: true,
  elevation: false,
  wedges: false,
  edges: true,
  slopeArrows: false,
});
```

---

## 4. Interaction Modes

### Select Mode (default)

- **Click hex** → single select; clears previous selection; opens `HexEditPanel` for the
  clicked hex. Auto-creates `{ hex: id, terrain: 'unknown', elevation: 0 }` in `hexes[]`
  if the hex is not yet tracked.
- **Shift+click** → toggle the hex in or out of the current multi-selection. Does not close
  the edit panel if the primary hex remains selected.
- **Drag on empty map area** → rubber-band rectangle. On mouse-up, all hexes whose centres
  fall inside the rectangle are added to the selection.
- **Escape** → clear all selection; close edit panel.
- **Multi-select edit** — when more than one hex is selected, `HexEditPanel` shows only
  bulk-applicable fields: terrain (applied to all), elevation delta (added to each hex's
  current elevation). Individual edge/slope/feature editing requires a single-hex selection.

### Paint Mode

- Active terrain type is shown in `EditorToolbar` with a colour-coded indicator.
- **Click or click-drag** → set `terrain` on each hex the cursor enters to `paintTerrain`.
  Auto-creates the hex entry if not present: `{ hex: id, terrain: paintTerrain.value, elevation: 0 }`.
- Paint is immediate — no edit panel interaction. The hex is not selected.
- Marks `unsaved = true` on each paint operation.
- Entering paint mode clears `selectedHexIds` to avoid a stale edit panel.

### Elevation Mode

- **Click** → increment `elevation` by the contour interval (default 50 ft, from
  `scenario.rules.slopeContourInterval`).
- **Shift+click** → decrement elevation by one contour interval.
- **Click-drag** → applies the increment/decrement continuously to each hex the cursor
  enters. Direction (up/down) is fixed at mouse-down: shift held at drag start = decrement
  for the entire drag.
- Marks `unsaved = true` on each change.

### Edge Draw Mode

- Active edge feature type is shown in `EditorToolbar`.
- `onMousemove` detects which edge is closest to the cursor: compare the cursor position to
  the midpoint of each of the hex's 6 edges (midpoint of corner[i] and corner[(i+1)%6]).
  Snap to the nearest edge midpoint within a threshold of ~8 px at 1× zoom. The snapped
  edge is highlighted in `HexMapOverlay`.
- **Click or click-drag** → add the active `EdgeFeature` to the snapped edge. Updates the
  `edges` field in both the hovered hex and the mirrored direction of the adjacent hex.
- If an identical feature type already exists on the edge, the click removes it (toggle
  behaviour).
- Marks `unsaved = true` on each change.

---

## 5. Visualization Layers

Each layer is an independent SVG `<g>` element inside `HexMapOverlay`. Layers are toggled
by the `layers` prop and rendered in the order below (bottom to top).

**Render order:** terrain → wedge shading → grid → edges → slope arrows → selection overlays

| Layer             | `layers` key  | Render element                            | Notes                                                                                                                                                                                            |
| ----------------- | ------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Terrain           | `terrain`     | `<polygon fill>` per hex                  | Terrain colour at 0.45 opacity. Unknown hexes: `#cccccc` at 0.3 opacity.                                                                                                                         |
| Wedge shading     | `wedges`      | 6 `<polygon>` triangles per hex           | Each wedge: fill white (positive offset) or black (negative), opacity proportional to `abs(offset) / 100`. Only rendered for hexes with `wedgeElevations`.                                       |
| Grid              | `grid`        | `<polygon stroke>` per hex                | Outline at low opacity (stroke-width per `gridSpec.strokeWidth`). Always visible; opacity is independent of `layers.grid` toggle (the toggle hides the thick diagnostic outline only).           |
| Base elevation    | `elevation`   | `<text>` at hex centre                    | Numeric label (feet). Omitted when `elevation === 0`.                                                                                                                                            |
| Edge features     | `edges`       | `<line>` along each edge                  | Line runs from 20% to 80% along the edge (from corner[i] toward corner[(i+1)%6]). Colour-coded by feature type (road=brown, stream=blue, stoneWall=grey, slope=orange, verticalSlope=red, etc.). |
| Slope arrows      | `slopeArrows` | `<path>` arrow at hex centre              | SVG arrow pointing in the `slope` direction. Only rendered for hexes where `slope` is defined.                                                                                                   |
| Selection overlay | _(always)_    | `<polygon stroke>` + rubber-band `<rect>` | Selected hexes: yellow stroke. Multi-select rect: dashed blue border. VP hexes: red stroke. These are always rendered regardless of layer toggles.                                               |

### Geometry Formulas

**Wedge geometry.** Wedge i = triangle from hex centre to corner[i] to corner[(i+1)%6].
SVG polygon points are drawn from `hex.corners` provided by honeycomb-grid. The centre
point is `hex.origin` (or the computed pixel centre for the current gridSpec).

**Edge midpoint geometry.** Edge i midpoint = average of corner[i] and corner[(i+1)%6].
The edge feature line runs from the point 20% along the edge from corner[i] to the point
80% along — keeping the line clear of hex corners where multiple edges meet.

**Slope arrow geometry.** A simple SVG arrowhead centred at the hex centre, rotated by
`slope × 60°` (since HexDir indices are 60° apart: 0=N=0°, 1=NE=60°, 2=SE=120°, etc.).

### Direction Index Reference

| Index | HexDir | Compass bearing | Wedge / slope direction |
| ----- | ------ | --------------- | ----------------------- |
| 0     | N      | 0°              | North face              |
| 1     | NE     | 60°             | Northeast face          |
| 2     | SE     | 120°            | Southeast face          |
| 3     | S      | 180°            | South face              |
| 4     | SW     | 240°            | Southwest face          |
| 5     | NW     | 300°            | Northwest face          |

This mapping is used consistently across §1 (`slope`, `wedgeElevations`) and §5 (wedge
geometry, slope arrows, edge midpoints).

---

## 6. Save Model

### Three Tiers, in Order of Authority

**Tier 1 — localStorage autosave (working copy)**

Every change to `mapData` (terrain paint, elevation edit, edge paint, hex feature change)
is immediately serialised and written to a dedicated localStorage key
(`lob-map-editor-mapdata-v1`). The stored value includes a `_savedAt` ISO timestamp field.

On load, if the server returns map data AND localStorage has a working copy with a newer
`_savedAt` timestamp than the server response, the editor shows a banner offering to restore
the local draft. The user can dismiss the banner to discard the draft and use the server
version.

This preserves work across browser reloads without server round-trips and provides a
safety net against accidental navigation away from the editor.

**Tier 2 — Server save (authoritative copy)**

The "Save" button performs `PUT /api/tools/map-editor/data` with the full `mapData` object.
The server Zod-validates the payload and writes it to
`data/scenarios/south-mountain/map.json`. This file is part of the server codebase and is
committed to the repository.

On successful save, the localStorage working copy is cleared — the server copy becomes the
source of truth. On failure, the localStorage copy is retained and the error is shown to the
user.

No change to the endpoint itself. The Zod schema is updated to validate the new fields
(`edges`, `slope`, `wedgeElevations`, `features`, `gridSpec.rotation`, `gridSpec.locked`).

**Tier 3 — Engine export (client-side download)**

The "Export engine JSON" button in `EditorToolbar` produces a stripped version of the map
data suitable for game engine consumption. It removes all editor-only fields:

- Removed: `_note`, `_todoHexes`, `_digitizationPlan`, `_status`, any field prefixed `_`
- Retained: `hexes` (with `terrain`, `elevation`, `slope`, `wedgeElevations`, `features`,
  `edges`, `vpHex`, `entryHex`, `side`, `setupUnits`), `vpHexes`, `entryHexes`, `gridSpec`,
  `terrainTypes`, `hexFeatureTypes`, `edgeFeatureTypes`

The export is triggered as a client-side file download via a temporary `<a download>` link
— no server round-trip. This is optional and lower priority than the server save; the server
save (Tier 2) is the primary output consumed by the game engine.

### Conflict and Draft Restoration Flow

```
1. User opens editor
2. Client fetches GET /api/tools/map-editor/data → serverData (has serverData._savedAt)
3. Client reads localStorage['lob-map-editor-mapdata-v1'] → draft (has draft._savedAt)
4. If draft exists AND draft._savedAt > serverData._savedAt:
     Show banner: "You have unsaved local changes from <time>. Restore draft?"
     [Restore] → use draft as working copy
     [Discard] → use serverData; clear localStorage key
   Else:
     Use serverData as working copy; clear localStorage key if stale
5. On any edit: immediately write updated mapData (with _savedAt = now) to localStorage
6. On "Save": PUT serverData; on 200 → clear localStorage key
```
