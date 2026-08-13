import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('passport-discord', () => {
  class MockStrategy {
    constructor(options, verify) {
      MockStrategy.lastOptions = options;
      MockStrategy.lastVerify = verify;
    }
  }
  return { Strategy: MockStrategy };
});

import { configurePassport } from './discord.js';

function makeDb({ userRow, throwOnGet, throwOnRun } = {}) {
  const getStmt = {
    get: vi.fn(() => {
      if (throwOnGet) throw new Error('db locked');
      return userRow;
    }),
  };
  const runStmt = {
    run: vi.fn(() => {
      if (throwOnRun) throw new Error('db locked');
    }),
  };
  return {
    prepare: vi.fn((sql) => (sql.startsWith('SELECT') ? getStmt : runStmt)),
    _getStmt: getStmt,
    _runStmt: runStmt,
  };
}

const ORIGINAL_ENV = { ...process.env };

describe('configurePassport', () => {
  let deserializeUserSpy, useSpy;

  beforeEach(() => {
    deserializeUserSpy = vi.spyOn(passport, 'deserializeUser');
    useSpy = vi.spyOn(passport, 'use').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  // #m9-discord-oauth review finding — the dev- prefix branch previously reconstituted a
  // valid identity with no runtime check of AUTH_DEV_MODE at all, so a session minted while
  // the flag was on kept authenticating after it was turned off (session lifetime is 14 days,
  // server.js).
  describe('deserializeUser — dev- prefixed ids', () => {
    it('fails closed (done(null, false)) when AUTH_DEV_MODE is not "true"', () => {
      delete process.env.AUTH_DEV_MODE;
      configurePassport(makeDb());
      const deserialize = deserializeUserSpy.mock.calls.at(-1)[0];
      const done = vi.fn();
      deserialize('dev-1234', done);
      expect(done).toHaveBeenCalledWith(null, false);
    });

    it('fails closed when AUTH_DEV_MODE is any value other than the literal string "true"', () => {
      process.env.AUTH_DEV_MODE = 'yes';
      configurePassport(makeDb());
      const deserialize = deserializeUserSpy.mock.calls.at(-1)[0];
      const done = vi.fn();
      deserialize('dev-1234', done);
      expect(done).toHaveBeenCalledWith(null, false);
    });

    it('reconstitutes a synthetic user without a DB hit when AUTH_DEV_MODE is "true"', () => {
      process.env.AUTH_DEV_MODE = 'true';
      const db = makeDb();
      configurePassport(db);
      const deserialize = deserializeUserSpy.mock.calls.at(-1)[0];
      const done = vi.fn();
      deserialize('dev-1234', done);
      expect(done).toHaveBeenCalledWith(null, {
        id: 'dev-1234',
        username: 'DevUser 1234',
        avatar: null,
      });
      expect(db._getStmt.get).not.toHaveBeenCalled();
    });
  });

  describe('deserializeUser — real (DB-backed) ids', () => {
    it('looks up the user row and passes it to done', () => {
      const db = makeDb({ userRow: { id: 'discord-1', username: 'Alice', avatar: 'x' } });
      configurePassport(db);
      const deserialize = deserializeUserSpy.mock.calls.at(-1)[0];
      const done = vi.fn();
      deserialize('discord-1', done);
      expect(done).toHaveBeenCalledWith(null, { id: 'discord-1', username: 'Alice', avatar: 'x' });
    });

    it('passes false when the user row no longer exists (deleted user)', () => {
      const db = makeDb({ userRow: undefined });
      configurePassport(db);
      const deserialize = deserializeUserSpy.mock.calls.at(-1)[0];
      const done = vi.fn();
      deserialize('discord-deleted', done);
      expect(done).toHaveBeenCalledWith(null, false);
    });

    it('passes the error to done when the DB lookup throws', () => {
      const db = makeDb({ throwOnGet: true });
      configurePassport(db);
      const deserialize = deserializeUserSpy.mock.calls.at(-1)[0];
      const done = vi.fn();
      deserialize('discord-1', done);
      expect(done).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // #698 — passport.serializeUser()/deserializeUser() push onto internal arrays rather than
  // replacing; without a reset, a second configurePassport() call in the same process leaves
  // the FIRST-registered deserializer (bound to a possibly-closed db) permanently in effect,
  // since deserializeUser's real stack-traversal tries stack[0] first and this deserializer
  // never returns the 'pass' sentinel needed to fall through.
  describe('idempotency', () => {
    it('a second configurePassport() call does not accumulate deserializers', () => {
      configurePassport(makeDb());
      configurePassport(makeDb());
      expect(passport._deserializers).toHaveLength(1);
      expect(passport._serializers).toHaveLength(1);
    });

    it('after a second configurePassport() call, only the latest db is consulted', () => {
      const dbA = makeDb({ userRow: { id: 'u1', username: 'FromA', avatar: null } });
      const dbB = makeDb({ userRow: { id: 'u1', username: 'FromB', avatar: null } });
      configurePassport(dbA);
      configurePassport(dbB);

      // Real stack traversal (not the spy's direct-call shortcut the tests above use) — this
      // is what actually runs when a request deserializes a session.
      const done = vi.fn();
      passport.deserializeUser('u1', done);
      expect(done).toHaveBeenCalledWith(null, { id: 'u1', username: 'FromB', avatar: null });
      expect(dbA._getStmt.get).not.toHaveBeenCalled();
    });
  });

  describe('DiscordStrategy configuration', () => {
    it('registers a strategy with state: true (login CSRF protection) when Discord env vars are set', () => {
      process.env.DISCORD_CLIENT_ID = 'cid';
      process.env.DISCORD_CLIENT_SECRET = 'secret';
      process.env.DISCORD_CALLBACK_URL = 'http://localhost/cb';
      configurePassport(makeDb());
      expect(useSpy).toHaveBeenCalledOnce();
      expect(DiscordStrategy.lastOptions).toMatchObject({
        clientID: 'cid',
        clientSecret: 'secret',
        callbackURL: 'http://localhost/cb',
        state: true,
      });
    });

    it('does not register a strategy when Discord env vars are missing', () => {
      delete process.env.DISCORD_CLIENT_ID;
      delete process.env.DISCORD_CLIENT_SECRET;
      delete process.env.DISCORD_CALLBACK_URL;
      configurePassport(makeDb());
      expect(useSpy).not.toHaveBeenCalled();
    });

    it("upserts the user and calls done on the strategy's verify callback", () => {
      process.env.DISCORD_CLIENT_ID = 'cid';
      process.env.DISCORD_CLIENT_SECRET = 'secret';
      process.env.DISCORD_CALLBACK_URL = 'http://localhost/cb';
      const db = makeDb();
      configurePassport(db);
      const verify = DiscordStrategy.lastVerify;
      const done = vi.fn();
      verify('token', 'refresh', { id: 'discord-1', username: 'Alice', avatar: 'x' }, done);
      expect(done).toHaveBeenCalledWith(null, { id: 'discord-1', username: 'Alice', avatar: 'x' });
    });

    // #699 — a malformed profile must surface as a typed auth failure (done(err)), not reach
    // upsertUser() and fail as a raw, unexplained SQLite error.
    it('calls done with a typed error and does not upsert when the profile is missing a username', () => {
      process.env.DISCORD_CLIENT_ID = 'cid';
      process.env.DISCORD_CLIENT_SECRET = 'secret';
      process.env.DISCORD_CALLBACK_URL = 'http://localhost/cb';
      const db = makeDb();
      configurePassport(db);
      const verify = DiscordStrategy.lastVerify;
      const done = vi.fn();
      verify('token', 'refresh', { id: 'discord-1', avatar: 'x' }, done);
      expect(done).toHaveBeenCalledWith(expect.any(Error));
      expect(done.mock.calls[0][0].message).toMatch(/Invalid Discord profile/);
      expect(db._runStmt.run).not.toHaveBeenCalled();
    });

    it('calls done with a typed error when the profile id is not a string', () => {
      process.env.DISCORD_CLIENT_ID = 'cid';
      process.env.DISCORD_CLIENT_SECRET = 'secret';
      process.env.DISCORD_CALLBACK_URL = 'http://localhost/cb';
      const db = makeDb();
      configurePassport(db);
      const verify = DiscordStrategy.lastVerify;
      const done = vi.fn();
      verify('token', 'refresh', { id: 12345, username: 'Alice', avatar: null }, done);
      expect(done).toHaveBeenCalledWith(expect.any(Error));
      expect(db._runStmt.run).not.toHaveBeenCalled();
    });
  });
});
