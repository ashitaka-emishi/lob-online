import { beforeEach, describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(() => Promise.resolve()),
  rename: vi.fn(() => Promise.resolve()),
  mkdir: vi.fn(() => Promise.resolve()),
  readdir: vi.fn(() => Promise.resolve([])),
  unlink: vi.fn(() => Promise.resolve()),
}));

// eslint-disable-next-line import/order
import { readFile, writeFile as _writeFile } from 'fs/promises';

beforeEach(() => vi.clearAllMocks());

const VALID_MAP = {
  _status: 'scaffold',
  scenario: 'sm',
  layout: 'pointy-top',
  vpHexes: [],
  hexes: [],
};
const VALID_OOB = {
  _status: 'scaffold',
  _source: 'test',
  _errata_applied: [],
  union: {
    army: 'Union',
    supplyTrain: { id: 'supply', name: 'Supply' },
    corps: [],
    cavalryDivision: { id: 'cav', name: 'Cavalry', brigades: [] },
  },
  confederate: {
    army: 'Confederate',
    wing: 'Wing',
    supplyWagon: { id: 'wagon', name: 'Wagon' },
    independent: { cavalry: [], artillery: [] },
    reserveArtillery: { batteries: [] },
    divisions: [],
  },
};
const VALID_SCENARIO = {
  _status: 'scaffold',
  _source: 'test',
  id: 'sm',
  name: 'Test',
  system: 'Line of Battle v2.0',
  publication: 'SM',
  turnStructure: {
    firstTurn: '09:00',
    lastTurn: '18:00',
    totalTurns: 36,
    firstPlayer: 'union',
    date: 'TBD',
  },
  rules: {},
  movementCosts: {
    movementAllowances: {},
    terrainCosts: {},
    hexsideCosts: {},
    noEffectTerrain: [],
  },
  ammoReserves: { confederate: {}, union: {} },
  setup: { union: [], confederate: [] },
  reinforcements: { union: [], confederate: [] },
  victoryPoints: { terrain: [], wreck: { confederate: {}, union: {} } },
  victoryConditions: { results: [] },
  randomEvents: { confederate: { table: [] }, union: { table: [] } },
};
const VALID_LEADERS = {
  _status: 'scaffold',
  _source: 'test',
  union: { army: [], corps: [], cavalry: [], divisions: [], brigades: [] },
  confederate: { wing: [], divisions: [], brigades: [] },
};
const VALID_SUCCESSION = {
  _status: 'scaffold',
  _source: 'test',
  union: [],
  confederate: [],
};

async function buildApp() {
  const { default: router } = await import('./moduleData.js');
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return app;
}

// ── map ───────────────────────────────────────────────────────────────────────

describe('GET /:moduleSlug/map', () => {
  it('returns map data for a valid slug', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_MAP));
    const app = await buildApp();
    const res = await request(app).get('/SM/map');
    expect(res.status).toBe(200);
    expect(res.body.layout).toBe('pointy-top');
  });

  it('returns 404 for unknown slug', async () => {
    const app = await buildApp();
    const res = await request(app).get('/UNKNOWN/map');
    expect(res.status).toBe(404);
  });

  it('SM slug reads from south-mountain folder path', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_MAP));
    const app = await buildApp();
    await request(app).get('/SM/map');
    expect(readFile.mock.calls[0][0]).toMatch(/south-mountain[/\\]map\.json$/);
  });

  it('lowercase slug is treated case-insensitively', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_MAP));
    const app = await buildApp();
    const res = await request(app).get('/sm/map');
    expect(res.status).toBe(200);
  });
});

describe('PUT /:moduleSlug/map', () => {
  it('accepts valid map body and returns ok', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_MAP));
    const app = await buildApp();
    const res = await request(app).put('/SM/map').send(VALID_MAP);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects invalid map body with 400', async () => {
    const app = await buildApp();
    const res = await request(app).put('/SM/map').send({ bad: true });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown slug on PUT', async () => {
    const app = await buildApp();
    const res = await request(app).put('/NOPE/map').send(VALID_MAP);
    expect(res.status).toBe(404);
  });
});

// ── oob ───────────────────────────────────────────────────────────────────────

describe('GET /:moduleSlug/oob', () => {
  it('returns oob data for a valid slug', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_OOB));
    const app = await buildApp();
    const res = await request(app).get('/THG/oob');
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown slug', async () => {
    const app = await buildApp();
    const res = await request(app).get('/UNKNOWN/oob');
    expect(res.status).toBe(404);
  });
});

describe('PUT /:moduleSlug/oob', () => {
  it('accepts valid oob body', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_OOB));
    const app = await buildApp();
    const res = await request(app).put('/SM/oob').send(VALID_OOB);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── scenario ──────────────────────────────────────────────────────────────────

describe('GET /:moduleSlug/scenarios/:scenarioSlug/scenario', () => {
  it('returns scenario data for a valid module and scenario slug', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_SCENARIO));
    const app = await buildApp();
    const res = await request(app).get('/SM/scenarios/full-battle/scenario');
    expect(res.status).toBe(200);
  });

  it('reads scenario data from the nested module scenario folder', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_SCENARIO));
    const app = await buildApp();
    await request(app).get('/SM/scenarios/full-battle/scenario');
    expect(readFile.mock.calls[0][0]).toMatch(
      /south-mountain[/\\]scenarios[/\\]full-battle[/\\]scenario\.json$/
    );
  });

  it('returns 404 for unknown module slug', async () => {
    const app = await buildApp();
    const res = await request(app).get('/UNKNOWN/scenarios/full-battle/scenario');
    expect(res.status).toBe(404);
  });
});

describe('GET /:moduleSlug/scenario', () => {
  it('keeps compatibility by reading the default full-battle scenario', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_SCENARIO));
    const app = await buildApp();
    const res = await request(app).get('/SM/scenario');
    expect(res.status).toBe(200);
    expect(readFile.mock.calls[0][0]).toMatch(
      /south-mountain[/\\]scenarios[/\\]full-battle[/\\]scenario\.json$/
    );
  });
});

// ── leaders ───────────────────────────────────────────────────────────────────

describe('GET /:moduleSlug/leaders', () => {
  it('returns leaders data for a valid slug', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_LEADERS));
    const app = await buildApp();
    const res = await request(app).get('/SM/leaders');
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown slug', async () => {
    const app = await buildApp();
    const res = await request(app).get('/UNKNOWN/leaders');
    expect(res.status).toBe(404);
  });
});

describe('PUT /:moduleSlug/leaders', () => {
  it('accepts valid leaders body', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_LEADERS));
    const app = await buildApp();
    const res = await request(app).put('/SM/leaders').send(VALID_LEADERS);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── succession ────────────────────────────────────────────────────────────────

describe('GET /:moduleSlug/succession', () => {
  it('returns succession data for a valid slug', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_SUCCESSION));
    const app = await buildApp();
    const res = await request(app).get('/SM/succession');
    expect(res.status).toBe(200);
  });
});

describe('PUT /:moduleSlug/succession', () => {
  it('accepts valid succession body', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_SUCCESSION));
    const app = await buildApp();
    const res = await request(app).put('/SM/succession').send(VALID_SUCCESSION);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
