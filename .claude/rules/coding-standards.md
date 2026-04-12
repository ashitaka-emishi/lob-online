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
- **Rule traceability (core philosophy):** Every game rule implemented in code must have a
  comment citing the exact rule reference — section number, table name, or clause. The goal
  is full traceability: when the game is complete, every LOB v2.0 and SM rule reference should
  appear as a comment at the point of implementation. Multiple code locations may cite the same
  rule. When a rule spans multiple functions, cite it at each one.
  - Format: `// LOB §3.2 — terrain cost for woods in line formation`
  - Format: `// SM §1.1 — Special Slope Rule: 50-ft contour, vertical slopes impassable`
  - Format: `// LOB §5.6 — Combat Table column shifts`
  - This applies to all engine modules, table modules, and any future game logic.
  - When touching existing code that implements a rule but lacks a citation, add the comment
    in the same PR — do not defer it.
