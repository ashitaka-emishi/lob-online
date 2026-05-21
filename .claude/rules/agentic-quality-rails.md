# Agentic Quality Rails

Lightweight enforcement rules for Conductor tracks. These apply to all Claude sessions
implementing tracks in this project. The goal is fewer late debt sprints and warning-noise
accumulation without adding heavyweight process.

## Interaction Modes

Every track must declare an Interaction Mode in its plan.md.

### Autonomous (default)

The agent proceeds without human approval at intermediate steps. Use for ordinary
feature/test/docs work where behavior is clear and the affected surface is bounded.

The agent still halts if:

- A task proposes accepting debt scored ≥ 3.
- Behavior is ambiguous and the right answer isn't derivable from the spec.
- A test failure cannot be explained locally.

### Checkpointed

The agent pauses for explicit human approval after preflight/architecture notes and before
accepting any deferred debt. **Required** when a track touches any of the following:

- Auth, authorization, sessions, tokens, permissions, or any route that grants access to
  game state.
- Persistence, migrations, save/load paths, cache invalidation, or data validation schemas.
- Game-state or schema compatibility (state written to disk, session data, wire formats).
- Shared rules-engine logic — movement, LOS, combat, morale, orders, or other domain-critical
  paths.
- Production deployment behavior (PM2 config, environment variables, startup scripts).
- Shared Vue stores, composables, editor orchestration, or API/client contract boundaries.
- A broad multi-file refactor, or more than roughly 300–500 production LOC changed.

When in doubt, use Checkpointed.

## Risk Classes

Every track must declare a Risk Classification in its plan.md.

| Risk   | Definition                                                                 |
| ------ | -------------------------------------------------------------------------- |
| Low    | Documentation, config, test additions, isolated utility changes.           |
| Medium | New UI components, new routes, isolated engine functions, additive schema. |
| High   | Auth/session, persistence, schema migration, rules-engine, broad refactor. |

High-risk tracks automatically require Checkpointed mode. Medium-risk tracks may use
Autonomous mode if the scope is well-bounded and reviewer-approved.

## Warning-Free Completion Policy

**Passing tests with unexpected warning output is not complete.**

Fix warnings when feasible. If a warning is expected prototype noise, document it explicitly:

```
Accepted warning: <npm script or test command>
Category: <Vue warning | unhandled rejection | console.warn | console.error>
Reason: <why this is accepted prototype noise>
Will be removed by: <issue number or track ID>
```

Unexpected warnings that require documentation before a task can be marked complete:

- Vue component warnings (`[Vue warn]: ...`)
- Unhandled promise rejections
- `console.warn` or `console.error` output not emitted by the test assertions themselves

## Immediate Debt-Capture Policy

When a track accepts a deferred finding:

1. File a GitHub issue before closing the task — do not defer filing.
2. Include the debt score (1–5) and a written assessment in the issue.
3. Apply the `tech-debt` label to the issue.
4. Add the finding to the per-PR debt report immediately, not at end-of-session.
5. The debt register must reflect the finding before the PR is merged.

## Required Track Metadata Fields

Every `plan.md` must include the following sections after the **Overview** heading:

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

## Strict Closeout Gates

The following must all pass before a track is marked complete and a PR is opened:

1. `npm run validate-data` — data files conform to their Zod schemas
2. `npm run lint` — zero ESLint errors or warnings
3. `npm run format:check` — all files match Prettier config
4. `npm run test` — full suite green at ≥ 70% line coverage
5. `npm run build` — production build succeeds
6. No unexpected warnings in test output (see Warning-Free Completion Policy above)

`npm run quality:strict` runs gates 1–5 in sequence and is the canonical local closeout command.

## Escalation Rules

| Condition                                | Required Action                               |
| ---------------------------------------- | --------------------------------------------- |
| Track touches a Checkpointed surface     | Switch to Checkpointed mode; pause for review |
| Test failure with no local explanation   | Halt; do not skip or mark passing             |
| Proposed deferred debt score ≥ 3         | Halt; get explicit human approval             |
| Unexpected warnings that cannot be fixed | Document with accepted-noise classification   |
| `quality:strict` fails at closeout       | Fix before opening PR; do not bypass          |
