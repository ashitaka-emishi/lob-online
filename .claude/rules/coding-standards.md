# Coding Standards

- **Runtime:** Node.js 20; ES modules (`"type": "module"`) throughout — the only CommonJS file
  is `ecosystem.config.cjs` (PM2 requires it)
- **Formatting:** Prettier enforced — 100-char print width, 2-space indent, single quotes,
  semicolons, trailing commas (ES5), LF line endings. Run `npm run format` to auto-fix.
- **Linting:** ESLint 9 flat config. Node plugin for `server/`, Vue plugin for `client/`.
  Prefix unused variables with `_` to suppress warnings. Import order:
  builtin → external → internal (blank line between groups).
- **Server:** Express, plain JavaScript (no TypeScript). Structured console prefixes:
  `[server]`, `[route]`, `[socket]`, etc. `console.log` is permitted in server code.
- **Client:** Vue 3 with `<script setup>` Composition API only — no Options API, no Vuex.
  Pinia for state management. Vue Router for navigation. Scoped CSS in SFCs.
- **Testing:** Vitest. Server tests run in the Node environment; client tests in jsdom.
  Co-locate test files as `feature.test.js` next to source. 70% line coverage threshold
  (enforced in CI). Run `npm run test:coverage` to check locally.
- **Data validation:** Zod schemas in `server/src/schemas/` validate all JSON data files at
  load time. No TypeScript — runtime validation is the type safety strategy.
- **CI gates:** `npm run lint`, `npm run format:check`, and `npm run test` must all pass before
  merge. The `/dev-build` skill runs these three checks locally in order.
- **Tech-debt fixes must not generate new debt:** A PR that closes debt items must not introduce
  new deferred findings. If a review surfaces new issues during a debt-cleanup PR, fix them
  in-place before merging — do not file them as follow-up issues. The debt register should only
  ever decrease after a debt sprint.
