# Line of Battle Online

An online implementation of the _Line of Battle v2.0_ wargame system (Multi-Man Publishing). The first game is **South Mountain** (RSS #4).

## Repository Guide

| Document                                               | Description                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md)                     | Contribution workflow, coding standards, branch/PR conventions, and devlog process |
| [.github/README.md](.github/README.md)                 | GitHub issue templates, pull request template, and CI/CD workflow definitions      |
| [.claude/README.md](.claude/README.md)                 | Claude Code agent definitions and slash-command skills for development automation  |
| [docs/high-level-design.md](docs/high-level-design.md) | Full system architecture, phased development plan, and implementation status       |
| [docs/devlog.md](docs/devlog.md)                       | Chronological index of development session notes                                   |

---

## Stack

| Layer   | Technology                                        |
| ------- | ------------------------------------------------- |
| Server  | Node.js, Express, Socket.io                       |
| Client  | Vue 3, Vite, Pinia, honeycomb-grid                |
| Auth    | Discord OAuth (passport-discord), JWT             |
| Storage | SQLite (game state), DigitalOcean Spaces (assets) |

## Architecture

Single-server, two-player async/real-time wargame. See [docs/high-level-design.md](docs/high-level-design.md) for the full high-level design. Development notes are in the [Devlog](docs/devlog.md).

## Project Structure

```
server/src/          Express API + Socket.io
  routes/            API route handlers
  schemas/           Zod validation schemas
client/src/          Vue 3 SPA
  views/             Page-level components
  components/        Reusable UI components
  router/            Vue Router config
data/scenarios/      Game data JSON files
docs/                Rules PDFs, HLD, reference library
scripts/             Dev utility scripts
```

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

Alternatively, use the Claude Code devops skills for a managed start/stop experience — see [.claude/README.md](.claude/README.md).

## Developer Tools — Map Editor

The map editor is a dev-only tool for digitizing `docs/reference/sm-map.jpg` into `data/scenarios/south-mountain/map.json`. It is **not** part of the game itself.

To enable it, set `MAP_EDITOR_ENABLED=true` in `.env`, then launch both processes with:

```bash
npm run dev:map-editor
```

Open `http://localhost:5173/tools/map-editor`. The editor supports:

- Hex grid calibration over the map image (dx, dy, scale, rotation, lock)
- Four interaction modes: select, paint terrain, set elevation, draw edge features
- Per-hex editing: terrain, elevation, slope direction, sub-hex wedge elevations, hex features, and edge features (road, stream, stone wall, slope variants)
- LOS test panel: pick two hexes and compute line-of-sight with path and blocked-hex highlighting
- Layer toggles: terrain fills, elevation labels, wedge shading, edge lines, slope arrows
- localStorage autosave with draft restore banner; engine export as a downloadable JSON blob

> The API endpoints are only mounted when `MAP_EDITOR_ENABLED=true`. The Vue route is always present in the router.

## Testing

```bash
npm run test             # Run all tests
npm run test:coverage    # Run with v8 coverage report (threshold: 70% lines)
npm run validate-data    # Cross-validate all JSON data files against Zod schemas
```

## Other Commands

```bash
npm run build            # Production build of the client
npm run lint             # Lint
npm run format           # Format with Prettier
npm run validate-data    # Validate data JSON against Zod schemas
npm run dev:map-editor   # Launch server + client with map editor enabled
```

## Production

Uses PM2. See `ecosystem.config.cjs` for configuration.

## License

MIT — see [LICENSE](LICENSE).
