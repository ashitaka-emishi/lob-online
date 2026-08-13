import { describe, it, expect, vi } from 'vitest';

import {
  findOobUnit,
  findOobLeader,
  findBrigadeForUnit,
  buildUnitIndex,
  findOobUnitFast,
  safeFindOobUnit,
  sumCurrentSPs,
} from './oob.js';

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

// ─── safeFindOobUnit (#681) ────────────────────────────────────────────────

describe('safeFindOobUnit', () => {
  it('finds a unit when oob is present and valid', () => {
    expect(safeFindOobUnit(OOB, 'r1')?.id).toBe('r1');
  });

  it('returns null when oob is null', () => {
    expect(safeFindOobUnit(null, 'r1')).toBeNull();
  });

  it('returns null when oob is undefined', () => {
    expect(safeFindOobUnit(undefined, 'r1')).toBeNull();
  });

  it('returns null (not throw) when the OOB shape is malformed, and warns (data-corruption signal)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(safeFindOobUnit({ union: null, confederate: null }, 'r1')).toBeNull();
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toContain('r1');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('returns null for an unknown unit id, same as findOobUnit', () => {
    expect(safeFindOobUnit(OOB, 'no-such')).toBeNull();
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

  it('finds brigade for a union cavalry regiment', () => {
    const result = findBrigadeForUnit(OOB, 'cav-r1');
    expect(result?.brigadeId).toBe('cav-brig');
    expect(result?.unitIds).toContain('cav-r1');
  });

  it('finds brigade for a confederate independent brigade regiment', () => {
    const result = findBrigadeForUnit(OOB, 'ind-r1');
    expect(result?.brigadeId).toBe('ind-brig');
    expect(result?.unitIds).toContain('ind-r1');
  });

  // #606 — corps-level units and batteries are NOT in any brigade; cascade must not fire for them
  it('returns null for a corps-level unit (not in any brigade) — load-bearing for #606', () => {
    expect(findBrigadeForUnit(OOB, 'cox-hq')).toBeNull();
  });

  it('returns null for a unit not in any brigade', () => {
    expect(findBrigadeForUnit(OOB, 'no-such')).toBeNull();
  });

  it('returns null when oob is null', () => {
    expect(findBrigadeForUnit(null, 'r1')).toBeNull();
  });
});

// ─── buildUnitIndex / findOobUnitFast ─────────────────────────────────────

describe('buildUnitIndex', () => {
  it('indexes all unit IDs present in the OOB fixture', () => {
    const index = buildUnitIndex(OOB);
    // union corps unit, two brigade regiments, cavalry regiment, confederate regiment, ind. brigade regiment
    for (const id of ['cox-hq', 'r1', 'r2', 'cav-r1', 'csa-r1', 'ind-r1']) {
      expect(index.has(id)).toBe(true);
    }
  });

  it('returns a Map with the correct unit object for each id', () => {
    const index = buildUnitIndex(OOB);
    expect(index.get('r1')?.strengthPoints).toBe(4);
    expect(index.get('cav-r1')?.morale).toBe('A');
    expect(index.get('ind-r1')?.morale).toBe('D');
  });

  it('index agrees with findOobUnit for every unit in the fixture (#596)', () => {
    const index = buildUnitIndex(OOB);
    for (const id of ['cox-hq', 'r1', 'r2', 'cav-r1', 'csa-r1', 'ind-r1']) {
      expect(index.get(id)).toStrictEqual(findOobUnit(OOB, id));
    }
  });

  it('returns an empty Map for a null OOB', () => {
    expect(buildUnitIndex(null).size).toBe(0);
  });
});

describe('findOobUnitFast', () => {
  it('returns the unit object by id from a pre-built index (#596)', () => {
    const index = buildUnitIndex(OOB);
    expect(findOobUnitFast(index, 'r2')?.strengthPoints).toBe(3);
  });

  it('returns null for an id not in the index', () => {
    const index = buildUnitIndex(OOB);
    expect(findOobUnitFast(index, 'no-such')).toBeNull();
  });
});

// ─── sumCurrentSPs ────────────────────────────────────────────────────────

describe('sumCurrentSPs', () => {
  it('sums printed OOB SPs when no state.strengthPoints override is present', () => {
    const states = [{ id: 'r1' }, { id: 'r2' }];
    expect(sumCurrentSPs(states, OOB)).toBe(7); // 4 + 3
  });

  it('uses state.strengthPoints over OOB printed value when present', () => {
    const states = [{ id: 'r1', strengthPoints: 2 }, { id: 'r2' }];
    expect(sumCurrentSPs(states, OOB)).toBe(5); // 2 + 3
  });

  it('halves DG unit SP contribution when applyDgHalving is true (LOB §5.0)', () => {
    const states = [
      { id: 'r1', strengthPoints: 4, moraleState: 'disorganized' },
      { id: 'r2', strengthPoints: 3, moraleState: 'normal' },
    ];
    expect(sumCurrentSPs(states, OOB, { applyDgHalving: true })).toBe(5); // floor(4/2) + 3
  });

  it('does NOT halve DG SP when applyDgHalving is false (LOB §7.0g gate — raw SP)', () => {
    const states = [{ id: 'r1', strengthPoints: 4, moraleState: 'disorganized' }];
    expect(sumCurrentSPs(states, OOB, { applyDgHalving: false })).toBe(4);
  });

  it('contributes 0 for a unit not found in the OOB', () => {
    const states = [{ id: 'ghost', strengthPoints: 99 }, { id: 'r1' }];
    expect(sumCurrentSPs(states, OOB)).toBe(4); // ghost skipped; r1 printed = 4
  });

  it('returns 0 for an empty unit list', () => {
    expect(sumCurrentSPs([], OOB)).toBe(0);
  });
});
