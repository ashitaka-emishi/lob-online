import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createStore } from './gameSqlite.js';

// Each test gets an isolated in-memory DB — no vi.resetModules() needed (#331)
let db;
let store;

beforeEach(() => {
  db = new Database(':memory:');
  store = createStore(db);
});

afterEach(() => {
  db.close();
});

describe('createGame', () => {
  it('inserts a row and returns the game id', () => {
    const result = store.createGame('game1', 'token-union-abc');
    expect(result).toBe('game1');
  });

  it('stores side_a_token and sets status to open', () => {
    store.createGame('game2', 'tok-a');
    const row = store.getGame('game2');
    expect(row.side_a_token).toBe('tok-a');
    expect(row.status).toBe('open');
    expect(row.side_b_token).toBeNull();
  });

  it('throws on duplicate id', () => {
    store.createGame('dup', 'tok');
    expect(() => store.createGame('dup', 'tok2')).toThrow();
  });
});

describe('joinGame', () => {
  it('sets side_b_token and changes status to active', () => {
    store.createGame('j1', 'tok-a');
    store.joinGame('j1', 'tok-b');
    const row = store.getGame('j1');
    expect(row.side_b_token).toBe('tok-b');
    expect(row.status).toBe('active');
  });

  it('throws if game does not exist', () => {
    expect(() => store.joinGame('nope', 'tok')).toThrow();
  });

  it('throws if game is already full (status active)', () => {
    store.createGame('full1', 'tok-a');
    store.joinGame('full1', 'tok-b');
    expect(() => store.joinGame('full1', 'tok-c')).toThrow();
  });
});

describe('getGame', () => {
  it('returns null for an unknown id', () => {
    expect(store.getGame('missing')).toBeNull();
  });

  it('returns the full row for a known game', () => {
    store.createGame('g3', 'tok-a');
    const row = store.getGame('g3');
    expect(row.id).toBe('g3');
    expect(typeof row.created_at).toBe('number');
  });
});

describe('listGames', () => {
  it('returns an empty array when no games exist', () => {
    expect(store.listGames()).toEqual([]);
  });

  it('returns all inserted rows', () => {
    store.createGame('la', 'ta');
    store.createGame('lb', 'tb');
    const rows = store.listGames();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id).sort()).toEqual(['la', 'lb']);
  });
});
