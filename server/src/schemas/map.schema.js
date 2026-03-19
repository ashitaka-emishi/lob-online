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

export const EDGE_FEATURE_TYPE_VALUES = [
  'road',
  'trail',
  'pike',
  'stream',
  'ford',
  'bridge',
  'stoneWall',
  'elevation',
  'slope',
  'extremeSlope',
  'verticalSlope',
];

const EdgeFeature = z.object({
  type: z.enum(EDGE_FEATURE_TYPE_VALUES),
  movementModifier: z.number().optional(),
  losBlocking: z.boolean().optional(),
  losHeightBonus: z.number().optional(),
});

// Canonical edge ownership: only face indices 0, 1, 2 are stored on this hex.
// Faces 3, 4, 5 are stored on the neighbour hex as face index (dir − 3).
// NOTE: JSON object keys are always strings, so face indices are stored as '0', '1', '2'.
// Any consumer performing arithmetic on face keys must use parseInt(face, 10).
const FaceIndex = z.enum(['0', '1', '2']);

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
  edges: z.record(FaceIndex, z.array(EdgeFeature)).optional(),
  hexFeature: z.object({ type: z.enum(['building']) }).optional(),
  vpHex: z.boolean().optional(),
  entryHex: z.boolean().optional(),
  side: z.enum(['union', 'confederate']).optional(),
  setupUnits: z.array(z.string()).optional(),
  playable: z.boolean().optional(),
  autoDetected: z.boolean().optional(),
  detectionConfidence: z.number().min(0).max(1).optional(),
  _note: z.string().optional(),
});

// Exported so game-logic consumers (LOS, movement) can share the canonical classification
// without duplication. Both sets are subsets of EDGE_FEATURE_TYPE_VALUES.
export const ELEVATION_TYPES = new Set(['elevation', 'slope', 'extremeSlope', 'verticalSlope']);
export const ROUTE_TYPES = new Set(['road', 'trail', 'pike']);

function validateCoexistence(hex, hexIdx, ctx) {
  if (!hex.edges) return;
  for (const [face, features] of Object.entries(hex.edges)) {
    const types = features.map((f) => f.type);
    const typeSet = new Set(types);

    // ford requires stream on same edge
    if (typeSet.has('ford') && !typeSet.has('stream')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Hex ${hex.hex} face ${face}: ford requires stream on the same edge`,
        path: ['hexes', hexIdx, 'edges', face],
      });
    }

    // bridge requires road/trail/pike on same edge
    if (typeSet.has('bridge') && !types.some((t) => ROUTE_TYPES.has(t))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Hex ${hex.hex} face ${face}: bridge requires road, trail, or pike on the same edge`,
        path: ['hexes', hexIdx, 'edges', face],
      });
    }

    // elevation types are mutually exclusive per edge
    const elevationTypesOnEdge = types.filter((t) => ELEVATION_TYPES.has(t));
    if (elevationTypesOnEdge.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Hex ${hex.hex} face ${face}: elevation types are mutually exclusive (found: ${elevationTypesOnEdge.join(', ')})`,
        path: ['hexes', hexIdx, 'edges', face],
      });
    }
  }
}

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
      validateCoexistence(hex, i, ctx);
    }
  });
