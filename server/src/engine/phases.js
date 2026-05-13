// LOB §2.1 — Turn sequence: Command Phase → Activity Phase → Rally Phase → next turn.
// These constants are the canonical string identifiers used throughout the engine and schema.
// Add new phases here (before M6 combat/morale phases) rather than scattering string literals.

export const PHASES = /** @type {const} */ ({
  COMMAND: 'command',
  ACTIVITY: 'activity',
  RALLY: 'rally',
});

// LOB §2.1 — Steps within each phase (interactive and automatic).
// Command:  orders (interactive) → attackRecovery (auto) → flukeStoppage (auto)
// Activity: activation (interactive)
// Rally:    rally (auto at M5 depth; per-unit rolls added in M6)
export const STEPS = /** @type {const} */ ({
  // Command phase
  ORDERS: 'orders',
  ATTACK_RECOVERY: 'attackRecovery',
  FLUKE_STOPPAGE: 'flukeStoppage',
  // Activity phase
  ACTIVATION: 'activation',
  // Rally phase
  RALLY: 'rally',
});
