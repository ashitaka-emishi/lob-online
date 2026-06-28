// Middleware: rejects requests that have no authenticated user in the passport session.
// Apply at the router mount point (server.js) for routes that require identity.
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
