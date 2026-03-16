---
description: Orchestrate the full ticket-to-merge workflow for a GitHub issue with human control points
allowed-tools: Bash, Read, Edit, Glob, Grep, Write
---

Run the full ticket-to-merge workflow for issue `<number>`. Execute each step in order;
stop at every human control point (HCP) and wait for explicit approval before continuing.

## Step 1 — Issue start

Run `/issue-start <number>`.

This skill fetches the issue, displays a one-paragraph plan and AC checklist, and waits
for **HCP 1** approval before proceeding. Do not continue until the user approves.

> **Optional HCP 0** — If the issue has significant architectural choices (new subsystem,
> new API surface, schema change), show a design proposal and wait for sign-off before
> `/issue-branch`.

## Step 2 — Branch

Run `/issue-branch <number>`.

This creates `feat/{number}-{slug}` and reminds you that every commit must start with
`#{number} `.

## Step 3 — Implement

Implement all acceptance criteria from the issue. Read the issue body carefully — every
AC checklist item must be satisfied.

Keep commits small and focused. First commit line format: `#{number} <type>: <description>`

## Step 4 — Build

Run `/dev-build`.

If any step fails (format, lint, build), fix the errors and re-run before proceeding.

## Step 5 — Test

Run `/dev-test`.

If the server is not running, report that and stop — do not start the server automatically.
If tests fail, fix them and re-run.

> **HCP 2** — Report the build and test results. Show a brief summary of what was
> implemented. Wait for the user to say "push" before continuing to Step 6.
>
> Update the AI log with Implementation Notes and Build/Test Results sections before
> waiting.

## Step 6 — Create PR

Run `/pr-create`.

This writes a devlog entry, runs CI checks, and opens the pull request on GitHub.

## Step 7 — Review

Run `/pr-review`.

Examine all findings:

- **Error-severity** findings must be fixed before merge (no exceptions)
- **Warning-severity** findings should be addressed where practical

> **HCP 2b** — Show the findings table. Wait for the user's decision:
>
> - "fix all" — fix every finding, re-run review until clean
> - "fix errors only" — fix error-severity only, leave warnings
> - "accept" — proceed to merge as-is (use sparingly)
>
> Update the AI log with Review Findings and HCP 2b sections.

## Step 8 — Merge

Run `/pr-merge`.

This skill runs a final CI check and presents **HCP 3** before squashing and deleting
the branch. The AI log is updated with the merge SHA.

## Step 9 — Close issue

> **HCP 4** — After `/pr-merge` completes, display the merged commit SHA and the issue
> URL. Wait for the user to reply with an explicit **"close"** signal before proceeding.
> If the user does not say "close", stop here and report the issue URL so the engineer
> can close it manually.

Once "close" is received, run:

```bash
gh issue close <number> --comment "Delivered in <merged-commit-sha>. All acceptance criteria met."
```

Report the closed issue URL.

## AI Log

The log file at `docs/ailog/YYYY_MM_DD-LOB-{####}.md` is updated by the sub-skills at
each checkpoint. After HCP 2 approval, ensure the log has:

```markdown
## Implementation Notes

{Brief notes on non-obvious decisions made during coding.}

---

## Build & Test Results

{one-line summary from /dev-build and /dev-test}

---

## HCP 2 — Implementation Accepted

**Accepted:** YYYY-MM-DD HH:MM
**Notes:** {any requests before push}

---
```

After the PR is created, the log should have a PR section with the URL. After merge,
commit the final log state:

```bash
git add docs/ailog/YYYY_MM_DD-LOB-{####}.md
git commit -m "docs: complete ailog for LOB-{####}"
git push
```
