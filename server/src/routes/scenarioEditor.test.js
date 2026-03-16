import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock fs before importing the router
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  unlinkSync: vi.fn(),
}));

// eslint-disable-next-line import/order
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';

const VALID_SCENARIO = {
  _status: 'available',
  _source: 'test',
  id: 'south-mountain',
  name: 'South Mountain',
  system: 'Line of Battle v2.0',
  publication: 'RSS #4',
  turnStructure: {
    firstTurn: '09:00',
    lastTurn: '20:00',
    totalTurns: 45,
    minutesPerTurn: 20,
    firstPlayer: 'union',
    date: '1862-09-14',
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

async function buildApp() {
  const { default: router } = await import('./scenarioEditor.js');
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return app;
}

describe('GET /data', () => {
  it('returns parsed JSON from file', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_SCENARIO));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('south-mountain');
  });
});

describe('PUT /data', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    readdirSync.mockReturnValue([]);
  });

  it('accepts valid body, writes file, returns { ok: true }', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SCENARIO);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // readFileSync returns undefined (cleared) → no backup → writeFileSync called once
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('rejects invalid body with 400 and issues array', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send({ id: 'only-id' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('creates backup file before main write when current file exists', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_SCENARIO));
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SCENARIO);
    expect(res.status).toBe(200);
    // writeFileSync called twice: once for backup, once for main write
    expect(writeFileSync).toHaveBeenCalledTimes(2);
  });

  it('backup filename uses scenario- prefix', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_SCENARIO));
    const app = await buildApp();
    await request(app).put('/data').send(VALID_SCENARIO);
    const backupCall = writeFileSync.mock.calls[0];
    expect(backupCall[0]).toMatch(/scenario-.*\.json$/);
  });

  it('sets _savedAt on written data', async () => {
    const before = Date.now();
    const app = await buildApp();
    await request(app).put('/data').send(VALID_SCENARIO);
    const writtenJson = writeFileSync.mock.calls[0][1];
    const written = JSON.parse(writtenJson);
    expect(written._savedAt).toBeGreaterThanOrEqual(before);
    expect(written._savedAt).toBeLessThanOrEqual(Date.now());
  });

  it('returns _savedAt in response', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SCENARIO);
    expect(res.status).toBe(200);
    expect(typeof res.body._savedAt).toBe('number');
  });

  it('returns 500 when backup write throws', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_SCENARIO));
    writeFileSync.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SCENARIO);
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(writeFileSync).toHaveBeenCalledOnce();
  });

  it('trims backups when count exceeds MAX_BACKUPS (20)', async () => {
    readFileSync.mockReturnValue(JSON.stringify(VALID_SCENARIO));
    const existing = Array.from(
      { length: 21 },
      (_, i) => `scenario-2026-03-${String(i + 1).padStart(2, '0')}.json`
    );
    readdirSync.mockReturnValue(existing);
    const app = await buildApp();
    await request(app).put('/data').send(VALID_SCENARIO);
    expect(unlinkSync).toHaveBeenCalledOnce();
  });

  it('creates backup directory via mkdirSync', async () => {
    const app = await buildApp();
    await request(app).put('/data').send(VALID_SCENARIO);
    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('backups'), {
      recursive: true,
    });
  });

  it('accepts scenario with all new lighting/rules fields', async () => {
    const app = await buildApp();
    const res = await request(app)
      .put('/data')
      .send({
        ...VALID_SCENARIO,
        lightingSchedule: [{ startTurn: 1, condition: 'day' }],
        nightVisibilityCap: 2,
        flukeStoppageGracePeriodTurns: 8,
        initiativeSystem: 'RSS',
        looseCannon: true,
        lossRecovery: { enabled: false, triggerTime: null },
        randomEventsEnabled: true,
        randomEventsTiming: 'commandPhaseAfterOrderAcceptance',
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
