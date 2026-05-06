export function setPlayerSession(req, gameId, side, token) {
  req.session.gameId = gameId;
  req.session.side = side;
  req.session.sideToken = token;
}

export function getPlayerSession(req) {
  const { gameId, side, sideToken } = req.session ?? {};
  if (!gameId || !sideToken) return null;
  return { gameId, side, token: sideToken };
}
