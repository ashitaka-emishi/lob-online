# Tutorial: Modifying an Existing Agent

> **Note:** This tutorial describes the process used for the **lob-online** project. File
> paths and skill names are project-specific. Treat this as a pattern for your own ecosystem.

This tutorial covers making changes to an existing agent — updating its description, adding
or removing tools, or revising the prose system prompt. The key principle is:

> **`docs/agents/<name>/design.md §4` is the single source of truth for agent frontmatter.**
> Never edit `.claude/agents/<name>.md` directly. Always update §4 first, then regenerate.

---

## Why §4 is the source of truth

`.claude/agents/<name>.md` is a derived file. If you edit it directly and later someone runs
`/agent-regenerate`, your changes will be silently overwritten by what is in `design.md §4`.
Working the other direction — updating §4 first — keeps the design document and the agent
file in sync, and gives reviewers a single authoritative place to review changes.

The separation also means design history is preserved: the commit history of `design.md`
shows every deliberate change to the agent's definition, while the agent file's history only
shows regeneration events.

---

## When to modify an agent

Common reasons to modify an agent:

- **Add a new tool** — the agent needs to call a command it was not previously allowed to run
- **Update the description** — the agent's routing description no longer reflects its current
  scope (Claude Code uses this text to decide which agent to invoke)
- **Revise the system prompt** — the agent's behaviour is wrong or a new procedure needs to
  be encoded
- **Remove a skill** — a skill has been retired or moved to a different agent

---

## Step 1 — Edit `docs/agents/<name>/design.md §4`

Open the design doc and find `## 4. Agent Definition`. Make your changes here:

- To change **tools**, edit the `tools:` line in the frontmatter block
- To change the **description**, edit the `description:` block
- To change the **system prompt**, edit the prose after the frontmatter block (or update
  `docs/agents/<name>/prompt.md` if the prompt is maintained separately)

Keep the changes minimal and intentional. The design doc is a permanent record — add a short
comment in the Implementation Checklist noting what changed and why.

---

## Step 2 — Regenerate `.claude/agents/<name>.md`

**Claude Code path:**

```
/agent-regenerate
```

This reads the updated §4 and overwrites `.claude/agents/<name>.md` with the new frontmatter
and prompt content.

**Manual path:**

```bash
# Open .claude/agents/<name>.md
# 1. Replace the YAML frontmatter block with the updated values from design.md §4
# 2. If the prompt changed, update the prose body accordingly
```

---

## Step 3 — Verify with `/agent-sync`

**Claude Code path:**

```
/agent-sync
```

**Manual path:**

```bash
# Check that name, description, and tools match between the two files
head -10 .claude/agents/my-agent.md
grep -A 15 "## 4. Agent Definition" docs/agents/my-agent/design.md
```

`/agent-sync` compares every field. If it reports `IN SYNC`, the change is complete.
If it reports `DRIFT`, review the output to see which field still disagrees and fix it.

---

## Step 4 — Run `/dev-build` to confirm no breakage

Even though agent files are Markdown (not compiled code), linting and format checks still
run across the repository:

```
/dev-build
```

This catches accidental YAML syntax errors in the frontmatter, formatting inconsistencies,
and ensures the build is clean before opening a PR.

---

## Worked Example: Adding a tool to `project-manager`

During the skill rename session (PR #14), the `project-manager` agent gained the `Grep` tool
because the new `/issue-start` skill needed to search issue bodies for keywords. Here is how
the change flowed:

**Before (design.md §4):**

```yaml
tools: Bash, Read, Glob
```

**After (design.md §4):**

```yaml
tools: Bash, Read, Glob, Grep
```

1. `design.md §4` updated — `Grep` added to the `tools:` line
2. A note added to the Implementation Checklist: "Added Grep — required by /issue-start
   keyword search"
3. `/agent-regenerate` ran — `.claude/agents/project-manager.md` frontmatter updated
4. `/agent-sync` confirmed `[project-manager] IN SYNC`
5. `/dev-build` passed — format clean, lint clean, build succeeded

The key point: `design.md` now has a permanent record of _when_ `Grep` was added and _why_,
which would be lost if `.claude/agents/project-manager.md` had been edited directly.

---

## Common mistakes

| Mistake                                               | Consequence                                                                  | Fix                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| Editing `.claude/agents/<name>.md` directly           | Change is overwritten by next `/agent-regenerate` run                        | Always edit §4 first                    |
| Updating §4 but forgetting to regenerate              | `/agent-sync` reports DRIFT; Claude Code uses stale agent definition         | Run `/agent-regenerate`                 |
| Adding a tool in the agent file but not in §4         | DRIFT detected; tool silently removed on next regenerate                     | Update §4 to match                      |
| Removing a tool without checking which skills need it | Skills that relied on the tool fail silently or prompt for extra permissions | Grep skill files before removing a tool |

---

## Summary

| Step | Action                | Claude Code         | Manual                            |
| ---- | --------------------- | ------------------- | --------------------------------- |
| 1    | Edit `design.md §4`   | edit manually       | edit manually                     |
| 2    | Regenerate agent file | `/agent-regenerate` | update `.claude/agents/<name>.md` |
| 3    | Verify sync           | `/agent-sync`       | diff frontmatter fields           |
| 4    | Confirm build passes  | `/dev-build`        | `npm run format && npm run lint`  |
