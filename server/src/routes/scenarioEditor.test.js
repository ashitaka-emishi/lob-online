import { describe, it, expect, vi } from 'vitest';
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

// #337 — clearScenarioCache must be called on successful scenario save
const clearScenarioCacheMock = vi.fn();
vi.mock('../engine/scenario.js', () => ({ clearScenarioCache: clearScenarioCacheMock }));

// eslint-disable-next-line import/order
import { readFile } from 'fs/promises';

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

// Schema-specific tests only — generic GET/PUT/backup behavior is covered
// in editorRouteFactory.test.js. (#346)

describe('GET /data', () => {
  it('returns parsed JSON from file', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_SCENARIO));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('south-mountain');
  });
});

describe('PUT /data', () => {
  it('accepts valid body, writes file, returns { ok: true }', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SCENARIO);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects invalid body with 400 and issues array', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send({ id: 'only-id' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it('accepts scenario with all lighting/rules fields', async () => {
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

  it('calls clearScenarioCache after a successful save (#337)', async () => {
    clearScenarioCacheMock.mockReset();
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_SCENARIO);
    expect(res.status).toBe(200);
    expect(clearScenarioCacheMock).toHaveBeenCalledOnce();
  });

  it('does not call clearScenarioCache on a failed save (#337)', async () => {
    clearScenarioCacheMock.mockReset();
    const app = await buildApp();
    const res = await request(app).put('/data').send({ invalid: 'body' });
    expect(res.status).toBe(400);
    expect(clearScenarioCacheMock).not.toHaveBeenCalled();
  });
});
