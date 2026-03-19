# Map Editor — Detailed Design

**Version:** 2.0
**Date:** 2026-03-19
**Status:** Approved — supersedes v1.0 (2026-02-21)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Hex Data Model](#2-hex-data-model)
3. [Tool Inventory](#3-tool-inventory)
4. [Tool Panel Framework](#4-tool-panel-framework)
5. [Grid Calibration Tool](#5-grid-calibration-tool)
6. [Elevation Tool](#6-elevation-tool)
7. [Terrain Tool](#7-terrain-tool)
8. [Road Tool](#8-road-tool)
9. [Stream and Stone Wall Tool](#9-stream-and-stone-wall-tool)
10. [Contour Line Tool](#10-contour-line-tool)
11. [Ford and Bridge Controls](#11-ford-and-bridge-controls)
12. [LOS Test Panel](#12-los-test-panel)
13. [Hover Tooltip](#13-hover-tooltip)
14. [Save Model](#14-save-model)
15. [Formula and Config Modules](#15-formula-and-config-modules)

---

## 1. Overview

The map editor is a dev-only tool for digitizing `docs/reference/sm-map.jpg` into structured hex
terrain data in `data/scenarios/south-mountain/map.json`. It is guarded by `MAP_EDITOR_ENABLED=true`
and never active in production.

### Design Philosophy

Each tool owns a specific, narrow set of map model properties. The engineer completes one full pass
over the map per tool (all elevations first, then terrain, then roads, etc.) rather than editing
each hex end-to-end. This produces consistent results and keeps each tool's overlay uncluttered.

### Tool-Based Interaction Model

- **One tool active at a time.** Tools are accordion panels in the right sidebar. Opening a panel
  activates that tool; only one panel can be open at a time.
- **No tool active = no map interaction.** When no panel is open, the only map interaction is
  scroll/pan. A hover tooltip (§13) shows all hex data for the hex under the cursor.
- **Tools own their overlays.** Each tool declares an `overlayConfig` (§4) that drives
  `HexMapOverlay`. No global layer toggle bar exists.

---

## 2. Hex Data Model

### Type Definitions

```ts
// Face index 0–5, clockwise from the top face in the rendered SVG grid.
// 0 = top, 1 = top-right, 2 = bottom-right, 3 = bottom, 4 = bottom-left, 5 = top-left.
// Geometry labels — independent of compass direction. Compass labels are derived at
// render time from gridSpec.northOffset (see §5).
type FaceIndex = 0 | 1 | 2 | 3 | 4 | 5;

// A single hex-wide feature. Only one may exist per hex.
type HexFeature = {
  type: 'building'; // only valid value in South Mountain
};

type EdgeFeature = {
  type: string;
  movementModifier?: number;
  losBlocking?: boolean;
  losHeightBonus?: number;
};

type HexEntry = {
  hex: string; // 'col.row' zero-padded, e.g. '05.10'
  terrain: string; // validated against map.terrainTypes[]
  elevation: number; // integer level index (0-based)

  hexFeature?: HexFeature;

  // Canonical edge ownership: only face indices 0, 1, 2 are stored on this hex.
  // Face indices 3, 4, 5 are owned by the respective neighbour hex, stored there
  // as face index (dir − 3). See §2 Canonical Edge Ownership.
  edges?: Partial<Record<0 | 1 | 2, EdgeFeature[]>>;

  vpHex?: boolean;
  entryHex?: boolean;
  side?: 'union' | 'confederate';
  setupUnits?: string[];
  _note?: string;
};
```

### Face Index and North Offset

**Face indices (0–5) are geometry-stable.** They describe physical hex face positions in the SVG
grid, clockwise from the top face, independent of compass direction.

The map's compass orientation is captured by `gridSpec.northOffset` (integer 0–11, 30° per step).
The UI converts face indices to compass labels at render time using `compassLabel()` in
`compass.js` (§15). **Changing `northOffset` never corrupts edge data** — only display labels
change.

### Canonical Edge Ownership

Every shared edge is stored on exactly one hex — the **canonical owner**.

**Rule:** face indices 0, 1, 2 are stored on the current hex. Face indices 3, 4, 5 are stored on
the neighbour in that direction as face index `(dir − 3)`.

```js
// Engine / editor lookup — see edge-model.js (§15)
function getEdgeFeatures(hexMap, hexId, dir, gridSpec) {
  if (dir < 3) return hexMap[hexId]?.edges?.[dir] ?? [];
  const neighborId = getNeighborId(hexId, dir, gridSpec);
  return hexMap[neighborId]?.edges?.[dir - 3] ?? [];
}
```

Editor writes only the canonical owner's entry. Map boundary edges (no neighbour in `hexes[]`)
return `[]` — same as the engine's missing-hex handling.

### Edge Feature Coexistence Rules

Enforced by Zod schema at save time and by `validateCoexistence()` in `edge-model.js` at paint
time:

| Group   | Types                                                 | Rule                                                                            |
| ------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Road    | `trail`, `road`, `pike`                               | Coexist freely with each other and all other groups                             |
| Contour | `elevation`, `slope`, `extremeSlope`, `verticalSlope` | **Mutually exclusive** within this group; at most one per edge                  |
| Linear  | `stream`, `stoneWall`                                 | Coexist with any other edge feature                                             |
| Ford    | `ford`                                                | Valid only when `stream` also exists on the same edge                           |
| Bridge  | `bridge`                                              | Valid only when at least one of `road`, `trail`, `pike` exists on the same edge |

### Map Metadata

- `terrainTypes: string[]` — valid terrain names (editor enforces at edit time)
- `elevationSystem: { baseElevation, elevationLevels }` — integer level count (0-based)

### Key Design Decisions

**`hexFeature` replaces `features[]`.** South Mountain has only one hex-wide feature type
(buildings). A single optional field is simpler and avoids empty-array noise.

**Elevation as integer level index.** Editor and overlays work in levels (0 to
`elevationLevels − 1`). Physical feet are context only.

**Canonical edge ownership.** Halves edge storage and eliminates sync bugs. Engine lookups require
a neighbour check for faces 3–5, already required for movement and LOS.

**`hexsides` removed.** All existing entries had no hexside data; no migration needed.

---

## 3. Tool Inventory

| Panel               | Edits                                              | Base composable    |
| ------------------- | -------------------------------------------------- | ------------------ |
| Grid Calibration    | `gridSpec`                                         | — (inputs only)    |
| Elevation           | `hex.elevation`                                    | `useHexPaintTool`  |
| Terrain             | `hex.terrain`, `hex.hexFeature`                    | `useHexPaintTool`  |
| Road                | `edges[0‒2]` ∈ {trail, road, pike}                 | `useEdgePaintTool` |
| Stream & Stone Wall | `edges[0‒2]` ∈ {stream, stoneWall}                 | `useEdgePaintTool` |
| Contour Line        | `edges[0‒2]` ∈ {elevation, slope, extremeSlope, …} | `useEdgePaintTool` |
| LOS Test            | read-only                                          | — (standalone)     |

---

## 4. Tool Panel Framework

### Component and Composable Diagram

```
MapEditorView.vue  (orchestrator — owns mapData, calibration, openPanel, onMutated)
│
├── HexMapOverlay.vue
│   │  Receives overlayConfig from the active tool panel.
│   │  Contains zero tool-specific logic.
│   └── Primitive layer renderers (all driven by overlayConfig):
│       ├── HexGridLayer      gridSpec → hex outlines
│       ├── HexFillLayer      fillFn(hex) → per-hex color polygon
│       ├── HexLabelLayer     labelFn(hex) → text at hex center
│       ├── HexIconLayer      iconFn(hex) → SVG icon at hex center
│       ├── EdgeLineLayer     featureGroups, style → lines along or through edges
│       └── HexHighlightLayer hexIds → outlined/tinted specific hexes
│
├── Accordion panels (one open at a time → active tool)
│   │
│   ├── CalibrationPanel.vue          (standalone — not a BaseToolPanel)
│   │
│   ├── ElevationToolPanel.vue ───────┐
│   ├── TerrainToolPanel.vue  ────────┤  All extend BaseToolPanel.vue
│   ├── RoadToolPanel.vue     ────────┤  BaseToolPanel provides:
│   ├── StreamWallToolPanel.vue ──────┤    • overlayConfig → HexMapOverlay
│   └── ContourToolPanel.vue  ────────┘    • ToolChooser.vue (shared chooser)
│                                          • clear-all button + ConfirmDialog
│                                          • help popup
│                                          • auto-rendered toggles for non-alwaysOn layers
│
└── Composables
    ├── useHexPaintTool.js     hex click / paint / right-click clear
    │   └── usePaintStroke.js  stroke start/end; suppresses per-hex localStorage saves
    │
    ├── useEdgePaintTool.js    edge paint / right-click clear / clearAll(allowedTypes)
    │   └── usePaintStroke.js  (shared)
    │
    ├── useClickHexside.js     single-click edge placement with validateFn
    │   (used inside RoadToolPanel for bridge, StreamWallToolPanel for ford)
    │
    └── (existing) useMapPersistence, useLosTest, useEditorAccordion, …

Config / formula layer (pure functions, no Vue — see §15)
    ├── config/feature-types.js   type strings + display properties (colors, styles, labels)
    ├── formulas/hex-geometry.js
    ├── formulas/compass.js
    ├── formulas/edge-model.js
    ├── formulas/elevation.js
    └── formulas/los.js
```

### Interaction Gate

`HexMapOverlay` emits click, right-click, and mouseenter events only when a data-editing tool is
active (`openPanel` ∈ `{elevation, terrain, road, stream, contour}`). When no data-editing tool
is open, the overlay renders the hover tooltip but emits no interaction events.

### Overlay System

`HexMapOverlay` is a **declarative renderer**. Each tool panel computes an `overlayConfig` object;
the overlay renders whichever primitive layers are specified. Zero tool-specific logic lives in
`HexMapOverlay`.

**Overlay config shape:**

```js
overlayConfig = {
  grid: {
    alwaysOn: true,
    weight: 'faint' | 'diagnostic',   // faint = 0.3 opacity thin; diagnostic = full calibration grid
  },
  hexFill: {
    alwaysOn: true | false,
    toggleLabel: string,               // present when alwaysOn: false → BaseToolPanel renders checkbox
    fillFn: (hex) => cssColor | null,
  },
  hexLabel: {
    alwaysOn: true | false,
    toggleLabel: string,
    labelFn: (hex) => string | null,
    size: 'large' | 'small',
  },
  hexIcon: {
    alwaysOn: true | false,
    iconFn: (hex) => iconKey | null,   // iconKey resolves to an SVG symbol
  },
  edgeLine: {
    alwaysOn: true,
    style: 'along-edge' | 'through-hex',
    featureGroups: [                   // ordered; last group renders on top
      { types: string[], color: string, strokeWidth: number, dash?: string },
    ],
  },
  highlight: {
    alwaysOn: true,
    hexIds: string[],
    strokeColor: string,
  },
}
```

**Toggle pattern:** layers with `alwaysOn: false` have a `toggleLabel`. `BaseToolPanel` reads the
`overlayConfig` and automatically renders a labelled checkbox for each toggleable layer. The tool
panel's local state tracks the current `active` value and passes the updated config to
`HexMapOverlay`. Tools never manage toggle state manually — `BaseToolPanel` owns it.

**Color and style source of truth:** all `color`, `strokeWidth`, `dash`, `fillFn`, and `iconFn`
values come from `config/feature-types.js` (§15), not hardcoded in tool panels or overlay
components. Chooser swatches and overlay rendering both import from the same registry.

### Shared Composable Contracts

**`useHexPaintTool({ onPaint(hex, selectedValue), onClear(hex) })`**

- Handles hex click (click mode) and hex mouseenter (paint mode)
- Right-click calls `onClear`
- Uses `usePaintStroke` for stroke batching
- Used by: Elevation, Terrain

**`useEdgePaintTool({ allowedTypes, onPaint(hexId, faceIndex, type), onClear(hexId, faceIndex, type) })`**

- Handles edge-snapped mousedown drag
- Right-click calls `onClear` for the selected type
- Exposes `clearAll()` — removes all `allowedTypes` edges from all hexes
- Uses `usePaintStroke` for stroke batching
- Used by: Road, Stream & Stone Wall, Contour Line

**`useClickHexside({ validateFn(hexId, faceIndex) → { valid, reason }, onPlace(hexId, faceIndex), onRemove(hexId, faceIndex) })`**

- Single-click edge placement; right-click removes
- Calls `validateFn` before placing; shows inline error if invalid
- Used by: Road (bridge), Stream & Stone Wall (ford)

**`usePaintStroke(onMutated)`**

- Exposes `strokeStart()`, `strokeEnd()`
- On `strokeStart`: sets `paintStrokeActive = true`
- On `strokeEnd`: sets `paintStrokeActive = false`, flushes `saveMapDraft` once
- Used by: `useHexPaintTool`, `useEdgePaintTool`

### Common Tool Controls (all via BaseToolPanel)

Every data-editing tool gets these for free from `BaseToolPanel`:

- **Overlay toggles** — auto-rendered from `overlayConfig` for non-`alwaysOn` layers
- **Clear all button** — calls `clearAll()` from the active composable after confirmation dialog
- **Help popup** — tool panel passes help text as a prop; `BaseToolPanel` renders the trigger and modal
- **Right-click clear** — handled by the active composable; documented once here, not per-tool

Tool sections (§6–§10) document only what is **unique** to each tool.

---

## 5. Grid Calibration Tool

Standalone panel — does not use `BaseToolPanel` or the paint composables.

### Controls

| Control                 | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `cols`, `rows`          | Grid dimensions                                                          |
| `hexWidth`, `hexHeight` | Hex cell size in pixels                                                  |
| `dx`, `dy`              | Grid origin offset                                                       |
| `imageScale`            | Map image scale multiplier                                               |
| `strokeWidth`           | Grid line thickness                                                      |
| `evenColUp`             | Even/odd column stagger direction                                        |
| `northOffset`           | 12-position rotation ring (0–11, 30° each); sets map compass orientation |

### Overlay Config

```js
overlayConfig = {
  grid: { alwaysOn: true, weight: 'diagnostic' },
  hexLabel: { alwaysOn: true, labelFn: (hex) => `${hex.col}.${hex.row}`, size: 'large' },
};
```

### North Offset Picker

Renders a 12-node circular ring. The selected node is highlighted. Face compass labels are derived
from `allFaceLabels(northOffset)` in `compass.js` (§15).

Because face indices are geometry-stable (§2), changing `northOffset` only changes display labels —
no edge data is affected and no warning or confirmation is needed.

> **Known bug (fix tracked separately):** The face-index-to-label mapping has an off-by-one error
> causing labels to appear one step clockwise from correct when `northOffset ≠ 0`.

---

## 6. Elevation Tool

**Edits:** `hex.elevation` — integer level index, 0 to `elevationLevels − 1`.

**Composable:** `useHexPaintTool`. Supports click and paint mode.

Right-click resets `elevation` to 0.

### Overlay Config

```js
overlayConfig = {
  hexLabel: {
    alwaysOn: true,
    labelFn: (hex) => String(hex.elevation),
    size: 'large',
  },
  hexFill: {
    alwaysOn: false,
    toggleLabel: 'Elevation tint',
    fillFn: (hex) => tintForLevel(hex.elevation, palette), // palette from elevationTintPalette()
  },
};
// Note: no grid layer — elevation labels are readable without it
```

Tint palette auto-generated by `elevationTintPalette(elevationLevels)` in `elevation.js` (§15):
level 0 = light blue → green → tan → dark brown at max.

### Unique Controls

- **Value slider** — integer 0 to `elevationLevels − 1`. Both click and paint set this fixed value.

---

## 7. Terrain Tool

**Edits:** `hex.terrain` (string), `hex.hexFeature` (`{ type: 'building' }` or absent).

**Composable:** `useHexPaintTool`. Supports click and paint mode.

Right-click on terrain mode resets `terrain` to `'unknown'`. Right-click on building mode clears
`hexFeature`; terrain is unaffected.

### Overlay Config

```js
overlayConfig = {
  hexFill: {
    alwaysOn: true,
    fillFn: (hex) => TERRAIN_COLORS[hex.terrain] ?? TERRAIN_COLORS.unknown,
    // TERRAIN_COLORS from feature-types.js; all at 80% opacity
  },
  hexIcon: {
    alwaysOn: true,
    iconFn: (hex) => (hex.hexFeature?.type === 'building' ? 'building' : null),
  },
};
// Note: no grid layer — terrain fill provides enough spatial context
```

**Terrain colors** (from `feature-types.js`, 80% transparent):

| Terrain       | Color       |
| ------------- | ----------- |
| clear         | Transparent |
| woods         | Dark green  |
| orchards      | Light green |
| marsh         | Green-blue  |
| slopingGround | Brown       |
| woodedSloping | Green-brown |
| unknown       | Grey 0.3    |

### Unique Controls

- **Terrain chooser (`ToolChooser`)** — one item per `terrainTypes` entry; each item has a
  `color` swatch from `TERRAIN_COLORS` in `feature-types.js`.
- **Building button** — separate item in the chooser with `icon: 'building'` instead of a color
  swatch. Selecting it switches `onPaint` to write `hexFeature` instead of `terrain`.

---

## 8. Road Tool

**Edits:** `edges[0|1|2]` entries of type `trail`, `road`, `pike`.

**Composable:** `useEdgePaintTool({ allowedTypes: ['trail','road','pike'] })`. Paint mode only.

Right-click removes the selected type from the edge. Clear all removes all three types.

### Overlay Config

```js
overlayConfig = {
  grid: { alwaysOn: true, weight: 'faint' },
  edgeLine: {
    alwaysOn: true,
    style: 'through-hex',        // lines connect entry/exit edge midpoints via hex center
    featureGroups: ROAD_GROUPS,  // from feature-types.js; trail → road → pike (pike on top)
  },
}

// ROAD_GROUPS (feature-types.js):
[
  { types: ['trail'], color: '#8B6914', strokeWidth: 1.5, dash: '4,3' },
  { types: ['road'],  color: '#8B6914', strokeWidth: 2 },
  { types: ['pike'],  color: '#ffffff', strokeWidth: 2.5 },
]
```

### Unique Controls

- **Chooser** — trail / road / pike; swatches and styles from `ROAD_GROUPS` in `feature-types.js`.
- **Bridge sub-control** — see §11.

---

## 9. Stream and Stone Wall Tool

**Edits:** `edges[0|1|2]` entries of type `stream`, `stoneWall`.

**Composable:** `useEdgePaintTool({ allowedTypes: ['stream','stoneWall'] })`. Paint mode only.

Right-click removes the selected type. Clear all removes both types.

### Overlay Config

```js
overlayConfig = {
  grid: { alwaysOn: true, weight: 'faint' },
  edgeLine: {
    alwaysOn: true,
    style: 'along-edge',           // line runs along the shared edge
    featureGroups: STREAM_WALL_GROUPS,  // from feature-types.js
  },
}

// STREAM_WALL_GROUPS (feature-types.js):
[
  { types: ['stream'],    color: '#4a90d9', strokeWidth: 2 },
  { types: ['stoneWall'], color: '#555555', strokeWidth: 2 },
]
```

### Unique Controls

- **Chooser** — stream / stone wall; swatches from `STREAM_WALL_GROUPS`.
- **Ford sub-control** — see §11.

---

## 10. Contour Line Tool

**Edits:** `edges[0|1|2]` entries of type `elevation`, `slope`, `extremeSlope`, `verticalSlope`.
Mutually exclusive per edge (enforced by `validateCoexistence()` in `edge-model.js`).

**Composable:** `useEdgePaintTool({ allowedTypes: ['elevation','slope','extremeSlope','verticalSlope'] })`.
Paint mode only.

Right-click removes the selected type from the edge. Clear all removes all four types.

### Overlay Config

```js
overlayConfig = {
  grid: { alwaysOn: true, weight: 'faint' },
  edgeLine: {
    alwaysOn: true,
    style: 'along-edge',
    featureGroups: CONTOUR_GROUPS,   // from feature-types.js
  },
  hexLabel: {
    alwaysOn: false,
    toggleLabel: 'Elevation info',
    labelFn: hex => String(hex.elevation),
    size: 'large',
  },
  hexFill: {
    alwaysOn: false,
    toggleLabel: 'Elevation info',   // same label — BaseToolPanel renders one checkbox for both
    fillFn: hex => tintForLevel(hex.elevation, palette),
  },
}

// CONTOUR_GROUPS (feature-types.js):
[
  { types: ['elevation'],     color: '#888888', strokeWidth: 1 },
  { types: ['slope'],         color: '#222222', strokeWidth: 2 },
  { types: ['extremeSlope'],  color: '#000000', strokeWidth: 3.5 },
  { types: ['verticalSlope'], color: '#cc0000', strokeWidth: 2.5 },
]
```

Note: `hexLabel` and `hexFill` share the `toggleLabel: 'Elevation info'` string. `BaseToolPanel`
renders a single checkbox that toggles both layers together.

### Unique Controls

- **Chooser** — four contour types; style swatches from `CONTOUR_GROUPS`.
- **Auto-detect button** — calls `autoDetectContourType()` from `elevation.js` (§15) for every
  adjacent hex pair. Rules: 1-level diff → `elevation`; 2-level diff → `extremeSlope`; 3+ →
  `verticalSlope`. Clears all existing contour edges first. Requires confirmation before running.

---

## 11. Ford and Bridge Controls

Sub-controls inside their respective tool panels using `useClickHexside`. Single-click places or
removes the feature; no drag painting.

**Ford** (Stream & Stone Wall panel):

```js
useClickHexside({
  validateFn: (hexId, face) => {
    const features = getEdgeFeatures(hexMap, hexId, face, gridSpec);
    return features.some((f) => f.type === 'stream')
      ? { valid: true }
      : { valid: false, reason: 'Ford requires a stream on this edge.' };
  },
  onPlace: (hexId, face) => addEdgeFeature(hexId, face, { type: 'ford' }),
  onRemove: (hexId, face) => removeEdgeFeature(hexId, face, 'ford'),
});
```

**Bridge** (Road panel):

```js
useClickHexside({
  validateFn: (hexId, face) => {
    const features = getEdgeFeatures(hexMap, hexId, face, gridSpec);
    const ROAD_TYPES = ['road', 'trail', 'pike'];
    return features.some((f) => ROAD_TYPES.includes(f.type))
      ? { valid: true }
      : { valid: false, reason: 'Bridge requires a road, trail, or pike on this edge.' };
  },
  onPlace: (hexId, face) => addEdgeFeature(hexId, face, { type: 'bridge' }),
  onRemove: (hexId, face) => removeEdgeFeature(hexId, face, 'bridge'),
});
```

Fords render as perpendicular tick marks across the edge; bridges as a bridge glyph. Both symbols
defined in `feature-types.js`.

---

## 12. LOS Test Panel

Standalone read-only panel. Does not use `BaseToolPanel`, the paint composables, or the overlay
system. Activating the LOS panel does not trigger the interaction gate — hex clicks are routed to
the LOS composable (`useLosTest`), not to a paint handler.

- "Set Hex A" / "Set Hex B" → click hexes to select the LOS pair.
- Displays LOS result, path hexes, and blocking hex.
- LOS path hexes highlighted via a `highlight` layer passed to `HexMapOverlay`.
- No changes from v1.

---

## 13. Hover Tooltip

When no data-editing tool is active, `HexMapOverlay` shows a tooltip for the hex under the cursor.

| Field       | Display                                                           |
| ----------- | ----------------------------------------------------------------- |
| Hex ID      | `col.row`                                                         |
| Terrain     | terrain type string                                               |
| Elevation   | integer level index                                               |
| Hex feature | `building` if present; omitted otherwise                          |
| Edges       | one line per face with features, e.g. `face 2 (SE): road, stream` |

Face indices shown with compass label derived from `compassLabel(face, northOffset)` in
`compass.js`. Tooltip floats near cursor; disappears on mouse leave. No click or hex selection.

---

## 14. Save Model

### Three Tiers

**Tier 1 — localStorage autosave**
Every edit writes updated `mapData` to `lob-map-editor-mapdata-south-mountain-v2`. On load, if
localStorage draft is newer than the server response, a restore banner is shown.

**Tier 2 — Server save (authoritative)**
"Push to Server" → `PUT /api/tools/map-editor/data` → Zod validation → write `map.json`. On
success, localStorage cleared. On failure, localStorage retained and error shown.

**Tier 3 — Engine export (client download)**
"Export" strips all `_`-prefixed fields and triggers a client-side file download.

### Draft Restore Flow

```
1. Fetch GET /api/tools/map-editor/data
2. If localStorage draft._savedAt > server._savedAt: banner → Restore | Dismiss
3. On every edit: write mapData + _savedAt to localStorage
4. On Push: PUT → 200 → clear localStorage
```

---

## 15. Formula and Config Modules

All formulas and feature type definitions live in pure-function modules under `client/src/`. No
Vue reactivity or side effects. Server-side equivalents are added when the game engine needs them.

Each exported function carries JSDoc with: what it computes, parameters, return type, the
mathematical formula, a reference (rulebook section or external resource), and which
composables/components use it.

---

### `config/feature-types.js`

Single source of truth for all feature type strings and their display properties. Both chooser
items and overlay `featureGroups` import from here — colors and styles are defined once.

```js
export const TERRAIN_COLORS = {
  clear: null,
  woods: 'rgba(34,85,34,0.8)',
  orchards: 'rgba(100,160,60,0.8)',
  marsh: 'rgba(60,120,100,0.8)',
  slopingGround: 'rgba(139,100,60,0.8)',
  woodedSloping: 'rgba(80,110,50,0.8)',
  unknown: 'rgba(150,150,150,0.3)',
};

export const ROAD_GROUPS = [
  { types: ['trail'], color: '#8B6914', strokeWidth: 1.5, dash: '4,3' },
  { types: ['road'], color: '#8B6914', strokeWidth: 2 },
  { types: ['pike'], color: '#ffffff', strokeWidth: 2.5 },
];

export const STREAM_WALL_GROUPS = [
  { types: ['stream'], color: '#4a90d9', strokeWidth: 2 },
  { types: ['stoneWall'], color: '#555555', strokeWidth: 2 },
];

export const CONTOUR_GROUPS = [
  { types: ['elevation'], color: '#888888', strokeWidth: 1 },
  { types: ['slope'], color: '#222222', strokeWidth: 2 },
  { types: ['extremeSlope'], color: '#000000', strokeWidth: 3.5 },
  { types: ['verticalSlope'], color: '#cc0000', strokeWidth: 2.5 },
];

export const FORD_BRIDGE_SYMBOLS = {
  ford: 'perpendicular-ticks',
  bridge: 'bridge-glyph',
};
```

---

### `formulas/hex-geometry.js`

Hex grid spatial calculations. Flat-top orientation.

**Reference:** Amit Patel, "Hexagonal Grids" — redblobgames.com/grids/hexagons

| Function                                           | Description                                                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `hexCenter(col, row, gridSpec)`                    | Pixel center of hex at `(col, row)`; applies `dx`, `dy`, `hexWidth`, `hexHeight`, `evenColUp`, `imageScale` |
| `hexCorners(cx, cy, hexWidth, hexHeight)`          | Array of 6 `{x,y}` corner points, clockwise from top-left corner                                            |
| `edgeMidpoint(corners, faceIndex)`                 | `{x,y}` midpoint of face `faceIndex`: average of `corners[faceIndex]` and `corners[(faceIndex+1)%6]`        |
| `edgePoints(corners, faceIndex, pct)`              | Point `pct`% along face from corner `i` toward corner `(i+1)%6`; used to inset edge lines from corners      |
| `getNeighborCoord(col, row, faceIndex, evenColUp)` | `{col, row}` of the hex adjacent in direction `faceIndex`; uses offset lookup tables for even/odd stagger   |
| `getNeighborId(hexId, faceIndex, gridSpec)`        | String `'col.row'` of neighbour; parses `hexId`, calls `getNeighborCoord`                                   |
| `pointInHex(px, py, cx, cy, hexWidth, hexHeight)`  | Boolean; flat-top bounding box test then corner-cut test                                                    |
| `nearestFace(px, py, corners)`                     | Face index (0–5) whose midpoint is closest to `(px, py)`; used for edge-click snapping                      |

---

### `formulas/compass.js`

Converts geometry face indices to compass labels given `northOffset`.

**Reference:** §5 of this document. The 12-step ring (0–11, 30° each) allows north to fall
between hex faces for non-axis-aligned maps.

| Function                               | Formula / Description                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `compassLabel(faceIndex, northOffset)` | `SIX_LABELS[Math.round(((faceIndex*2 − northOffset + 12) % 12) / 2) % 6]`; `SIX_LABELS = ['N','NE','SE','S','SW','NW']` |
| `faceIndexForNorth(northOffset)`       | Face whose label is 'N': `Math.round(northOffset / 2) % 6`                                                              |
| `allFaceLabels(northOffset)`           | Array of 6 compass labels indexed by face 0–5; wrapper over `compassLabel`                                              |

---

### `formulas/edge-model.js`

Canonical edge ownership, lookup, and coexistence validation.

**Reference:** §2 of this document (Canonical Edge Ownership, Edge Feature Coexistence Rules).

| Function                                                      | Description                                                                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `canonicalOwner(hexId, faceIndex, gridSpec)`                  | `{ ownerId, ownerFace }`: if `faceIndex < 3` → current hex; else → neighbour at `faceIndex − 3` |
| `getEdgeFeatures(hexMap, hexId, faceIndex, gridSpec)`         | Resolves canonical owner; returns `EdgeFeature[]` or `[]`                                       |
| `oppositeFace(faceIndex)`                                     | `(faceIndex + 3) % 6` — the mirrored face on the adjacent hex                                   |
| `validateCoexistence(existingFeatures, newType)`              | `{ valid, reason }` — enforces coexistence rules from §2                                        |
| `addEdgeFeature(hexMap, hexId, faceIndex, feature, gridSpec)` | Mutates canonical owner's edge entry; calls `validateCoexistence` first                         |
| `removeEdgeFeature(hexMap, hexId, faceIndex, type, gridSpec)` | Removes all features of `type` from canonical owner's edge entry                                |

---

### `formulas/elevation.js`

Elevation palette generation and contour auto-detection.

**Reference (palette):** Standard perceptual terrain color ramp (cartographic convention).
**Reference (contour rules):** _Line of Battle v2.0_ §1.1 (Slope and Elevation); _South Mountain_
special rules — slope grade defined by elevation level differences between adjacent hex centers.

| Function                                | Description                                                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `elevationTintPalette(elevationLevels)` | Array of `elevationLevels` CSS colors; interpolates HSL from `hsl(185,50%,65%)` (level 0) through green, tan, to `hsl(25,50%,30%)` (max) |
| `tintForLevel(level, palette)`          | CSS color string for integer level index                                                                                                 |
| `autoDetectContourType(levelA, levelB)` | `diff = abs(levelA−levelB)`; returns: `0→null`, `1→'elevation'`, `2→'extremeSlope'`, `3+→'verticalSlope'`                                |

---

### `formulas/los.js`

Line-of-sight calculation between two hex centers.

**Reference:** _Line of Battle v2.0_ §4 (Line of Sight). _South Mountain_ special rules §SM-3
(woods hex adds +1 effective height). Hex line algorithm: Amit Patel, "Hexagonal Grids" —
redblobgames.com/grids/hexagons/#line-drawing (supercover DDA on cube coordinates).

| Function                                   | Description                                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `hexLine(hexA, hexB, gridSpec)`            | Ordered array of hex IDs on the straight line from center of `hexA` to center of `hexB`; supercover DDA on cube coordinates |
| `effectiveHeight(hex, edgeFeatures)`       | `hex.elevation + terrainHeightBonus(hex.terrain) + max(edgeFeature.losHeightBonus ?? 0)`                                    |
| `losBlocked(hexA, hexB, hexMap, gridSpec)` | `{ blocked, blockingHexId }` — traces `hexLine`, computes `effectiveHeight` at each hex, applies LoB §4 rules               |
| `terrainHeightBonus(terrainType)`          | `woods → 1`, all others `→ 0` (SM special rule SM-3)                                                                        |
