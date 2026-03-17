# .claude — Claude Code Agent and Skill Configuration

This directory contains the Claude Code agent definitions and slash-command skill files that
automate development operations for lob-online. Agents are specialized subprocesses launched
by Claude Code; skills are reusable prompt files invoked with `/skill-name`.

---

## Agents — `agents/`

Each agent file defines a name, description, allowed tools, and a detailed system prompt. The
main Claude Code session spawns agents using the `Agent` tool.

| Agent             | File                        | Responsibilities                                                                                 |
| ----------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `devops`          | `agents/devops.md`          | Build, start, stop, and test the development environment via the four core skills                |
| `project-manager` | `agents/project-manager.md` | File well-formed GitHub issues, assign milestones, audit backlog against HLD                     |
| `issue-intake`    | `agents/issue-intake.md`    | Guide issue creation with branch/PR lifecycle: open branch → refine → file → commit → PR → merge |
| `code-review`     | `agents/code-review.md`     | Review PRs for coding standards, test coverage, dead code, and defects                           |
| `domain-expert`    | `agents/domain-expert.md`    | Authoritative rulings on LoB v2.0 rules, SM errata, and rule-source conflicts                    |

Full design specifications for each agent live in `docs/agents/<name>/design.md`.

---

## Skills (Slash Commands) — `commands/`

Skills are Markdown prompt files invoked as `/skill-name` in Claude Code. They contain
step-by-step instructions that Claude executes, including allowed-tools declarations.

### DevOps Skills

| Skill        | File                    | Purpose                                                                                                                     |
| ------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/dev-build` | `commands/dev-build.md` | Run Prettier, ESLint, and Vite build in sequence; stop on first failure                                                     |
| `/dev-start` | `commands/dev-start.md` | Launch server (port 3000) and Vite dev client (port 5173); log output to `logs/<type>/YYYY_MM_DD/`; persist PIDs to `.pids` |
| `/dev-stop`  | `commands/dev-stop.md`  | Gracefully terminate server and client using `.pids` and port scan; SIGKILL after 10 s; remove `.pids`                      |
| `/dev-test`  | `commands/dev-test.md`  | Run full test suite; capture logs to `logs/test/YYYY_MM_DD/`; detect flaky tests; correlate failures with server logs       |

### Issue Workflow Skills

| Skill              | File                          | Purpose                                                                                                           |
| ------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/issue-intake`    | `commands/issue-intake.md`    | Full branch/PR intake workflow — owned by `issue-intake` agent; open branch → refine → file → commit → PR → merge |
| `/issue-start`     | `commands/issue-start.md`     | Read issue, summarise ACs, confirm approach — HCP 1                                                               |
| `/issue-branch`    | `commands/issue-branch.md`    | Create `feat/{id}-{slug}` branch; set commit prefix `#{id}`                                                       |
| `/issue-implement` | `commands/issue-implement.md` | Orchestrating macro-skill: sequences all sub-skills with human control points from ticket to merge                |

### PR and Plan Skills

| Skill        | File                    | Purpose                                                                                             |
| ------------ | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `/pr-create` | `commands/pr-create.md` | Write devlog entry, run build checks, then open a GitHub pull request                               |
| `/pr-review` | `commands/pr-review.md` | Review the current PR for coding standards, test coverage, and common defects                       |
| `/pr-merge`  | `commands/pr-merge.md`  | Squash-merge the current PR and delete the branch — HCP 3                                           |
| `/plan-wrap` | `commands/plan-wrap.md` | After a plan is implemented: verify lint/format/tests, write devlog entry, review CLAUDE.md and HLD |

### Code Review Skills

| Skill          | File                      | Purpose                                                                                |
| -------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `/code-assess` | `commands/code-assess.md` | Full codebase examination for duplicate code, dead code, and refactoring opportunities |

### Agent Maintenance Skills

| Skill                | File                            | Purpose                                                                   |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| `/agent-sync`        | `commands/agent-sync.md`        | Read-only drift check between `design.md` files and `.claude/agents/*.md` |
| `/agent-regenerate`  | `commands/agent-regenerate.md`  | Rebuild agent files from the `design.md` Section 4 prompt block           |
| `/agent-standardize` | `commands/agent-standardize.md` | Normalize prompt files and cascade changes through design and agent files |

---

## Settings

`settings.local.json` — local Claude Code settings (gitignored if it contains secrets; this
copy contains no credentials and is safe to commit).

---

## Documentation

| Document                                                                | Purpose                                                                                                  |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`docs/claude-ecosystem/README.md`](../docs/claude-ecosystem/README.md) | Hub for the lob-online agent ecosystem: agent reference, skill reference, diagrams, guardrails guide     |
| [`docs/architecture.md`](../docs/architecture.md)                       | Full agent/skill architecture with Mermaid diagrams, skill dependency graph, and issue-to-merge workflow |
| [`docs/agents/SKILL_TEMPLATE.md`](../docs/agents/SKILL_TEMPLATE.md)     | Template for authoring new skill files                                                                   |
