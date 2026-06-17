// LOB §6.1/§7.0/§6.3 — pending resolution types that require a player morale roll. (#571)
// Single source of truth; imported by getValidActions, handleResolveMorale, and resolvePendingMorale.
export const MORALE_PENDING_TYPES = new Set(['combatResult', 'closingRoll', 'moraleCheck']);
