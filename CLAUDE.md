# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**lob-online** is an online game implementation of the _Line of Battle v2.0_ wargame system (Multi-Man Publishing). The first game being implemented is _South Mountain_ (RSS #4), chosen because it is a smaller, more tractable battle.

**Current state:** Phase 1 scaffold complete. The tech stack is established (Node.js/Express/Socket.io server, Vue 3/Vite/Pinia client), and the following are all built and tested: five data JSON files with Zod schemas, a fully-featured hex map editor dev tool (terrain paint, elevation, edge features, slope, wedge elevations, layer toggles, localStorage autosave, versioned server backups, offline fallback, and push/pull sync UX), a scenario editor dev tool (turn structure, lighting schedule, and rules fields with the same push/pull sync pattern), extended `scenario.json` with lighting schedule and rules fields, Vitest test suites for both server and client, ESLint/Prettier config, and a GitHub Actions CI pipeline. Game logic (rules engine, auth, multiplayer) is planned for subsequent phases.

## Reference Library

All source material lives in `docs/`. The library is tracked in two parallel files that must stay in sync:

- `docs/library.md` — human-readable manifest with status indicators (✅ available, ⬜ needed, 🔧 to be built)
- `docs/library.json` — machine-readable catalog (`"available"`, `"missing"`, `"todo"`)

### Available Source Documents

| ID               | File                            | Contents                                                                  |
| ---------------- | ------------------------------- | ------------------------------------------------------------------------- |
| LOB_RULES        | `lob-rules.pdf`                 | Complete 36-page LoB v2.0 series rulebook                                 |
| LOB_CHARTS       | `lob-tables.pdf`                | 6-page combat/morale/terrain tables                                       |
| LOB_GAME_UPDATES | `lob-game-specific-updates.pdf` | RSS-to-LoB conversions + SM-specific rule overrides                       |
| SM_RULES         | `sm-rules.pdf`                  | 28-page South Mountain scenario rules, terrain, reinforcements, VP system |
| SM_ROSTER        | `sm-regimental-roster.pdf`      | All unit statistics for both sides                                        |
| SM_ERRATA        | `sm-errata.pdf`                 | 5 official corrections (all applied to canonical data)                    |
| SM_MAP           | `sm-map.jpg`                    | South Mountain hex map (high-resolution image)                            |

### Data Models

All five data files exist under `data/scenarios/south-mountain/` and are validated by Zod schemas in `server/src/schemas/`.

| ID                | File                                                       | Contents                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SM_MAP_DATA       | `data/scenarios/south-mountain/map.json`                   | Hex terrain, gridSpec calibration, VP/entry hexes, type registries (hexsideTypes, hexFeatureTypes, edgeFeatureTypes) — partial, digitization in progress via map editor |
| GS_OOB            | `data/scenarios/south-mountain/oob.json`                   | 219 units, brigade/division hierarchy, wreck thresholds                                                                                                                 |
| GS_LEADERS        | `data/scenarios/south-mountain/leaders.json`               | 48 leaders, ratings, special rule flags                                                                                                                                 |
| SM_SCENARIO_DATA  | `data/scenarios/south-mountain/scenario.json`              | Turn structure, reinforcements, VP conditions, movement costs, random events                                                                                            |
| SM_AUTODETECT_CFG | `data/scenarios/south-mountain/map-autodetect-config.json` | Auto-detect configuration: elevation color palette, confidence threshold, seed hex list (confirmed hexes used as few-shot examples for Vision API classification)       |

### Developer Tools

Two dev-only tools are available, both guarded by `MAP_EDITOR_ENABLED=true` in `.env`. Launch with `npm run dev:map-editor`.

**Map editor** (`/tools/map-editor`) — digitize `docs/reference/sm-map.jpg` into `map.json` terrain data.

**Scenario editor** (`/tools/scenario-editor`) — edit `scenario.json` fields: turn structure, lighting schedule (day/twilight/night by start turn), and rules fields (night visibility cap, fluke stoppage grace period, initiative system, loose cannon, loss recovery, random events). See `docs/scenario-editor-design.md` for the full spec.

- **Enable:** set `MAP_EDITOR_ENABLED=true` in `.env`
- **Launch:** `npm run dev:map-editor` (starts both server and client with the env flag set)

A `devops` agent and four skills automate the build/run/test cycle. See `docs/agents/devops/design.md` for the full spec.

- `/dev-build` — format, lint, and build the client
- `/dev-start` — launch server (port 3000) and Vite dev client (port 5173), logging to `logs/`
- `/dev-stop` — graceful shutdown with 10 s SIGKILL fallback
- `/dev-test` — run suite, snapshot results to `test-results/`, detect flaky tests, correlate server errors

