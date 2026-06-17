import { describe, it, expect } from 'vitest';

import { findOobUnit, findOobLeader, findBrigadeForUnit } from './oob.js';

// Minimal synthetic OOB fixture — just enough structure to exercise each walk path
const OOB = {
  union: {
    corps: [
      {
        id: 'cox',
        corpsUnits: [{ id: 'cox-hq', strengthPoints: 1, morale: 'C' }],
        artillery: {},
        divisions: [
          {
            id: 'willcox',
            brigades: [
              {
                id: 'christ',
                regiments: [
                  { id: 'r1', strengthPoints: 4, morale: 'B' },
                  { id: 'r2', strengthPoints: 3, morale: 'C' },
                ],
                batteries: [],
              },
            ],
            artillery: {},
            batteries: [],
          },
        ],
      },
    ],
    cavalryDivision: {
      brigades: [
        {
          id: 'cav-brig',
          regiments: [{ id: 'cav-r1', strengthPoints: 2, morale: 'A' }],
          batteries: [],
        },
      ],
      artillery: {},
    },
  },
  confederate: {
    divisions: [
      {
        id: 'd-h-hill',
        brigades: [
          {
            id: 'anderson',
            regiments: [{ id: 'csa-r1', strengthPoints: 5, morale: 'B' }],
            batteries: [],
          },
        ],
        artillery: {},
        batteries: [],
      },
    ],
    independent: { cavalry: [], artillery: [] },
    reserveArtillery: { batteries: [] },
    independentBrigades: [
      {
        id: 'ind-brig',
        regiments: [{ id: 'ind-r1', strengthPoints: 2, morale: 'D' }],
        artillery: {},
      },
    ],
  },
};

// ─── findOobUnit ────────────────────────────────────────────────────────────

describe('findOobUnit', () => {
  it('finds a union regiment in a corps division brigade', () => {
    expect(findOobUnit(OOB, 'r1')?.id).toBe('r1');
  });

  it('finds a union corps-level unit', () => {
    expect(findOobUnit(OOB, 'cox-hq')?.id).toBe('cox-hq');
  });

  it('finds a union cavalry regiment', () => {
    expect(findOobUnit(OOB, 'cav-r1')?.id).toBe('cav-r1');
  });

  it('finds a confederate regiment', () => {
    expect(findOobUnit(OOB, 'csa-r1')?.id).toBe('csa-r1');
  });

  it('finds a confederate independent brigade regiment', () => {
    expect(findOobUnit(OOB, 'ind-r1')?.id).toBe('ind-r1');
  });

  it('returns null for unknown id', () => {
    expect(findOobUnit(OOB, 'no-such')).toBeNull();
  });
});

// ─── findOobLeader ─────────────────────────────────────────────────────────

describe('findOobLeader', () => {
  it('finds a union corps leader', () => {
    expect(findOobLeader(OOB, 'cox')?.id).toBe('cox');
  });

  it('finds a union division leader', () => {
    expect(findOobLeader(OOB, 'willcox')?.id).toBe('willcox');
  });

  it('finds a union brigade leader', () => {
    expect(findOobLeader(OOB, 'christ')?.id).toBe('christ');
  });

  it('finds a confederate division leader', () => {
    expect(findOobLeader(OOB, 'd-h-hill')?.id).toBe('d-h-hill');
  });

  it('finds a confederate brigade leader', () => {
    expect(findOobLeader(OOB, 'anderson')?.id).toBe('anderson');
  });

  it('finds a confederate independent brigade leader', () => {
    expect(findOobLeader(OOB, 'ind-brig')?.id).toBe('ind-brig');
  });

  it('returns null for unknown id', () => {
    expect(findOobLeader(OOB, 'no-such')).toBeNull();
  });
});

// ─── findBrigadeForUnit ────────────────────────────────────────────────────

describe('findBrigadeForUnit', () => {
  it('finds brigade for a union regiment', () => {
    const result = findBrigadeForUnit(OOB, 'r1');
    expect(result?.brigadeId).toBe('christ');
    expect(result?.unitIds).toContain('r1');
    expect(result?.unitIds).toContain('r2');
  });

  it('finds brigade for a confederate regiment', () => {
    const result = findBrigadeForUnit(OOB, 'csa-r1');
    expect(result?.brigadeId).toBe('anderson');
    expect(result?.unitIds).toContain('csa-r1');
  });

  it('returns null for a unit not in any brigade', () => {
    expect(findBrigadeForUnit(OOB, 'no-such')).toBeNull();
  });

  it('returns null when oob is null', () => {
    expect(findBrigadeForUnit(null, 'r1')).toBeNull();
  });
});
