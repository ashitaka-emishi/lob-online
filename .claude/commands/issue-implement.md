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

If `editorFeedback` is provided in your inputs (injected from a prior `gate-editor` Fix
decision), begin by summarising the feedback and describing how you will address each point
before writing any code. If `editorFeedback` is absent or empty, proceed normally.

## Step 3a — Sync project docs

Run `/doc-sync`.

This skill reads `git diff --name-only origin/master...HEAD` and updates `CLAUDE.md`,
`docs/high-level-design.md`, and `docs/agents/*/design.md` to reflect the implementation.
It edits stale facts directly and removes duplication. If it makes changes, it commits
them before continuing. Any findings are included in the HCP 2 report.

## Step 3b — Regenerate ecosystem docs

Run `/ecosystem-docs-generate`.

This skill rebuilds the six reference files in `docs/claude-ecosystem/` from source-of-truth
inputs (agent design docs, registry, skill command files, workflow definitions). It shows a
diff before writing — confirm or skip. Any files written are committed before continuing.

## Step 4 — Build

Run `/dev-build`.

If any step fails (format, lint, build), fix the errors and re-run before proceeding.

## Step 5 — Test

Run `/dev-test`.

If the server is not running, report that and stop — do not start the server automatically.
If tests fail, fix them and re-run.

## Step 5a — Launch Editor for Review

Run `/dev-start` to launch the server and Vite dev client.

> **HCP 2a** — Pause here. The dev server is running. Ask the engineer to open the editor
> in their browser and review the implementation. Provide the local URLs (server: port 3000,
> client: port 5173).
>
> Wait for the engineer to choose one of two options:
>
> - **Approve** — implementation looks correct. Run `/dev-stop` to shut down the server,
>   then continue to HCP 2 below.
> - **Fix** — implementation has issues. The engineer provides free-text feedback describing
>   what is wrong. Run `/dev-stop` to shut down the server, then loop back to Step 3
>   (Implement) with the engineer's feedback injected as explicit context. Begin the next
>   implementation pass by summarising the feedback and describing how you will address each
>   point before writing any code.
>
> **Always run `/dev-stop` before leaving this step** — on both the approve and fix paths —
> so the dev server is never left running.

> **HCP 2** — Report: (1) doc-sync results (which docs were updated or confirmed
> consistent), (2) ecosystem-docs-generate results (which reference files were regenerated),
> (3) build and test results, and (4) a brief summary of what was implemented. Wait for
> the user to say "push" before continuing to Step 6.
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

Once "close" is received, run `/issue-close <number>`, substituting the actual issue
number (e.g., `36`) from the current branch. The skill resolves the merged commit SHA
automatically and posts the closing comment.

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
