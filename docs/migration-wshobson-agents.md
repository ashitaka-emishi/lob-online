# Migration Guide: wshobson/agents as Primary Workflow Layer

This document maps the old hand-rolled command surface to its wshobson/agents replacement.
All superseded agents and skills were removed in LOB-0082.

## Command Mapping

| Old command / agent                               | wshobson/agents replacement                            | Notes                                                              |
| ------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| `/issue-intake`                                   | `/conductor:new-track` (spec creation step)            | conductor gathers intent and writes a spec before creating a track |
| `/issue-implement <n>`                            | `/conductor:new-track` → `/conductor:implement`        | conductor tracks replace the hand-rolled 6-HCP workflow            |
| `/pr-review`                                      | `/team-review`                                         | multi-dimension parallel review via agent-teams                    |
| `code-review` agent                               | `agent-teams:team-reviewer`                            | invoked automatically by `/team-review`                            |
| `project-manager` agent                           | `/conductor:status`, `/conductor:manage`               | conductor owns SDLC state                                          |
| `issue-intake` agent                              | conductor intake (spec step of `/conductor:new-track`) |                                                                    |
| Node.js orchestrator (`server/src/orchestrator/`) | conductor runtime                                      | deleted; conductor handles workflow sequencing                     |
| `docs/workflows/*.workflow.json`                  | conductor tracks (`conductor/`)                        | deleted; use `/conductor:new-track` to create tracks               |
| _(new, no old equivalent)_                        | `/team-debug`                                          | parallel hypothesis debugging                                      |
| _(new, no old equivalent)_                        | `/team-feature`                                        | parallel feature development                                       |

## Retained Lob-Specific Skills (no plugin equivalent)

These skills are lob-online extensions and are **not** replaced by wshobson/agents:

| Skill                      | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| `domain-expert` agent      | Domain-specific wargame rules arbiter — irreplaceable |
| `devops` agent             | Project-specific build/run/test orchestration         |
| `/dev-build`               | Format, lint, and build                               |
| `/dev-start`               | Launch server + Vite dev client                       |
| `/dev-stop`                | Graceful shutdown                                     |
| `/dev-test`                | Run test suite with flake detection                   |
| `/pr-create`               | Write devlog entry and open PR                        |
| `/pr-merge`                | Squash-merge and delete branch                        |
| `/issue-close`             | Close issue with merge summary comment                |
| `/doc-sync`                | Sync CLAUDE.md, HLD, and agent design docs            |
| `/ecosystem-docs-generate` | Rebuild `docs/claude-ecosystem/` reference files      |
| `/design`                  | Author design documents before writing issues         |
| `/plan-wrap`               | Post-implementation doc and devlog wrap-up            |

## Plugin Installation

On a new machine, install the wshobson/agents plugins:

```
/plugin marketplace add wshobson/agents
/plugin install conductor
/plugin install agent-teams
```

Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.env` (or your shell) to enable agent-teams.

## Typical Workflows

### Start a new feature

```
/conductor:new-track
```

This replaces `/issue-intake` (spec gathering) and begins the conductor track lifecycle.

### Implement a track

```
/conductor:implement
```

This replaces `/issue-implement <n>`. Conductor checkpoints replace the hand-rolled HCPs.

### Review a PR

```
/team-review
```

This replaces `/pr-review`. Launches parallel reviewers across multiple quality dimensions.

### Debug a complex issue

```
/team-debug
```

No old equivalent. Runs competing-hypothesis parallel investigation.
