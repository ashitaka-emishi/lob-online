import { z } from 'zod';

export const ElevationBandSchema = z.object({
  elevationFeet: z.number(),
  colorName: z.string(),
  rgb: z.tuple([z.number(), z.number(), z.number()]),
});

export const SeedHexSchema = z.object({
  hexId: z.string(),
  confirmedData: z.object({
    terrain: z.string(),
    elevation: z.number(),
    features: z.array(z.string()),
  }),
  cropBase64: z.string(),
});

export const AutoDetectConfigSchema = z.object({
  elevationPalette: z.array(ElevationBandSchema).optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  seedHexes: z.array(SeedHexSchema).optional(),
});
