import { getGame } from '../store/index.js';
import { getPlayerSession } from './session.js';

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
