# Workflow: lob-online

## TDD Policy

**Strict** — tests are written before or alongside implementation. For new utility functions and Vue components, tests must be created in the same task as the implementation. For schema changes, schema tests are required in the same commit.

## Commit Strategy

Conventional Commits format:

```
<type>(<scope>): <description> (#<issue>)
```

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`
Scope: component or module name (e.g. `hexGeometry`, `CalibrationControls`, `map.schema`)

Example: `feat(hexGeometry): add getEdgeLabels utility (#80)`

## Code Review Requirements

Required for all changes via GitHub PR. Use `/team-review` for quality-gate reviews across multiple dimensions.

## CI Gates

All three must pass before merge:

1. `npm run lint`
2. `npm run format:check`
3. `npm run test` (70% line coverage threshold enforced)

## Verification Checkpoints

Manual verification required after each phase completion. The implementer confirms:

- All phase tasks marked complete
- Phase verification checklist items pass
- CI gates green

## Task Lifecycle

```
[ ] Not started → [~] In progress → [x] Complete
```

## SDLC Commands

| Step                | Command                |
| ------------------- | ---------------------- |
| Scope new feature   | `/conductor:new-track` |
| Implement a track   | `/conductor:implement` |
| Check status        | `/conductor:status`    |
| PR code review      | `/team-review`         |
| Score deferred debt | `/tech-debt-report`    |
| Create PR           | `/pr-create`           |
| After-action        | `/plan-wrap`           |

## Domain Questions

Use the `domain-expert` agent for rules questions, errata, and SM-specific overrides before implementing any game mechanic.

## Dev Environment

- `/dev-start` — launch server (port 3000) and Vite client (port 5173)
- `/dev-stop` — graceful shutdown
- `/dev-build` — format, lint, build
- `/dev-test` — run suite, snapshot results
- Map/scenario editors: `npm run dev:map-editor` (requires `MAP_EDITOR_ENABLED=true` in `.env`)
