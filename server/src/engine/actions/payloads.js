import { z } from 'zod';

import { ActionError } from './actionError.js';

// LOB §5.5 — valid weapon classes
const WeaponClass = z.enum(['smallArms', 'artillery']);

// Hex coordinate strings (e.g. "12.34") — two non-negative integers separated by a dot
const HexCoord = z.string().regex(/^\d+\.\d+$/, 'hex must be in "row.col" format');

// Single d6 integer result
const Die6 = z.number().int().min(1).max(6);

// Two-element d6 array for Combat Table
const Dice2d6 = z.array(Die6).length(2);

// Optional boolean mods object for Closing Roll
const ClosingMods = z
  .object({
    hasLeaderMorale2Plus: z.boolean().optional(),
    isRear: z.boolean().optional(),
    isShaken: z.boolean().optional(),
    frontalArtilleryWithCanister: z.boolean().optional(),
    startsAdjacentToTarget: z.boolean().optional(),
  })
  .optional()
  .default({});

/**
 * CLOSE_COMBAT payload schema (LOB §7.0).
 */
export const CloseCombatPayloadSchema = z.object({
  attackerHex: HexCoord,
  defenderHex: HexCoord,
  closingDie: Die6,
  openingVolleyDie: Die6,
  mods: ClosingMods,
});

/**
 * FIRE_COMBAT payload schema (LOB §5.0).
 */
export const FireCombatPayloadSchema = z.object({
  attackerHex: HexCoord,
  defenderHex: HexCoord,
  weaponClass: WeaponClass,
  weaponType: z.string().min(1),
  dice: Dice2d6,
  openingVolleyDie: Die6.optional(),
});

/**
 * Parse and validate a raw action payload against a Zod schema.
 * Throws ActionError('INVALID_PAYLOAD', ...) on failure.
 *
 * @param {unknown} raw - raw payload from req.body.payload
 * @param {z.ZodTypeAny} schema - the Zod schema to validate against
 * @returns {object} parsed and validated payload
 */
export function parsePayload(raw, schema) {
  const result = schema.safeParse(raw ?? {});
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ActionError('INVALID_PAYLOAD', msg);
  }
  return result.data;
}
