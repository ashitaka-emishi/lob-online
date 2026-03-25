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

  it('accepts leader with full counterRef object', () => {
    const leaders = {
      ...MINIMAL_LEADERS,
      union: {
        ...MINIMAL_LEADERS.union,
        brigades: [
          {
            ...MINIMAL_LEADER,
            counterRef: {
              front: 'CS1-Front_10.jpg',
              back: 'CS1-Back_10.jpg',
              promotedFront: 'CS1-Front_11.jpg',
              promotedBack: 'CS1-Back_11.jpg',
            },
          },
        ],
      },
    };
    const result = LeadersSchema.safeParse(leaders);
    expect(result.success).toBe(true);
  });

  it('accepts leader with counterRef having null filenames', () => {
    const leaders = {
      ...MINIMAL_LEADERS,
      union: {
        ...MINIMAL_LEADERS.union,
        brigades: [
          {
            ...MINIMAL_LEADER,
            counterRef: {
              front: null,
              back: null,
              promotedFront: null,
              promotedBack: null,
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
            counterRef: { front: 'file.jpg' }, // missing back, promotedFront, promotedBack
          },
        ],
      },
    };
    const result = LeadersSchema.safeParse(leaders);
    expect(result.success).toBe(false);
  });
});
