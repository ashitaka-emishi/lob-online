import Database from 'better-sqlite3';
import SqliteStore from 'better-sqlite3-session-store';
import session from 'express-session';
import { describe, it, expect } from 'vitest';

// Smoke test: verify better-sqlite3-session-store works with an in-memory DB (#329)
describe('better-sqlite3-session-store', () => {
  it('creates a store instance with expected express-session interface', () => {
    const db = new Database(':memory:');
    const Store = SqliteStore(session);
    const store = new Store({ client: db });
    expect(typeof store.get).toBe('function');
    expect(typeof store.set).toBe('function');
    expect(typeof store.destroy).toBe('function');
    db.close();
  });

  it('persists and retrieves a session', async () => {
    const db = new Database(':memory:');
    const Store = SqliteStore(session);
    const store = new Store({ client: db });

    await new Promise((resolve, reject) =>
      store.set('sid-1', { userId: 42 }, (err) => (err ? reject(err) : resolve()))
    );

    const sess = await new Promise((resolve, reject) =>
      store.get('sid-1', (err, s) => (err ? reject(err) : resolve(s)))
    );
    expect(sess).toMatchObject({ userId: 42 });
    db.close();
  });
});
