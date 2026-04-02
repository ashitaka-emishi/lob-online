/**
 * Unit tests for detect-counters.js helpers.
 *
 * Tests only pure / mockable functions — the main() entry point is not tested
 * (it requires ANTHROPIC_API_KEY and live image files).
 */

import { readFileSync, writeFileSync } from 'fs';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  classifyImage,
  detectArmyByColor,
  collectOOBRecords,
  collectLeaderRecords,
  buildRoster,
  identifyCounter,
  extractFirstJson,
  writeCounterRef,
  loadJSON,
  saveJSON,
} from './detect-counters.js';

// Mock 'fs' at the top level so all tests share the same mock instance.
// readFileSync and writeFileSync are replaced with vi.fn(); all other fs exports
// remain from the original module.
vi.mock('fs', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    readFileSync: vi.fn(() => Buffer.from('fake-image-data')),
    writeFileSync: vi.fn(),
  };
});

afterEach(() => {
  vi.mocked(readFileSync).mockReset();
  vi.mocked(writeFileSync).mockReset();
  // Restore the default mock behaviour after each test
  vi.mocked(readFileSync).mockReturnValue(Buffer.from('fake-image-data'));
});

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
// detectArmyByColor (mocked Anthropic client + mocked fs)
// ---------------------------------------------------------------------------

describe('detectArmyByColor', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = { messages: { create: vi.fn() } };
  });

  it('returns "union" when Claude responds with "union"', async () => {
    mockClient.messages.create.mockResolvedValue({ content: [{ text: 'union' }] });
    const result = await detectArmyByColor(mockClient, '/fake/CS1-Front_01.jpg');
    expect(result).toBe('union');
  });

  it('returns "confederate" when Claude responds with "confederate"', async () => {
    mockClient.messages.create.mockResolvedValue({ content: [{ text: 'confederate' }] });
    const result = await detectArmyByColor(mockClient, '/fake/CS1-Front_05.jpg');
    expect(result).toBe('confederate');
  });

  it('returns null when Claude response is ambiguous', async () => {
    mockClient.messages.create.mockResolvedValue({ content: [{ text: 'I cannot determine' }] });
    const result = await detectArmyByColor(mockClient, '/fake/CS1-Back_10.jpg');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractFirstJson
// ---------------------------------------------------------------------------

describe('extractFirstJson', () => {
  it('extracts a simple flat object', () => {
    expect(extractFirstJson('{"unitId":"foo","confidence":0.9}')).toBe(
      '{"unitId":"foo","confidence":0.9}'
    );
  });

  it('extracts JSON when followed by trailing prose', () => {
    expect(extractFirstJson('{"unitId":"foo","confidence":0.9} Based on the markings...')).toBe(
      '{"unitId":"foo","confidence":0.9}'
    );
  });

  it('extracts a nested JSON object correctly', () => {
    const input = '{"unitId":"foo","confidence":0.9,"meta":{"note":"clear"}}';
    expect(extractFirstJson(input)).toBe(input);
  });

  it('returns null when no JSON object is present', () => {
    expect(extractFirstJson('I cannot identify this counter.')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractFirstJson('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// identifyCounter (mocked Anthropic client + mocked fs)
// ---------------------------------------------------------------------------

describe('identifyCounter', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = { messages: { create: vi.fn() } };
  });

  it('parses a clean JSON response', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: '{"unitId":"22ny","confidence":0.95}' }],
    });
    const result = await identifyCounter(mockClient, '/fake/U1.png', 'front', 'union', 'roster...');
    expect(result).toEqual({ unitId: '22ny', confidence: 0.95 });
  });

  it('extracts JSON when Claude appends explanation text', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: '{"unitId":"2nc","confidence":0.85} Based on the markings I can see...' }],
    });
    const result = await identifyCounter(
      mockClient,
      '/fake/C1.png',
      'front',
      'confederate',
      'roster...'
    );
    expect(result).toEqual({ unitId: '2nc', confidence: 0.85 });
  });

  it('handles nested JSON from Claude response', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: '{"unitId":"22ny","confidence":0.9,"meta":{"note":"clear"}}' }],
    });
    const result = await identifyCounter(mockClient, '/fake/U1.png', 'front', 'union', 'roster...');
    expect(result.unitId).toBe('22ny');
    expect(result.confidence).toBe(0.9);
  });

  it('strips markdown fences and parses JSON', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: '```json\n{"unitId":"hooker","confidence":0.7}\n```' }],
    });
    const result = await identifyCounter(
      mockClient,
      '/fake/CS1-Front_01.jpg',
      'front',
      'union',
      'roster...'
    );
    expect(result.unitId).toBe('hooker');
  });

  it('returns null unitId and zero confidence when response is unparseable', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: 'I cannot identify this counter.' }],
    });
    const result = await identifyCounter(mockClient, '/fake/U1.png', 'front', 'union', 'roster...');
    expect(result).toEqual({ unitId: null, confidence: 0 });
  });

  it('clamps confidence above 1.0 to 1.0', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: '{"unitId":"22ny","confidence":1.5}' }],
    });
    const result = await identifyCounter(mockClient, '/fake/U1.png', 'front', 'union', 'roster...');
    expect(result.confidence).toBe(1.0);
  });

  it('clamps negative confidence to 0.0', async () => {
    mockClient.messages.create.mockResolvedValue({
      content: [{ text: '{"unitId":"22ny","confidence":-0.5}' }],
    });
    const result = await identifyCounter(mockClient, '/fake/U1.png', 'front', 'union', 'roster...');
    expect(result.confidence).toBe(0.0);
  });
});

