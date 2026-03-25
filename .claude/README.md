# .claude — Claude Code Agent and Skill Configuration

This directory contains the Claude Code agent definitions and slash-command skill files that
automate development operations for lob-online. Agents are specialized subprocesses launched
by Claude Code; skills are reusable prompt files invoked with `/skill-name`.

The primary SDLC workflow layer is the **wshobson/agents** plugin (`conductor`,
`agent-teams`). The lob-specific agents and skills below are extensions that have no plugin
equivalent.

---

## Agents — `agents/`

Each agent file defines a name, description, allowed tools, and a detailed system prompt. The
main Claude Code session spawns agents using the `Agent` tool.

| Agent           | File                      | Responsibilities                                                          |
| --------------- | ------------------------- | ------------------------------------------------------------------------- |
| `devops`        | `agents/devops.md`        | Build, start, stop, and test the development environment                  |
| `domain-expert` | `agents/domain-expert.md` | Authoritative rulings on LoB v2.0 rules, SM errata, rule-source conflicts |

Full design specifications for each agent live in `docs/agents/<name>/design.md`.

---

## Skills (Slash Commands) — `commands/`

Skills are Markdown prompt files invoked as `/skill-name` in Claude Code. They contain
step-by-step instructions that Claude executes.

### DevOps Skills

| Skill        | File                    | Purpose                                                                                                                     |
| ------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/dev-build` | `commands/dev-build.md` | Run Prettier, ESLint, and Vite build in sequence; stop on first failure                                                     |
| `/dev-start` | `commands/dev-start.md` | Launch server (port 3000) and Vite dev client (port 5173); log output to `logs/<type>/YYYY_MM_DD/`; persist PIDs to `.pids` |
| `/dev-stop`  | `commands/dev-stop.md`  | Gracefully terminate server and client using `.pids` and port scan; SIGKILL after 10 s; remove `.pids`                      |
| `/dev-test`  | `commands/dev-test.md`  | Run full test suite; capture logs to `logs/test/YYYY_MM_DD/`; detect flaky tests; correlate failures with server logs       |

### PR and Plan Skills

| Skill          | File                      | Purpose                                                                                             |
| -------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| `/pr-create`   | `commands/pr-create.md`   | Write devlog entry, run build checks, then open a GitHub pull request                               |
| `/pr-merge`    | `commands/pr-merge.md`    | Squash-merge the current PR and delete the branch                                                   |
| `/issue-close` | `commands/issue-close.md` | Close a GitHub issue with a merge summary comment after the PR is merged                            |
| `/plan-wrap`   | `commands/plan-wrap.md`   | After a plan is implemented: verify lint/format/tests, write devlog entry, review CLAUDE.md and HLD |

### Documentation Skills

| Skill                      | File                                  | Purpose                                                                           |
| -------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| `/doc-sync`                | `commands/doc-sync.md`                | Diff-driven sync of CLAUDE.md, HLD, and agent design docs to match branch changes |
| `/ecosystem-docs-generate` | `commands/ecosystem-docs-generate.md` | Rebuild all files in `docs/claude-ecosystem/` from source-of-truth inputs         |
| `/design`                  | `commands/design.md`                  | Collaboratively author a design doc for a new component before writing any issues |

---

## Settings

`settings.local.json` — local Claude Code settings (gitignored if it contains secrets; this
copy contains no credentials and is safe to commit).

---

## Documentation

| Document                                                                    | Purpose                                                                                             |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`docs/claude-ecosystem/README.md`](../docs/claude-ecosystem/README.md)     | Hub for the lob-online agent ecosystem: agent reference, skill reference, guardrails, orchestration |
| [`docs/designs/ecosystem-design.md`](../docs/designs/ecosystem-design.md)   | Full agent/skill architecture with Mermaid diagrams and skill dependency graph                      |
| [`docs/migration-wshobson-agents.md`](../docs/migration-wshobson-agents.md) | Old-to-new command mapping from hand-rolled SDLC to wshobson/agents plugin layer                    |
| [`docs/agents/SKILL_TEMPLATE.md`](../docs/agents/SKILL_TEMPLATE.md)         | Template for authoring new skill files                                                              |
