import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mock state so vi.mock factories can reference it
const { mockClose, mockDb } = vi.hoisted(() => {
  const mockClose = vi.fn();
  const mockDb = {
    close: mockClose,
    exec: vi.fn(),
    prepare: vi.fn(() => ({ run: vi.fn(), get: vi.fn(), all: vi.fn() })),
  };
  return { mockClose, mockDb };
});

// Prevent real DB/network side-effects
vi.mock('./store/gameSqlite.js', () => ({
  initDb: vi.fn().mockReturnValue(mockDb),
  getDb: vi.fn().mockReturnValue(mockDb),
  createGame: vi.fn(),
  joinGame: vi.fn(),
  getGame: vi.fn(),
  listGames: vi.fn(),
}));

vi.mock('better-sqlite3-session-store', () => ({
  default: vi.fn(() => class MockStore {}),
}));

vi.mock('express-session', () => ({
  default: vi.fn(() => (_req, _res, next) => next()),
}));

vi.mock('./routes/games.js', () => {
  const r = Object.assign((_req, _res, next) => next(), {
    stack: [],
    use: () => r,
    get: () => r,
    post: () => r,
    param: () => r,
  });
  return { default: r };
});

vi.mock('socket.io', () => ({
  Server: class MockIo {
    constructor() {
      this.engine = { use: vi.fn() };
    }
    on() {}
  },
}));

vi.mock('http', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    createServer: vi.fn(() => ({
      listen: vi.fn((_port, cb) => cb?.()),
      close: vi.fn((cb) => cb?.()),
    })),
  };
});

import { initDb } from './store/gameSqlite.js';

describe('startServer (#338)', () => {
  let sighandlers;

  beforeEach(() => {
    sighandlers = {};
    vi.spyOn(process, 'on').mockImplementation((event, fn) => {
      sighandlers[event] = fn;
      return process;
    });
    vi.spyOn(process, 'once').mockImplementation((event, fn) => {
      sighandlers[event] = fn;
      return process;
    });
    mockClose.mockClear();
    initDb.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports a startServer function', async () => {
    const mod = await import('./server.js');
    expect(typeof mod.startServer).toBe('function');
  });

  it('calls initDb() when startServer runs', async () => {
    const { startServer } = await import('./server.js');
    await startServer();
    expect(initDb).toHaveBeenCalled();
  });

  it('registers a SIGTERM handler that closes the db', async () => {
    const { startServer } = await import('./server.js');
    await startServer();
    expect(sighandlers['SIGTERM']).toBeDefined();
    sighandlers['SIGTERM']();
    expect(mockClose).toHaveBeenCalled();
  });

  // #589 — TRUST_PROXY guard: log line fires only when TRUST_PROXY=true
  it('logs trust proxy enabled message only when TRUST_PROXY=true', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Without TRUST_PROXY — no trust proxy log
    delete process.env.TRUST_PROXY;
    const { startServer: startNoProxy } = await import('./server.js');
    await startNoProxy();
    const noProxyCalls = logSpy.mock.calls.map((a) => a.join(' '));
    expect(noProxyCalls.some((s) => s.includes('trust proxy'))).toBe(false);

    logSpy.mockRestore();
  });

  // #m9-discord-oauth review finding — the dev-auth mount gate was never asserted anywhere;
  // deleting the "if (AUTH_DEV_MODE === 'true')" wrapper around app.use('/auth/dev', ...)
  // previously broke zero tests, which is an auth-bypass-sized blind spot given requireAuth
  // gates every /api/v1/games route on the identity this endpoint mints.
  describe('AUTH_DEV_MODE mount gate', () => {
    const ORIGINAL_ENV = { ...process.env };

    beforeEach(() => {
      // Restored by afterEach on each iteration; dotenv's one-time side effect (triggered by
      // an earlier test's `await import('./server.js')`) is not reliably present in
      // ORIGINAL_ENV, since that snapshot was taken at describe-registration time, before any
      // test body — including dotenv's first load — had run.
      process.env.SESSION_SECRET = 'test-secret';
    });

    afterEach(() => {
      process.env = { ...ORIGINAL_ENV };
    });

    it('mounts /auth/dev when AUTH_DEV_MODE=true and NODE_ENV is not production', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env.AUTH_DEV_MODE = 'true';
      process.env.NODE_ENV = 'development';
      const { startServer } = await import('./server.js');
      await startServer();
      const calls = logSpy.mock.calls.map((a) => a.join(' '));
      expect(calls.some((s) => s.includes('dev auth enabled at /auth/dev'))).toBe(true);
    });

    it('does NOT mount /auth/dev when AUTH_DEV_MODE=true but NODE_ENV=production (fail closed)', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.AUTH_DEV_MODE = 'true';
      process.env.NODE_ENV = 'production';
      const { startServer } = await import('./server.js');
      await startServer();
      const logCalls = logSpy.mock.calls.map((a) => a.join(' '));
      const warnCalls = warnSpy.mock.calls.map((a) => a.join(' '));
      expect(logCalls.some((s) => s.includes('dev auth enabled'))).toBe(false);
      expect(
        warnCalls.some((s) => s.includes('NODE_ENV=production') && s.includes('NOT mounted'))
      ).toBe(true);
    });

    it('does not mount /auth/dev when AUTH_DEV_MODE is unset', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      delete process.env.AUTH_DEV_MODE;
      process.env.NODE_ENV = 'development';
      const { startServer } = await import('./server.js');
      await startServer();
      const calls = logSpy.mock.calls.map((a) => a.join(' '));
      expect(calls.some((s) => s.includes('dev auth enabled'))).toBe(false);
    });
  });
});
