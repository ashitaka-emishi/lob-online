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

describe('faction columns — createGame / joinGame / getGame', () => {
  it('stores side_a_faction when provided to createGame', () => {
    store.createGame('fc1', 'tok-a', 'union');
    const row = store.getGame('fc1');
    expect(row.side_a_faction).toBe('union');
  });

  it('stores null side_a_faction when faction omitted', () => {
    store.createGame('fc2', 'tok-a');
    const row = store.getGame('fc2');
    expect(row.side_a_faction).toBeNull();
  });

  it('stores side_b_faction when joinGame called with faction', () => {
    store.createGame('fc3', 'tok-a', 'union');
    store.joinGame('fc3', VALID_UUID_1, 'confederate');
    const row = store.getGame('fc3');
    expect(row.side_b_faction).toBe('confederate');
  });

  it('stores null side_b_faction when joinGame called without faction', () => {
    store.createGame('fc4', 'tok-a');
    store.joinGame('fc4', VALID_UUID_1);
    const row = store.getGame('fc4');
    expect(row.side_b_faction).toBeNull();
  });

  it('getGame returns all three new columns', () => {
    store.createGame('fc5', 'tok-a', 'union', 'https://discord.com/webhook/test');
    store.joinGame('fc5', VALID_UUID_1, 'confederate');
    const row = store.getGame('fc5');
    expect(row.side_a_faction).toBe('union');
    expect(row.side_b_faction).toBe('confederate');
    expect(row.discord_webhook).toBe('https://discord.com/webhook/test');
  });
});

describe('faction validation — createGame / joinGame reject invalid values', () => {
  // The store does not validate faction values; the route validates before calling createGame.
  // These tests document the boundary: non-canonical string values pass through to the DB.
  it.each(['', 'north', 'Union', 'UNION'])(
    'createGame stores non-canonical faction string verbatim (%p)',
    (faction) => {
      store.createGame('fv1', 'tok-a', faction);
      const row = store.getGame('fv1');
      expect(row.side_a_faction).toBe(faction);
    }
  );

  it('createGame stores null when faction is null', () => {
    store.createGame('fv2', 'tok-a', null);
    expect(store.getGame('fv2').side_a_faction).toBeNull();
  });
});

describe('discord_webhook column', () => {
  it('stores and retrieves discord_webhook URL', () => {
    store.createGame('dw1', 'tok-a', 'union', 'https://discord.com/api/webhooks/123/abc');
    const row = store.getGame('dw1');
    expect(row.discord_webhook).toBe('https://discord.com/api/webhooks/123/abc');
  });

  it('stores null discord_webhook when not provided', () => {
    store.createGame('dw2', 'tok-a', 'union');
    expect(store.getGame('dw2').discord_webhook).toBeNull();
  });

  it('stores null discord_webhook when explicitly passed null', () => {
    store.createGame('dw3', 'tok-a', 'union', null);
    expect(store.getGame('dw3').discord_webhook).toBeNull();
  });
});

describe('migration idempotency', () => {
  it('createStore on the same DB twice does not throw', () => {
    const db2 = new Database(':memory:');
    expect(() => {
      createStore(db2);
      createStore(db2);
    }).not.toThrow();
    db2.close();
  });

  it('createStore on a DB that already has the v2 schema skips migration cleanly', () => {
    // Simulate a DB that was already migrated to v2
    const db3 = new Database(':memory:');
    const s1 = createStore(db3); // first init — runs migration, sets user_version = 2
    s1.createGame('pre-migrated', 'tok-a', 'union');

    // Second createStore on same connection — must not error
    const s2 = createStore(db3);
    const row = s2.getGame('pre-migrated');
    expect(row.side_a_faction).toBe('union');
    db3.close();
  });

  it('createStore on a pre-v1 DB (missing new columns) adds all columns and sets user_version = 2', () => {
    // Simulate the legacy schema without the v1/v2 columns
    const db4 = new Database(':memory:');
    db4.exec(`
      CREATE TABLE games (
        id TEXT PRIMARY KEY,
        side_a_token TEXT NOT NULL,
        side_b_token TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        created_at INTEGER NOT NULL
      )
    `);
    // user_version is still 0 — migration has not run
    expect(db4.pragma('user_version', { simple: true })).toBe(0);

    // createStore must add missing columns and bump user_version to 2
    const s = createStore(db4);
    expect(db4.pragma('user_version', { simple: true })).toBe(2);

    s.createGame('legacy-game', 'tok-a', 'union', 'https://example.com/hook');
    const row = s.getGame('legacy-game');
    expect(row.side_a_faction).toBe('union');
    expect(row.discord_webhook).toBe('https://example.com/hook');
    expect(row.side_a_user_id).toBeNull();
    db4.close();
  });

  it('createStore on a v1 DB migrates to v2 cleanly', () => {
    // Build a v1 DB by hand (as if it was created before the v2 migration)
    const db5 = new Database(':memory:');
    db5.exec(`
      CREATE TABLE games (
        id TEXT PRIMARY KEY,
        side_a_token TEXT NOT NULL,
        side_b_token TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        created_at INTEGER NOT NULL,
        side_a_faction TEXT,
        side_b_faction TEXT,
        discord_webhook TEXT
      )
    `);
    db5.pragma('user_version = 1');
    db5
      .prepare(
        "INSERT INTO games (id, side_a_token, status, created_at, side_a_faction) VALUES ('v1-game', 'tok', 'open', 1, 'union')"
      )
      .run();

    const s = createStore(db5);
    expect(db5.pragma('user_version', { simple: true })).toBe(2);
    // Existing v1 game is preserved and new columns are NULL
    const row = s.getGame('v1-game');
    expect(row.side_a_faction).toBe('union');
    expect(row.side_a_user_id).toBeNull();
    // users table was created
    expect(() => db5.prepare('SELECT * FROM users').all()).not.toThrow();
    db5.close();
  });
});

