import { z } from 'zod';

const HexId = z.string().regex(/^\d+\.\d+$/, 'Hex ID must be in col.row format (e.g. "19.23")');

const TerrainType = z.enum([
  'clear',
  'woods',
  'slopingGround',
  'woodedSloping',
  'orchard',
  'marsh',
  'unknown',
]);

const HexFeature = z.object({
  type: z.string(),
});

const EdgeFeature = z.object({
  type: z.string(),
  movementModifier: z.number().optional(),
  losBlocking: z.boolean().optional(),
  losHeightBonus: z.number().optional(),
});

const HexEntry = z.object({
  hex: HexId,
  terrain: TerrainType,
  elevation: z.number().int().min(0).optional(),
  slope: z.number().int().min(0).max(5).optional(),
  // [0]=N, [1]=NE, [2]=SE, [3]=S, [4]=SW, [5]=NW — integer level offsets relative to hex elevation
  wedgeElevations: z
    .tuple([
      z.number().int().min(-98).max(98),
      z.number().int().min(-98).max(98),
      z.number().int().min(-98).max(98),
      z.number().int().min(-98).max(98),
      z.number().int().min(-98).max(98),
      z.number().int().min(-98).max(98),
    ])
    .optional(),
  hexsides: z.record(z.string(), z.string()).optional(),
  edges: z.record(z.enum(['N', 'NE', 'SE', 'S', 'SW', 'NW']), z.array(EdgeFeature)).optional(),
  features: z.array(HexFeature).optional(),
  vpHex: z.boolean().optional(),
  entryHex: z.boolean().optional(),
  side: z.enum(['union', 'confederate']).optional(),
  setupUnits: z.array(z.string()).optional(),
  playable: z.boolean().optional(),
  autoDetected: z.boolean().optional(),
  detectionConfidence: z.number().min(0).max(1).optional(),
  _note: z.string().optional(),
});

export const MapSchema = z
  .object({
    _status: z.string(),
    _savedAt: z.number().optional(),
    _description: z.string().optional(),
    _digitizationNote: z.string().optional(),
    scenario: z.string(),
    layout: z.literal('pointy-top'),
    hexIdFormat: z.string().optional(),
    gridSpec: z
      .object({
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
        rotation: z.number().min(-15).max(15).optional(),
        northOffset: z.number().int().min(0).max(11).optional(),
        locked: z.boolean().optional(),
        _note: z.string().optional(),
      })
      .optional(),
    terrainTypes: z.array(z.string()).optional(),
    hexsideTypes: z.array(z.string()).optional(),
    hexFeatureTypes: z.array(z.string()).optional(),
    edgeFeatureTypes: z.array(z.string()).optional(),
    elevationSystem: z
      .object({
        baseElevation: z.number().int().min(0).max(9999),
        elevationLevels: z.number().int().min(1).max(99),
        contourInterval: z.number(),
        unit: z.string(),
        verticalSlopesImpassable: z.boolean(),
        _note: z.string().optional(),
      })
      .optional(),
    vpHexes: z.array(
      z.object({
        hex: HexId,
        unionVP: z.number(),
        confederateVP: z.number(),
        label: z.string().optional(),
      })
    ),
    entryHexes: z
      .object({
        union: z.array(z.object({ hex: HexId, label: z.string().optional() })),
        confederate: z.array(z.object({ hex: HexId, label: z.string().optional() })),
      })
      .optional(),
    hexes: z.array(HexEntry),
    _todoHexes: z.unknown().optional(),
    _digitizationPlan: z.unknown().optional(),
  })
  .superRefine((data, ctx) => {
    const elevationLevels = data.elevationSystem?.elevationLevels ?? 22;
    const maxElevation = elevationLevels - 1;
    const maxWedgeOffset = elevationLevels - 1;
    for (let i = 0; i < data.hexes.length; i++) {
      const hex = data.hexes[i];
      if (hex.elevation !== undefined && hex.elevation > maxElevation) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: maxElevation,
          type: 'number',
          inclusive: true,
          message: `Hex ${hex.hex}: elevation ${hex.elevation} exceeds max ${maxElevation} (elevationLevels: ${elevationLevels})`,
          path: ['hexes', i, 'elevation'],
        });
      }
      if (hex.wedgeElevations) {
        for (let w = 0; w < hex.wedgeElevations.length; w++) {
          const offset = hex.wedgeElevations[w];
          if (Math.abs(offset) > maxWedgeOffset) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Hex ${hex.hex}: wedgeElevations[${w}] offset ${offset} exceeds ±${maxWedgeOffset} (elevationLevels: ${elevationLevels})`,
              path: ['hexes', i, 'wedgeElevations', w],
            });
          }
        }
      }
    }
  });
