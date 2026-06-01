import { fileURLToPath } from 'url';
import { join } from 'path';
import { createServer } from 'http';

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import SqliteStore from 'better-sqlite3-session-store';
import { Server } from 'socket.io';

import { initDb, getDb } from './store/gameSqlite.js';
import gamesRouter from './routes/games.js';
import oobRouter from './routes/oob.js';
import leadersRouter from './routes/leaders.js';
import scenariosRouter from './routes/scenarios.js';
import { registerGameSocket } from './socket/gameSocket.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

export async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: { origin: CLIENT_ORIGIN, credentials: true },
  });

  // Expose io to route handlers via app.locals so POST /actions can emit after dispatch (#356)
  app.locals.io = io;

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '5mb' }));

  // Fail fast if SESSION_SECRET is absent in any non-test environment (#SEC-M2)
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV !== 'test') {
    throw new Error('SESSION_SECRET env var must be set in all non-test environments');
  }

  // Initialise DB and persistent session store (#329, #338)
  initDb();
  const SessionStore = SqliteStore(session);
  // CSRF defense: CORS is restricted to CLIENT_ORIGIN (single known origin) and all API
  // mutations require Content-Type: application/json which cross-site simple requests
  // cannot set. Full synchronizer-token CSRF protection is deferred to M8 (#350). lgtm[js/missing-token-validation]
  const sessionMiddleware = session({
    // lgtm[js/missing-token-validation]
    store: new SessionStore({ client: getDb() }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
      // Drive secure flag from explicit env var so staging/preview HTTPS envs are covered (#SEC-M3)
      secure: process.env.COOKIE_SECURE === 'true',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
  });
  app.use(sessionMiddleware);

  // Share Express session with Socket.io so game:join/game:leave can read session.gameId (#356)
  io.engine.use(sessionMiddleware);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  // Game API
  app.use('/api/v1/games', gamesRouter);
  console.log('[server] game API enabled at /api/v1/games');

  // Scenario data API — production-safe, not gated by MAP_EDITOR_ENABLED (#431)
  app.use('/api/v1/oob', oobRouter);
  console.log('[server] OOB API enabled at /api/v1/oob');

  app.use('/api/v1/leaders', leadersRouter);
  console.log('[server] leaders API enabled at /api/v1/leaders');

  // Scenario map config — static data, no auth required (#421)
  app.use('/api/v1/scenarios', scenariosRouter);
  console.log('[server] scenarios API enabled at /api/v1/scenarios');

  // E2E coverage endpoint — returns Istanbul coverage collected via esm-loader-hook
  if (process.env.CYPRESS_COVERAGE === 'true') {
    app.get('/__coverage__', (_req, res) => {
      res.json({ coverage: global.__coverage__ || {} });
    });
    console.log('[server] coverage endpoint enabled at /__coverage__');
  }

  // Dev tools (map editor + scenario editor — guarded by env var)
  if (process.env.MAP_EDITOR_ENABLED === 'true') {
    const { default: mapEditorRouter } = await import('./routes/mapEditor.js');
    app.use(
      '/tools/map-editor/assets',
      express.static(join(__dirname, '../../docs'), {
        index: false,
        dotfiles: 'deny',
        maxAge: '1h',
      })
    );
    app.use('/api/tools/map-editor', mapEditorRouter);
    console.log('[server] map editor enabled at /tools/map-editor');

    const { default: scenarioEditorRouter } = await import('./routes/scenarioEditor.js');
    app.use('/api/tools/scenario-editor', scenarioEditorRouter);
    console.log('[server] scenario editor enabled at /tools/scenario-editor');

    const { default: autoDetectConfigRouter } = await import('./routes/autoDetectConfig.js');
    app.use('/api/tools/map-autodetect-config', autoDetectConfigRouter);
    console.log('[server] auto-detect config enabled at /api/tools/map-autodetect-config');

    const { default: oobEditorRouter } = await import('./routes/oobEditor.js');
    app.use('/api/tools/oob-editor', oobEditorRouter);
    console.log('[server] oob editor enabled at /api/tools/oob-editor');

    const { default: leadersEditorRouter } = await import('./routes/leadersEditor.js');
    app.use('/api/tools/leaders-editor', leadersEditorRouter);
    console.log('[server] leaders editor enabled at /api/tools/leaders-editor');

    const { default: successionEditorRouter } = await import('./routes/successionEditor.js');
    app.use('/api/tools/succession-editor', successionEditorRouter);
    console.log('[server] succession editor enabled at /api/tools/succession-editor');

    const { default: countersRouter } = await import('./routes/counters.js');
    app.use('/api/tools/counters', countersRouter);
    console.log('[server] counters enabled at /api/tools/counters');

    const { default: mapTestRouter } = await import('./routes/mapTest.js');
    app.use('/api/tools/map-test', mapTestRouter);
    console.log('[server] map test tool enabled at /tools/map-test');

    const { default: tableTestRouter } = await import('./routes/tableTest.js');
    app.use('/api/tools/table-test', tableTestRouter);
    console.log('[server] table test tool enabled at /tools/table-test');
  }

  // Global error handler — must be registered after all routes
  app.use((err, _req, res, _next) => {
    console.error('[server] unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Socket.io — game room membership and state-change notifications (#356)
  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);
    registerGameSocket(socket);
    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });

  // Graceful shutdown — close http server first, then DB; use once to prevent accumulation (#ARCH-M3)
  process.once('SIGTERM', () => {
    httpServer.close(() => getDb().close());
  });

  return new Promise((resolve) => {
    httpServer.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
      resolve(httpServer);
    });
  });
}

// Only auto-start when this file is the process entry point (#ARCH-H1)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
