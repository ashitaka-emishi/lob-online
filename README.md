# Line of Battle Online

An online implementation of the _Line of Battle v2.0_ wargame system (Multi-Man Publishing). The first game is **South Mountain** (RSS #4).

## Stack

| Layer   | Technology                                        |
| ------- | ------------------------------------------------- |
| Server  | Node.js, Express, Socket.io                       |
| Client  | Vue 3, Vite, Pinia, honeycomb-grid                |
| Auth    | Discord OAuth (passport-discord), JWT             |
| Storage | SQLite (game state), DigitalOcean Spaces (assets) |

## Development

**Prerequisites:** Node.js 20+

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env and fill in secrets as needed

# Start the server (port 3000)
npm run dev:server

# Start the client dev server (port 5173)
npm run dev:client
```

Open `http://localhost:5173`. The Vite dev server proxies `/api`, `/auth`, and `/socket.io` to the Express server.

## Other Commands

```bash
npm run build          # Production build of the client
npm test               # Run tests
npm run lint           # Lint
npm run format         # Format with Prettier
```

## Production

Uses PM2. See `ecosystem.config.cjs` for configuration.

## License

MIT — see [LICENSE](LICENSE).
