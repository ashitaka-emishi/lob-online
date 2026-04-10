import { z } from 'zod';

/**
 * Shared schema primitives used across oob.schema.js, leaders.schema.js, and succession.schema.js.
 * Import from this module instead of redefining locally.
 */

export const CommandLevel = z.enum(['army', 'wing', 'corps', 'division', 'brigade', 'cavalry']);

const _baseCounterRefFields = {
  front: z.string().nullable(),
  frontConfidence: z.number().min(0).max(1).nullable(),
  back: z.string().nullable(),
  backConfidence: z.number().min(0).max(1).nullable(),
};

/**
 * Counter ref for unit/node records (oob.json) — base four fields only.
 */
export const BaseCounterRef = z.object({ ..._baseCounterRefFields }).nullable();

/**
 * Counter ref for leader records — all eight fields present (promoted fields required/nullable).
 */
export const LeaderCounterRef = z
  .object({
    ..._baseCounterRefFields,
    promotedFront: z.string().nullable(),
    promotedFrontConfidence: z.number().min(0).max(1).nullable(),
    promotedBack: z.string().nullable(),
    promotedBackConfidence: z.number().min(0).max(1).nullable(),
  })
  .nullable();

/**
 * Counter ref for succession variant records — promoted fields are optional
 * (variants may not yet have counter images assigned).
 */
export const SuccessionCounterRef = z
  .object({
    ..._baseCounterRefFields,
    promotedFront: z.string().nullable().optional(),
    promotedFrontConfidence: z.number().min(0).max(1).nullable().optional(),
    promotedBack: z.string().nullable().optional(),
    promotedBackConfidence: z.number().min(0).max(1).nullable().optional(),
  })
  .nullable();
