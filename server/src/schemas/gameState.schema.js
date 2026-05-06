import { z } from 'zod';

// col.row format — e.g. "19.23"
const HexId = z.string().regex(/^\d+\.\d+$/, 'Hex ID must be in col.row format (e.g. "19.23")');

// LOB §6.0 — Morale States: Normal, Blood Lust (BL), Shaken (Sh), Disorganized (DG), Routed (R)
export const MoraleState = z.enum(['normal', 'bloodLust', 'shaken', 'DG', 'routed']);

// LOB §10.4a–b — Attack and Move order types; null = no accepted order (§10.8a, defaults to defending)
export const OrderType = z.enum(['attack', 'move']).nullable();

// LOB §8.2b — Shell Depletion / Canister Depletion mapped to RSS Low/No Ammo markers (LOB_GAME_UPDATES)
// 'full' = undepleted; 'low' = Shell Depleted; 'none' = Canister Depleted
export const AmmoState = z.enum(['full', 'low', 'none']);

export const UnitStateSchema = z.object({
  id: z.string(),
  // LOB §3.3 — Facing: hexside 0–5, 0=N clockwise (implementation convention)
  hex: HexId.nullable(),
  facing: z.number().int().min(0).max(5),
  moraleState: MoraleState,
  // LOB §5.7 — Wrecked Status: separate from morale; unit is Wrecked when current SPs < 50% of printed strength
  wrecked: z.boolean(),
  orders: OrderType,
  ammo: AmmoState,
  isOnBoard: z.boolean(),
  entryTurn: z.number().int().positive().nullable(),
});

const ReinforcementEntry = z.object({
  unitId: z.string(),
  turn: z.number().int().positive(),
  entryHex: HexId,
});

export const GameStateSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  // Monotonically incremented on every saveGame — used for optimistic concurrency control (#332)
  version: z.number().int().nonnegative(),
  turn: z.number().int().min(1),
  // Phase within the current turn; null when status = 'setup' (pre-game) — LOB §10 turn sequence
  phase: z.enum(['initiative', 'orders', 'movement', 'combat', 'morale', 'recovery']).nullable(),
  initiative: z.enum(['union', 'confederate']).nullable(),
  sides: z.object({
    union: z.string().nullable(),
    confederate: z.string().nullable(),
  }),
  units: z.record(z.string(), UnitStateSchema),
  reinforcementQueue: z.array(ReinforcementEntry),
  status: z.enum(['setup', 'active', 'complete']),
});
