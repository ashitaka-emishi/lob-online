import { z } from 'zod';

const HexId = z.string().regex(/^\d+\.\d+$/, 'Hex ID must be in col.row format (e.g. "19.23")');

const TerrainType = z.enum([
  'clear', 'woods', 'slopingGround', 'woodedSloping', 'orchard', 'marsh', 'unknown',
]);

const HexEntry = z.object({
  hex: HexId,
  terrain: TerrainType,
  elevation: z.number().optional(),
  hexsides: z.record(z.string(), z.string()).optional(),
  vpHex: z.boolean().optional(),
  entryHex: z.boolean().optional(),
  side: z.enum(['union', 'confederate']).optional(),
  setupUnits: z.array(z.string()).optional(),
  _note: z.string().optional(),
});

export const MapSchema = z.object({
  _status: z.string(),
  _description: z.string().optional(),
  _digitizationNote: z.string().optional(),
  scenario: z.string(),
  layout: z.literal('pointy-top'),
  hexIdFormat: z.string().optional(),
  gridSpec: z.object({
    cols: z.number().int().positive(),
    rows: z.number().int().positive(),
    dx: z.number(),
    dy: z.number(),
    hexWidth: z.number().positive(),
    hexHeight: z.number().positive(),
    imageScale: z.number().positive(),
    strokeWidth: z.number().positive(),
    orientation: z.enum(['flat', 'pointy']),
    evenColUp: z.boolean(),
    _note: z.string().optional(),
  }).optional(),
  terrainTypes: z.array(z.string()).optional(),
  hexsideTypes: z.array(z.string()).optional(),
  elevationSystem: z.object({
    contourInterval: z.number(),
    unit: z.string(),
    verticalSlopesImpassable: z.boolean(),
    _note: z.string().optional(),
  }).optional(),
  vpHexes: z.array(z.object({
    hex: HexId,
    unionVP: z.number(),
    confederateVP: z.number(),
    label: z.string().optional(),
  })),
  entryHexes: z.object({
    union: z.array(z.object({ hex: HexId, label: z.string().optional() })),
    confederate: z.array(z.object({ hex: HexId, label: z.string().optional() })),
  }).optional(),
  hexes: z.array(HexEntry),
  _todoHexes: z.unknown().optional(),
  _digitizationPlan: z.unknown().optional(),
});
