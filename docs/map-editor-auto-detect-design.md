# Map Editor Auto-Detect — Design Document

**Version:** 0.1 (draft)
**Date:** 2026-03-16
**Status:** Draft — open questions in §8 Decision Log

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Experience](#2-user-experience)
3. [Elevation Palette Config](#3-elevation-palette-config)
4. [Hex Crop Extraction](#4-hex-crop-extraction)
5. [Local Color Analysis](#5-local-color-analysis)
6. [Claude Vision API](#6-claude-vision-api)
7. [Seed Hex Collection](#7-seed-hex-collection)
8. [Decision Log](#8-decision-log)
9. [Data Model Changes](#9-data-model-changes)
10. [Component and Composable Map](#10-component-and-composable-map)
11. [Test Strategy](#11-test-strategy)
12. [Implementation Sequencing](#12-implementation-sequencing)

---

## 1. Overview

### Problem

The hex map editor requires manual entry for every hex's terrain, elevation, and hexside
features. South Mountain has a 36×63 grid — potentially ~1,200–1,500 playable hexes. Manual
entry for all of them is slow, error-prone, and a bottleneck before the game engine can be
built.

### Goal

Reduce manual data entry by automatically detecting terrain type, elevation band, and
hex-centre features from the scanned map image, pre-populating the hex editor fields. The
engineer reviews and confirms (or overrides) each suggestion before it becomes canonical data.

### Non-Goals

- **Full automation** — the system will not achieve 100% accuracy. Human review of every
  auto-detected hex is expected and required.
- **Hexside linear feature detection** — detecting roads, streams, slopes, and fences along
  specific hex edges requires edge/line detection algorithms beyond color analysis. This is
  explicitly deferred to a future phase.
- **Multi-scenario support** — all design decisions here are scoped to South Mountain.
- **Real-time detection during painting** — detection is a batch operation, not triggered
  on every hex interaction.

### Accuracy Expectations (Realistic V1)

| Detection task                  | Expected accuracy | Notes                                    |
| ------------------------------- | ----------------- | ---------------------------------------- |
| Terrain type (woods/open/etc.)  | 60–70%            | Color overlap from overlaid features     |
| Elevation band                  | 70–80%            | Depends on palette quality and scan      |
| Hex-centre features (buildings) | 40–60%            | Small features, easily missed by sampling |
| Hexside linear features         | Not in v1         | Deferred                                 |

The editor treats all auto-detected values as suggestions. The workflow is: detect → review
→ confirm (or override) → save.

---

## 2. User Experience

### Setup Phase (one-time per map)

1. **Palette extraction** — A "Extract Elevation Palette" button in the map editor toolbar
   opens a modal. The engineer clicks the button; a single Claude Vision API call analyzes
   the full map image and returns the elevation color gradient (bluish-green = lowest →
   green → tan → brown = highest) as a structured palette. The result is shown for review.
   The engineer confirms, and the palette is stored in `scenario.json` as
   `autoDetectConfig.elevationPalette`.

2. **Seed hex collection** — Before batch detection, the engineer manually reviews ~25
   hexes — selected to span all terrain types and elevation bands — and confirms their
   values in the standard hex editor. These confirmed hexes are stored as
   `autoDetectConfig.seedHexes` and serve as few-shot examples in subsequent Vision API
   calls.

### Detection Phase

3. **Single-hex detect** — In any edit mode, a "Detect" button appears in the hex edit
   panel for any unconfirmed hex. Clicking it runs local color analysis (fast) and, if
   confidence is below threshold, optionally calls the Vision API with seed hex context.
   Detected values are pre-populated into the editor fields, highlighted in amber to
   indicate they are unconfirmed.

4. **Batch detect** — A "Batch Detect All" button in the toolbar runs detection on all
   unconfirmed hexes. Progress is shown with a count and progress bar. Results are
   accumulated but not saved until the engineer reviews.

5. **Review and confirm** — After batch detection, a "Review Queue" panel shows all hexes
   with amber (unconfirmed) values, sorted by ascending confidence. The engineer steps
   through each, viewing the hex crop and the pre-populated fields, and either confirms
   (turning the highlight green) or overrides individual fields.

6. **Overwrite protection** — If a hex already has manually-entered confirmed values, batch
   detect skips it by default. A "Force Re-detect" option (off by default) re-runs
   detection and presents a diff: `"Field X: current value → detected value"`. The
   engineer must confirm the overwrite for each changed field.

### Visual States

| Hex state          | Visual indicator      |
| ------------------ | --------------------- |
| No data            | Grey fill             |
| Auto-detected      | Amber outline         |
| Confirmed (manual) | No special indicator  |
| Confirmed (auto)   | Green flash on accept |
| Needs review       | Amber dot in corner   |

---

## 3. Elevation Palette Config

### Purpose

Maps the map image's color gradient to elevation bands. Derived once from the map image
using Claude Vision; stored persistently so subsequent sessions do not require re-extraction.

### Palette Structure

The palette is an ordered array of elevation bands, from lowest to highest:

```json
[
  { "elevationFeet": 250, "colorName": "lowland blue-green", "rgb": [120, 160, 130] },
  { "elevationFeet": 400, "colorName": "valley green",       "rgb": [100, 140, 90]  },
  { "elevationFeet": 550, "colorName": "mid-slope tan",      "rgb": [160, 140, 100] },
  { "elevationFeet": 700, "colorName": "high ground brown",  "rgb": [140, 110, 80]  },
  { "elevationFeet": 900, "colorName": "ridge brown",        "rgb": [120, 90,  60]  }
]
```

`rgb` values are the representative color extracted by Vision from the map image. During
local analysis, the nearest-neighbor match in RGB space determines the elevation band.

### Extraction Process

The Claude Vision API is called with:
- The full map image (already loaded in the editor)
- A prompt asking it to identify the elevation color gradient and return structured JSON

The response is parsed and validated against a Zod schema before storage. If the Vision
call fails, the engineer can manually define the palette via a color-picker UI (fallback).

### Storage

`scenario.json` → `autoDetectConfig.elevationPalette` (see §9 Data Model Changes).

---

## 4. Hex Crop Extraction

### Computing the Bounding Box

The `gridSpec` object in `map.json` provides everything needed to compute the pixel region
for any hex:

| `gridSpec` field | Used for                                        |
| ---------------- | ----------------------------------------------- |
| `originX/Y`      | Pixel position of hex `(0, 0)` centre           |
| `cellW`          | Horizontal distance between hex column centres  |
| `cellH`          | Vertical distance between hex row centres       |
| `offsetX/Y`      | Odd/even row stagger offset                     |
| `rotation`       | Grid rotation in degrees (applied via transform)|

For a hex at grid position `(col, row)`, the centre pixel is:

```
cx = originX + col * cellW + (row % 2 === 1 ? offsetX : 0)
cy = originY + row * cellH
```

The crop bounding box is a rectangle of `cellW × cellH` centred on `(cx, cy)`.

> **Note:** The crop is rectangular, not hexagonal. The hexagonal boundary within the
> crop is applied as a mask during color sampling to exclude corner pixels that belong to
> adjacent hexes.

### Rotation Handling

If `gridSpec.rotation` is non-zero, the crop must be extracted after rotating the source
image by the inverse rotation angle, or the canvas context must apply the corresponding
CSS/SVG transform before sampling. The simpler approach is to create an offscreen canvas,
draw the map image rotated by `-gridSpec.rotation` degrees around the grid anchor, then
crop from the de-rotated canvas.

### Edge Cases

| Case                           | Handling                                                      |
| ------------------------------ | ------------------------------------------------------------- |
| Crop extends beyond image edge | Clip to image bounds; flag as `partialCrop: true` in result  |
| `playable: false` hex          | Skip entirely; do not crop or analyse                         |
| `gridSpec.locked` is false     | Warn user that calibration is not finalised; allow but flag   |
| `cellW` or `cellH` is zero     | Abort with error; gridSpec is invalid                         |

### Playable Flag

A hex is non-playable if it has `playable: false` in its `HexEntry`. Off-map edge positions
must be explicitly marked. The editor map view should shade non-playable hexes distinctly
(grey hatching) so the engineer can mark them during initial setup.

Hexsides and vertices shared between a playable and non-playable hex require special
handling: the hexside feature is playable only if the inner hex (playable side) owns it.
This is tracked via the `playable` field on individual `EdgeFeature` entries (see §9).

---

## 5. Local Color Analysis

### Algorithm

For each hex crop:

1. **Mask** — Apply a hexagonal mask to exclude the ~15% corner area that belongs to
   adjacent hexes. Only pixels within the inscribed hexagon are sampled.

2. **Sample** — Sample a grid of N×N points within the hex interior (default N=8, yielding
   64 samples). Exclude pixels within 3px of the hex boundary to reduce edge bleed.

3. **Cluster** — Build a color histogram by binning samples into 8 RGB clusters (k-means
   with k=3 is sufficient for most hexes). The dominant cluster is the primary color.

4. **Match elevation** — Compare the primary color against `autoDetectConfig.elevationPalette`
   using Euclidean distance in RGB space. The closest match determines the elevation band.
   Record `elevationConfidence` = `1 - (distance / maxExpectedDistance)`.

5. **Match terrain** — Apply heuristic terrain rules against the primary color:
   - Dark green (low luminance, green dominant) → `woods`
   - Light tan/beige (high luminance, red+green balanced) → `open`
   - Dark grey/brown cluster present → `town` or `building` (flag for Vision review)
   - Near-white with slight blue → `road` or `pike` (flag for Vision review)

6. **Confidence** — Overall confidence is `min(elevationConfidence, terrainConfidence)`.
   Hexes below `autoDetectConfig.confidenceThreshold` (default 0.60) are flagged for
   Vision API review.

### Limitations

- Road overlays reduce terrain confidence (road color bleeds into the dominant cluster)
- Heavily wooded hexes at high elevation may confuse terrain and elevation matching
- Small hex-centre features (buildings, fords) are likely missed by sampling alone
- Hexside linear features are not detectable by this algorithm (see §1 Non-Goals)

---

## 6. Claude Vision API

### When It Is Used

The Vision API is used in two modes:

1. **Palette extraction** (one-time) — analyze the full map image to derive the elevation
   color gradient. Triggered manually by the engineer.

2. **Hex classification fallback** — called when a hex's local confidence is below
   `confidenceThreshold`, or when the engineer clicks "Detect with Vision" on a specific
   hex. Not called automatically for all hexes.

### Prompt Design — Palette Extraction

```
You are analyzing a scanned board wargame map (South Mountain, Line of Battle v2.0).
The map uses color tinting to indicate elevation — lowest elevations are a bluish-green,
rising through green, tan, and brown to the highest elevations.

Examine the map image and return a JSON array of elevation bands in this format:
[
  { "elevationFeet": <number>, "colorName": "<descriptive name>", "rgb": [r, g, b] },
  ...
]

Return 4–6 bands from lowest to highest. Use approximate elevation values appropriate
for South Mountain (range ~250–950 feet). Do not add explanation outside the JSON.
```

### Prompt Design — Hex Classification (with seed data)

```
You are classifying hexes from a scanned board wargame map (South Mountain, Line of
Battle v2.0). Each image is a single hex crop.

The following confirmed examples show the classification schema:
<seed hex examples — image + confirmed JSON for each seed hex>

For the provided hex image, return a JSON object:
{
  "terrain": "<terrain type>",
  "elevation": <number in feet>,
  "features": ["<feature type>", ...],
  "confidence": <0.0–1.0>,
  "notes": "<brief rationale or flag>"
}

Valid terrain types: open, woods, town, orchard, rough
Valid feature types: building, ford, fortification, springhouse
Do not classify hexside features (roads, streams, slopes) — return [] for features
if only hexside features are visible.
Do not add explanation outside the JSON.
```

### Response Schema (Zod)

```js
const AutoDetectResultSchema = z.object({
  terrain: z.string(),
  elevation: z.number(),
  features: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});
```

### Error Handling

| Error condition            | Handling                                               |
| -------------------------- | ------------------------------------------------------ |
| API key missing            | Disable Vision buttons; show "API key not configured"  |
| Network timeout            | Retry once; if still fails, mark hex as `needsReview`  |
| Invalid JSON response      | Log raw response; mark hex as `needsReview`            |
| Zod parse failure          | Log validation errors; mark hex as `needsReview`       |
| Rate limit (429)           | Backoff 5s, retry; surface error after 3 failures      |

### Cost Model

| Use case                   | API calls         | Estimated cost             |
| -------------------------- | ----------------- | -------------------------- |
| Palette extraction         | 1                 | ~$0.05                     |
| Seed hex collection (25)   | 0 (manual)        | $0.00                      |
| Batch detect fallback pass | ~50–150 calls     | ~$0.50–$1.50               |
| Full Vision pass (all hex) | ~150–200 calls    | ~$1.50–$2.50               |
| **Typical full session**   | **~50–100 calls** | **~$0.50–$1.00**           |

Estimates assume ~10 hex crops per API call (batched), using claude-sonnet-4-6. Cost per
1M input tokens: $3.00.

---

## 7. Seed Hex Collection

### Purpose

Seed hexes are confirmed human-reviewed hex entries that serve as few-shot examples in
Vision API calls and as a ground truth baseline for calibrating local color analysis.

### Required Coverage

To be effective, seed hexes must cover:

| Dimension        | Values to cover                                      | Min examples |
| ---------------- | ---------------------------------------------------- | ------------ |
| Terrain type     | open, woods, town, orchard, rough                    | 2–3 each     |
| Elevation band   | All 5 bands (bluish-green → green → tan → tan-brown → brown) | 2–3 each |
| Hex-centre feat. | building, ford, fortification (at least one each)    | 1 each       |

Recommended minimum: **25 seed hexes**. More examples improve Vision accuracy but
increase prompt token usage. 25 is the practical minimum for reasonable coverage.

### Collection Workflow

1. Engineer opens the map editor and manually edits a hex using the standard edit panel
2. After confirming all fields, clicks "Mark as Seed Hex"
3. The hex entry is stored in `autoDetectConfig.seedHexes` alongside its confirmed data
   and a small base64-encoded crop image (for Vision prompt injection)
4. The seed hex collection panel shows coverage status: which terrain types and elevation
   bands still need at least one example

### Using Seed Data in Vision Prompts

Each Vision API call for hex classification includes the 3–5 most relevant seed hexes as
few-shot examples (selected by terrain/elevation proximity to the target hex). Including
all 25 seeds would exceed context limits or add unnecessary cost.

### Persistence

Seed hexes are persisted in `scenario.json` → `autoDetectConfig.seedHexes`. They survive
across editor sessions. The engineer can add more seeds at any time to improve accuracy.

---

## 8. Decision Log

### DL-01 — Hexside detection approach

**Question:** Local color analysis cannot reliably detect roads, streams, slopes, and
other hexside linear features crossing a specific edge. What approach should be used?

**Status:** Deferred to a future issue.

**Proposed resolution:** Implement edge-line detection (directional pixel sampling along
each of the 6 hex edge boundaries) as a separate phase after terrain/elevation detection
is stable. Alternatively, rely entirely on manual entry for hexside features and use
auto-detect only for terrain and elevation.

---

### DL-02 — Confidence threshold default

**Question:** What confidence threshold triggers a Vision API fallback? Too low = too many
API calls; too high = Vision never called for genuinely ambiguous hexes.

**Status:** Proposed default: 0.60. Needs calibration against real map data.

**Proposed resolution:** Expose `confidenceThreshold` as a user-adjustable setting in the
auto-detect panel. Default 0.60. Allow values 0.40–0.90.

---

### DL-03 — Non-playable hex marking workflow

**Question:** Which hexes are non-playable? How does the engineer mark them, and when?

**Status:** Unresolved. Needs decision before implementation.

**Proposed resolution:** Add a "Mark non-playable" paint mode to the editor toolbar.
Non-playable hexes are saved with `playable: false` in their `HexEntry`. The auto-detect
batch operation skips them. Alternatively, the map boundary could be specified as a polygon
in `gridSpec` and all hexes outside it automatically marked non-playable.

---

### DL-04 — Hexside `playable` flag granularity

**Question:** A hexside between a playable and non-playable hex — is the hexside playable?

**Status:** Proposed: the hexside is considered playable if the hex on the inner
(playable) side owns it. An `EdgeFeature` does not need its own `playable` flag — the
playability of a hexside is fully determined by whether both, one, or neither adjacent
hex is playable.

**Proposed resolution:** No new field needed on `EdgeFeature`. The engine and editor
resolve hexside playability at runtime by checking both adjacent hexes.

---

### DL-05 — Batch detect — crop batching strategy for Vision API

**Question:** Should multiple hex crops be sent in a single Vision API call (batched), or
one call per hex?

**Status:** Proposed: batch 10 hex crops per API call with a shared instruction block.
This reduces API calls by ~10× vs. one-per-hex.

**Proposed resolution:** Implement batching in `useAutoDetect.js`. Response is a JSON
array, one entry per crop, in the same order as the input batch.

---

### DL-06 — Map image loading for crop extraction

**Question:** The map image (`sm-map.jpg`) is referenced by the editor but not necessarily
loaded in memory as a pixel-accessible canvas. How is it made available for color sampling?

**Status:** Unresolved.

**Proposed resolution:** On editor mount, load the map image into a hidden offscreen
`<canvas>` element. The canvas 2D context provides `getImageData()` for pixel sampling.
This canvas is reused for all crop operations in the session and discarded on unmount.
Image loading should be lazy — triggered only when the engineer initiates palette
extraction or detection.

---

### DL-07 — Vertex playability

**Question:** The issue specified that vertices (hex corners, shared by up to 3 hexes)
also need a playable flag. Is this needed for auto-detect, or only for the game engine?

**Status:** Auto-detect does not use vertices. A vertex `playable` flag is a game engine
concern (LOS corner cases, ZOC). Defer to game engine design phase.

**Proposed resolution:** Do not add vertex-level playability to the data model in this
issue. Track as a game engine requirement.

---

## 9. Data Model Changes

### `scenario.json` — new `autoDetectConfig` field

```json
"autoDetectConfig": {
  "elevationPalette": [
    { "elevationFeet": 250, "colorName": "lowland blue-green", "rgb": [120, 160, 130] },
    { "elevationFeet": 400, "colorName": "valley green",       "rgb": [100, 140, 90]  },
    { "elevationFeet": 550, "colorName": "mid-slope tan",      "rgb": [160, 140, 100] },
    { "elevationFeet": 700, "colorName": "high ground brown",  "rgb": [140, 110, 80]  },
    { "elevationFeet": 900, "colorName": "ridge brown",        "rgb": [120, 90, 60]   }
  ],
  "confidenceThreshold": 0.60,
  "seedHexes": [
    {
      "hexId": "12.08",
      "confirmedData": {
        "terrain": "woods",
        "elevation": 550,
        "features": []
      },
      "cropBase64": "<base64-encoded PNG crop>"
    }
  ]
}
```

### Zod Schema Additions (`server/src/schemas/scenario.schema.js`)

```js
const ElevationBandSchema = z.object({
  elevationFeet: z.number(),
  colorName: z.string(),
  rgb: z.tuple([z.number(), z.number(), z.number()]),
});

const SeedHexSchema = z.object({
  hexId: z.string(),
  confirmedData: z.object({
    terrain: z.string(),
    elevation: z.number(),
    features: z.array(z.string()),
  }),
  cropBase64: z.string(),
});

const AutoDetectConfigSchema = z.object({
  elevationPalette: z.array(ElevationBandSchema).optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  seedHexes: z.array(SeedHexSchema).optional(),
});
```

Added to `ScenarioSchema` as `autoDetectConfig: AutoDetectConfigSchema.optional()`.

### `map.json` — `HexEntry` changes

New fields on `HexEntry`:

```js
playable: z.boolean().optional(), // false = off-map; omitted = playable (default true)
autoDetected: z.boolean().optional(), // true = value came from auto-detect, not confirmed
detectionConfidence: z.number().optional(), // 0.0–1.0, present when autoDetected is true
```

No changes to `EdgeFeature`. Hexside playability is derived at runtime (see DL-04).

---

## 10. Component and Composable Map

### New Components

| Component                 | Responsibility                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `AutoDetectPanel.vue`     | Toolbar-level control: palette extraction button, batch detect button, review queue summary   |
| `PaletteExtractModal.vue` | One-time palette extraction: shows Vision result for review before saving to scenario.json    |
| `SeedHexManager.vue`      | Seed hex collection panel: coverage grid, "Mark as Seed" action, seed hex list with delete    |
| `DetectionReviewQueue.vue`| Ordered list of amber (unconfirmed) hexes with hex crop preview and field-by-field confirm UI |

### Modified Components

| Component         | Changes                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `MapEditorView.vue` | Mount offscreen crop canvas; integrate `AutoDetectPanel`; handle amber/confirmed hex visual states |
| `HexEditPanel.vue`  | Add "Detect" button; show amber highlight + confidence badge on unconfirmed fields                 |
| `EditorToolbar.vue` | Add "Mark non-playable" paint mode toggle; add auto-detect panel trigger button                    |
| `HexMapOverlay.vue` | Add visual state for `autoDetected` (amber outline) and `playable: false` (grey hatching)          |

### New Composables

| Composable           | Responsibility                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `useAutoDetect.js`   | Orchestrates palette extraction, crop extraction, local analysis, Vision API calls, batch queue    |
| `useHexCrop.js`      | Offscreen canvas management; `cropHex(col, row)` → ImageData or base64 PNG                        |
| `useColorAnalysis.js`| Local color analysis: hexagonal mask, sampling, k-means clustering, palette matching              |
| `useVisionApi.js`    | Claude Vision API client: palette extraction prompt, hex classification prompt, Zod validation     |

---

## 11. Test Strategy

### Unit Tests (Vitest)

| Module               | What to test                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `useHexCrop.js`      | Bounding box calculation for various `gridSpec` values; edge cases (boundary hexes, rotation=0)    |
| `useColorAnalysis.js`| Sampling mask correctness; palette nearest-neighbor matching with known RGB values; confidence calc |
| `useVisionApi.js`    | Prompt construction with seed examples; Zod response validation; error handling for malformed JSON |
| `AutoDetectConfigSchema` | Valid and invalid `autoDetectConfig` objects; missing optional fields; rgb tuple validation   |

### Mocking Constraints

- **Canvas API** — `getImageData()` is not available in jsdom. Unit tests for
  `useHexCrop.js` must mock the canvas context or use a node-canvas polyfill.
  Recommended: mock `getImageData` to return a fixed pixel array for known test inputs.

- **Claude Vision API** — unit tests for `useVisionApi.js` must mock the Anthropic SDK.
  Do not make real API calls in tests. The mock should return the exact JSON shapes
  defined in the response schema.

- **No E2E tests in v1** — the auto-detect workflow is too dependent on the real map
  image and API to be E2E tested meaningfully at this stage. Add E2E coverage after the
  feature is stable.

---

## 12. Implementation Sequencing

Suggested child issues, in dependency order:

| # | Issue title                                      | Depends on | Notes                                           |
| - | ------------------------------------------------ | ---------- | ----------------------------------------------- |
| A | Add `playable` flag and auto-detect fields to `HexEntry` schema | — | Data model first; unblocks all others |
| B | Add `autoDetectConfig` to `ScenarioSchema`        | A          | Zod schema + scenario editor display            |
| C | `useHexCrop.js` — gridSpec-based crop extraction  | A          | Core utility; unit-testable in isolation        |
| D | `useColorAnalysis.js` — local palette matching    | B, C       | Requires palette from B and crops from C        |
| E | `PaletteExtractModal` + `useVisionApi.js` palette prompt | B   | One-time setup; can be built before C/D         |
| F | `SeedHexManager` + seed hex persistence           | A, B       | Provides few-shot data for Vision calls         |
| G | `useVisionApi.js` hex classification prompt       | E, F       | Requires seed data from F                       |
| H | `useAutoDetect.js` orchestrator + batch queue     | D, G       | Wires together local and Vision paths           |
| I | `AutoDetectPanel` + `DetectionReviewQueue` UX     | H          | Final UX integration                            |
| J | `MapEditorView` integration + visual states       | I          | Amber/confirmed states, non-playable shading    |

Issues A and B can be filed and implemented immediately. Issues C–J should be filed after
A and B are merged and the data model is stable.
