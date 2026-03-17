# Tutorial: Creating a New Agent

> **Note:** This tutorial describes the process used for the **lob-online** project. The
> specific file paths, tool lists, and skill names are project-specific. Treat this as a
> worked pattern — your own ecosystem will have different agents, tools, and conventions.

This tutorial walks through creating a new Claude Code agent from scratch. An agent is a
specialised AI subprocess with a focused responsibility (e.g., build automation, code review).
You define its name, description, allowed tools, and system prompt once, then invoke it by
name whenever that responsibility is needed.

---

## Prerequisites

- Claude Code installed and authenticated
- The project checked out locally
- `docs/agents/` directory structure already in place (see the existing agents for examples)
- `.claude/settings.json` accessible for allow-list edits

---

## Step 1 — Choose a name and responsibility

Decide what the agent is responsible for and pick a short, descriptive kebab-case name
(e.g., `data-validator`, `docs-writer`). The name becomes the filename in `.claude/agents/`
and the key in every reference to the agent.

Write down two things before touching any file:

1. **One-sentence purpose** — what does this agent do, and when do you invoke it?
2. **Allowed tools** — the minimum set the agent needs (Bash, Read, Write, Edit, Glob,
   Grep, Agent, WebSearch, etc.). Fewer tools = narrower blast radius.

---

## Step 2 — Author `docs/agents/<name>/design.md`

Create `docs/agents/<name>/design.md` following the project's `DESIGN_TEMPLATE.md`. The
most important section is **§4 Agent Definition**, which is the canonical source of truth
for the agent's frontmatter. Every other representation (`.claude/agents/<name>.md`) is
derived from §4. If §4 and the agent file ever disagree, §4 wins.

A minimal §4 looks like:

```markdown
## 4. Agent Definition

### Frontmatter

\`\`\`yaml
name: My Agent
description: >
One or two sentences describing when to invoke this agent and what it does.
Claude Code uses this description to route requests automatically.
tools: Bash, Read, Glob
\`\`\`

### Key Files

- `docs/agents/my-agent/design.md` — this file
- `docs/agents/my-agent/prompt.md` — system prompt
- `.claude/agents/my-agent.md` — agent file (generated from §4)

### Implementation Checklist

- [ ] `design.md` authored
- [ ] `prompt.md` authored
- [ ] `.claude/agents/my-agent.md` created
- [ ] Added to `settings.json` allow list
- [ ] `/agent-sync` reports IN SYNC
```

---

## Step 3 — Author `docs/agents/<name>/prompt.md`

The prompt file contains the prose system instructions the agent will follow. Write it as
clear, imperative instructions. Good prompts:

- State the agent's primary goal in the first paragraph
- List explicit constraints (what the agent must _not_ do)
- Reference specific file paths, commands, or skill names the agent should use
- End with a "Finishing" or "Report" section describing the expected output

---

## Step 4 — Create `.claude/agents/<name>.md`

This file is what Claude Code actually loads. It must have valid YAML frontmatter followed
by prose responsibilities. The frontmatter `name`, `description`, and `tools` must exactly
match §4 of `design.md`.

**Claude Code path:**

```
/agent-regenerate
```

This reads `design.md §4` and writes `.claude/agents/<name>.md` automatically.

**Manual path:**

Create `.claude/agents/<name>.md` with this structure:

```markdown
---
name: My Agent
description: >
  One or two sentences describing when to invoke this agent and what it does.
tools: Bash, Read, Glob
---

{Paste the full contents of prompt.md here, or write the prose responsibilities directly.}
```

---

## Step 5 — Add to `settings.json` allow list

Claude Code's permission model requires new agents to be explicitly allowed. Edit
`.claude/settings.json` and add an entry to the `allow` array:

```json
{
  "permissions": {
    "allow": ["Agent(my-agent)"]
  }
}
```

Without this entry, Claude Code will prompt for permission every time the agent is invoked.

---

## Step 6 — Register in `.claude/agents/registry.json`

If this agent will be used in declarative workflow definitions (`.workflow.json` files under
`docs/workflows/`), add an entry to the agent registry so the orchestration runtime can
resolve it by `id`:

```json
{
  "id": "my-agent",
  "name": "My Agent",
  "description": "One-line description matching design.md §4",
  "type": "agent",
  "path": ".claude/agents/my-agent.md"
}
```

The `id` field is what workflow definitions use in `agentId` — it must be unique across all
agents and skills in the registry. If the agent is not used in any workflow definition, this
step can be skipped.

---

## Step 7 — Verify with `/agent-sync`

Run `/agent-sync` to confirm that `.claude/agents/<name>.md` matches `design.md §4` exactly.
If you added a registry entry, also verify it manually — `/agent-sync` does not check
`registry.json`.

**Claude Code path:**

```
/agent-sync
```

**Manual path:**

```bash
# Compare frontmatter fields manually
head -10 .claude/agents/my-agent.md
grep -A 10 "## 4. Agent Definition" docs/agents/my-agent/design.md
```

A passing sync looks like:

```
[my-agent]   IN SYNC
All agents in sync
```

If you see `DRIFT`, the fields diverged — fix `.claude/agents/<name>.md` to match §4.

---

## Worked Example: `issue-intake` agent

The `issue-intake` agent was created during the [PR #21 session](../devlog/2026-03-16.md)
to promote issue creation from a flat skill into a standalone, version-controlled workflow.
Here is how each step applied:

**Step 1 — Name and responsibility:**

- Name: `issue-intake`
- Purpose: "Guide creation of a well-formed GitHub issue through interactive conversation"
- Tools: `Bash, Read, Glob, Grep` (no file writing needed — the issue IS the artifact)

**Step 2 — `design.md`:**
Created at `docs/agents/issue-intake/design.md`. §4 specified four tools and a description
covering the gather-refine-HCP-file flow with no branch or PR lifecycle.

**Step 3 — `prompt.md`:**
Created at `docs/agents/issue-intake/prompt.md`. The prompt defines the 2-step workflow:
gather → HCP 1 → `gh issue create`.

**Step 4 — Agent file:**
`/agent-regenerate` wrote `.claude/agents/issue-intake.md` from §4.

**Step 5 — Allow list:**
Added `"Agent(issue-intake)"` to `.claude/settings.json`.

**Step 6 — Registry:**
An entry was added to `.claude/agents/registry.json` for the `issue-intake` id so the
workflow runtime can dispatch it from `issue-intake.workflow.json`.

**Step 7 — Verify:**
`/agent-sync` reported `[issue-intake] IN SYNC`.

---

## Summary

| Step | File(s)                        | Claude Code         | Manual                                  |
| ---- | ------------------------------ | ------------------- | --------------------------------------- |
| 1    | (planning only)                | —                   | —                                       |
| 2    | `docs/agents/<name>/design.md` | author manually     | author manually                         |
| 3    | `docs/agents/<name>/prompt.md` | author manually     | author manually                         |
| 4    | `.claude/agents/<name>.md`     | `/agent-regenerate` | copy frontmatter from §4, paste prompt  |
| 5    | `.claude/settings.json`        | edit manually       | edit manually                           |
| 6    | `.claude/agents/registry.json` | edit manually       | edit manually (skip if no workflow use) |
| 7    | (verification)                 | `/agent-sync`       | diff frontmatter fields                 |
