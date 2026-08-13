import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// CodeQL (js/missing-rate-limiting) — this route mints an authenticated session from a
// caller-supplied code with no credential check at all; matches the create/join limiter
// pattern already used in games.js. Independent of the AUTH_DEV_MODE/NODE_ENV mount gate.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

// POST /auth/dev/login — poorman auth for local development without Discord credentials.
// Body: { code: "1234" } — any 4-digit (or other) string; creates a synthetic user identity.
// Mounted only when AUTH_DEV_MODE=true AND NODE_ENV !== 'production' (server.js) — both
// conditions are checked at mount time, not just this flag alone.
router.post('/login', loginLimiter, (req, res, next) => {
  const { code } = req.body ?? {};
  if (!code || typeof code !== 'string' || code.trim() === '') {
    return res.status(400).json({ error: 'code is required' });
  }
  const trimmed = code.trim();
  const user = { id: `dev-${trimmed}`, username: `DevUser ${trimmed}`, avatar: null };

  req.login(user, (err) => {
    if (err) return next(err);
    res.json({ ok: true, user });
  });
});

export default router;
