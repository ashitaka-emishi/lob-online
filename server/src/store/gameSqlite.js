import Database from 'better-sqlite3';

import { UUID_RE } from '../util/uuid.js';
import { GameNotFoundError } from './errors.js';

// Schema v0: original 5-column table (no faction or webhook columns)
// Schema v1: adds side_a_faction, side_b_faction, discord_webhook
// Schema v2: adds users table, side_a_user_id + side_b_user_id on games
// PRAGMA user_version gates migrations so they are safe to run on restart.
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

const SCHEMA_V2_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar TEXT,
    created_at INTEGER NOT NULL
  )
`;

const CURRENT_USER_VERSION = 2;

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
// Each migration block is wrapped in a single transaction so DDL + version bump are atomic:
// a crash mid-migration leaves the DB at the prior version and is safely re-run on restart.
function migrate(db) {
  const version = db.pragma('user_version', { simple: true });

  // #698 — without this guard, a binary built against an older CURRENT_USER_VERSION that opens
  // a DB file written by a newer binary falls through to the `version === 2: already migrated,
  // nothing to do` comment below and proceeds silently against a schema it doesn't understand —
  // a newer schema could rename/repurpose a column this binary still reads/writes under old
  // assumptions. Fail loudly instead: refuse to start rather than risk silent data corruption.
  if (version > CURRENT_USER_VERSION) {
    throw new Error(
      `Database schema version ${version} is newer than this binary supports (max ${CURRENT_USER_VERSION}). Refusing to start — upgrade the binary before opening this database.`
    );
  }

  if (version < 2) {
    db.transaction(() => {
      if (version === 0) {
        // Fresh or pre-v1 DB: create games table (includes v1 columns), then add any
        // that are missing (guards against old 5-col schema still at user_version 0).
        db.exec(SCHEMA_V1);
        const v1cols = db
          .prepare('PRAGMA table_info(games)')
          .all()
          .map((r) => r.name);
        if (!v1cols.includes('side_a_faction')) {
          db.exec('ALTER TABLE games ADD COLUMN side_a_faction TEXT');
        }
        if (!v1cols.includes('side_b_faction')) {
          db.exec('ALTER TABLE games ADD COLUMN side_b_faction TEXT');
        }
        if (!v1cols.includes('discord_webhook')) {
          db.exec('ALTER TABLE games ADD COLUMN discord_webhook TEXT');
        }
      }

      // v2 changes — apply whether arriving from v0 or v1.
      db.exec(SCHEMA_V2_USERS);
      const v2cols = db
        .prepare('PRAGMA table_info(games)')
        .all()
        .map((r) => r.name);
      if (!v2cols.includes('side_a_user_id')) {
        db.exec('ALTER TABLE games ADD COLUMN side_a_user_id TEXT');
      }
      if (!v2cols.includes('side_b_user_id')) {
        db.exec('ALTER TABLE games ADD COLUMN side_b_user_id TEXT');
      }

      db.pragma(`user_version = ${CURRENT_USER_VERSION}`);
    })();
  }
  // user_version === 2: already migrated, nothing to do
}

// #698 — shared `users`-table query builder. Previously createStore() (game persistence) and
// discord.js's configurePassport() (passport identity lookups) each held their own byte-identical
// upsertUser/getUser prepared statements — a future users-table schema change only had to be
// applied here, but nothing enforced that, and only this copy (via createGame/joinGame's tests)
// had exercised coverage. discord.js now calls this directly instead of duplicating the SQL.
export function createUserQueries(db) {
  const upsertUserStmt = db.prepare(
    'INSERT INTO users (id, username, avatar, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET username = excluded.username, avatar = excluded.avatar'
  );
  const getUserStmt = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?');

  return {
    upsertUser(id, username, avatar) {
      upsertUserStmt.run(id, username, avatar ?? null, Date.now());
    },
    getUser(id) {
      return getUserStmt.get(id) ?? null;
    },
  };
}

// Factory — hoists all prepared statements at construction time (#331)
export function createStore(db) {
  migrate(db);

  const userQueries = createUserQueries(db);

  const stmts = {
    insert: db.prepare(
      'INSERT INTO games (id, side_a_token, side_a_faction, discord_webhook, status, created_at, side_a_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ),
    selectById: db.prepare('SELECT * FROM games WHERE id = ?'),
    updateJoin: db.prepare(
      "UPDATE games SET side_b_token = ?, side_b_faction = ?, side_b_user_id = ?, status = 'active' WHERE id = ? AND status = 'open'"
    ),
    delete: db.prepare('DELETE FROM games WHERE id = ?'),
    // LIMIT 200 guards against unbounded memory growth as game count scales (#PERF-M1)
    selectAll: db.prepare(
      'SELECT id, status, created_at FROM games ORDER BY created_at DESC LIMIT 200'
    ),
    selectByUser: db.prepare(
      'SELECT id, status, created_at FROM games WHERE side_a_user_id = ? OR side_b_user_id = ? ORDER BY created_at DESC LIMIT 200'
    ),
    // #m9-discord-oauth review — reissue a side's token to its recorded owner (identity, not
    // sideToken, is the WHERE clause here) so a player who lost their session (logout, cookie
    // expiry, new device) can recover access to a game they already own, without needing the
    // old sideToken. The ownership match is enforced in SQL, not just by the caller.
    reclaimSideAToken: db.prepare(
      'UPDATE games SET side_a_token = ? WHERE id = ? AND side_a_user_id = ?'
    ),
    reclaimSideBToken: db.prepare(
      'UPDATE games SET side_b_token = ? WHERE id = ? AND side_b_user_id = ?'
    ),
  };

  return {
    createGame(id, sideAToken, faction, discordWebhook = null, sideAUserId = null) {
      stmts.insert.run(
        id,
        sideAToken,
        faction ?? null,
        discordWebhook,
        'open',
        Date.now(),
        sideAUserId
      );
      return id;
    },

    joinGame(id, sideBToken, faction, sideBUserId = null) {
      // SEC-H1: contract assertion — defence-in-depth against caller bugs (#340)
      if (typeof sideBToken !== 'string' || !UUID_RE.test(sideBToken)) {
        throw new InvalidTokenError('sideBToken', sideBToken);
      }
      const result = stmts.updateJoin.run(sideBToken, faction ?? null, sideBUserId, id);
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

    listGamesByUser(userId) {
      return stmts.selectByUser.all(userId, userId);
    },

    upsertUser: userQueries.upsertUser,
    getUser: userQueries.getUser,

    // Reissues the token for whichever recorded side (union/confederate) matches `faction`
    // AND is owned by `userId`. Returns true if a row was updated, false if this user does
    // not own that faction on this game (caller should fall through to normal join/409 logic).
    reclaimSideToken(id, faction, userId, newToken) {
      const row = stmts.selectById.get(id);
      if (!row) throw new GameNotFoundError(id);
      if (row.side_a_faction === faction) {
        return stmts.reclaimSideAToken.run(newToken, id, userId).changes > 0;
      }
      if (row.side_b_faction === faction) {
        return stmts.reclaimSideBToken.run(newToken, id, userId).changes > 0;
      }
      return false;
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
export const listGamesByUser = (...args) => requireStore().listGamesByUser(...args);
export const upsertUser = (...args) => requireStore().upsertUser(...args);
export const getUser = (...args) => requireStore().getUser(...args);
export const reclaimSideToken = (...args) => requireStore().reclaimSideToken(...args);
