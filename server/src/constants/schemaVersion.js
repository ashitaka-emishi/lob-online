// Monotonically incremented when GameStateSchema fields change in a breaking way.
// loadGame() rejects files whose schemaVersion !== STATE_SCHEMA_VERSION (#363).
// Increment this constant — and write a migration note in the commit — whenever
// the on-disk game-state format changes in a backward-incompatible way.
export const STATE_SCHEMA_VERSION = 1;
