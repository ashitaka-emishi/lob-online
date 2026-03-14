# Agent Documentation

This directory contains the design documents and prompts for all Claude Code agents used in
the lob-online project. Each agent has its own subdirectory with two files:

- `prompt.md` — the raw requirements used to generate the design (the "brief")
- `design.md` — the full agent design spec, including the canonical agent definition

## Agent Catalog

| Agent             | Design                                 | Purpose                                                         |
| ----------------- | -------------------------------------- | --------------------------------------------------------------- |
| `devops`          | [design.md](devops/design.md)          | Build, start, stop, and test the lob-online system              |
| `project-manager` | [design.md](project-manager/design.md) | Manage the SDLC via GitHub issues and milestones                |
| `code-review`     | [design.md](code-review/design.md)     | Quality-gate PR reviews and full codebase assessments           |
| `rules-lawyer`    | [design.md](rules-lawyer/design.md)    | Rules arbiter and wargame analyst for LoB v2.0 / South Mountain |

## Templates

| File                                     | Purpose                                  |
| ---------------------------------------- | ---------------------------------------- |
| [PROMPT_TEMPLATE.md](PROMPT_TEMPLATE.md) | Standard structure for `prompt.md` files |
| [DESIGN_TEMPLATE.md](DESIGN_TEMPLATE.md) | Standard structure for `design.md` files |

## How to Create a New Agent

1. Create `docs/agents/<name>/prompt.md` using `PROMPT_TEMPLATE.md` as a guide
2. Create `docs/agents/<name>/design.md` using `DESIGN_TEMPLATE.md` as a guide
   - Section 4 (`## 4. Agent Definition`) is the canonical source for the agent file
3. Create `.claude/agents/<name>.md` from section 4 of `design.md`
4. Update `CLAUDE.md` — add the agent to the Developer Tools section
5. Add the agent to the catalog table above
6. Run `/sync-agents` to verify everything is consistent

## How to Update an Existing Agent

1. Edit `docs/agents/<name>/design.md` — section 4 is the canonical source
2. Run `/regenerate-agents` to rewrite `.claude/agents/<name>.md` from section 4
3. Run `/sync-agents` to confirm "All agents in sync"

## Skill Reference

| Skill                 | File                                     | Purpose                                                       |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `/standardize-agents` | `.claude/commands/standardize-agents.md` | Normalize all `prompt.md` files and regenerate design + agent |
| `/regenerate-agents`  | `.claude/commands/regenerate-agents.md`  | Rebuild `.claude/agents/*.md` from `design.md` section 4      |
| `/sync-agents`        | `.claude/commands/sync-agents.md`        | Read-only drift check between `design.md` and agent files     |
