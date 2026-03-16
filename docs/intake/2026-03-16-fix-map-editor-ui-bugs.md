---
issue: 63
title: Fix map editor tool selection, hex display, and UI bugs
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

Several UI bugs in the map editor dev tool were found during map calibration. The tool selection state is not consistently reflected in the UI (top bar does not show the active tool, and the accordion header changes incorrectly), the hex editor's data form does not render in its panel, hex ID labels on the overlay have incorrect styling and an off-by-one row coordinate for even columns, and a duplicate Export button creates confusion.

## Acceptance Criteria

- Only one accordion tool panel (Grid Calibration, Hex Editor, LOS Test) may be open at a time; opening one closes any other (already enforced by `openPanel`, verify no regression)
- The active tool name is displayed in the top-bar header next to the selected hex ID (e.g., "Hex: 03.07 | Tool: Hex Edit")
- The Hex Edit accordion header always reads "Hex Edit" regardless of which hex is selected (remove the dynamic `"Hex {{ selectedHexId }}"` substitution from the header label)
- The hex editor data form (terrain, elevation, slope, features, edges, wedge elevations, etc.) renders correctly inside the Hex Edit panel when a hex is selected
- Hex ID labels rendered on the grid overlay are dark blue and match the font size of the accordion tool name headers
- For even-numbered columns, the displayed row number in the hex ID is decremented by one (off-by-one correction in the coordinate display logic in `HexMapOverlay.vue`)
- There is exactly one Export button in the UI (remove the duplicate from `EditorToolbar.vue`, keeping the one in the header)

## Files to Create/Modify

- `client/src/views/tools/MapEditorView.vue` — top bar active-tool display; accordion Hex Edit header fix
- `client/src/components/HexEditPanel.vue` — fix data editor not rendering in panel
- `client/src/components/HexMapOverlay.vue` — hex ID label color, font size, and even-column row offset fix
- `client/src/components/EditorToolbar.vue` — remove duplicate Export button

## Tests Required

- `MapEditorView.test.js`: opening one accordion panel closes any previously open panel
- `MapEditorView.test.js`: top bar displays active tool name when a panel is open
- `MapEditorView.test.js`: Hex Edit accordion header always reads "Hex Edit"
- `HexEditPanel.test.js`: component renders terrain/elevation fields when a hex is passed
- `HexMapOverlay.test.js`: hex ID label color is `#00008b` (dark blue) and font size matches accordion header
- `HexMapOverlay.test.js`: even-column hex IDs display row value decremented by one

## Rules / Data Dependencies

None — these are dev-tool UI bugs only.

## Depends On

None

## Milestone

v1.0 — MVP
