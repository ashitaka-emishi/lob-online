---
issue: 54
title: Add map-autodetect-config.json with seed hex management UI
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

The auto-detect feature's configuration — elevation color palette, confidence threshold, and seed hex list — is stored in a new dedicated file `data/scenarios/south-mountain/map-autodetect-config.json`. Keeping it separate from `scenario.json` isolates auto-detect state from scenario rules data and makes the file independently push/pull-able from the editor.

The seed workflow is intentionally iterative: as the engineer confirms hexes as accurate, they add them to the seed list. More seeds improve Vision API classification accuracy over time. Auto-detect is gated on ≥10 seed hexes before it can be activated. Two separate management UIs are needed — an elevation seed editor (anchors the elevation color gradient) and a terrain seed editor (anchors terrain type classification).

See design spec: `docs/map-editor-auto-detect-design.md §7, §9`

## Acceptance criteria

- [ ] `map-autodetect-config.schema.js` (new) — defines `ElevationBandSchema`, `SeedHexSchema`, `AutoDetectConfigSchema` per design doc §9; validates at server load time
- [ ] `data/scenarios/south-mountain/map-autodetect-config.json` (new) — empty valid initial state: `{ "seedHexes": [] }`
- [ ] New server route (`autoDetectConfig.js`) — push/pull following the same pattern as `mapEditor.js` and `scenarioEditor.js`; versioned server-side backups before every write
- [ ] `HexEditPanel.vue` — "Mark as Seed Hex" toggle (enabled only after all required fields populated); adds/removes hex from seed list via auto-detect config store
- [ ] `ElevationSeedEditor.vue` (new) — coverage grid by elevation band; lists current elevation seed hexes; delete action per entry
- [ ] `TerrainSeedEditor.vue` (new) — coverage grid by terrain type (open, woods, town, orchard, rough); lists current terrain seed hexes; delete action per entry
- [ ] Both editors update reactively when seeds are added/removed via `HexEditPanel`
- [ ] Schema tests: valid full config, valid empty config, invalid rgb tuple, missing `confirmedData` fields
- [ ] Route tests follow the pattern in `mapEditor.test.js` and `scenarioEditor.test.js`
- [ ] `npm run test` passes, ≥70% line coverage on new files

## Files to create/modify

- `server/src/schemas/map-autodetect-config.schema.js` (new)
- `server/src/schemas/map-autodetect-config.schema.test.js` (new)
- `data/scenarios/south-mountain/map-autodetect-config.json` (new)
- `server/src/routes/autoDetectConfig.js` (new)
- `server/src/routes/autoDetectConfig.test.js` (new)
- `client/src/components/HexEditPanel.vue`
- `client/src/components/ElevationSeedEditor.vue` (new)
- `client/src/components/ElevationSeedEditor.test.js` (new)
- `client/src/components/TerrainSeedEditor.vue` (new)
- `client/src/components/TerrainSeedEditor.test.js` (new)

## Tests required

Vitest unit tests for schema; Vitest route tests; Vitest component tests for both seed editors.

## Rules / data dependencies

None.

## Depends on

#53

## Milestone

v1.0 — MVP
