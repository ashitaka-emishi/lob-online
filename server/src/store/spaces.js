import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { STATE_SCHEMA_VERSION } from '../constants/schemaVersion.js';
import { GameStateSchema } from '../schemas/gameState.schema.js';
import { GameNotFoundError } from './errors.js';

function stateKey(id) {
  return `games/${id}/state.json`;
}

function historyKey(id, seq) {
  return `games/${id}/history/${String(seq).padStart(6, '0')}.json`;
}

function createClient() {
  return new S3Client({
    endpoint: process.env.SPACES_ENDPOINT,
    region: process.env.SPACES_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET,
    },
    forcePathStyle: process.env.SPACES_FORCE_PATH_STYLE === 'true',
  });
}

// Module-level singleton — replaced by initSpaces() in tests
let _client = null;
let _bucket = null;

function getClient() {
  if (!_client) {
    _client = createClient();
    _bucket = process.env.SPACES_BUCKET;
  }
  return { client: _client, bucket: _bucket };
}

// Test injection — call before each test to point at MinIO or a mock
export function initSpaces(client, bucket) {
  _client = client;
  _bucket = bucket;
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function isNotFound(err) {
  return err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404;
}

// Returns the persisted state (with incremented version). Callers must adopt the returned
// object for any subsequent saveGame call — the in-memory state.version is now stale.
// Note: the version check is best-effort (read-compare-write, not atomic CAS). It catches
// stale-client overwrites in the common case but does not prevent lost updates under true
// concurrent writes. A follow-on issue (#648-related) tracks upgrading to S3 ETag preconditions.
export async function saveGame(id, state) {
  const { client, bucket } = getClient();

  // Optimistic concurrency: if an object exists, stored version must match state.version.
  // Only engaged when state.version is a number; undefined opts out (first write or
  // concurrency-exempt callers).
  let versionConflictError = null;
  if (typeof state.version === 'number') {
    try {
      const existing = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: stateKey(id) })
      );
      const raw = await streamToString(existing.Body);
      const stored = JSON.parse(raw);
      if (stored.version !== state.version) {
        versionConflictError = new Error(
          `Version conflict on game ${id}: stored=${stored.version}, expected=${state.version}`
        );
      }
    } catch (err) {
      // Only suppress genuine "object does not exist" — re-throw network/server errors
      // so callers are not silently bypassing the version check on transient failures.
      if (!isNotFound(err)) throw err;
    }
    if (versionConflictError) throw versionConflictError;
  }

  const toWrite =
    typeof state.version === 'number' ? { ...state, version: state.version + 1 } : state;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: stateKey(id),
      Body: JSON.stringify(toWrite),
      ContentType: 'application/json',
    })
  );

  return toWrite;
}

export async function loadGame(id) {
  const { client, bucket } = getClient();

  let raw;
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: stateKey(id) }));
    raw = await streamToString(result.Body);
  } catch (err) {
    if (isNotFound(err)) throw new GameNotFoundError(id);
    throw err;
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Game state in Spaces is corrupted for game ${id}: expected a JSON object.`);
  }
  // Reject saves whose on-disk format differs from the current schema version (#363)
  if (parsed.schemaVersion !== STATE_SCHEMA_VERSION) {
    throw new Error(
      `Game state schemaVersion mismatch for game ${id}: stored ${parsed.schemaVersion ?? '(none)'}, ` +
        `expected ${STATE_SCHEMA_VERSION}. Delete this game and create a new one.`
    );
  }
  return GameStateSchema.parse(parsed);
}

export async function deleteGameState(id) {
  const { client, bucket } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: stateKey(id) }));
}

// Append one history entry. seq should be the post-action state.version (1-based).
export async function appendHistory(id, seq, payload) {
  const { client, bucket } = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: historyKey(id, seq),
      Body: JSON.stringify(payload),
      ContentType: 'application/json',
    })
  );
}
