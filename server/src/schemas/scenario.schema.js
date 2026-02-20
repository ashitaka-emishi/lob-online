import { z } from 'zod';

const HexId = z.string().regex(/^\d+\.\d+$/, 'Hex ID must be in col.row format (e.g. "19.23")');
const TimeStr = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format');
const OrderType = z.enum(['move', 'complexDefense', 'none']);

const VPEntry = z.object({
  hex: HexId,
  unionVP: z.number(),
  confederateVP: z.number(),
  label: z.string().optional(),
});

const VictoryResult = z.object({
  label: z.string(),
  min: z.number().nullable(),
  max: z.number().nullable(),
});

const TerrainCostRow = z.object({
  line: z.union([z.number(), z.literal('ot'), z.null()]),
  column: z.union([z.number(), z.literal('ot'), z.null()]),
  mounted: z.union([z.number(), z.literal('ot'), z.null()]),
  limbered: z.union([z.number(), z.literal('ot'), z.null()]),
  wagon: z.union([z.number(), z.literal('ot'), z.null()]),
  leader: z.union([z.number(), z.literal('ot'), z.null()]),
  _smSpecial: z.boolean().optional(),
  _note: z.string().optional(),
});

const ReinforcementGroup = z.object({
  time: TimeStr.optional(),
  entryHex: HexId.optional(),
  orderRef: z.string().optional(),
  orderType: OrderType.optional(),
  orderDescription: z.string().optional(),
  units: z.array(z.string()),
  variable: z.boolean().optional(),
  variableTable: z
    .array(
      z.object({
        roll: z.union([z.number(), z.string()]),
        time: TimeStr,
        entryHex: HexId,
      })
    )
    .optional(),
  _id: z.string().optional(),
  _note: z.string().optional(),
  _groupNote: z.string().optional(),
});

const RandomEventEntry = z.object({
  roll: z.union([z.number(), z.string()]),
  event: z.string(),
  text: z.string(),
  affectsUnit: z.string().optional(),
  _reroll: z.boolean().optional(),
});

export const ScenarioSchema = z.object({
  _status: z.string(),
  _source: z.string(),
  id: z.string(),
  name: z.string(),
  system: z.string(),
  publication: z.string(),
  turnStructure: z.object({
    firstTurn: TimeStr,
    lastTurn: TimeStr,
    totalTurns: z.number().int().positive(),
    minutesPerTurn: z.number().int().positive(),
    firstPlayer: z.enum(['union', 'confederate']),
    date: z.string(),
  }),
  rules: z.record(z.string(), z.unknown()),
  movementCosts: z.object({
    _source: z.string().optional(),
    _notes: z.record(z.string(), z.string()).optional(),
    movementAllowances: z.record(z.string(), z.number()),
    terrainCosts: z.record(z.string(), TerrainCostRow),
    hexsideCosts: z.record(z.string(), z.unknown()),
    noEffectTerrain: z.array(z.string()),
    roadSlopePenalty: z.record(z.string(), z.unknown()).optional(),
  }),
  ammoReserves: z.object({
    _source: z.string().optional(),
    confederate: z.record(z.string(), z.unknown()),
    union: z.record(z.string(), z.unknown()),
  }),
  setup: z.object({
    _note: z.string().optional(),
    union: z.array(z.unknown()),
    confederate: z.array(z.unknown()),
  }),
  initialOrders: z
    .object({
      confederate: z.array(
        z.object({
          id: z.string(),
          type: OrderType,
          originalType: z.string().optional(),
          assignedTo: z.string(),
          description: z.string().optional(),
        })
      ),
    })
    .optional(),
  reinforcements: z.object({
    _note: z.string().optional(),
    union: z.array(ReinforcementGroup),
    confederate: z.array(ReinforcementGroup),
  }),
  victoryPoints: z.object({
    _note: z.string().optional(),
    terrain: z.array(VPEntry),
    wreck: z.object({
      confederate: z.record(z.string(), z.unknown()),
      union: z.record(z.string(), z.unknown()),
    }),
  }),
  victoryConditions: z.object({
    _note: z.string().optional(),
    results: z.array(VictoryResult),
  }),
  randomEvents: z.object({
    _note: z.string().optional(),
    confederate: z.object({
      _rerollOn: z.string().optional(),
      table: z.array(RandomEventEntry),
    }),
    union: z.object({
      _rerollOn: z.string().optional(),
      table: z.array(RandomEventEntry),
    }),
  }),
});
