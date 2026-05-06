import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createStore, GameNotFoundError, GameNotOpenError } from './gameSqlite.js';

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

const UUID_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const UUID_C = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('joinGame', () => {
  it('sets side_b_token and changes status to active', () => {
    store.createGame('j1', 'tok-a');
    store.joinGame('j1', UUID_B);
    const row = store.getGame('j1');
    expect(row.side_b_token).toBe(UUID_B);
    expect(row.status).toBe('active');
  });

  it('throws GameNotFoundError if game does not exist', () => {
    expect(() => store.joinGame('nope', UUID_B)).toThrow(GameNotFoundError);
  });

  it('throws GameNotOpenError if game is already full (status active)', () => {
    store.createGame('full1', 'tok-a');
    store.joinGame('full1', UUID_B);
    expect(() => store.joinGame('full1', UUID_C)).toThrow(GameNotOpenError);
  });

  it('throws "not open" via changes === 0, not a prior SELECT — proves atomic fix (#336)', () => {
    store.createGame('race1', 'tok-a');
    // Mark game active directly in DB, simulating the race scenario where both callers
    // have already passed a SELECT check but only one UPDATE can win
    db.prepare("UPDATE games SET status = 'active', side_b_token = ? WHERE id = ?").run(
      UUID_B,
      'race1'
    );
    // Must throw "not open" — the conditional UPDATE returns changes=0, not a JS SELECT check
    expect(() => store.joinGame('race1', UUID_C)).toThrow(/not open/i);
    expect(store.getGame('race1').side_b_token).toBe(UUID_B);
  });

  // SEC-H1: sideToken must be a non-empty UUID string (#340)
  it('throws TypeError when sideBToken is an empty string (#340)', () => {
    store.createGame('val1', 'tok-a');
    expect(() => store.joinGame('val1', '')).toThrow(TypeError);
  });

  it('throws TypeError when sideBToken is not a string (#340)', () => {
    store.createGame('val2', 'tok-a');
    expect(() => store.joinGame('val2', null)).toThrow(TypeError);
    expect(() => store.joinGame('val2', 123)).toThrow(TypeError);
    expect(() => store.joinGame('val2', undefined)).toThrow(TypeError);
  });

  it('throws TypeError when sideBToken is not UUID format (#340)', () => {
    store.createGame('val3', 'tok-a');
    expect(() => store.joinGame('val3', 'not-a-uuid')).toThrow(TypeError);
    expect(() => store.joinGame('val3', 'tok-b')).toThrow(TypeError);
  });

  it('accepts a valid UUID-format sideBToken (#340)', () => {
    store.createGame('val4', 'tok-a');
    const uuid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    expect(() => store.joinGame('val4', uuid)).not.toThrow();
    expect(store.getGame('val4').side_b_token).toBe(uuid);
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
