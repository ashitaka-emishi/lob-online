// Socket.io handlers for game room membership.
// Session is shared with Express via io.engine.use(sessionMiddleware) in server.js.
export function registerGameSocket(socket) {
  // game:join — client joins the Socket.io room for a game after REST auth succeeds.
  // Authorization: session.gameId must match the requested gameId. (#356)
  socket.on('game:join', (data) => {
    const session = socket.request.session ?? {};
    const { gameId } = data ?? {};
    if (!session.gameId || session.gameId !== gameId) {
      socket.emit('game:error', { error: 'Unauthorized' });
      return;
    }
    socket.join(gameId);
    socket.emit('game:joined', { gameId });
  });

  // game:leave — client explicitly leaves the room (e.g. navigating away). (#356)
  socket.on('game:leave', (data) => {
    const { gameId } = data ?? {};
    if (gameId) socket.leave(gameId);
  });
}
