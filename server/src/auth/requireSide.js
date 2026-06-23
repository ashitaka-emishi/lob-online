// NOTE: Importing from the store barrel (index.js) rather than gameSqlite.js directly
// keeps the test mock surface consistent — games.test.js mocks the barrel and configures
// getGame there. A direct gameSqlite import would require a separate mock entry.
import { getGame } from '../store/index.js';
import { getPlayerSession } from './session.js';

/**
 * Express middleware that authorises a request as a player with an active game side.
 *
 * Response code matrix:
 *   401 — no valid player session (unauthenticated)
 *   403 — session exists but session.gameId ≠ req.params.id (authenticated for a different game)
 *   404 — game row no longer exists in the DB (game was deleted)
 *   403 — game exists but session.sideToken does not match either side (stale/rotated token)
 *   409 — token is valid but game is not in 'active' status
 *   next — all checks pass; caller is an authorised active-side player
 */
export function requireSide(req, res, next) {
  const player = getPlayerSession(req);
  // No session at all → 401 (unauthenticated). Session exists but for a different game → 403
  // (#553). These two cases must be distinct: 401 means "prove who you are"; 403 means "you
  // proved who you are, but you don't own this game."
  if (!player) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (player.gameId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Verify the sideToken is still valid against the DB record (#477).
  // This ensures stale sessions (e.g. after token rotation or game deletion) fail closed.
  const row = getGame(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Game not found' });
  }
  // Token check before status check: an invalid token yields 403 without leaking lifecycle state.
  if (player.sideToken !== row.side_a_token && player.sideToken !== row.side_b_token) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (row.status !== 'active') {
    return res.status(409).json({ error: 'Game is not active' });
  }

  // Attach a safe projection of the row — omits side tokens so handlers cannot
  // accidentally serialize secret credentials to clients.
  req.game = { id: row.id, status: row.status, discord_webhook: row.discord_webhook };
  next();
}
