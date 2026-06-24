# Implementation Plan: M8 Debt Quick-Wins Sprint

**Track ID:** m8-debt-quickwins_20260623
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-23
**Status:** [ ] Not Started

## Overview

Ten score-1/2 debt items closed in a single PR. All fixes are additive or doc-only; no DB,
schema, or auth surface changes. Autonomous mode is safe — nothing here can cause cascading
failures. Group into four logical phases: env/doc fixes, docker polish, discord-sink refactor,
and code quality (JSDoc + tests).

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None — all changes are additive config, docs, and tests

## Risk Classification

**Risk:** Low
**Reason:** No app logic changed; only env docs, docker-compose, a dev-only script, and JSDoc/tests.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0.

## Completion Contract

- [ ] All 10 issues resolved (closes #641 #642 #643 #644 #645 #646 #654 #655 #656 #657)
- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes
- [ ] Ready for `/team-review`

---

## Phase 1: Env Var Documentation

Fix `.env.example` gaps and the `DO_SPACES_*` → `SPACES_*` migration note.

### Tasks

- [ ] Task 1.1: Add `SPACES_REGION=us-east-1` to `.env.example` after the existing `SPACES_*`
      block with comment: "Required by the AWS SDK v3 S3 client even for MinIO (use us-east-1)"
      — closes #641
- [ ] Task 1.2: Add migration note to `.env.example` top comment block (or a dedicated
      `# Migration` section): "If upgrading from before PR #639, rename DO_SPACES_KEY →
      SPACES_KEY, DO_SPACES_SECRET → SPACES_SECRET, DO_SPACES_BUCKET → SPACES_BUCKET,
      DO_SPACES_ENDPOINT → SPACES_ENDPOINT; DO_SPACES_REGION is now SPACES_REGION" — closes #646
- [ ] Task 1.3: Update `DISCORD_WEBHOOK_TEST_URL` comment in `.env.example` to warn of
      staging SSRF risk: note that `notifyWebhook` honors this var when `NODE_ENV !== 'production'`,
      so a staging deploy with this var set will POST to the override URL bypassing the allowlist
      — closes #654

### Verification

- [ ] `.env.example` diff reviewed; no variable values changed, only additions/comments

---

## Phase 2: Rename DISCORD_WEBHOOK_TEST_URL → DISCORD_WEBHOOK_URL

Rename the env var everywhere it is used. This is a breaking change for existing `.env` files
so the rename must be atomic across all references.

### Tasks

- [ ] Task 2.1: Search for all occurrences: `grep -rn "DISCORD_WEBHOOK_TEST_URL" .` — confirm
      the full hit list before changing anything
- [ ] Task 2.2: Rename in `server/src/notifications/discord.js` — update the `process.env`
      read from `DISCORD_WEBHOOK_TEST_URL` to `DISCORD_WEBHOOK_URL`
- [ ] Task 2.3: Rename in `server/src/notifications/discord.test.js` — update env var set in
      test setup
- [ ] Task 2.4: Rename in `.env.example` — update the variable name and its inline comment;
      keep the staging SSRF warning from Task 1.3
- [ ] Task 2.5: Search and update any references in `CLAUDE.md`, `infra/PROVISIONING.md`,
      `infra/cloud-init.yaml`, or other docs
- [ ] Task 2.6: Verify `npm run discord:sink` still works after rename (the sink URL is set
      in `.env`, not the code — confirm the var name in the npm script comment if any) — closes #643

### Verification

- [ ] `grep -rn "DISCORD_WEBHOOK_TEST_URL" .` returns zero hits (excluding git history)
- [ ] `npm run test` passes with renamed var

---

## Phase 3: Discord Sink Script Refactor

Refactor `scripts/discord-test-server.js` for testability and port configurability.

### Tasks

- [ ] Task 3.1: Restructure `discord-test-server.js` — move route definitions onto a named
      `app` export; guard `app.listen()` behind an ES module main-check:
      `js
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) { app.listen(port, '127.0.0.1', () => { ... }); }
export { app };
`
      — closes #644
- [ ] Task 3.2: Read port from `process.env.DISCORD_SINK_PORT` with fallback to `4040`:
      `js
const port = parseInt(process.env.DISCORD_SINK_PORT ?? '4040', 10);
`
      — closes #645
- [ ] Task 3.3: Verify `npm run discord:sink` still starts correctly (the `isMain` guard
      fires when run via `node scripts/discord-test-server.js`)

### Verification

- [ ] `npm run discord:sink` starts and logs `Listening on http://localhost:4040`
- [ ] Script can be imported in tests without binding the port

---

## Phase 4: Code Quality — JSDoc and Unit Tests

Add `requireSide` JSDoc and direct `isAllowedDiscordWebhook` unit tests.

### Tasks

- [ ] Task 4.1: Extend `requireSide` JSDoc in `server/src/auth/requireSide.js` to document: - `req.game` is set on success to `{ id, status, discord_webhook }` - Which routes can rely on `req.game` being present - That `req.game` is a projection (omits token columns)
      — closes #655
- [x] Task 4.2: Comment already present at `server/src/routes/games.js:254`:
      `// req.game is populated by requireSide — no second DB read needed.`
      — closes #656
- [ ] Task 4.3: Add direct unit tests for `isAllowedDiscordWebhook` in
      `server/src/notifications/discord.test.js`: - Returns true for `https://discord.com/api/webhooks/...` (canonical Discord CDN) - Returns true for `https://discordapp.com/api/webhooks/...` - Returns true for `https://ptb.discord.com/api/webhooks/...` - Returns false for `http://localhost/...` - Returns false for `http://127.0.0.1/...` - Returns false for an arbitrary external URL - Returns false for empty string
      — closes #657

### Verification

- [ ] `npm run test` passes with new assertions
- [ ] No new ESLint warnings

---

## Final Verification

- [ ] All 10 issues closeable: #641 #642 #643 #644 #645 #646 #654 #655 #656 #657
- [ ] `npm run quality:strict` passes
- [ ] `grep -rn "DISCORD_WEBHOOK_TEST_URL" .` returns 0 hits
- [ ] No unexpected warnings in test output
- [ ] Ready for `/team-review`

---

_Generated by Conductor on 2026-06-23._
