import Database from 'better-sqlite3';

import { UUID_RE } from '../util/uuid.js';
import { GameNotFoundError } from './errors.js';

// Schema v0: original 5-column table (no faction or webhook columns)
// Schema v1: adds side_a_faction, side_b_faction, discord_webhook
// PRAGMA user_version gates the migration so it is safe to run on restart.
const SCHEMA_V1 = `
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    side_a_token TEXT NOT NULL,
    side_b_token TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL,
    side_a_faction TEXT,
    side_b_faction TEXT,
    discord_webhook TEXT
  )
`;

const CURRENT_USER_VERSION = 1;

export { GameNotFoundError } from './errors.js';

export class GameNotOpenError extends Error {
  constructor(id) {
    super(`Game ${id} is not open`);
    this.name = 'GameNotOpenError';
  }
}

// SEC-H1: contract assertion — token must be a UUID string (#340)
export class InvalidTokenError extends Error {
  constructor(field, value) {
    super(`${field} must be a UUID string, got ${typeof value} (len=${value?.length ?? 'n/a'})`);
    this.name = 'InvalidTokenError';
  }
}

// Run idempotent schema migration. user_version 0 = no migration applied yet.
// The migration body is wrapped in a transaction so DDL + version bump are atomic:
// a crash mid-migration leaves the DB at version 0 and is safely re-run on the next start.
function migrate(db) {
  const version = db.pragma('user_version', { simple: true });

  if (version === 0) {
    db.transaction(() => {
      // Fresh DB fast path: SCHEMA_V1 already includes the new columns.
      db.exec(SCHEMA_V1);

      // Upgrade path: if the table already existed (pre-v1, 5-col schema), add the new
      // columns. SQLite errors on ADD COLUMN when the column already exists — the
      // cols.includes guard prevents that; we do not rely on SQLite to no-op it.
      const cols = db
        .prepare('PRAGMA table_info(games)')
        .all()
        .map((r) => r.name);

      if (!cols.includes('side_a_faction')) {
        db.exec('ALTER TABLE games ADD COLUMN side_a_faction TEXT');
      }
      if (!cols.includes('side_b_faction')) {
        db.exec('ALTER TABLE games ADD COLUMN side_b_faction TEXT');
      }
      if (!cols.includes('discord_webhook')) {
        db.exec('ALTER TABLE games ADD COLUMN discord_webhook TEXT');
      }

      db.pragma(`user_version = ${CURRENT_USER_VERSION}`);
    })();
  }
  // user_version === 1: already migrated, nothing to do
}

// Factory — hoists all prepared statements at construction time (#331)
export function createStore(db) {
  migrate(db);

  const stmts = {
    insert: db.prepare(
      'INSERT INTO games (id, side_a_token, side_a_faction, discord_webhook, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ),
    selectById: db.prepare('SELECT * FROM games WHERE id = ?'),
    updateJoin: db.prepare(
      "UPDATE games SET side_b_token = ?, side_b_faction = ?, status = 'active' WHERE id = ? AND status = 'open'"
    ),
    delete: db.prepare('DELETE FROM games WHERE id = ?'),
    // LIMIT 200 guards against unbounded memory growth as game count scales (#PERF-M1)
    selectAll: db.prepare(
      'SELECT id, status, created_at FROM games ORDER BY created_at DESC LIMIT 200'
    ),
  };

  return {
    createGame(id, sideAToken, faction, discordWebhook = null) {
      stmts.insert.run(id, sideAToken, faction ?? null, discordWebhook, 'open', Date.now());
      return id;
    },

    joinGame(id, sideBToken, faction) {
      // SEC-H1: contract assertion — defence-in-depth against caller bugs (#340)
      if (typeof sideBToken !== 'string' || !UUID_RE.test(sideBToken)) {
        throw new InvalidTokenError('sideBToken', sideBToken);
      }
      const result = stmts.updateJoin.run(sideBToken, faction ?? null, id);
      if (result.changes === 0) {
        const row = stmts.selectById.get(id);
        if (!row) throw new GameNotFoundError(id);
        throw new GameNotOpenError(id);
      }
    },

    deleteGame(id) {
      const result = stmts.delete.run(id);
      if (result.changes === 0) throw new GameNotFoundError(id);
    },

    getGame(id) {
      return stmts.selectById.get(id) ?? null;
    },

    listGames() {
      return stmts.selectAll.all();
    },
  };
}

// Module-level singleton — initialised by initDb(), used by the convenience delegates below
let _store;
let _db;

export function initDb(dbPath = process.env.DB_PATH || 'data/games.db') {
  // Idempotent: close any prior connection before re-initialising (#ARCH-M4)
  if (_db) _db.close();
  _db = new Database(dbPath);
  _store = createStore(_db);
  return _db;
}

export function getDb() {
  return _db;
}

function requireStore() {
  if (!_store) throw new Error('[gameSqlite] store not initialised — call initDb() first');
  return _store;
}

// Convenience delegates — guarded so callers get a clear error before initDb() (#ARCH-H5)
export const createGame = (...args) => requireStore().createGame(...args);
export const joinGame = (...args) => requireStore().joinGame(...args);
export const deleteGame = (...args) => requireStore().deleteGame(...args);
export const getGame = (...args) => requireStore().getGame(...args);
export const listGames = (...args) => requireStore().listGames(...args);
