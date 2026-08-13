# Specification: Auth Debt Sprint — Issues #698-700

**Track ID:** auth-debt-sprint_20260813
**Type:** Chore
**Created:** 2026-08-13
**Status:** Draft

## Summary

Close the auth/session debt backlog deferred from PR #701 (M9 Discord OAuth): 13 findings
across three issues (#698 architecture, #699 dependency/validation/UX, #700 test-coverage and
doc-accuracy), score 7 total (3 + 2 + 2).

## Context

PR #701 shipped the Discord OAuth identity layer. Its `/team-review` found 7 High-severity
findings (fixed in that PR) plus 13 lower-severity findings explicitly deferred by user decision
at the time ("fix Highs + security Mediums, defer the rest"). None of the deferred findings are
exploitable or actively broken as shipped — they are architectural debt, coverage gaps, and one
missing UI control. This track closes them out per the project's Immediate Debt-Capture Policy,
which expects deferred debt to be revisited, not left open indefinitely.

## Findings In Scope

**#698 — Auth architecture debt (score 3):**

1. `regenerateSession()` in `games.js` double-regenerates the session — `req.login()` internally
   re-calls `req.session.regenerate()` (passport 0.7's `SessionManager.logIn`). Verified safe,
   but an extra store round-trip per request, relying on undocumented passport-internal behavior.
2. `configurePassport()` (`discord.js`) is not idempotent — `serializeUser`/`deserializeUser`
   push onto module-global arrays rather than replacing. Multiple calls per process accumulate
   stale deserializers bound to closed DB handles.
3. Auth module duplicates `users` table SQL instead of using the store abstraction —
   `discord.js`'s inline `upsertUser`/`getUser` are byte-identical to `gameSqlite.js`'s versions,
   which have zero production callers as a result.
4. SQLite migration is an if/else ladder with no forward-version guard
   (`store/gameSqlite.js`) — v0→v1→v2 logic is nested conditionals in one transaction; no
   `if (version > CURRENT_USER_VERSION) throw` guard, so an older binary opened against a newer
   DB proceeds silently.
5. `requireSide`'s response-code semantics are stale post-`requireAuth` — its own "no session"
   case is now reachable only when authenticated but side-less, arguably 403 not 401. Explicitly
   left undecided in #698 pending "more thought," since it affects client re-login-flow behavior.

**#699 — Dependency risk, boundary validation, missing logout UI (score 2):**

6. ~~`passport-discord@0.1.4` is deprecated upstream with no in-repo risk acknowledgment.~~
   **Already resolved** — `discord.js`'s header comment (added in PR #701 itself, after this
   issue was filed but before it was updated) already documents the deprecation, the shim
   rationale, and the migration path. Dropped from this track's scope; confirmed in Phase 1.
7. No Zod schema validates the Discord OAuth profile or the `/auth/me` response — a malformed
   profile surfaces as a raw SQLite error, not a typed auth failure.
8. `useAuthStore.logout()` is implemented and tested but unreachable from the UI — no logout
   control in `HomeView.vue` or `LobbyView.vue`.

**#700 — Test-coverage and doc-accuracy follow-ups (score 2):**

9. No direct route-level test for `GET /auth/discord` / `GET /auth/discord/callback`'s
   `passport.authenticate('discord')` dispatch and `failureRedirect` path.
10. Three narrow SQLite migration test gaps (`gameSqlite.test.js`): v0-upgrade test inserts its
    row after migrating (doesn't prove data preservation for that path); neither v0 nor v1 case
    asserts `side_b_user_id` survives migration; no test opens an already-migrated file DB with a
    fresh connection.
11. `useAuthStore`'s `loading` ref is untested.
12. `req.user?.id` optional-chaining inconsistency in `games.js` — create/join use `?? null`,
    list route uses bare access, despite `requireAuth` guaranteeing `req.user` truthy at all three.
13. `GameView` route has no `meta: { requiresAuth: true }` guard (server already 401s correctly;
    client-side UX polish gap only).

## Acceptance Criteria

- [ ] All 13 findings addressed: fixed in place, or explicitly re-deferred with updated reasoning
      if investigation reveals a fix is riskier than the original finding implied
- [ ] Finding 5 (`requireSide` status code) resolved with an explicit decision (change or
      confirm-as-is), not left ambiguous
- [ ] Finding 8 (logout UI) ships a real, reachable control — not just wiring
- [ ] No new debt introduced (project rule: debt-cleanup PRs must not generate new deferred debt)
- [ ] Full quality suite green; no unexpected warnings
- [ ] `/team-review` run given the High-risk classification (auth/session surface); a targeted
      second-pass review runs if the review-fix diff itself touches auth/session/persistence

## Dependencies

None — PR #701 (source of all three issues) is already merged.

## Out of Scope

- The logout UI's visual design beyond a functional control (icon/placement polish can be a
  follow-up if the reviewer flags it)
- Any change to the Discord OAuth `state`/CSRF handling (already fixed in PR #701)
- Migrating off `passport-discord` entirely (finding 6 is a documented-risk acceptance, not a
  dependency swap)

## Technical Notes

High risk per `.claude/rules/agentic-quality-rails.md` — touches auth, sessions, persistence,
migrations, and API/client contract boundaries (multiple Checkpointed triggers). Checkpointed
mode: human confirmation sought on finding 5's status-code decision before implementing, and
before the migration-ladder guard's exact failure behavior (finding 4) is finalized.

---

_Generated by Conductor. Review and edit as needed._
