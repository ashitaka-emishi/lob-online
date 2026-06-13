import { ModuleNotFoundError } from '../utils/moduleFolders.js';

// Global Express error handler — registered after all routes in server.js (#545).
// Four-argument signature is required for Express to treat this as an error handler.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ModuleNotFoundError) {
    return res.status(404).json({ error: 'Not found' });
  }
  console.error('[server] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
