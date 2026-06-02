// NOTE: Importing from the store barrel (index.js) rather than gameSqlite.js directly
// keeps the test mock surface consistent — games.test.js mocks the barrel and configures
// getGame there. A direct gameSqlite import would require a separate mock entry.
// The transitive load of gameFile.js via the barrel is a known coupling concern (#arch)
// with negligible runtime impact for a single-server process.
import { getGame } from '../store/index.js';
import { getPlayerSession } from './session.js';

/**
 * Express middleware that authorises a request as a player with an active game side.
 *
 * Response code matrix:
 *   401 — no valid player session, or session.gameId ≠ req.params.id
 *   404 — game row no longer exists in the DB (game was deleted)
 *   409 — game exists but is not in 'active' status
 *         Note: 409 is returned before the token check, so a holder of a stale session
 *         for this game learns its lifecycle state. This is intentional: the 401 gate
 *         already scopes the caller to a specific game they previously joined.
 *   403 — game exists and is active, but session.sideToken does not match either side
 *   next — all checks pass; caller is an authorised active-side player
 */
export function requireSide(req, res, next) {
  const player = getPlayerSession(req);
  if (!player || player.gameId !== req.params.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify the sideToken is still valid against the DB record (#477).
  // This ensures stale sessions (e.g. after token rotation or game deletion) fail closed.
  const row = getGame(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Game not found' });
  }
  if (row.status !== 'active') {
    return res.status(409).json({ error: 'Game is not active' });
  }
  if (player.token !== row.side_a_token && player.token !== row.side_b_token) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
