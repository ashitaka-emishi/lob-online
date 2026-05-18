// LOB §2.1 — Turn sequence: Command Phase → Activity Phase → Rally Phase → next turn.
// Canonical string identifiers for engine, schema, and client. Centralised here so both the
// schema layer (server/src/schemas/) and the engine (server/src/engine/) can import without
// inverting the dependency direction. Add new phases here before M6 combat/morale phases.

export const PHASES = Object.freeze({
  COMMAND: 'command',
  ACTIVITY: 'activity',
  RALLY: 'rally',
});

// LOB §2.1 — Steps within each phase (interactive and automatic).
// Command:  orders (interactive) → attackRecovery (auto) → flukeStoppage (auto)
// Activity: activation (interactive)
// Rally:    rally (auto at M5 depth; per-unit rolls added in M6)
//
// Note: STEPS.RALLY === PHASES.RALLY === 'rally'. The two constants are intentionally
// distinct (step vs. phase namespace) — do not merge them. When M6 adds per-unit rally
// rolls the step name will diverge from the phase name.
export const STEPS = Object.freeze({
  // Command phase
  ORDERS: 'orders',
  ATTACK_RECOVERY: 'attackRecovery',
  FLUKE_STOPPAGE: 'flukeStoppage',
  // Activity phase
  ACTIVATION: 'activation',
  // Rally phase
  RALLY: 'rally',
});
