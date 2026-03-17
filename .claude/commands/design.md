---
description: Collaboratively author a design document for a new or changed component (orchestrator, skill, or agent) before writing any issues
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

You are running the **design** skill for the lob-online project. Your job is to help the
engineer produce a clear, actionable design document for a new or changed component before
any issues are written. The design doc is the authoritative record; it lives in
`docs/designs/{slug}.md` and is merged on a `design/{slug}` branch.

**One human control point is required:**

1. **Design approval** — always show the full design doc and wait for explicit engineer
   approval before committing and opening a PR.

Work through these steps in order.

---

## Step 1 — Gather intent

Ask the engineer:

> "What component do you want to design? Describe the intent — what it should do and why
> it's needed. A few sentences is enough to get started."

Accept free text. Read any referenced files or existing docs/designs/ entries for context.

### Infer component type

Based on the description, propose one of:

- **`orchestrator`** — a Node.js workflow engine (new or changed `*.workflow.json` plus
  runtime changes in `server/src/orchestrator/`)
- **`skill`** — a `.claude/commands/*.md` prompt file that Claude Code executes
  conversationally
- **`agent`** — a `.claude/agents/*.md` specialised agent definition

State your reasoning and ask the engineer to confirm or correct the type before proceeding.

### Derive slug

Transform the component name:

1. Lowercase all characters
2. Strip all punctuation except hyphens
3. Replace spaces with hyphens
4. Collapse consecutive hyphens to one
5. Truncate to 40 characters
6. Strip leading/trailing hyphens

---

## Step 2 — Draft the design document

Create `docs/designs/{slug}.md` using `docs/designs/TEMPLATE.md` as the base. Fill in all
sections with as much detail as the engineer has provided:

- **Component Type** — the confirmed type from Step 1
- **Intent** — a clear paragraph from the engineer's description
- **Proposed Solution** — your best-effort design based on existing patterns in the codebase
- **Open Questions** — unresolved decisions or unknowns you've identified
- **Issues** — leave as `- #??? — {issue title}` placeholder

After writing the file, display the full contents in chat and ask:

> "Here's the draft design. Does this capture what you have in mind? Reply with changes to
> make, or say 'approve' if it looks right."

---

## Step 3 — Iterate

Accept feedback in two forms:

**Chat feedback** — the engineer replies with changes ("change the solution to...", "add an
open question about..."). Apply each change to `docs/designs/{slug}.md` using the Edit tool,
then display the updated file and ask for further feedback.

**Direct file edits** — the engineer edits `docs/designs/{slug}.md` directly in their editor.
Re-read the file with the Read tool, display a summary of what changed, and confirm:

> "I see you updated [section]. Does this look correct, or should I adjust anything?"

Continue iterating until the engineer explicitly approves with "approve", "looks good",
"LGTM", or equivalent.

---

## Step 4 — Commit and open PR (HCP 1)

> **HUMAN CONTROL POINT** — Do not commit until the engineer has explicitly approved the
> design in Step 3.

Once approved:

### 4a — Create branch

```bash
git checkout -b design/{slug}
```

### 4b — Commit design file

```bash
git add docs/designs/{slug}.md
git commit -m "design: add {slug} design doc"
git push -u origin design/{slug}
```

### 4c — Open PR

```bash
gh pr create \
  --title "design: {component name}" \
  --body "## Summary

- Adds \`docs/designs/{slug}.md\` design document for the {component name} {component type}
- Covers intent, proposed solution, and open questions
- Issues section to be populated during /issue-intake

## Next step

After merging, run \`/issue-intake\` to break this design into actionable GitHub issues.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Display the PR URL, then wait for the engineer to reply with **"merge"**.

### 4d — Merge PR

When "merge" is received:

```bash
gh pr merge --squash --delete-branch
```

Report the merged commit SHA and display:

> "Design merged. Run `/issue-intake` to begin breaking this design into issues."
