---
description: Sync CLAUDE.md, HLD, and agent design docs to match code changes on the current branch
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# /doc-sync

Ensure `CLAUDE.md`, `docs/high-level-design.md`, and all `docs/agents/*/design.md` files
accurately reflect the code changes on the current branch. This skill is diff-driven: it
only inspects and updates docs relevant to what changed. It makes edits directly — removing
stale facts, correcting inaccuracies, eliminating duplication — rather than producing a
report for the engineer to act on.

Run this after implementation and before `/dev-build`. For `docs/claude-ecosystem/`
reference files, run `/ecosystem-docs-generate` separately.

---

## Step 1 — Get changed files

```bash
git diff --name-only origin/master...HEAD
```

Collect the full list of changed files on this branch. If the list is empty (no changes vs
master), report "No changes detected — all docs consistent." and stop.

---

## Step 2 — Identify affected documentation

For each changed file, determine which documentation files reference it. Check by:

1. **File path match** — grep the doc files for the exact path or filename:

```bash
grep -rl "<filename>" CLAUDE.md docs/high-level-design.md docs/agents/
```

2. **Subsystem match** — if the file belongs to a named subsystem (e.g.,
   `server/src/orchestrator/` → orchestration runtime; `client/src/views/tools/` → dev
   tools; `.claude/commands/` → skills; `.claude/agents/` → agents), grep for the
   subsystem name and its common aliases.

Build a map: `{ changedFile → [doc files that reference it] }`. A changed file with no
doc references needs no action — note it as "no docs reference this path" and move on.

---

## Step 3 — Read and assess each affected doc

For each `(changedFile, docFile)` pair identified in Step 2:

1. Read the changed source file (or its diff) to understand what changed — file paths,
   function names, config keys, agent names, skill names, step counts, etc.
2. Read the relevant section of the doc file.
3. Determine the action:
   - **Update** — the doc references a name, path, or fact that no longer matches the code
   - **Remove duplication** — the same fact is stated in multiple places in the doc; keep
     the most precise instance and remove the rest
   - **OK** — the doc accurately describes the current state; no edit needed

Do not rewrite prose wholesale. Change only the specific fact that has drifted.

---

## Step 4 — Edit the docs

For each doc requiring an update:

- Use targeted `Edit` calls — replace only the stale fact, not the surrounding paragraph
- Preserve voice, tone, and structure
- If removing duplication, delete the redundant sentence or bullet and verify the
  remaining text still reads correctly in context

After all edits are applied, run Prettier on the modified files:

```bash
npx prettier --write CLAUDE.md docs/high-level-design.md docs/agents/*/design.md
```

---

## Step 5 — Report

Output a structured summary:

```
### doc-sync results

| Changed file | Doc file | Action taken |
|---|---|---|
| path/to/file.js | CLAUDE.md | Updated: "X" → "Y" |
| path/to/other.js | docs/high-level-design.md | OK — no stale references |
| path/to/skill.md | docs/agents/devops/design.md | Removed duplicate sentence in §3 |
```

If no edits were made: "All docs consistent with current branch changes."

Commit any edited doc files before continuing:

```bash
git add CLAUDE.md docs/high-level-design.md docs/agents/
git commit -m "#{issue-number} docs: sync docs to match implementation"
```

---

## Constraints

- Only edit `CLAUDE.md`, `docs/high-level-design.md`, and `docs/agents/*/design.md`
- Do not touch `docs/claude-ecosystem/` — that is `/ecosystem-docs-generate`'s domain
- Do not touch source code (`.js`, `.vue`, `.json` data files)
- Do not rewrite narrative prose — only correct specific factual drift
- If a doc section is ambiguous and you cannot determine whether it is stale, note it in
  the report as "needs manual review" and leave it unchanged
