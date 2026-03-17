# JavaScript Style Guide: lob-online

Enforced via ESLint 9 flat config + Prettier. Run `npm run lint` and `npm run format` to check/fix.

## Formatting (Prettier)

- Print width: 100 characters
- Indent: 2 spaces
- Quotes: single
- Semicolons: yes
- Trailing commas: ES5
- Line endings: LF

## Modules

- ES modules (`import`/`export`) throughout — no `require()`
- Exception: `ecosystem.config.cjs` (PM2)
- Import order: builtin → external → internal, with a blank line between groups

## Naming

- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` for module-level config constants
- Vue component files: `PascalCase.vue`
- Test files: `featureName.test.js` co-located with source

## Unused Variables

Prefix with `_` to suppress ESLint warnings: `_unusedParam`

## Logging (Server)

Use structured console prefixes: `[server]`, `[route]`, `[socket]`, etc.
`console.log` is permitted in server code.

## Vue 3 (Client)

- `<script setup>` Composition API only — no Options API, no Vuex
- Pinia for state management
- Vue Router for navigation
- Scoped CSS in SFCs

## Testing

- Vitest for unit/integration tests
- Server tests: Node environment
- Client tests: jsdom environment
- 70% line coverage threshold (CI-enforced)
- Co-locate test files as `feature.test.js` next to source

## Data Validation

- Zod schemas in `server/src/schemas/` validate all JSON data files at load time
- No TypeScript — Zod is the type-safety strategy
