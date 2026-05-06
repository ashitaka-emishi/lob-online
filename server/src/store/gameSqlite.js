import Database from 'better-sqlite3';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    side_a_token TEXT NOT NULL,
    side_b_token TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL
  )
`;

export class GameNotFoundError extends Error {
  constructor(id) {
    super(`Game not found: ${id}`);
    this.name = 'GameNotFoundError';
  }
}

export class GameNotOpenError extends Error {
  constructor(id) {
    super(`Game ${id} is not open`);
    this.name = 'GameNotOpenError';
  }
}

// Factory — hoists all prepared statements at construction time (#331)
export function createStore(db) {
  db.exec(SCHEMA);

  const stmts = {
    insert: db.prepare(
      'INSERT INTO games (id, side_a_token, status, created_at) VALUES (?, ?, ?, ?)'
    ),
    selectById: db.prepare('SELECT * FROM games WHERE id = ?'),
    updateJoin: db.prepare(
      "UPDATE games SET side_b_token = ?, status = 'active' WHERE id = ? AND status = 'open'"
    ),
    // LIMIT 200 guards against unbounded memory growth as game count scales (#PERF-M1)
    selectAll: db.prepare(
      'SELECT id, status, created_at FROM games ORDER BY created_at DESC LIMIT 200'
    ),
  };

  return {
    createGame(id, sideAToken) {
      stmts.insert.run(id, sideAToken, 'open', Date.now());
      return id;
    },

    joinGame(id, sideBToken) {
      const result = stmts.updateJoin.run(sideBToken, id);
      if (result.changes === 0) {
        const row = stmts.selectById.get(id);
        if (!row) throw new GameNotFoundError(id);
        throw new GameNotOpenError(id);
      }
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
export const getGame = (...args) => requireStore().getGame(...args);
export const listGames = (...args) => requireStore().listGames(...args);