// ---------------------------------------------------------------------------
// loadJSON / saveJSON
// ---------------------------------------------------------------------------

describe('loadJSON', () => {
  it('parses JSON returned by readFileSync', () => {
    vi.mocked(readFileSync).mockReturnValueOnce('{"key":"value","n":42}');
    const result = loadJSON('/fake/data.json');
    expect(result).toEqual({ key: 'value', n: 42 });
  });
});

describe('saveJSON', () => {
  it('writes pretty-printed JSON with a trailing newline', () => {
    saveJSON('/fake/output.json', { a: 1, b: 2 });
    expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
      '/fake/output.json',
      JSON.stringify({ a: 1, b: 2 }, null, 2) + '\n',
      'utf8'
    );
  });
});

// ---------------------------------------------------------------------------
// collectOOBRecords
// ---------------------------------------------------------------------------

describe('collectOOBRecords', () => {
  const baseOob = {
    union: {
      corps: [
        {
          name: '1 Corps',
          hq: { id: '1c-hq', name: '1 Corps HQ', counterRef: null },
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
      supplyTrain: { id: 'usa-train', name: 'AotP Supply', counterRef: null },
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
    const map = collectOOBRecords(baseOob);
    const entry = map.get('22ny');
    expect(entry).toBeDefined();
    expect(entry.army).toBe('union');
    expect(entry.chain.corps).toBe('1 Corps');
    expect(entry.chain.division).toBe('1st Division');
    expect(entry.chain.brigade).toBe('1st Brigade');
  });

  it('collects confederate regiments tagged as confederate', () => {
    const map = collectOOBRecords(baseOob);
    const entry = map.get('2nc');
    expect(entry).toBeDefined();
    expect(entry.army).toBe('confederate');
    expect(entry.chain.division).toBe('dH Division');
    expect(entry.chain.brigade).toBe('A/dH');
  });

  it('collects union supplyTrain when present', () => {
    const map = collectOOBRecords(baseOob);
    const entry = map.get('usa-train');
    expect(entry).toBeDefined();
    expect(entry.army).toBe('union');
    expect(entry.type).toBe('unit');
  });

  it('collects corps hq markers when present', () => {
    const map = collectOOBRecords(baseOob);
    const entry = map.get('1c-hq');
    expect(entry).toBeDefined();
    expect(entry.army).toBe('union');
    expect(entry.chain.corps).toBe('1 Corps');
  });

  it('collects union cavalry division units', () => {
    const oob = {
      union: {
        corps: [],
        cavalryDivision: {
          name: 'Cavalry Division',
          brigades: [
            {
              name: '1st Cav Brig',
              regiments: [
                {
                  id: 'cav-1',
                  name: '8 PA Cav',
                  type: 'cavalry',
                  weapon: 'C',
                  strengthPoints: 4,
                  morale: 'B',
                  counterRef: null,
                },
              ],
              artillery: {},
            },
          ],
          artillery: {},
        },
      },
      confederate: {
        divisions: [],
        independentBrigades: [],
        independent: {},
        reserveArtillery: {},
      },
    };
    const map = collectOOBRecords(oob);
    expect(map.get('cav-1')?.army).toBe('union');
    expect(map.get('cav-1')?.chain.corps).toBe('Cavalry Division');
  });

  it('collects confederate independent brigade units', () => {
    const oob = {
      union: { corps: [] },
      confederate: {
        divisions: [],
        independentBrigades: [
          {
            name: 'Jeb Stuart',
            regiments: [
              {
                id: 'cav-ind',
                name: '1 VA Cav',
                type: 'cavalry',
                weapon: 'C',
                strengthPoints: 3,
                morale: 'A',
                counterRef: null,
              },
            ],
            artillery: {},
          },
        ],
        independent: {},
        reserveArtillery: {},
      },
    };
    const map = collectOOBRecords(oob);
    expect(map.get('cav-ind')?.army).toBe('confederate');
    expect(map.get('cav-ind')?.chain.division).toBe('Independent');
  });

  it('collects confederate reserve artillery batteries', () => {
    const oob = {
      union: { corps: [] },
      confederate: {
        divisions: [],
        independentBrigades: [],
        independent: {},
        reserveArtillery: {
          batteries: [
            {
              id: 'res-art-1',
              name: 'Pelham Arty',
              gunType: '3-inch',
              strengthPoints: 2,
              ammoClass: 'B',
              counterRef: null,
            },
          ],
        },
      },
    };
    const map = collectOOBRecords(oob);
    expect(map.get('res-art-1')?.army).toBe('confederate');
    expect(map.get('res-art-1')?.chain.division).toBe('Reserve Artillery');
  });

  it('collects confederate independent artillery batteries', () => {
    const oob = {
      union: { corps: [] },
      confederate: {
        divisions: [],
        independentBrigades: [],
        independent: {
          artillery: {
            batteries: [
              {
                id: 'pelham-1',
                name: 'Pelham Btn',
                gunType: '3-inch',
                strengthPoints: 1,
                ammoClass: 'A',
                counterRef: null,
              },
            ],
          },
        },
        reserveArtillery: {},
      },
    };
    const map = collectOOBRecords(oob);
    expect(map.get('pelham-1')?.army).toBe('confederate');
    expect(map.get('pelham-1')?.chain.division).toBe('Independent (Pelham)');
  });
});

// ---------------------------------------------------------------------------
// collectLeaderRecords
// ---------------------------------------------------------------------------

describe('collectLeaderRecords', () => {
  const minimalLeaders = {
    union: {
      army: [],
      corps: [
        {
          id: 'hooker',
          name: 'Joseph Hooker',
          commandLevel: 'corps',
          commandsId: '1c',
          initiativeRating: null,
          counterRef: null,
        },
      ],
      divisions: [],
      brigades: [],
      cavalry: [],
    },
    confederate: {
      army: [],
      divisions: [
        {
          id: 'dh-hill',
          name: 'D.H. Hill',
          commandLevel: 'division',
          commandsId: null,
          initiativeRating: null,
          counterRef: null,
        },
      ],
      brigades: [],
    },
  };

  it('collects union leaders tagged as union', () => {
    const map = collectLeaderRecords(minimalLeaders);
    const entry = map.get('hooker');
    expect(entry).toBeDefined();
    expect(entry.army).toBe('union');
    expect(entry.type).toBe('leader');
    expect(entry.record.name).toBe('Joseph Hooker');
  });

  it('collects confederate leaders tagged as confederate', () => {
    const map = collectLeaderRecords(minimalLeaders);
    const entry = map.get('dh-hill');
    expect(entry).toBeDefined();
    expect(entry.army).toBe('confederate');
    expect(entry.type).toBe('leader');
  });

  it('does not collect non-leader nodes (objects lacking commandLevel)', () => {
    const leaders = {
      union: {
        _meta: { version: 1 },
        corps: [
          {
            id: 'hooker',
            name: 'Hooker',
            commandLevel: 'corps',
            commandsId: '1c',
            initiativeRating: null,
            counterRef: null,
          },
        ],
      },
      confederate: { divisions: [] },
    };
    const map = collectLeaderRecords(leaders);
    expect(map.has('hooker')).toBe(true);
    // _meta node should be skipped (key starts with '_')
    for (const key of map.keys()) {
      expect(key.startsWith('_')).toBe(false);
    }
  });

  it('collects leaders from nested arrays (e.g. multiple corps leaders)', () => {
    const leaders = {
      union: {
        corps: [
          {
            id: 'hooker',
            name: 'Hooker',
            commandLevel: 'corps',
            commandsId: '1c',
            initiativeRating: null,
            counterRef: null,
          },
          {
            id: 'reno',
            name: 'Reno',
            commandLevel: 'corps',
            commandsId: '9c',
            initiativeRating: null,
            counterRef: null,
          },
        ],
      },
      confederate: { divisions: [] },
    };
    const map = collectLeaderRecords(leaders);
    expect(map.size).toBe(2);
    expect(map.has('hooker')).toBe(true);
    expect(map.has('reno')).toBe(true);
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
        record: {
          id: 'hooker',
          name: 'Joseph Hooker',
          commandLevel: 'corps',
          commandsId: '1c',
        },
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
    // Sibling fields must be initialised to null
    expect(record.counterRef.back).toBeNull();
    expect(record.counterRef.backConfidence).toBeNull();
  });

  it('writes back filename and confidence', () => {
    const record = { counterRef: null };
    writeCounterRef(record, 'unit', 'back', 'CS1-Back_01.jpg', 0.85);
    expect(record.counterRef.back).toBe('CS1-Back_01.jpg');
    expect(record.counterRef.backConfidence).toBe(0.85);
    expect(record.counterRef.front).toBeNull();
    expect(record.counterRef.frontConfidence).toBeNull();
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
    expect(record.counterRef.promotedFront).toBeNull();
    expect(record.counterRef).toHaveProperty('promotedBack');
    expect(record.counterRef.promotedBack).toBeNull();
  });

  it('returns false and warns for invalid face field', () => {
    const record = { counterRef: null };
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const written = writeCounterRef(record, 'unit', 'promotedFront', 'x.png', 0.9);
    expect(written).toBe(false);
    spy.mockRestore();
  });
});
