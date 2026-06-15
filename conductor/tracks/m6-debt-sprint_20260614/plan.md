# Implementation Plan: M6 Debt Sprint

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals.

## Risk Classification

**Risk:** Low–Medium
**Reason:** #583 touches the shared game store; all others are isolated. No schema changes.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

---

## Phase 1 — One-liner fixes (#584, #560, #583)

### Task 1.1 — Add `<main>` landmark to MenuLayout (#584)

In `client/src/layouts/MenuLayout.vue`, change the outermost `<div>` to `<main
id="main-content">` (or wrap the `<slot />` in `<main id="main-content">`). Confirm
`HomeView` and `AboutView` now have a `<main>` landmark in browser DevTools.

### Task 1.2 — Filter ROLL_INITIATIVE to friendly units (#560)

In `server/src/engine/phase.js`, find the `ROLL_INITIATIVE` handler. Filter the candidate
unit list to `unit.side === action.playerSide` before building roll list. Add
`// LOB §10.3 — initiative candidates limited to active side's units`.

### Task 1.3 — Move scenario fetch into useGameStore (#583)

In `client/src/stores/useGameStore.js`, add a `scenarioData` ref. In `loadGame()`, after
loading map config, also fetch `scenario.json` from the module API and store in
`scenarioData`. Export as a computed or raw ref.

In `client/src/views/GameView.vue`, remove the inline `onMounted` scenario fetch. Read
`gameStore.scenarioData` instead. Pass to `TurnControl` as before.

Add a test asserting that `loadGame()` populates `scenarioData`.

---

## Phase 2 — OOB Editor bug fixes (#506)

### Task 2.1 — Fix back-counter slot for Supply/HQ nodes

In `client/src/components/CounterImageWidget.vue` (or its parent), ensure the back-counter
slot renders regardless of `mode`. Remove or relax the `mode === 'leader'` gate if present.

### Task 2.2 — Fix AotP HQ counter path

Locate the hardcoded path for the Army of the Potomac HQ counter. Correct it to match the
actual file path under `client/public/counters/`.

### Task 2.3 — Remove Walker phantom entry

Locate where the phantom Walker unit appears in the OOB tree rendering. Confirm it does not
exist in `oob.json` and remove the erroneous rendering logic that creates it.

### Task 2.4 — Display specialRules in unit detail panel

In the OOB editor unit detail panel component, add a display section for `specialRules`
(same pattern as other optional fields). Confirm it renders for units that have it.

---

## Phase 3 — Security middleware (#403, #350) + debt register sync

### Task 3.1 — Add Helmet CSP headers (#403)

In `server/src/server.js`, confirm `helmet` is in `package.json` dependencies (install if
not). Add `app.use(helmet())` before other middleware. For development, configure CSP to
allow `localhost:5173` as a connect-src. Add comment `// Security: CSP headers (#403)`.

Verify via `curl -I http://localhost:3000/api/v1/games` that `Content-Security-Policy`
appears in response headers.

### Task 3.2 — Add rate limiting on game routes (#350)

Install `express-rate-limit` if not present (`npm install express-rate-limit`). In
`server/src/routes/games.js`, create a limiter:

```js
import rateLimit from 'express-rate-limit';
const gameLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
```

Apply to `router.post('/', gameLimiter, ...)` (create game) and
`router.post('/:id/join', gameLimiter, ...)` (join game). Add comment
`// Security: rate limit game create/join (#350)`.

### Task 3.3 — Sync debt register

In `docs/tech-debt/report.md`:

1. Add a new Debt Over Time row for PR #582 (`m6-combat-engine_20260614`), adding
   #571 (4), #572 (4), #573 (2), #574 (5), #575 (5), #576 (4), #577 (4), #578 (3),
   #579 (3), #580 (3), #581 (2) = 39 gross debt added.
2. Assign milestone M6 to issues #571–#581 via GitHub API.
3. Update the Executive Summary net open score to reflect actual state after all five
   tracks merge (target: #562 score 4 + #563 score 3 = 7).
4. Update "Last updated" line.

### Task 3.4 — Run `npm run quality:strict` and fix any issues