For rules questions, errata, and SM-specific overrides, use the `rules-lawyer` agent.
See `docs/agents/rules-lawyer/design.md` for the full spec.

A `project-manager` agent manages the SDLC: assigning milestones and auditing issue/HLD
consistency. Use `/issue-implement <number>` to drive the full ticket-to-merge workflow with
human control points. See `docs/agents/project-manager/design.md` for the full spec.

The **four-phase SDLC lifecycle** is documented in `.claude/rules/sdlc.md`.

@.claude/rules/sdlc.md

An `issue-intake` agent handles issue creation: it gathers the raw requirement, iteratively
refines the draft with the engineer, and files the GitHub issue after explicit approval (HCP).
No branch, artifact, or PR is created — the filed issue is the record. Use `/issue-intake` to
create a well-formed, AI-actionable GitHub issue. See `docs/agents/issue-intake/design.md`.

A `code-review` agent performs quality-gate reviews. See `docs/agents/code-review/design.md`
for the full spec.

- `/pr-review` — reviews the current PR for coding standards, test coverage, and common defects
- `/code-assess` — performs a full codebase examination for duplicate code, dead code, and
  refactoring opportunities

Two skills keep project documentation in sync after each implementation:

- `/doc-sync` — updates `CLAUDE.md`, `docs/high-level-design.md`, and `docs/agents/*/design.md`
  to match code changes on the current branch (diff-driven; edits stale facts directly)
- `/ecosystem-docs-generate` — rebuilds the six reference files in `docs/claude-ecosystem/`
  from source-of-truth inputs (full rebuild from registry, design docs, and workflow files)

Both are invoked automatically by `/issue-implement` between implementation and build.

All agent design documents and prompts live in `docs/agents/<name>/`. Three skills manage the
agent layer:

- `/agent-sync` — read-only drift check between `design.md` and `.claude/agents/*.md`
- `/agent-regenerate` — rebuild agent files from `design.md` section 4
- `/agent-standardize` — normalize prompt files and cascade changes through design and agent files

An **orchestration agent runtime** (`server/src/orchestrator/`) provides a Node.js workflow
engine that sequences registered agents and skills declaratively. It reads `WorkflowDefinition`
JSON files from `docs/workflows/{name}/{name}.workflow.json`, executes steps by resolving
agents from `.claude/agents/registry.json`, pauses at blocking `GateDef` checkpoints for
human input via a CLI readline interface, and persists a `WorkflowInstance` JSON to
`docs/ailog/YYYY_MM_DD-LOB-{####}-instance.json`. Four workflows are defined:

- `docs/workflows/design/` — gather intent → draft design doc → iterate → commit on design/{slug} branch and open PR
- `docs/workflows/sdlc-feature/` — full feature delivery pipeline
- `docs/workflows/issue-intake/` — gather → refine → HCP → file issue
- `docs/workflows/issue-implement/` — full ticket-to-merge with six HCPs (plan, editor review, push, review, merge, close)

AI execution logs for issue implementations are stored in `docs/ailog/YYYY_MM_DD-LOB-{####}.md`
and committed as a permanent audit trail of AI planning and human approvals.

## Coding Standards

@.claude/rules/coding-standards.md

## Plugin Ecosystem

This project uses the [wshobson/agents](https://github.com/wshobson/agents) plugin marketplace
alongside the custom lob-online skill set. To install on a new machine:

```
/plugin marketplace add wshobson/agents
/plugin install conductor
/plugin install agent-teams
```

Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.env` (or your shell) to enable agent-teams.

**Two parallel workflow layers:**

| Task                  | Native lob-online skill | wshobson/agents plugin |
| --------------------- | ----------------------- | ---------------------- |
| SDLC feature delivery | `/issue-implement <n>`  | `/conductor:new-track` |
| Code review           | `/pr-review`            | `/team-review`         |
| Parallel debugging    | —                       | `/team-debug`          |

The lob-specific skills (`/issue-implement`, `/pr-review`, etc.) are the primary workflow.
Plugin commands are available as supplementary tools.

## Post-Plan Protocol

After any plan is implemented, run `/plan-wrap` to verify lint, formatting, and tests pass; write
a devlog entry; review CLAUDE.md for needed updates; and assess whether high-level-design.md requires
architectural revision. Do not skip this step before ending a working session.

When creating a pull request, run `/pr-create` instead of `gh pr create` directly. The command
writes a diary entry for the PR, runs the build checks, and then opens the PR.

Devlog entries are appended to a per-day file in `docs/devlog/YYYY-MM-DD.md`. Each entry
within the file is a `## HH:MM — Title` section. `docs/devlog.md` is an index only.
