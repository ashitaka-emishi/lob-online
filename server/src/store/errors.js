export class GameNotFoundError extends Error {
  constructor(id) {
    super(`Game not found: ${id}`);
    this.name = 'GameNotFoundError';
  }
}
