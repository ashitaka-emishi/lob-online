import express from 'express';

const router = express.Router();

// POST /auth/dev/login — poorman auth for local development without Discord credentials.
// Body: { code: "1234" } — any 4-digit (or other) string; creates a synthetic user identity.
// Gated by AUTH_DEV_MODE=true in .env; never mounted in production.
router.post('/login', (req, res, next) => {
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
