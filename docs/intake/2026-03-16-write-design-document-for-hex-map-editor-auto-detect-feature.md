---
issue: 40
title: Write design document for hex map editor auto-detect feature
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

The hex map editor requires manual entry for every hex's terrain, elevation, and hexside features — a slow process for hundreds of hexes. Before implementation can begin, a design document is needed to specify the auto-detect feature architecture: how hex crops are extracted from the map image, how color analysis produces terrain and elevation assignments, how a user-supplied elevation palette is stored, and how the Claude Vision API fallback integrates. The design doc will be the authoritative reference for all subsequent implementation issues.

## Acceptance criteria

- A design document exists at `docs/map-editor-auto-detect-design.md`
- The document covers all of the following sections:
  - **Overview** — problem statement, goals, non-goals
  - **User experience** — how the feature appears in the editor (palette upload, single-hex and batch detect buttons, confidence indicators, accept/override flow)
  - **Elevation palette config** — format of the palette image, how it is uploaded, where it is stored (proposed: `autoDetectConfig` field in `scenario.json`), and how it is retrieved
  - **Hex crop extraction** — how `gridSpec` is used to compute the pixel bounding region for each hex; edge cases (partial hexes, map boundaries)
  - **Local color analysis** — canvas-based pixel sampling algorithm, terrain heuristic color mappings, road/hexside linear feature detection approach, confidence scoring
  - **Claude Vision API fallback** — when it is triggered (manual toggle vs. confidence threshold), prompt design, response schema, error handling
  - **Decision log** — open questions with proposed answers and rationale; updated as decisions are made during design and implementation phases
  - **Data model changes** — proposed additions to `scenario.json` schema and any new Zod schema fields
  - **Component and composable map** — list of new/modified Vue components and composables with their responsibilities
  - **Test strategy** — what must be unit-tested vs. integration-tested; any constraints on mocking canvas or the Claude API in tests
  - **Implementation sequencing** — suggested breakdown into child issues (e.g. palette config, crop extraction, local analysis, API fallback, UX review flow)
- All open questions that cannot be resolved during document authoring are recorded in the decision log with a clear statement of what must be decided during implementation
- The document does not contain implementation code — pseudocode and data structure sketches are acceptable

## Files to create/modify

- `docs/map-editor-auto-detect-design.md` _(new)_

## Tests required

None — this issue produces documentation only.

## Rules / data dependencies

None — this is a dev tooling feature with no game mechanics implications.

## Depends on

None
