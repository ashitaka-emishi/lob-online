import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { GameNotFoundError } from './errors.js';
import { appendHistory, deleteGameState, initSpaces, loadGame, saveGame } from './spaces.js';

// Integration tests — require MinIO running on localhost:9000.
// Start with: docker compose up -d
// These tests use a dedicated test bucket to avoid colliding with dev data.
// Skipped automatically when SPACES_INTEGRATION_TESTS=1 is not set (e.g., in CI).

const RUN_INTEGRATION = process.env.SPACES_INTEGRATION_TESTS === '1';

const MINIO_ENDPOINT = 'http://localhost:9000';
const MINIO_KEY = 'minioadmin';
const MINIO_SECRET = 'minioadmin';
const TEST_BUCKET = 'lob-online-test';

let client;

const BASE_STATE = {
  id: 'test-game',
  scenarioId: 'south-mountain',
  schemaVersion: 3,
  version: 0,
  turn: 1,
  phase: null,
  activePlayer: null,
  step: null,
  completedSteps: [],
  initiative: null,
  sides: { union: null, confederate: null },
  units: {},
  reinforcementQueue: [],
  status: 'setup',
  leaderState: {},
  pendingResolution: null,
  activityPhase: null,
  ordersPhase: null,
  rallyPhase: null,
};

describe.skipIf(!RUN_INTEGRATION)('Spaces integration tests (MinIO required)', () => {
  beforeAll(async () => {
    client = new S3Client({
      endpoint: MINIO_ENDPOINT,
      region: 'us-east-1',
      credentials: { accessKeyId: MINIO_KEY, secretAccessKey: MINIO_SECRET },
      forcePathStyle: true,
    });

    // Create test bucket if it doesn't exist
    try {
      await client.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));
    } catch (err) {
      if (err.name !== 'BucketAlreadyOwnedByYou' && err.name !== 'BucketAlreadyExists') throw err;
    }

    initSpaces(client, TEST_BUCKET);
  });

  afterEach(async () => {
    // Clean up all objects created during the test
    const listed = await client.send(new ListObjectsV2Command({ Bucket: TEST_BUCKET }));
    if (listed.Contents?.length) {
      await Promise.all(
        listed.Contents.map((obj) =>
          client.send(new DeleteObjectCommand({ Bucket: TEST_BUCKET, Key: obj.Key }))
        )
      );
    }
  });

  afterAll(() => {
    // Client has no explicit close; GC handles it
  });

  describe('saveGame / loadGame round-trip', () => {
    it('saves and reloads game state correctly', async () => {
      const saved = await saveGame('g1', BASE_STATE);
      expect(saved.version).toBe(1);

      const loaded = await loadGame('g1');
      expect(loaded.id).toBe('test-game');
      expect(loaded.version).toBe(1);
      expect(loaded.turn).toBe(1);
    });

    it('increments version on each save', async () => {
      const v1 = await saveGame('g2', BASE_STATE);
      expect(v1.version).toBe(1);

      const v2 = await saveGame('g2', v1);
      expect(v2.version).toBe(2);

      const loaded = await loadGame('g2');
      expect(loaded.version).toBe(2);
    });
  });

  describe('saveGame — version undefined (concurrency opt-out)', () => {
    it('writes state verbatim when version is undefined (no increment, no conflict check)', async () => {
      const noVersion = { ...BASE_STATE, version: undefined };
      const saved = await saveGame('no-ver', noVersion);
      // version is not incremented when it is not a number
      expect(saved.version).toBeUndefined();

      // A second save with the same undefined-version state must also succeed (no conflict check)
      const saved2 = await saveGame('no-ver', noVersion);
      expect(saved2.version).toBeUndefined();
    });
  });

  describe('saveGame version conflict', () => {
    it('throws on version conflict when stored version differs from expected', async () => {
      // Save once — disk now has version 1
      await saveGame('conflict-game', BASE_STATE);
      // Load to get version 1
      const v1 = await loadGame('conflict-game');
      // Another writer advances disk to version 2
      await saveGame('conflict-game', v1);
      // Original caller tries to save with stale version 1 — should throw
      await expect(saveGame('conflict-game', v1)).rejects.toThrow(/version/i);
    });
  });

  describe('loadGame missing game', () => {
    it('throws GameNotFoundError for a game that does not exist', async () => {
      await expect(loadGame('no-such-game')).rejects.toThrow(GameNotFoundError);
    });

    it('thrown error message includes the game id', async () => {
      await expect(loadGame('missing-id')).rejects.toThrow('missing-id');
    });
  });

  describe('loadGame schema version guard', () => {
    it('throws when stored schemaVersion mismatches', async () => {
      // Bypass saveGame to write a stale schemaVersion directly
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const stale = { ...BASE_STATE, schemaVersion: 99, version: 1 };
      await client.send(
        new PutObjectCommand({
          Bucket: TEST_BUCKET,
          Key: 'games/stale-game/state.json',
          Body: JSON.stringify(stale),
          ContentType: 'application/json',
        })
      );
      await expect(loadGame('stale-game')).rejects.toThrow(/schemaVersion/i);
    });
  });

  describe('deleteGameState', () => {
    it('makes a subsequent loadGame throw GameNotFoundError', async () => {
      await saveGame('del-game', BASE_STATE);
      await loadGame('del-game'); // confirms it exists
      await deleteGameState('del-game');
      await expect(loadGame('del-game')).rejects.toThrow(GameNotFoundError);
    });

    it('does not throw when the object does not exist (idempotent)', async () => {
      await expect(deleteGameState('never-existed')).resolves.not.toThrow();
    });
  });

  describe('appendHistory', () => {
    it('writes correctly named history objects (zero-padded 6-digit seq)', async () => {
      await appendHistory('hist-game', 1, { action: 'MOVE', turn: 1 });
      await appendHistory('hist-game', 2, { action: 'FIRE', turn: 1 });

      const listed = await client.send(
        new ListObjectsV2Command({ Bucket: TEST_BUCKET, Prefix: 'games/hist-game/history/' })
      );
      const keys = listed.Contents.map((o) => o.Key).sort();
      expect(keys).toEqual([
        'games/hist-game/history/000001.json',
        'games/hist-game/history/000002.json',
      ]);
    });

    it('persists the payload body correctly', async () => {
      const payload = { action: 'MOVE', turn: 3, unitId: 'u42' };
      await appendHistory('payload-game', 7, payload);

      const result = await client.send(
        new GetObjectCommand({ Bucket: TEST_BUCKET, Key: 'games/payload-game/history/000007.json' })
      );
      const chunks = [];
      for await (const chunk of result.Body) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      expect(body).toEqual(payload);
    });

    it('history key uses post-action version as sequence number', async () => {
      await appendHistory('seq-game', 42, { type: 'TEST' });

      const listed = await client.send(
        new ListObjectsV2Command({ Bucket: TEST_BUCKET, Prefix: 'games/seq-game/history/' })
      );
      expect(listed.Contents[0].Key).toBe('games/seq-game/history/000042.json');
    });
  });
});
