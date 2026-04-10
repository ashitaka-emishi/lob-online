import { z } from 'zod';

import { CommandLevel, SuccessionCounterRef } from './shared.schema.js';

const SuccessionVariant = z.object({
  id: z.string(),
  name: z.string(),
  baseLeaderId: z.string(),
  rank: z.string().optional(),
  commandLevel: CommandLevel,
  commandsId: z.string().nullable(),
  commandValue: z.number().int().nullable(),
  moraleValue: z.number().int().nullable(),
  counterRef: SuccessionCounterRef.optional(),
  specialRules: z
    .record(z.string(), z.union([z.string(), z.boolean()]))
    .nullable()
    .optional(),
});

export const SuccessionSchema = z
  .object({
    _status: z.string(),
    _source: z.string(),
    _notes: z.record(z.string(), z.string()).optional(),
    _savedAt: z.number().optional(),
    union: z.array(SuccessionVariant),
    confederate: z.array(SuccessionVariant),
  })
  .strict();
