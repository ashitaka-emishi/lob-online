import { z } from 'zod';

import { CommandLevel, LeaderCounterRef } from './shared.schema.js';

const BaseLeader = z.object({
  id: z.string(),
  name: z.string(),
  rank: z.string().optional(),
  commandLevel: CommandLevel,
  commandsId: z.string().nullable(),
  commandValue: z.number().int().nullable(),
  moraleValue: z.number().int().nullable(),
  counterRef: LeaderCounterRef.optional(),
  specialRules: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
});

export const LeadersSchema = z
  .object({
    _status: z.string(),
    _source: z.string(),
    _notes: z.record(z.string(), z.string()).optional(),
    _savedAt: z.number().optional(),
    union: z.object({
      _note: z.string().optional(),
      army: z.array(BaseLeader),
      corps: z.array(BaseLeader),
      cavalry: z.array(BaseLeader),
      divisions: z.array(BaseLeader),
      brigades: z.array(BaseLeader),
    }),
    confederate: z.object({
      _note: z.string().optional(),
      wing: z.array(BaseLeader),
      divisions: z.array(BaseLeader),
      brigades: z.array(BaseLeader),
    }),
  })
  .strict();
