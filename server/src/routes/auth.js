import express from 'express';

import passport from '../auth/discord.js';

const router = express.Router();

// GET /auth/discord — redirect to Discord OAuth consent screen
router.get('/discord', passport.authenticate('discord'));

// GET /auth/discord/callback — Discord redirects here after consent
router.get(
  '/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/?error=auth' }),
  (_req, res) => {
    res.redirect('/');
  }
);

// POST /auth/logout — clear passport session and respond
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});

// GET /auth/me — return current user or 401
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.user);
});

export default router;
