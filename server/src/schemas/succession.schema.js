import { z } from 'zod';

const CommandLevel = z.enum(['army', 'wing', 'corps', 'division', 'brigade', 'cavalry']);

const SuccessionCounterRef = z
  .object({
    front: z.string().nullable(),
    frontConfidence: z.number().min(0).max(1).nullable(),
    back: z.string().nullable(),
    backConfidence: z.number().min(0).max(1).nullable(),
    promotedFront: z.string().nullable().optional(),
    promotedFrontConfidence: z.number().min(0).max(1).nullable().optional(),
    promotedBack: z.string().nullable().optional(),
    promotedBackConfidence: z.number().min(0).max(1).nullable().optional(),
  })
  .nullable();

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
  specialRules: z.record(z.string(), z.unknown()).nullable().optional(),
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
