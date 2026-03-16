import { fileURLToPath } from 'url';
import { join } from 'path';
import { createServer } from 'http';

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

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
    express.static(join(__dirname, '../../docs'), { index: false, dotfiles: 'deny', maxAge: '1h' })
  );
  app.use('/api/tools/map-editor', mapEditorRouter);
  console.log('[server] map editor enabled at /tools/map-editor');

  const { default: scenarioEditorRouter } = await import('./routes/scenarioEditor.js');
  app.use('/api/tools/scenario-editor', scenarioEditorRouter);
  console.log('[server] scenario editor enabled at /tools/scenario-editor');

  const { default: autoDetectConfigRouter } = await import('./routes/autoDetectConfig.js');
  app.use('/api/tools/map-autodetect-config', autoDetectConfigRouter);
  console.log('[server] auto-detect config enabled at /api/tools/map-autodetect-config');
}

// Socket.io
io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
