// NOTE: Importing from the store barrel (index.js) rather than gameSqlite.js directly
// keeps the test mock surface consistent — games.test.js mocks the barrel and configures
// getGame there. A direct gameSqlite import would require a separate mock entry.
import { getGame } from '../store/index.js';
import { getPlayerSession } from './session.js';

/**
 * Express middleware that authorises a request as a player with an active game side.
 *
 * On success, sets:
 *   - `req.game` — `{ id, status, discord_webhook }`, a safe projection omitting side tokens.
 *   - `req.side` — the authoritative faction string derived from which DB token column matched
 *     (`side_a_faction` when sideToken === side_a_token, else `side_b_faction`). Route handlers
 *     must use `req.side` for player identity — never `player.side` from the session.
 *
 * Both `req.game` and `req.side` are only set when `next()` is called.
 *
 * Response code matrix:
 *   401 — no valid player session (unauthenticated)
 *   403 — session exists but session.gameId ≠ req.params.id (authenticated for a different game)
 *   404 — game row no longer exists in the DB (game was deleted)
 *   403 — game exists but session.sideToken does not match either side (stale/rotated token)
 *   403 — token matches, but the DB-recorded owner (side_a/b_user_id) ≠ req.user.id
 *   409 — token and identity are valid but game is not in 'active' status
 *   next — all checks pass; req.game and req.side populated; caller is an authorised active-side player
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

  // Identity ownership check (#m9-discord-oauth review — security finding): without this,
  // possession of a sideToken authorizes side access regardless of which Discord identity is
  // attached to the session, making side_a_user_id/side_b_user_id purely decorative. Only
  // enforced when the DB has an owner recorded for the matched side — pre-migration rows and
  // any row created without a logged-in user (legacy data) have a null owner and are not
  // affected. req.user is guaranteed non-null here because requireAuth runs first (server.js).
  const ownerId = player.sideToken === row.side_a_token ? row.side_a_user_id : row.side_b_user_id;
  if (ownerId && req.user?.id !== ownerId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (row.status !== 'active') {
    return res.status(409).json({ error: 'Game is not active' });
  }

  // Derive authoritative side from DB token-to-faction mapping (#562).
  // Trusting the session-stored side string is insufficient — the DB is the source of truth.
  const derivedSide =
    player.sideToken === row.side_a_token ? row.side_a_faction : row.side_b_faction;
  req.side = derivedSide;

  // Attach a safe projection of the row — omits side tokens so handlers cannot
  // accidentally serialize secret credentials to clients.
  req.game = { id: row.id, status: row.status, discord_webhook: row.discord_webhook };
  next();
}
