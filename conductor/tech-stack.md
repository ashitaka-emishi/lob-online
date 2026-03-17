# Tech Stack: lob-online

## Runtime

- Node.js 20, ES modules (`"type": "module"`) throughout
- Exception: `ecosystem.config.cjs` (PM2 requires CommonJS)

## Languages

- JavaScript (plain JS, no TypeScript — runtime Zod validation is the type-safety strategy)

## Frontend

- Vue 3 with `<script setup>` Composition API
- Vite (build tool and dev server, port 5173)
- Pinia (state management)
- Vue Router (navigation)
- Scoped CSS in SFCs

## Backend

- Express (HTTP server, port 3000)
- Socket.io (real-time multiplayer, planned)
- Zod (schema validation for all JSON data files at load time)

## Database

- None — game state stored in versioned JSON files under `data/scenarios/south-mountain/`

## Infrastructure

- PM2 (`ecosystem.config.cjs`) for process management
- GitHub Actions for CI

## Key Dependencies

- `zod` — runtime schema validation
- `socket.io` — real-time communication
- `vitest` — unit/integration tests (server: Node env; client: jsdom)
- `eslint` 9 flat config with `eslint-plugin-n` (server) and `eslint-plugin-vue` (client)
- `prettier` — formatting (100-char print width, 2-space indent, single quotes, semicolons, trailing commas ES5, LF)
- `cypress` — e2e tests

## Monorepo Structure

```
lob-online/
├── server/          # Express server workspace
├── client/          # Vue 3 client workspace
├── data/            # JSON scenario/game data
├── docs/            # Reference docs, designs, devlog, ailog
├── scripts/         # Build and utility scripts
└── conductor/       # Conductor project context (this directory)
```
