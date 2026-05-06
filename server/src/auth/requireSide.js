import { getPlayerSession } from './session.js';

export function requireSide(req, res, next) {
  const player = getPlayerSession(req);
  if (!player || player.gameId !== req.params.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
