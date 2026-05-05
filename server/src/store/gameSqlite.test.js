import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Each test gets a fresh in-memory DB via the module factory.
// We re-import gameSqlite with a fresh db each time using the
// optional dbPath argument (":memory:" for tests).

let createGame, joinGame, getGame, listGames, initDb;

beforeEach(async () => {
  ({ createGame, joinGame, getGame, listGames, initDb } = await import('./gameSqlite.js'));
  initDb(':memory:');
});

afterEach(() => {
  // Reset module so the next beforeEach gets a fresh db instance
  vi.resetModules();
});

import { vi } from 'vitest';

describe('createGame', () => {
  it('inserts a row and returns the game id', () => {
    const result = createGame('game1', 'token-union-abc');
    expect(result).toBe('game1');
  });

  it('stores side_a_token and sets status to open', () => {
    createGame('game2', 'tok-a');
    const row = getGame('game2');
    expect(row.side_a_token).toBe('tok-a');
    expect(row.status).toBe('open');
    expect(row.side_b_token).toBeNull();
  });

  it('throws on duplicate id', () => {
    createGame('dup', 'tok');
    expect(() => createGame('dup', 'tok2')).toThrow();
  });
});

describe('joinGame', () => {
  it('sets side_b_token and changes status to active', () => {
    createGame('j1', 'tok-a');
    joinGame('j1', 'tok-b');
    const row = getGame('j1');
    expect(row.side_b_token).toBe('tok-b');
    expect(row.status).toBe('active');
  });

  it('throws if game does not exist', () => {
    expect(() => joinGame('nope', 'tok')).toThrow();
  });

  it('throws if game is already full (status active)', () => {
    createGame('full1', 'tok-a');
    joinGame('full1', 'tok-b');
    expect(() => joinGame('full1', 'tok-c')).toThrow();
  });
});

describe('getGame', () => {
  it('returns null for an unknown id', () => {
    expect(getGame('missing')).toBeNull();
  });

  it('returns the full row for a known game', () => {
    createGame('g3', 'tok-a');
    const row = getGame('g3');
    expect(row.id).toBe('g3');
    expect(typeof row.created_at).toBe('number');
  });
});

describe('listGames', () => {
  it('returns an empty array when no games exist', () => {
    expect(listGames()).toEqual([]);
  });

  it('returns all inserted rows', () => {
    createGame('la', 'ta');
    createGame('lb', 'tb');
    const rows = listGames();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id).sort()).toEqual(['la', 'lb']);
  });
});
