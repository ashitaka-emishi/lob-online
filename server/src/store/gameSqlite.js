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

// Factory — hoists all prepared statements at construction time (#331)
export function createStore(db) {
  db.exec(SCHEMA);

  const stmts = {
    insert: db.prepare(
      'INSERT INTO games (id, side_a_token, status, created_at) VALUES (?, ?, ?, ?)'
    ),
    selectById: db.prepare('SELECT * FROM games WHERE id = ?'),
    selectStatus: db.prepare('SELECT status FROM games WHERE id = ?'),
    updateJoin: db.prepare('UPDATE games SET side_b_token = ?, status = ? WHERE id = ?'),
    selectAll: db.prepare('SELECT id, status, created_at FROM games ORDER BY created_at DESC'),
  };

  return {
    createGame(id, sideAToken) {
      stmts.insert.run(id, sideAToken, 'open', Date.now());
      return id;
    },

    joinGame(id, sideBToken) {
      const row = stmts.selectStatus.get(id);
      if (!row) throw new Error(`Game not found: ${id}`);
      if (row.status !== 'open') throw new Error(`Game ${id} is already full`);
      stmts.updateJoin.run(sideBToken, 'active', id);
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
  _db = new Database(dbPath);
  _store = createStore(_db);
  return _db;
}

export function getDb() {
  return _db;
}

// Convenience delegates so existing routes keep working without change (#334 will clean this up)
export const createGame = (...args) => _store.createGame(...args);
export const joinGame = (...args) => _store.joinGame(...args);
export const getGame = (...args) => _store.getGame(...args);
export const listGames = (...args) => _store.listGames(...args);
