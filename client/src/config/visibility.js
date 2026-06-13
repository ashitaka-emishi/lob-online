// LOB §6.1 — visibility is unlimited during day; sentinel value used in schema and display logic.
// Sister definition: server/src/schemas/scenario.schema.js VISIBILITY_UNLIMITED — keep both in sync.
export const VISIBILITY_UNLIMITED = 999;

// LOB §6.1 — normal visibility range is 1–20 hexes.
// Sister definition: server/src/schemas/scenario.schema.js VISIBILITY_MAX — keep both in sync.
export const VISIBILITY_MAX = 20;
