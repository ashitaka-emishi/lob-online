import express from 'express';

const app = express();
app.use(express.json());

app.post('/', (req, res) => {
  console.log('[discord-sink] POST body:', JSON.stringify(req.body, null, 2));
  res.status(204).end();
});

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(4040, () => {
  console.log('[discord-sink] Listening on http://localhost:4040');
});
