---
description: Read a GitHub issue, summarise acceptance criteria, and confirm approach before any code is written
allowed-tools: Bash, Read, Glob, Grep
---

You are starting work on a GitHub issue. Work through these steps in order.

## Step 1 — Fetch issue

```bash
gh issue view <number>
```

Read the full issue body: title, description, acceptance criteria checklist, files to
create/modify, tests required, rules/data dependencies, and milestone.

## Step 2 — Summarise

Write a one-paragraph summary covering:

- What this issue asks for and why it matters
- Which files will be created or modified
- What the test strategy is (unit, integration, E2E)
- Any non-obvious constraints or dependencies

Then list the acceptance criteria as a numbered checklist.

Propose a branch name using the pattern `feat/{issue-id}-{slug}` where slug is the issue
title lowercased, punctuation stripped, spaces replaced with hyphens, truncated to 40 chars.

## Step 3 — Create AI log file

Create the log file at `docs/ailog/YYYY_MM_DD-LOB-{####}.md` where `####` is the
zero-padded issue number (e.g. `0012`) and the date is today's date from `date +%Y-%m-%d`.

Use this template:

```markdown
# LOB-{####} — {Issue Title}

**Branch:** feat/{####}-{slug}
**Started:** YYYY-MM-DD HH:MM

---

## AI Plan

{One-paragraph summary of proposed implementation approach, files to create/modify, and
test strategy.}

---
```

> **HUMAN CONTROL POINT 1** — Show the summary, branch name, AC checklist, and log file
> path. Wait for the user to reply with "proceed" (or adjustments) before any code is
> written or the branch is created. If the user requests changes, revise and re-display.

## Step 4 — Record HCP 1 approval

Once the user approves, append to the log file:

```markdown
## HCP 1 — Plan Accepted

**Accepted:** YYYY-MM-DD HH:MM
**Notes:** {any modifications the user requested, or "none"}

---
```

Report: "Plan accepted. Run `/issue-branch <number>` to create the branch."
