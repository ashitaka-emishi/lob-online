# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**lob-online** is an online game implementation of the _Line of Battle v2.0_ wargame system (Multi-Man Publishing). The first game being implemented is _South Mountain_ (RSS #4), chosen because it is a smaller, more tractable battle.

**Current state:** Phase 1 scaffold complete. The tech stack is established (Node.js/Express/Socket.io server, Vue 3/Vite/Pinia client), and the following are all built and tested: five data JSON files with Zod schemas, a fully-featured hex map editor dev tool (accordion-driven tool panels for elevation/terrain/linear-features/wedge editing, click-only tool interactions, bulk terrain/edge clear operations, building unicode icon overlay, cardinal direction labels on north-offset picker, layer toggles, localStorage autosave, versioned server backups, offline fallback, and push/pull sync UX), a scenario editor dev tool (turn structure, lighting schedule, and rules fields with the same push/pull sync pattern), extended `scenario.json` with lighting schedule and rules fields, Vitest test suites for both server and client, ESLint/Prettier config, and a GitHub Actions CI pipeline. Game logic (rules engine, auth, multiplayer) is planned for subsequent phases.

## Reference Library

All source material lives in `docs/reference/`. The library is tracked in two parallel files that must stay in sync:

- `docs/library.md` — human-readable manifest with status indicators (✅ available, ⬜ needed, 🔧 to be built)
- `docs/library.json` — machine-readable catalog (`"available"`, `"missing"`, `"todo"`)

For the full source-document inventory and data-file manifest, see
`docs/agents/domain-expert/design.md` § 2 (Source Library).

### Developer Tools

Three dev-only tools are available (two implemented, one designed), all guarded by `MAP_EDITOR_ENABLED=true` in `.env`.

**Map editor** (`/tools/map-editor`) — digitize `docs/reference/sm-map.jpg` into `map.json` terrain data. Launch with `npm run dev:map-editor`.

**Scenario editor** (`/tools/scenario-editor`) — edit `scenario.json` fields: turn structure, lighting schedule (day/twilight/night by start turn), and rules fields (night visibility cap, fluke stoppage grace period, initiative system, loose cannon, loss recovery, random events). See `docs/designs/scenario-editor-design.md` for the full spec. Launch with `npm run dev:map-editor`.

**OOB editor** (`/tools/oob-editor`) — view and edit the full command hierarchy, unit stats, leader succession, and counter image linkages in `oob.json` and `leaders.json`. See `docs/designs/oob-editor-design.md` for the full spec. Launch with `npm run dev:oob-editor` (not yet implemented).

- **Enable:** set `MAP_EDITOR_ENABLED=true` in `.env`

A `devops` agent and four skills automate the build/run/test cycle. See `docs/agents/devops/design.md` for the full spec.

- `/dev-build` — format, lint, and build the client
- `/dev-start` — launch server (port 3000) and Vite dev client (port 5173), logging to `logs/`
- `/dev-stop` — graceful shutdown with 10 s SIGKILL fallback
- `/dev-test` — run suite, snapshot results to `test-results/`, detect flaky tests, correlate server errors

For rules questions, errata, and SM-specific overrides, use the `domain-expert` agent.
See `docs/agents/domain-expert/design.md` for the full spec.

The **four-phase SDLC lifecycle** is documented in `.claude/rules/sdlc.md`.

@.claude/rules/sdlc.md

Use `/conductor:new-track` to scope a new feature (replaces `/issue-intake` and
`/issue-implement`). Use `/conductor:implement` to execute tasks within a track.
SDLC state and milestones are managed via `/conductor:status` and `/conductor:manage`.

For quality-gate PR reviews, use `/team-review` (replaces `/pr-review`). This launches
parallel reviewers across multiple dimensions via the agent-teams plugin.

Two skills keep project documentation in sync after each implementation:

- `/doc-sync` — updates `CLAUDE.md`, `docs/designs/high-level-design.md`, and `docs/agents/*/design.md`
  to match code changes on the current branch (diff-driven; edits stale facts directly)
- `/ecosystem-docs-generate` — rebuilds the reference files in `docs/claude-ecosystem/`
  from source-of-truth inputs (full rebuild from registry and design docs)

All agent design documents and prompts live in `docs/agents/<name>/`.

AI execution logs for issue implementations are stored in `docs/ailog/YYYY_MM_DD-LOB-{####}.md`
and committed as a permanent audit trail of AI planning and human approvals.

## Coding Standards

@.claude/rules/coding-standards.md

## Plugin Ecosystem

This project uses the [wshobson/agents](https://github.com/wshobson/agents) plugin marketplace
as its **primary** SDLC workflow layer. To install on a new machine:

```
/plugin marketplace add wshobson/agents
/plugin install conductor
/plugin install agent-teams
```

Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.env` (or your shell) to enable agent-teams.

**Primary workflow (wshobson/agents):**

| Task                | Command                                  |
| ------------------- | ---------------------------------------- |
| Scope a new feature | `/conductor:new-track`                   |
| Implement a track   | `/conductor:implement`                   |
| SDLC status         | `/conductor:status`, `/conductor:manage` |
| PR code review      | `/team-review`                           |
| Parallel debugging  | `/team-debug`                            |
| Parallel dev        | `/team-feature`                          |

After resolving review findings from `/team-review`, run `/tech-debt-report` to score any
deferred items and update the technical debt register in `docs/tech-debt/`.

**Lob-specific extensions** (retained; no plugin equivalent):
`domain-expert`, `devops`, `/dev-build`, `/dev-start`, `/dev-stop`, `/dev-test`,
`/pr-create`, `/pr-merge`, `/issue-close`, `/tech-debt-report`,
`/doc-sync`, `/ecosystem-docs-generate`, `/design`, `/plan-wrap`.

See `docs/migration-wshobson-agents.md` for the full old-to-new command mapping.

## Post-Plan Protocol

After any plan is implemented, run `/plan-wrap` to verify lint, formatting, and tests pass; write
a devlog entry; review CLAUDE.md for needed updates; and assess whether high-level-design.md requires
architectural revision. Do not skip this step before ending a working session.

When creating a pull request, run `/pr-create` instead of `gh pr create` directly. The command
writes a diary entry for the PR, runs the build checks, and then opens the PR.

Devlog entries are appended to a per-day file in `docs/devlog/YYYY-MM-DD.md`. Each entry
within the file is a `## HH:MM — Title` section. `docs/devlog.md` is an index only.
