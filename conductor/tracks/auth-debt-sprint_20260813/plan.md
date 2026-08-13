# Implementation Plan: Auth Debt Sprint — Issues #698-700

**Track ID:** auth-debt-sprint_20260813
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-13
**Status:** [ ] In Progress

## Overview

Six phases: a pre-implementation investigation (already completed — confirmed each finding is
still live against current code, and resolved the one genuinely ambiguous item, the `requireSide`
status code, with the user before touching anything), the #698 architecture fixes, the #699
dependency/validation/UX fixes, the #700 test-coverage and doc-accuracy fixes, a full
`/team-review` pass, and closeout.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Confirmed with the user before implementation whether `requireSide`'s
"no game-side session" branch should change from 401 to 403 (finding #698-5) — verified via a
client-code audit first that no client logic depends on the current 401, then asked; user chose 403. The SQL-duplication fix's exact approach (shared `createUserQueries(db)` factory vs. routing
`discord.js` through the store singleton) was resolved by investigation, not user input, since one
option preserves the existing test DI pattern and the other would require rewriting 9+ existing
`configurePassport(db)` test call sites for no behavioral gain — not a judgment call.

## Risk Classification

**Risk:** High
**Reason:** Auth, sessions, persistence, migrations, and API/client contract boundaries — every
Checkpointed trigger in `.claude/rules/agentic-quality-rails.md` except rules-engine logic.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated (#698, #699, #700 closed)
- [ ] Ready for `/team-review`

---

## Phase 1: Pre-Implementation Investigation (Complete)

### Tasks

- [x] Task 1.1: Re-verify each of the 13 findings against current code (not just the issue text,
      which is 6 weeks stale relative to PR #705's intervening changes) — confirmed 12 of 13 are
      still live; finding #699-1 (dependency-risk header comment) was discovered to already be
      present in `discord.js` as merged in PR #701, so it's dropped from this track's scope.
- [x] Task 1.2: Trace `req.login()`'s internal behavior in `node_modules/passport/lib/
sessionmanager.js` to confirm finding #698-1's premise (it unconditionally calls
      `req.session.regenerate()` a second time, no option to suppress) and that `req.user` is
      always truthy at all 4 `regenerateSession()` call sites (guaranteed by the router-level
      `requireAuth` mount in `server.js`), making the explicit pre-regenerate + the function's
      `if (!user)` branch both provably redundant.
- [x] Task 1.3: Trace `configurePassport`/`initDb` startup ordering in `server.js` (initDb() at
      line 81, configurePassport(getDb()) at line 99) to confirm the store singleton is always
      initialized before `discord.js` needs it, then evaluate two de-duplication approaches for
      finding #698-3 and choose the one that doesn't require rewriting existing DI-based tests.
- [x] Task 1.4: Audit `client/src/` for any 401-vs-403 branching logic on game routes (via
      `Explore` agent) before proposing the status-code change in finding #698-5 — confirmed none
      exists; both codes are treated as generic failures by `useGameStore.js`.
- [x] Task 1.5: Present the `requireSide` status-code question to the user via `AskUserQuestion`
      with the client-audit finding as context. User chose: change to 403.

---

## Phase 2: #698 — Auth Architecture Debt (score 3)

### Tasks

- [x] Task 2.1: Simplify `regenerateSession()` in `games.js` — since `req.user` is always
      non-null at every call site (requireAuth guarantee), drop the explicit
      `req.session.regenerate()` + conditional `req.login()` and call `req.login(req.user, cb)`
      directly, relying on its internal regenerate for the session-fixation defense. Removes one
      SQLite session-store round-trip per create/join.
- [x] Task 2.2: Make `configurePassport()` idempotent — passport's own `serializeUser`/
      `deserializeUser` accumulate handlers across calls (`passport.js` internals push onto an
      array); guard so a second call replaces rather than appends. Add a regression test calling
      `configurePassport` twice and asserting only one deserializer fires (or an equivalent
      call-count assertion).
- [x] Task 2.3: Extract `createUserQueries(db)` in `gameSqlite.js` — a small factory returning
      `{ upsertUser, getUser }` bound to prepared statements on the given `db` handle. Have
      `createStore(db)` use it internally for the `users`-table statements (replacing its inline
      duplicates) and have `discord.js`'s `configurePassport(db)` call it directly instead of its
      own inline `db.prepare(...)` pair. Preserves `configurePassport(db)`'s existing signature —
      no test call-site rewrites needed.
- [x] Task 2.4: Add a forward-version guard to `migrate()` in `gameSqlite.js` —
      `if (version > CURRENT_USER_VERSION) throw new Error(...)` before the `if (version < 2)`
      branch, so an older binary opened against a newer DB fails loudly instead of silently
      proceeding against a schema it doesn't understand.
- [x] Task 2.5: Change `requireSide.js`'s `if (!player)` branch from 401 to 403 (user-approved
      finding #698-5) and update the file's own response-code-matrix docstring to match. Update
      the existing regression test asserting 401 for this branch. Found and updated 6 more
      call-site tests in `games.test.js` exercising the same branch that weren't anticipated
      when this task was scoped.

### Verification

- [x] `games.test.js`, `discord.test.js`, `gameSqlite.test.js`, `requireSide.test.js` (or
      equivalent) all pass with updated/new assertions
- [x] Mutation-verify: the idempotency test fails if the fix is reverted; the migration guard
      test fails if the `throw` is removed; the status-code test fails if reverted to 401
      (8 tests across 2 files caught it). Also mutation-verified `regenerateSession()` itself
      against a full no-op, which surfaced a real coverage gap in
      `games.auth-integration.test.js` (fixed — see below).
- [x] `games.auth-integration.test.js` (real passport + session) still passes unmodified —
      confirms the `regenerateSession()` simplification preserves the login-after-regenerate
      behavior it exists to protect
- [x] Correction: mutation-testing `regenerateSession()` reduced to a full no-op revealed that
      no existing test (mocked or real-integration) would have caught it — every "stays logged
      in" assertion trivially holds if the session is never touched. Added a new test to
      `games.auth-integration.test.js` asserting the session ID (connect.sid cookie) actually
      changes across create, independent of identity persistence; mutation-verified.
- [x] Correction: `server.startup.test.js`'s `gameSqlite.js` mock didn't include the new
      `createUserQueries` export, which `configurePassport()` (called at real server startup)
      now depends on — caught by the full-suite run, not anticipated when this task was scoped.
      Added to the mock.

---

## Phase 3: #699 — Dependency Risk, Boundary Validation, Logout UI (score 2)

### Tasks

- [ ] Task 3.1: (Dropped — already resolved in PR #701, confirmed in Phase 1.)
- [ ] Task 3.2: Add a Zod schema (`server/src/schemas/discordProfile.schema.js` or inline in
      `discord.js`, matching project convention of schemas living in `server/src/schemas/`)
      validating the Discord profile shape (`id: string`, `username: string`,
      `avatar: string | null`) before it reaches `upsertUser`. On validation failure, `done()`
      with a typed auth error rather than letting a malformed profile hit SQLite raw.
- [ ] Task 3.3: Add a logout control to `HomeView.vue`, next to the existing `.user-info` span
      (visible only when `authStore.isLoggedIn`), calling `authStore.logout()` and clearing the
      session. Style to match the existing `.menu-btn` family.

### Verification

- [ ] New Zod schema has its own test file (valid profile, missing field, wrong type) per
      project convention (co-located `*.schema.test.js`)
- [ ] `discord.test.js` gets a case exercising the invalid-profile path through the strategy
      verify callback
- [ ] `HomeView.test.js` (or equivalent) gets a test clicking the new logout control and
      asserting `authStore.logout` is called and the UI reverts to the logged-out state
- [ ] Mutation-verify the new tests against their target behavior

---

## Phase 4: #700 — Test-Coverage and Doc-Accuracy Follow-Ups (score 2)

### Tasks

- [ ] Task 4.1: Add direct route-level tests for `GET /auth/discord` (redirects into the
      `passport.authenticate('discord')` flow) and `GET /auth/discord/callback`'s
      `failureRedirect: '/?error=auth'` path in `auth.test.js` (new or existing file).
- [ ] Task 4.2: Fix the three SQLite migration test gaps in `gameSqlite.test.js`: change the
      pre-v1 (`db4`) test to insert its row via raw SQL _before_ calling `createStore`, matching
      the v1 (`db5`) test's already-correct pattern; add a `side_b_user_id` assertion to both the
      v0 and v1 migration tests; add a new test that migrates a _file-based_ (not `:memory:`) DB,
      closes the connection, reopens with a fresh `Database` instance, and confirms the schema
      and data survived.
- [ ] Task 4.3: Add a `useAuthStore.test.js` case asserting `store.loading` is `true` while
      `fetchMe()`'s fetch promise is pending and `false` after it resolves (using a
      controllable/deferred mock rather than an immediately-resolved one).
- [ ] Task 4.4: Normalize `req.user?.id` to `req.user.id` at the three inconsistent call sites in
      `games.js` (lines ~111, ~180, ~198), matching the two already-bare call sites — `requireAuth`
      guarantees `req.user` truthy for every route in this router.
- [ ] Task 4.5: Add `meta: { requiresAuth: true }` to the `GameView` route in
      `client/src/router/index.js`, matching the lobby route's existing guard.

### Verification

- [ ] All new/modified tests pass; migration test file's mutation-sensitivity confirmed by
      reverting Task 4.2's insert-order fix and observing the test still incorrectly passes
      pre-fix (proving the gap was real), then confirming it's fixed post-change
- [ ] A router test (new or existing) confirms an unauthenticated visit to a game URL redirects
      to `/`, matching the lobby route's existing coverage
- [ ] `npm run lint` clean after the `?.` → `.` normalization (no new unused-optional-chaining
      warnings)

---

## Phase 5: Full Review

### Tasks

- [ ] Task 5.1: Run full quality suite (`validate-data`, `lint`, `format:check`, `test`, `build`).
- [ ] Task 5.2: Run `/team-review` — security, architecture, testing, maintainability given the
      High-risk auth/session/persistence surface (domain-expert not needed; no rules-engine logic
      touched).
- [ ] Task 5.3: Fix all findings in place per the project's no-new-debt-on-debt-cleanup rule; run
      a targeted second-pass review if the review-fix diff itself touches auth/session/
      persistence/migrations (same trigger class that caught the LIMBER bug in PR #705).

### Verification

- [ ] All review findings resolved (fixed in place, or re-deferred with updated reasoning and a
      fresh issue if a finding turns out to be a legitimately separate, larger piece of work)

---

## Phase 6: Closeout

### Tasks

- [ ] Task 6.1: Close #698, #699, #700 with summary comments.
- [ ] Task 6.2: Reconcile `spec.md`, `plan.md`, `metadata.json`, `index.md` with actual delivered
      state before opening the PR (checked proactively this time, given the recurring drift class
      this project has hit on the last two tracks).
- [ ] Task 6.3: Run `/pr-create`.
- [ ] Task 6.4: Run `/tech-debt-report` against the real PR number.

### Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] All three issues closed
- [ ] Debt register reflects -7 in score (3 items closed: #698 score 3, #699 score 2, #700
      score 2), net delta depends on whether review surfaces any pre-approved new debt
- [ ] Full quality suite green
- [ ] `/team-review` complete, all findings fixed in place

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
