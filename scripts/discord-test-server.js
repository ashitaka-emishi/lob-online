import { fileURLToPath } from 'url';

import express from 'express';

const app = express();
app.use(express.json({ limit: '64kb' }));

app.post('/', (req, res) => {
  console.log('[discord-sink] POST body:', JSON.stringify(req.body, null, 2));
  res.status(204).end();
});

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const port = parseInt(process.env.DISCORD_SINK_PORT ?? '4040', 10);

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  app.listen(port, '127.0.0.1', () => {
    console.log(`[discord-sink] Listening on http://localhost:${port}`);
  });
}

export { app };
