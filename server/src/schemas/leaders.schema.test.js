import { describe, it, expect } from 'vitest';

import { LeadersSchema } from './leaders.schema.js';

const MINIMAL_LEADER = {
  id: 'test-leader',
  name: 'Test Leader',
  commandLevel: 'brigade',
  commandsId: null,
  initiativeRating: null,
};

const MINIMAL_LEADERS = {
  _status: 'draft',
  _source: 'test',
  union: {
    army: [],
    corps: [],
    cavalry: [],
    divisions: [],
    brigades: [MINIMAL_LEADER],
  },
  confederate: {
    wing: [],
    divisions: [],
    brigades: [],
  },
};

describe('LeadersSchema — counterRef on BaseLeader', () => {
  it('accepts leader without counterRef', () => {
    const result = LeadersSchema.safeParse(MINIMAL_LEADERS);
    expect(result.success).toBe(true);
  });

  it('accepts leader with counterRef null', () => {
    const leaders = {
      ...MINIMAL_LEADERS,
      union: {
        ...MINIMAL_LEADERS.union,
        brigades: [{ ...MINIMAL_LEADER, counterRef: null }],
      },
    };
    const result = LeadersSchema.safeParse(leaders);
    expect(result.success).toBe(true);
  });

  it('accepts leader with full counterRef object including confidence', () => {
    const leaders = {
      ...MINIMAL_LEADERS,
      union: {
        ...MINIMAL_LEADERS.union,
        brigades: [
          {
            ...MINIMAL_LEADER,
            counterRef: {
              front: 'CS1-Front_10.jpg',
              frontConfidence: 0.9,
              back: 'CS1-Back_10.jpg',
              backConfidence: 0.85,
              promotedFront: 'CS1-Front_11.jpg',
              promotedFrontConfidence: 0.7,
              promotedBack: 'CS1-Back_11.jpg',
              promotedBackConfidence: null,
            },
          },
        ],
      },
    };
    const result = LeadersSchema.safeParse(leaders);
    expect(result.success).toBe(true);
  });

  it('accepts leader with counterRef having null filenames and confidences', () => {
    const leaders = {
      ...MINIMAL_LEADERS,
      union: {
        ...MINIMAL_LEADERS.union,
        brigades: [
          {
            ...MINIMAL_LEADER,
            counterRef: {
              front: null,
              frontConfidence: null,
              back: null,
              backConfidence: null,
              promotedFront: null,
              promotedFrontConfidence: null,
              promotedBack: null,
              promotedBackConfidence: null,
            },
          },
        ],
      },
    };
    const result = LeadersSchema.safeParse(leaders);
    expect(result.success).toBe(true);
  });

  it('rejects leader with counterRef missing required fields', () => {
    const leaders = {
      ...MINIMAL_LEADERS,
      union: {
        ...MINIMAL_LEADERS.union,
        brigades: [
          {
            ...MINIMAL_LEADER,
            counterRef: { front: 'file.jpg' }, // missing back, promotedFront, promotedBack, confidence fields
          },
        ],
      },
    };
    const result = LeadersSchema.safeParse(leaders);
    expect(result.success).toBe(false);
  });
});

// ── _savedAt + .strict() (#221) ──────────────────────────────────────────────

describe('LeadersSchema — _savedAt and strict mode (#221)', () => {
  it('accepts leaders with optional _savedAt number', () => {
    const result = LeadersSchema.safeParse({ ...MINIMAL_LEADERS, _savedAt: Date.now() });
    expect(result.success).toBe(true);
  });

  it('accepts leaders without _savedAt', () => {
    const result = LeadersSchema.safeParse(MINIMAL_LEADERS);
    expect(result.success).toBe(true);
  });

  it('rejects leaders with unknown top-level field', () => {
    const result = LeadersSchema.safeParse({ ...MINIMAL_LEADERS, _unknownField: 'surprise' });
    expect(result.success).toBe(false);
  });
});
