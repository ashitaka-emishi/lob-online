import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createStore,
  GameNotFoundError,
  GameNotOpenError,
  InvalidTokenError,
} from './gameSqlite.js';

// Reusable UUID fixtures — valid tokens for joinGame calls
const VALID_UUID_1 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const VALID_UUID_2 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

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
    store.joinGame('j1', VALID_UUID_1);
    const row = store.getGame('j1');
    expect(row.side_b_token).toBe(VALID_UUID_1);
    expect(row.status).toBe('active');
  });

  it('throws GameNotFoundError if game does not exist', () => {
    expect(() => store.joinGame('nope', VALID_UUID_1)).toThrow(GameNotFoundError);
  });

  it('throws GameNotOpenError if game is already full (status active)', () => {
    store.createGame('full1', 'tok-a');
    store.joinGame('full1', VALID_UUID_1);
    expect(() => store.joinGame('full1', VALID_UUID_2)).toThrow(GameNotOpenError);
  });

  it('throws "not open" via changes === 0, not a prior SELECT — proves atomic fix (#336)', () => {
    store.createGame('race1', 'tok-a');
    // Mark game active directly in DB, simulating the race scenario where both callers
    // have already passed a SELECT check but only one UPDATE can win
    db.prepare("UPDATE games SET status = 'active', side_b_token = ? WHERE id = ?").run(
      VALID_UUID_1,
      'race1'
    );
    // Must throw GameNotOpenError — the conditional UPDATE returns changes=0, not a JS SELECT check
    expect(() => store.joinGame('race1', VALID_UUID_2)).toThrow(GameNotOpenError);
    expect(store.getGame('race1').side_b_token).toBe(VALID_UUID_1);
  });

  // SEC-H1: sideBToken must match UUID format — contract assertion (#340)
  it.each([null, 123, undefined, true])(
    'throws InvalidTokenError when sideBToken is %p (#340)',
    (input) => {
      store.createGame('game', 'tok-a');
      expect(() => store.joinGame('game', input)).toThrow(InvalidTokenError);
    }
  );

  it.each(['', 'not-a-uuid', 'tok-b', ' bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb '])(
    'throws InvalidTokenError when sideBToken is not UUID format: %p (#340)',
    (input) => {
      store.createGame('game', 'tok-a');
      expect(() => store.joinGame('game', input)).toThrow(InvalidTokenError);
    }
  );

  it('accepts a valid lowercase UUID-format sideBToken (#340)', () => {
    store.createGame('val-lower', 'tok-a');
    store.joinGame('val-lower', VALID_UUID_1);
    const row = store.getGame('val-lower');
    expect(row.side_b_token).toBe(VALID_UUID_1);
    expect(row.status).toBe('active');
  });

  it('accepts a valid uppercase UUID-format sideBToken (regex is case-insensitive) (#340)', () => {
    store.createGame('val-upper', 'tok-a');
    const upper = 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB';
    expect(() => store.joinGame('val-upper', upper)).not.toThrow();
    expect(store.getGame('val-upper').side_b_token).toBe(upper);
    expect(store.getGame('val-upper').status).toBe('active');
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

describe('deleteGame', () => {
  it('removes an existing game row', () => {
    store.createGame('del1', 'tok-a');
    store.deleteGame('del1');
    expect(store.getGame('del1')).toBeNull();
  });

  it('throws GameNotFoundError for an unknown id', () => {
    expect(() => store.deleteGame('no-such')).toThrow(GameNotFoundError);
  });
});
