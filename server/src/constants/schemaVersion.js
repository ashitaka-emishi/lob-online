// Monotonically incremented when GameStateSchema fields change in a breaking way.
// loadGame() rejects files whose schemaVersion !== STATE_SCHEMA_VERSION (#363).
// Increment this constant — and write a migration note in the commit — whenever
// the on-disk game-state format changes in a backward-incompatible way.
// v2 (M6): added depletionMarker (LOB §5.8) and cbfMarker (LOB §8.1) to UnitStateSchema;
//          added moraleCheck, closingRoll, combatResult to PendingResolutionSchema type enum;
//          added rallyPhase envelope to GameStateSchema.
export const STATE_SCHEMA_VERSION = 2;
