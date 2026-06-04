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
import { readFile, writeFile } from 'fs/promises';

beforeEach(() => vi.clearAllMocks());

const VALID_MAP = {
  _status: 'draft',
  scenario: 'south-mountain',
  layout: 'pointy-top',
  vpHexes: [],
  hexes: [],
};

async function buildApp() {
  const { default: router } = await import('./mapEditor.js');
  const app = express();
  app.use(express.json());
  app.use('/', router);
  return app;
}

// Schema-specific tests only — generic GET/PUT/backup behavior is covered
// in editorRouteFactory.test.js. (#346)

describe('GET /data', () => {
  it('returns parsed JSON from file', async () => {
    readFile.mockResolvedValue(JSON.stringify(VALID_MAP));
    const app = await buildApp();
    const res = await request(app).get('/data');
    expect(res.status).toBe(200);
    expect(res.body.scenario).toBe('south-mountain');
  });
});

describe('PUT /data', () => {
  it('accepts valid map body', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send(VALID_MAP);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects invalid body with 400 and issues array', async () => {
    const app = await buildApp();
    const res = await request(app).put('/data').send({ layout: 'pointy-top' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  it('rejects wrong layout value with 400', async () => {
    const app = await buildApp();
    const res = await request(app)
      .put('/data')
      .send({ ...VALID_MAP, layout: 'flat-top' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  // Task 3.3 (#470): server mirrors client-side stripNonPlayableBoundaryEdges on PUT
  // gridSpec must include all required fields for MapSchema / GridSpecSchema to pass validation.
  const VALID_GRID_SPEC = {
    cols: 10,
    rows: 10,
    dx: 0,
    dy: 0,
    hexWidth: 40,
    hexHeight: 40,
    imageScale: 1,
    strokeWidth: 1,
    orientation: 'flat',
    evenColUp: true,
  };

  it('strips non-playable boundary edges before saving and returns stripped result (#470)', async () => {
    // 05.05 (non-playable) has face 0 (N) edge; that edge should be removed on PUT
    const mapWithEdge = {
      ...VALID_MAP,
      gridSpec: VALID_GRID_SPEC,
      hexes: [
        { hex: '05.05', playable: false, terrain: 'clear', edges: { 0: [{ type: 'road' }] } },
        { hex: '05.06', terrain: 'clear' },
      ],
    };
    const app = await buildApp();
    const res = await request(app).put('/data').send(mapWithEdge);
    expect(res.status).toBe(200);
    const [[, writtenContent]] = writeFile.mock.calls.filter((c) => c[0].endsWith('.tmp'));
    const written = JSON.parse(writtenContent);
    const hex = written.hexes.find((h) => h.hex === '05.05');
    expect(hex.edges).toBeUndefined();
  });

  it('preserves edges between two playable hexes on PUT (#470)', async () => {
    const mapWithEdge = {
      ...VALID_MAP,
      gridSpec: VALID_GRID_SPEC,
      hexes: [
        { hex: '05.05', terrain: 'clear', edges: { 0: [{ type: 'road' }] } },
        { hex: '05.06', terrain: 'clear' },
      ],
    };
    const app = await buildApp();
    const res = await request(app).put('/data').send(mapWithEdge);
    expect(res.status).toBe(200);
    const [[, writtenContent]] = writeFile.mock.calls.filter((c) => c[0].endsWith('.tmp'));
    const written = JSON.parse(writtenContent);
    const hex = written.hexes.find((h) => h.hex === '05.05');
    expect(hex.edges?.['0']).toEqual([{ type: 'road' }]);
  });
});
