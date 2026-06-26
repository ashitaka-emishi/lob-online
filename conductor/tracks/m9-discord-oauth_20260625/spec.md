# Spec: M9 Discord OAuth — Identity Layer

**Track ID:** m9-discord-oauth_20260625
**Issues:** #668, #410

## Goal

Add real player identity via Discord OAuth2. Players log in with Discord before creating or
joining games. Their Discord userId is stored in SQLite and linked to their sideToken on join.

## Background

The current auth model is sideToken-only — anyone with the URL and token can join. M8 hardened
the token-to-faction binding but there is still no user identity. Discord OAuth gives each player
a stable userId, display name, and avatar that can be shown in the lobby and game view.

## Deliverables

- `passport-discord` strategy wired on server with `passport` + `express-session` (or JWT cookie)
- `/auth/discord` → redirect to Discord, `/auth/discord/callback` → issue session/cookie
- `/auth/logout` → clear session
- `/auth/me` → return `{ id, username, avatar }` from session
- `users` table in SQLite: `id TEXT PRIMARY KEY, username TEXT, avatar TEXT, created_at INTEGER`
- On game join: `game.side_a_user_id` / `game.side_b_user_id` columns updated in SQLite
- Client: login button on `HomeView`; guard Lobby behind auth (`/lobby` redirects to login if
  no session); display Discord username in `LobbyView` header
- `GET /api/v1/games` filters to games where `side_a_user_id = me` or `side_b_user_id = me`

## Acceptance Criteria

- Unauthenticated user cannot reach `/lobby` — redirected to login
- After OAuth callback, `GET /auth/me` returns Discord user fields
- Creating a game sets `side_a_user_id` in the DB
- Joining a game sets `side_b_user_id` in the DB
- `npm run quality:strict` passes
