import Database from 'better-sqlite3';

let db;

export function initDb(dbPath = 'data/games.db') {
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      side_a_token TEXT NOT NULL,
      side_b_token TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL
    )
  `);
}

export function createGame(id, sideAToken) {
  const stmt = db.prepare(
    'INSERT INTO games (id, side_a_token, status, created_at) VALUES (?, ?, ?, ?)'
  );
  stmt.run(id, sideAToken, 'open', Date.now());
  return id;
}

export function joinGame(id, sideBToken) {
  const row = db.prepare('SELECT status FROM games WHERE id = ?').get(id);
  if (!row) throw new Error(`Game not found: ${id}`);
  if (row.status !== 'open') throw new Error(`Game ${id} is already full`);

  db.prepare('UPDATE games SET side_b_token = ?, status = ? WHERE id = ?').run(
    sideBToken,
    'active',
    id
  );
}

export function getGame(id) {
  return db.prepare('SELECT * FROM games WHERE id = ?').get(id) ?? null;
}

export function listGames() {
  return db.prepare('SELECT id, status, created_at FROM games ORDER BY created_at DESC').all();
}
