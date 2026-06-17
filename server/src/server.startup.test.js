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
});
