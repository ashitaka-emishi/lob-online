# .claude — Claude Code Agent and Skill Configuration

This directory contains the Claude Code agent definitions and slash-command skill files that
automate development operations for lob-online. Agents are specialized subprocesses launched
by Claude Code; skills are reusable prompt files invoked with `/skill-name`.

---

## Agents — `agents/`

Each agent file defines a name, description, allowed tools, and a detailed system prompt. The
main Claude Code session spawns agents using the `Agent` tool.

| Agent             | File                        | Responsibilities                                                                  |
| ----------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `devops`          | `agents/devops.md`          | Build, start, stop, and test the development environment via the four core skills |
| `project-manager` | `agents/project-manager.md` | File well-formed GitHub issues, assign milestones, audit backlog against HLD      |
| `code-review`     | `agents/code-review.md`     | Review PRs for coding standards, test coverage, dead code, and defects            |
| `rules-lawyer`    | `agents/rules-lawyer.md`    | Authoritative rulings on LoB v2.0 rules, SM errata, and rule-source conflicts     |

Full design specifications for each agent live in `docs/agents/<name>/design.md`.

---

## Skills (Slash Commands) — `commands/`

Skills are Markdown prompt files invoked as `/skill-name` in Claude Code. They contain
step-by-step instructions that Claude executes, including allowed-tools declarations.

### DevOps Skills

| Skill    | File                | Purpose                                                                                                                     |
| -------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/build` | `commands/build.md` | Run Prettier, ESLint, and Vite build in sequence; stop on first failure                                                     |
| `/start` | `commands/start.md` | Launch server (port 3000) and Vite dev client (port 5173); log output to `logs/<type>/YYYY_MM_DD/`; persist PIDs to `.pids` |
| `/stop`  | `commands/stop.md`  | Gracefully terminate server and client using `.pids` and port scan; SIGKILL after 10 s; remove `.pids`                      |
| `/test`  | `commands/test.md`  | Run full test suite; capture logs to `logs/test/YYYY_MM_DD/`; detect flaky tests; correlate failures with server logs       |

### Project Management Skills

| Skill           | File                       | Purpose                                                                                             |
| --------------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| `/issue-intake` | `commands/issue-intake.md` | Guide creation of an AI-actionable GitHub issue with two human control points before filing         |
| `/create-pr`    | `commands/create-pr.md`    | Write devlog entry, run build checks, then open a GitHub pull request                               |
| `/wrap-plan`    | `commands/wrap-plan.md`    | After a plan is implemented: verify lint/format/tests, write devlog entry, review CLAUDE.md and HLD |

### Code Review Skills

| Skill     | File                 | Purpose                                                                                |
| --------- | -------------------- | -------------------------------------------------------------------------------------- |
| `/review` | `commands/review.md` | Review the current PR for coding standards, test coverage, and common defects          |
| `/assess` | `commands/assess.md` | Full codebase examination for duplicate code, dead code, and refactoring opportunities |

### Agent Maintenance Skills

| Skill                 | File                             | Purpose                                                                   |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------- |
| `/sync-agents`        | `commands/sync-agents.md`        | Read-only drift check between `design.md` files and `.claude/agents/*.md` |
| `/regenerate-agents`  | `commands/regenerate-agents.md`  | Rebuild agent files from the `design.md` Section 4 prompt block           |
| `/standardize-agents` | `commands/standardize-agents.md` | Normalize prompt files and cascade changes through design and agent files |

---

## Settings

`settings.local.json` — local Claude Code settings (gitignored if it contains secrets; this
copy contains no credentials and is safe to commit).
