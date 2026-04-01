/**
 * Unit tests for detect-counters.js helpers.
 *
 * Tests only pure / mockable functions — the main() entry point is not tested
 * (it requires ANTHROPIC_API_KEY and live image files).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifyImage,
  detectArmyByColor,
  collectOOBRecords,
  collectLeaderRecords,
  buildRoster,
  writeCounterRef,
} from './detect-counters.js';

// ---------------------------------------------------------------------------
// classifyImage
// ---------------------------------------------------------------------------

describe('classifyImage', () => {
  it('classifies C## copy.png as confederate front', () => {
    expect(classifyImage('C1 copy.png')).toEqual({ army: 'confederate', face: 'front' });
    expect(classifyImage('C12 copy.png')).toEqual({ army: 'confederate', face: 'front' });
    expect(classifyImage('C80 copy.png')).toEqual({ army: 'confederate', face: 'front' });
  });

  it('classifies U##.png (no copy suffix) as union front', () => {
    expect(classifyImage('U1.png')).toEqual({ army: 'union', face: 'front' });
    expect(classifyImage('U56.png')).toEqual({ army: 'union', face: 'front' });
  });

  it('classifies U## copy.png as union front', () => {
    expect(classifyImage('U57 copy.png')).toEqual({ army: 'union', face: 'front' });
    expect(classifyImage('U99 copy.png')).toEqual({ army: 'union', face: 'front' });
  });

  it('classifies CS1-Front_## as front with null army', () => {
    expect(classifyImage('CS1-Front_01.jpg')).toEqual({ army: null, face: 'front' });
    expect(classifyImage('CS1-Front_150.jpg')).toEqual({ army: null, face: 'front' });
  });

  it('classifies CS1-Back_## as back with null army', () => {
    expect(classifyImage('CS1-Back_01.jpg')).toEqual({ army: null, face: 'back' });
    expect(classifyImage('CS1-Back_274.jpg')).toEqual({ army: null, face: 'back' });
  });

  it('returns front/null army for unrecognised filenames', () => {
    expect(classifyImage('unknown.png')).toEqual({ army: null, face: 'front' });
  });
});

// ---------------------------------------------------------------------------
// detectArmyByColor (mocked Anthropic client)
// ---------------------------------------------------------------------------

describe('detectArmyByColor', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      messages: {
        create: vi.fn(),
      },
    };
    // vi.spyOn fs.readFileSync so we don't need a real image file
    vi.mock('fs', async (importOriginal) => {
      const original = await importOriginal();
      return { ...original, readFileSync: vi.fn(() => Buffer.from('fake-image-data')) };
    });
  });

  it('returns "union" when Claude responds with "union"', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: 'union' }],
    });
    const result = await detectArmyByColor(mockClient, '/fake/CS1-Front_01.jpg');
    expect(result).toBe('union');
  });

  it('returns "confederate" when Claude responds with "confederate"', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: 'confederate' }],
    });
    const result = await detectArmyByColor(mockClient, '/fake/CS1-Front_05.jpg');
    expect(result).toBe('confederate');
  });

  it('returns null when Claude response is ambiguous', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: 'I cannot determine' }],
    });
    const result = await detectArmyByColor(mockClient, '/fake/CS1-Back_10.jpg');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// collectOOBRecords
// ---------------------------------------------------------------------------

describe('collectOOBRecords', () => {
  const minimalOob = {
    union: {
      corps: [
        {
          name: '1 Corps',
          divisions: [
            {
              name: '1st Division',
              brigades: [
                {
                  name: '1st Brigade',
                  regiments: [
                    {
                      id: '22ny',
                      name: '22nd NY',
                      type: 'infantry',
                      weapon: 'R',
                      strengthPoints: 8,
                      morale: 'B',
                      counterRef: null,
                    },
                  ],
                  artillery: {},
                },
              ],
              artillery: {},
            },
          ],
          artillery: {},
          corpsUnits: [],
        },
      ],
    },
    confederate: {
      divisions: [
        {
          name: 'dH Division',
          brigades: [
            {
              name: 'A/dH',
              regiments: [
                {
                  id: '2nc',
                  name: '2nd NC',
                  type: 'infantry',
                  weapon: 'M',
                  strengthPoints: 9,
                  morale: 'B',
                  counterRef: null,
                },
              ],
              artillery: {},
            },
          ],
          artillery: {},
        },
      ],
      independentBrigades: [],
      independent: {},
      reserveArtillery: {},
    },
  };

  it('collects union regiments tagged as union', () => {
    const map = collectOOBRecords(minimalOob);
    const entry = map.get('22ny');
    expect(entry).toBeDefined();
    expect(entry.army).toBe('union');
    expect(entry.chain.corps).toBe('1 Corps');
    expect(entry.chain.division).toBe('1st Division');
    expect(entry.chain.brigade).toBe('1st Brigade');
  });

  it('collects confederate regiments tagged as confederate', () => {
    const map = collectOOBRecords(minimalOob);
    const entry = map.get('2nc');
    expect(entry).toBeDefined();
    expect(entry.army).toBe('confederate');
    expect(entry.chain.division).toBe('dH Division');
    expect(entry.chain.brigade).toBe('A/dH');
  });
});

// ---------------------------------------------------------------------------
// buildRoster
// ---------------------------------------------------------------------------

describe('buildRoster', () => {
  const oobMap = new Map([
    [
      '22ny',
      {
        record: {
          id: '22ny',
          name: '22nd NY',
          type: 'infantry',
          weapon: 'R',
          strengthPoints: 8,
          morale: 'B',
        },
        army: 'union',
        chain: { corps: '1 Corps', division: '1st Div', brigade: '1st Brig' },
      },
    ],
    [
      '2nc',
      {
        record: {
          id: '2nc',
          name: '2nd NC',
          type: 'infantry',
          weapon: 'M',
          strengthPoints: 9,
          morale: 'B',
        },
        army: 'confederate',
        chain: { corps: null, division: 'dH Division', brigade: 'A/dH' },
      },
    ],
  ]);

  const leaderMap = new Map([
    [
      'hooker',
      {
        record: { id: 'hooker', name: 'Joseph Hooker', commandLevel: 'corps', commandsId: '1c' },
        army: 'union',
      },
    ],
  ]);

  it('filters to confederate army only', () => {
    const roster = buildRoster(oobMap, leaderMap, 'confederate');
    expect(roster).toContain('2nc');
    expect(roster).not.toContain('22ny');
    expect(roster).not.toContain('hooker');
  });

  it('filters to union army only', () => {
    const roster = buildRoster(oobMap, leaderMap, 'union');
    expect(roster).toContain('22ny');
    expect(roster).toContain('hooker');
    expect(roster).not.toContain('2nc');
  });

  it('includes full command chain in unit line', () => {
    const roster = buildRoster(oobMap, leaderMap, 'union');
    expect(roster).toContain('1 Corps');
    expect(roster).toContain('1st Div');
    expect(roster).toContain('1st Brig');
  });
});

// ---------------------------------------------------------------------------
// writeCounterRef
// ---------------------------------------------------------------------------

describe('writeCounterRef', () => {
  it('writes front filename and confidence when counterRef is null', () => {
    const record = { counterRef: null };
    const written = writeCounterRef(record, 'unit', 'front', 'C1 copy.png', 0.92);
    expect(written).toBe(true);
    expect(record.counterRef.front).toBe('C1 copy.png');
    expect(record.counterRef.frontConfidence).toBe(0.92);
  });

  it('writes back filename and confidence', () => {
    const record = { counterRef: null };
    writeCounterRef(record, 'unit', 'back', 'CS1-Back_01.jpg', 0.85);
    expect(record.counterRef.back).toBe('CS1-Back_01.jpg');
    expect(record.counterRef.backConfidence).toBe(0.85);
  });

  it('skips writing when front is already set and force=false', () => {
    const record = {
      counterRef: { front: 'existing.png', frontConfidence: 0.9, back: null, backConfidence: null },
    };
    const written = writeCounterRef(record, 'unit', 'front', 'new.png', 0.95, false);
    expect(written).toBe(false);
    expect(record.counterRef.front).toBe('existing.png');
  });

  it('overwrites when front is already set and force=true', () => {
    const record = {
      counterRef: { front: 'existing.png', frontConfidence: 0.9, back: null, backConfidence: null },
    };
    const written = writeCounterRef(record, 'unit', 'front', 'new.png', 0.95, true);
    expect(written).toBe(true);
    expect(record.counterRef.front).toBe('new.png');
    expect(record.counterRef.frontConfidence).toBe(0.95);
  });

  it('initialises leader counterRef with promoted fields', () => {
    const record = { counterRef: null };
    writeCounterRef(record, 'leader', 'front', 'L1.jpg', 0.88);
    expect(record.counterRef).toHaveProperty('promotedFront');
    expect(record.counterRef).toHaveProperty('promotedBack');
  });

  it('returns false and warns for invalid face field', () => {
    const record = { counterRef: null };
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const written = writeCounterRef(record, 'unit', 'promotedFront', 'x.png', 0.9);
    expect(written).toBe(false);
    spy.mockRestore();
  });
});
