# Workflow: lob-online

## Required Track Metadata

Every `plan.md` created by `/conductor:new-track` must include the following sections.
See `.claude/rules/agentic-quality-rails.md` for full definitions.

```markdown
## Interaction Mode

**Mode:** Autonomous | Checkpointed
**Human control points:** <list, or "None beyond phase approvals">

## Risk Classification

**Risk:** Low | Medium | High
**Reason:** <one sentence>

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
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`
```

**Autonomous** is the default for ordinary feature/test/docs work. **Checkpointed** is
required when the track touches auth/session/authorization, persistence/migrations,
game-state/schema compatibility, rules-engine behavior, production deployment behavior,
data validation semantics, or broad multi-file refactors (roughly 300–500+ production LOC).

## TDD Policy

**Strict** — tests are written before or alongside implementation. For new utility functions and Vue components, tests must be created in the same task as the implementation. For schema changes, schema tests are required in the same commit.

## Branching Strategy

**Never commit directly to `master`.** All implementation work must happen on a feature branch:

```bash
git checkout -b feat/{issue-number}-{short-slug}
```

Create the branch at the start of `/conductor:implement`, before writing any code. Open a PR with `/pr-create` when the track is complete.

## Commit Strategy

Conventional Commits format:

```text
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

```text
[ ] Not started → [~] In progress → [x] Complete
```

## SDLC Commands

| Step                | Command                              |
| ------------------- | ------------------------------------ |
| Scope new feature   | `/conductor:new-track`               |
| Implement a track   | `/conductor:implement`               |
| Check status        | `/conductor:status`                  |
| PR code review      | `/team-review`                       |
| Score deferred debt | auto (runs at end of `/team-review`) |
| Create PR           | `/pr-create`                         |
| After-action        | `/plan-wrap`                         |

## Domain Questions

Use the `domain-expert` agent for rules questions, errata, and SM-specific overrides before implementing any game mechanic.

## Dev Environment

- `/dev-start` — launch server (port 3000) and Vite client (port 5173)
- `/dev-stop` — graceful shutdown
- `/dev-build` — format, lint, build
- `/dev-test` — run suite, snapshot results
- Map/scenario editors: `npm run dev:map-editor` (requires `MAP_EDITOR_ENABLED=true` in `.env`)
