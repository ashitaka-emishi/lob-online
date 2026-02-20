# HLD Generation Prompt — lob-online

Paste this entire document into a new Claude session to generate a comprehensive high-level design document for the lob-online project.

---

## Your Task

You are a software architect. Using the project context below, generate a comprehensive **High-Level Design (HLD) document** for the `lob-online` project. Cover all twelve sections listed at the end of this prompt. Be specific: include example code structures, JSON shapes, file trees, and architectural diagrams in ASCII art where helpful.

---

## 1. Project Summary

**lob-online** is an online, two-player implementation of the *Line of Battle v2.0* (LoB) wargame system published by Multi-Man Publishing. The first game being implemented is *South Mountain* (RSS #4) — a Civil War battle chosen for its manageable scope.

### Development philosophy: ship a real MVP first

The MVP (v1) is a complete, playable application — not an API prototype. It includes authentication, persistence, an interactive hex map, and both async and real-time multiplayer. Later phases add polish and features, not foundational capabilities.

- **v1 (MVP)**: Full playable app — auth, REST API + Vue 3 frontend + interactive hex map + DigitalOcean Spaces-backed persistence. Both players can create an account, start a game, and play a complete scenario.
- **v2**: Enhanced experience — UI polish, replay/history viewer, richer map interactions, notifications.
- **v3**: Additional scenarios, spectator mode, AI opponent (stretch).

### Current state

Documentation and scoping only. No code exists. All source material (rulebooks, scenario sheets, unit rosters, errata) has been collected. Data models are defined but not yet built. This HLD is the first design artifact.

---

## 2. Confirmed Tech Stack

**Runtime & framework**

| Layer | Technology |
|-------|------------|
| Backend runtime | Node.js |
| Backend framework | Express.js |
| Frontend | Vue 3 + Vite + Pinia |
| Repo structure | npm workspaces (monorepo — `server/` and `client/` as workspace packages) |

**Auth & security**

| Layer | Technology |
|-------|------------|
| Authentication | Discord OAuth2 — "Login with Discord". No username/password; no argon2. |
| Discord app | Application registered in Discord developer portal — provides `DISCORD_CLIENT_ID` + `DISCORD_CLIENT_SECRET` |
| OAuth library | `passport` + `passport-discord` |
| Auth tokens | JWT (`jsonwebtoken`) — issued by the server after OAuth completes; stored in `httpOnly` cookies |
| Security middleware | `helmet` (HTTP headers) + `cors` (dev: Vite port → Express port) |
| Input validation | Zod — validates all incoming request bodies before the rules engine sees them |

**Persistence**

| Layer | Technology |
|-------|------------|
| Game state storage | DigitalOcean Spaces (S3-compatible object storage) — JSON files per game |
| Storage client | `@aws-sdk/client-s3` v3 with custom `endpoint` pointing to DO Spaces |
| Auth / game index | SQLite via `better-sqlite3` — user records (`discord_id`, `username`, `avatar_url`), game list, player-to-game mapping |

**Hex map**

| Layer | Technology |
|-------|------------|
| Map rendering | SVG (browser-rendered, in-DOM — natural for click/hover on discrete hexes) |
| Hex grid math | Honeycomb.js — cube coordinates, neighbor lookup, range, LOS geometry |

**Multiplayer**

| Layer | Technology |
|-------|------------|
| Multiplayer modes | Async (PBEM-style) AND real-time (both supported) |
| Async notifications | Discord webhook — optional URL stored per game; server POSTs a message when it's a player's turn. No SDK needed. |
| Real-time sync | **TBD** — recommend Socket.io vs. SSE vs. polling (see Section 5) |

**Infrastructure**

| Layer | Technology |
|-------|------------|
| Deployment | DigitalOcean Droplet (~$6/month, 1 vCPU / 1GB RAM) |
| Object storage | DigitalOcean Spaces (~$5/month, 250GB) |
| Static assets | Vue build served by Express (no separate CDN for MVP) |
| Reverse proxy | nginx — terminates HTTPS, proxies to Node process |
| TLS | Let's Encrypt via Certbot (auto-renewing) |
| Process management | PM2 — keeps Node process alive, handles restarts, log management |
| CI/CD | GitHub Actions — lint + test on every PR; deploy to Droplet on merge to `main` |
| Environment config | `dotenv` locally; environment variables set directly on the Droplet in production |
| Request logging | `morgan` (dev) / structured JSON log in production |

**Tooling**

| Layer | Technology |
|-------|------------|
| Testing | Vitest |
| Linting | ESLint v9+ flat config — `@eslint/js` recommended + `eslint-plugin-vue` (vue3-recommended) + `eslint-plugin-n` (Node.js) + `eslint-plugin-import` |
| Formatting | Prettier + `eslint-config-prettier` |

---

## 3. Game Domain Knowledge

### What kind of game is this?

- **Turn-based hex-and-counter wargame** — two players, Union vs. Confederate
- Players alternate activating units by brigade or order group
- The map is a hex grid with terrain affecting movement and combat
- Units have statistics: strength, morale class, fire/melee ratings, leader attachment
- Victory is determined by VP hexes held at scenario end

### Planned JSON data models (not yet built)

| Model ID | Contents |
|----------|----------|
| SM_SCENARIO_DATA | At-start positions, orders, reinforcement schedule, VP hexes, ammo reserves |
| GS_OOB | Order of Battle — all units with LoB stats, morale state, full hierarchy (army > corps > division > brigade > regiment) |
| GS_LEADERS | Leader data — ratings, command/morale values, special rule flags |
| GS_TURN | Game state — active orders, fluke stoppage, artillery depletion, VP totals, random event log |

### Rules engine scope

The server-side rules engine must process and validate:

- **Movement** — hex-by-hex movement point deduction, terrain costs, ZOC rules, stacking limits
- **Fire combat** — range, line of sight, terrain modifiers, fire table lookup, result application
- **Close combat** — melee resolution, retreat, rout, pursuit
- **Morale** — morale checks triggered by losses, rout propagation up the hierarchy
- **Orders and command** — unit activation based on current orders; initiative rolls
- **Artillery** — ammunition tracking, depletion, replenishment rules
- **Victory points** — hex control tracking, end-of-scenario VP calculation

### South Mountain rule overrides (override base LoB v2.0)

These SM-specific rules must be encoded in the engine:

1. Trees add **+1** (not +3) to LOS height
2. All army commanders rated **Normal**
3. **No breastworks** allowed
4. **Longstreet** acts as army commander — no initiative required
5. At-start "Complex defense" orders replaced by **Move orders**
6. **Pelham and Pleasonton** artillery replenish from any friendly ammo reserve
7. **Ignore LoB rules 4.2 and 4.3** — use SM game-specific versions instead
8. Use **SM Terrain Effects on Movement chart** (not standard LoB chart)
9. Use **RSS Trail movement costs**
10. **SM Special Slope rule (1.1)**: 50ft contour interval; vertical slopes impassable

### Canonical errata (corrections already applied to source data)

- Chicago Dragoons → unit designation **2/K/9** (not 1/K/9)
- E/2 US Artillery → rated **HvR** (not R)
- 28 Ohio Regimental Loss Chart → **15 boxes** (not 14)
- 5th Va Cavalry Brigade Loss Chart morale → **C** (not B)

---

## 4. Sections to Generate in the HLD

Produce a complete HLD document structured with the following twelve sections. Be concrete — include example code, JSON shapes, ASCII diagrams, and file trees where they add clarity.

---

### Section 1 — System Architecture Diagram

Provide a text/ASCII diagram showing how the major components relate:
- Vue 3 browser client — game UI + SVG hex map
- Express.js server (DigitalOcean Droplet)
- Auth layer (Discord OAuth2 → JWT in httpOnly cookies)
- Zod validation middleware
- Rules engine (internal module)
- SQLite (user accounts + game index)
- DigitalOcean Spaces (game state JSON files)
- Real-time channel (whatever you recommend)

Show both the async PBEM flow and the real-time flow.

---

### Section 2 — Phased Development Plan

Define three phases. Phase 1 is the full MVP — it ships a complete playable application, not an API skeleton.

- **Phase 1 (MVP)**: Discord OAuth login + REST API + Vue 3 frontend + SVG hex map + DigitalOcean Spaces + SQLite. Two players can log in with Discord, create a game, and play a full South Mountain scenario in both async and real-time modes.
- **Phase 2**: Enhanced experience — replay viewer, improved map UX, Discord bot DMs (private per-player notifications replacing the shared webhook), better error feedback.
- **Phase 3**: Additional scenarios, spectator mode, AI opponent (stretch goals).

For each phase: what is built, what is explicitly deferred, and what the acceptance criteria are.

---

### Section 3 — Backend Architecture

Detail the Express.js server structure:
- Route hierarchy (propose URL conventions)
- Middleware chain (session, validation, game-state loading, etc.)
- Internal module boundaries — how the rules engine is separated from HTTP concerns
- Game session model — how a "game" is represented in memory while active

Include a proposed file/module structure for the `server/` directory.

---

### Section 4 — Data Persistence Strategy

The persistence layer must:
- Allow async (PBEM) games to survive indefinitely between sessions
- Store full game state snapshots after each action
- Support action history / replay
- Support user accounts (auth)
- Be lightweight enough for a small-scale hobby project

**Decided: DigitalOcean Spaces + SQLite.**

- **DigitalOcean Spaces** (S3-compatible) stores game state as JSON files. Use `@aws-sdk/client-s3` v3 with a custom `endpoint` URL pointing to the DO Spaces region (e.g., `https://nyc3.digitaloceanspaces.com`). Proposed key layout: `games/{gameId}/state.json`, `games/{gameId}/history/{seq}.json`.
- **SQLite** (via `better-sqlite3`) stores user records (`discord_id`, `username`, `avatar_url`) and the game index (which games exist, which players are in them, whose turn it is). No passwords — identity is fully delegated to Discord. This supports queries that object storage cannot answer efficiently.

Design the two layers as clearly separated modules so either could be swapped independently. Provide the proposed Spaces key layout and the SQLite schema (tables + columns). Address how concurrent writes to a game's Spaces object are handled (optimistic locking? last-write-wins? turn-based serialization?).

---

### Section 5 — Multiplayer Coordination Model

The system must support two modes:

**Async mode (PBEM-style)**:
- Player A submits an action; server validates and advances state; POSTs a Discord webhook notification to the game's configured webhook URL (if set)
- Player B connects later and sees updated state; submits their action
- The webhook URL is optional — games without one still work, players just check the app manually
- Describe the turn-submission flow, state transitions, and how "whose turn is it" is tracked
- Show the Discord webhook POST payload and where the webhook URL is stored (SQLite game record)

**Real-time mode**:
- Both players online simultaneously; actions reflected to the opponent immediately
- **Evaluate and recommend:** Socket.io, SSE (Server-Sent Events), or polling
- Describe the event model: what events are emitted, what payload each carries

---

### Section 6 — Game State Lifecycle

Define the states a game passes through from creation to completion:

```
new → setup → in_progress → [suspended] → complete
```

For each state:
- What data is required / initialized
- What transitions are valid
- What API actions trigger each transition

Also describe how the turn sequence within `in_progress` maps to the LoB turn structure (initiative, activation, combat, morale, end-of-turn).

---

### Section 7 — Rules Engine Design

The rules engine is the core of the project. Design its internal architecture:

- **Module boundaries**: movement validator, combat resolver, morale checker, order manager, VP tracker, scenario loader
- **Action processing pipeline**: how an incoming player action flows through validation → state mutation → result → event emission
- **Immutability / snapshot approach**: should the engine mutate game state in place or produce new state objects?
- **Error model**: how invalid actions are rejected with meaningful error codes
- **SM override integration**: how game-specific rule overrides (listed above) are encoded without hardcoding them throughout the engine

---

### Section 8 — API Contract (v1 JSON API)

Define the REST API surface for Phase 1. Include:

- Base URL conventions and versioning strategy
- Auth endpoints — Discord OAuth2 flow, JWT returned in `httpOnly` cookie:
  - `GET /auth/discord` — redirect to Discord authorization page
  - `GET /auth/discord/callback` — OAuth callback; creates/finds SQLite user record by `discord_id`; issues JWT cookie
  - `POST /auth/logout` — clear JWT cookie
  - No registration endpoint — first login creates the account automatically
- Game endpoints:
  - `POST /games` — create a new game (accepts optional `discordWebhookUrl`)
  - `GET /games/:id` — get current game state
  - `POST /games/:id/actions` — submit a player action
  - `GET /games/:id/history` — action log
- Map data endpoint (describe how map/hex data is served to the frontend)
- Example JSON request and response bodies for each endpoint
- Error response format

---

### Section 9 — Project Directory Structure

Propose the full repository file tree for the completed Phase 1 (MVP) implementation. The repo is an **npm workspaces monorepo** — `server/` and `client/` are workspace packages with their own `package.json` files; tooling config (ESLint, Prettier, Vitest) lives at the root.

```
lob-online/
  docs/              ← existing reference library
  server/            ← Express.js workspace package
    package.json
  client/            ← Vue 3 + Vite workspace package
    package.json
  data/              ← scenario and OOB JSON files (shared)
  eslint.config.js   ← root, scoped rules per directory
  .prettierrc
  vitest.config.js   ← root, with separate environments per workspace
  .env.example
  package.json       ← root workspace manifest
```

Expand `server/`, `client/`, and `data/` in detail. Include where Vitest tests live relative to the code they test (co-located `*.test.js` vs. separate `tests/` directory — recommend one and explain why).

---

### Section 10 — Tooling Configuration

Provide concrete starter configuration for:

**ESLint (flat config — `eslint.config.js`)**:
- Use the new flat config format (ESLint v9+)
- Include: `@eslint/js` recommended, `eslint-plugin-vue` vue3-recommended, `eslint-plugin-n` for Node.js server code, `eslint-plugin-import` for import ordering
- `eslint-config-prettier` last to disable conflicting formatting rules
- Show how to scope different rules to `server/` vs `client/` directories

**Prettier (`.prettierrc`)**:
- Propose sensible defaults for this project (semi, singleQuote, printWidth, trailingComma, etc.)

**Vitest (`vitest.config.js`)**:
- Separate configs or environments for server-side (Node) and client-side (jsdom) tests
- Coverage configuration

Show the actual config file content, not just descriptions.

---

### Section 11 — DevOps: CI/CD and Deployment

Design the full DevOps pipeline for deploying to a DigitalOcean Droplet.

**GitHub Actions — CI (runs on every PR):**
- Lint: `eslint .`
- Test: `vitest run --coverage` (both server and client workspaces)
- Build: `vite build` (catch build errors before merge)
- Show the complete `.github/workflows/ci.yml`

**GitHub Actions — CD (runs on merge to `main`):**
- SSH into the Droplet
- Pull latest code (`git pull`)
- Install dependencies (`npm ci`)
- Build Vue client (`npm run build -w client`)
- Restart the Node process via PM2 (`pm2 reload lob-online`)
- Show the complete `.github/workflows/deploy.yml`
- Explain what GitHub secrets are required (`DO_DROPLET_IP`, `DO_SSH_KEY`, etc.)

**Droplet setup — what must be configured once:**
- nginx config: reverse proxy from port 80/443 → Node port 3000; serve the Vue static build
- Let's Encrypt / Certbot for HTTPS
- PM2 ecosystem file (`ecosystem.config.js`) — app name, entry point, env vars, log paths
- How production environment variables are set (not `.env` files — use `pm2 ecosystem` or OS-level env)
- SQLite file location and persistence strategy (path on Droplet disk)

Show:
- The nginx server block config
- The `ecosystem.config.js` for PM2
- The `.github/workflows/ci.yml`
- The `.github/workflows/deploy.yml`

---

### Section 12 — Open Questions and Risks

List the key unresolved questions and technical risks, organized by category:

- **Rules engine complexity**: which rules are hardest to implement correctly?
- **Data modeling**: what is most uncertain about the GS_OOB / GS_TURN schema?
- **Persistence**: any risks in the S3 JSON approach? What happens under concurrent writes?
- **Auth**: what are the failure modes of Discord OAuth2? What happens if Discord is down or the user revokes access?
- **Hex map**: what are the main complexity risks in building the interactive map in v1?
- **Multiplayer**: what edge cases exist in the async/real-time coordination model?
- **DevOps**: what are the risks in the GitHub Actions → Droplet deploy pipeline? What happens during a failed deployment?
- **Scope**: what is most likely to grow beyond initial estimates?
- **Testing**: how will rules correctness be verified?

For each risk, note its severity (low / medium / high) and a mitigation approach.

---

## Notes for the AI Generating the HLD

- The game-specific rule overrides and errata listed in Section 3 are **canonical** — the HLD and any subsequent implementation must treat them as ground truth, not suggestions.
- The source documents (rulebooks, roster, scenario sheets) exist as PDFs in `docs/` but are not included here. The HLD should be designed so that rules engine logic is clearly separated from hard-coded data, making it easy to load scenario data from JSON files derived from those PDFs.
- Prefer pragmatic, right-sized recommendations over enterprise-scale patterns. This is a hobby project with two players, not a SaaS platform.
- The interactive SVG hex map is **in scope for v1**. It is not deferred to a later phase.
- **All tech stack decisions in Section 2 are confirmed and final.** Do not re-litigate them. Design the HLD around them.
- The one remaining open question is real-time sync technology (Socket.io vs. SSE vs. polling) — make a concrete recommendation in Section 5.
- Discord is the identity provider, the notification channel, and the social/chat layer. The app does not need in-app chat — players communicate via Discord. The app is purely the game board.
- There is no user registration flow. A player's first "Login with Discord" creates their account automatically using their Discord identity.
- The tooling section (Section 10) must produce copy-paste-ready config file content, not prose descriptions.
- DigitalOcean Spaces uses the same `@aws-sdk/client-s3` client as AWS S3 — the only difference is the `endpoint` and `region` in the client config. The HLD should show this configuration explicitly.