describe('side_a_user_id / side_b_user_id columns', () => {
  it('stores side_a_user_id when provided to createGame', () => {
    store.createGame('uid1', 'tok-a', 'union', null, 'user-abc');
    expect(store.getGame('uid1').side_a_user_id).toBe('user-abc');
  });

  it('stores null side_a_user_id when omitted', () => {
    store.createGame('uid2', 'tok-a', 'union');
    expect(store.getGame('uid2').side_a_user_id).toBeNull();
  });

  it('stores side_b_user_id when joinGame called with userId', () => {
    store.createGame('uid3', 'tok-a', 'union');
    store.joinGame('uid3', VALID_UUID_1, 'confederate', 'user-xyz');
    expect(store.getGame('uid3').side_b_user_id).toBe('user-xyz');
  });

  it('stores null side_b_user_id when joinGame called without userId', () => {
    store.createGame('uid4', 'tok-a');
    store.joinGame('uid4', VALID_UUID_1);
    expect(store.getGame('uid4').side_b_user_id).toBeNull();
  });
});

describe('upsertUser / getUser', () => {
  it('inserts a new user and retrieves it', () => {
    store.upsertUser('u1', 'Alice', 'abc123');
    const user = store.getUser('u1');
    expect(user).toEqual({ id: 'u1', username: 'Alice', avatar: 'abc123' });
  });

  it('updates username and avatar on conflict', () => {
    store.upsertUser('u2', 'Bob', null);
    store.upsertUser('u2', 'Robert', 'new-avatar');
    const user = store.getUser('u2');
    expect(user.username).toBe('Robert');
    expect(user.avatar).toBe('new-avatar');
  });

  it('stores null avatar when not provided', () => {
    store.upsertUser('u3', 'Charlie', null);
    expect(store.getUser('u3').avatar).toBeNull();
  });

  it('returns null for unknown user id', () => {
    expect(store.getUser('nonexistent')).toBeNull();
  });
});

describe('listGamesByUser', () => {
  it('returns only games where the user is side_a or side_b', () => {
    store.createGame('g-mine-a', 'tok-a', 'union', null, 'me');
    store.createGame('g-mine-b', 'tok-b', 'union');
    store.joinGame('g-mine-b', VALID_UUID_1, 'confederate', 'me');
    store.createGame('g-other', 'tok-c', 'union', null, 'other-user');
    const rows = store.listGamesByUser('me');
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual(['g-mine-a', 'g-mine-b']);
  });

  it('returns empty array when user has no games', () => {
    store.createGame('g1', 'tok-a', 'union', null, 'someone-else');
    expect(store.listGamesByUser('nobody')).toEqual([]);
  });
});

// #m9-discord-oauth review finding — lets a player who lost their session (logout, cookie
// expiry, new device) recover access to a game they already own, without their old sideToken.
describe('reclaimSideToken', () => {
  it('reissues side_a_token when the caller owns side A', () => {
    store.createGame('g1', 'old-token-a', 'union', null, 'owner-a');
    const ok = store.reclaimSideToken('g1', 'union', 'owner-a', 'new-token-a');
    expect(ok).toBe(true);
    expect(store.getGame('g1').side_a_token).toBe('new-token-a');
  });

  it('reissues side_b_token when the caller owns side B', () => {
    store.createGame('g1', 'tok-a', 'union', null, 'owner-a');
    store.joinGame('g1', VALID_UUID_1, 'confederate', 'owner-b');
    const ok = store.reclaimSideToken('g1', 'confederate', 'owner-b', 'new-token-b');
    expect(ok).toBe(true);
    expect(store.getGame('g1').side_b_token).toBe('new-token-b');
    // Side A's token must be untouched by a side-B reclaim
    expect(store.getGame('g1').side_a_token).toBe('tok-a');
  });

  it('returns false and makes no change when the caller does not own the matching faction', () => {
    store.createGame('g1', 'tok-a', 'union', null, 'owner-a');
    const ok = store.reclaimSideToken('g1', 'union', 'someone-else', 'new-token');
    expect(ok).toBe(false);
    expect(store.getGame('g1').side_a_token).toBe('tok-a');
  });

  it('returns false when no side on the game matches the requested faction', () => {
    store.createGame('g1', 'tok-a', 'union', null, 'owner-a');
    const ok = store.reclaimSideToken('g1', 'confederate', 'owner-a', 'new-token');
    expect(ok).toBe(false);
  });

  it('throws GameNotFoundError when the game does not exist', () => {
    expect(() => store.reclaimSideToken('nope', 'union', 'owner-a', 'new-token')).toThrow(
      GameNotFoundError
    );
  });
});
