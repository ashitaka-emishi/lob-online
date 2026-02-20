import { z } from 'zod';

const CommandLevel = z.enum(['army', 'wing', 'corps', 'division', 'brigade', 'cavalry']);

const BaseLeader = z.object({
  id: z.string(),
  name: z.string(),
  rank: z.string().optional(),
  commandLevel: CommandLevel,
  commandsId: z.string().nullable(),
  initiativeRating: z.number().int().nullable(),
  specialRules: z.record(z.string(), z.unknown()).optional(),
});

export const LeadersSchema = z.object({
  _status: z.string(),
  _source: z.string(),
  _notes: z.record(z.string(), z.string()).optional(),
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
});
