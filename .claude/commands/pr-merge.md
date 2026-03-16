---
description: Squash-merge the current PR and delete the branch
allowed-tools: Bash
---

Merge the current pull request via squash merge and clean up the branch.

## Step 1 — Verify PR state

```bash
gh pr view
```

Confirm: PR is open, show title, URL, and latest CI check status. If no open PR exists for
the current branch, report the branch name and stop.

## Step 2 — Confirm checks pass

All three CI gates must be green before merging:

```bash
npm run lint
npm run format:check
npm run test
```

If any check fails, report the failure and stop. Do not merge broken code.

> **HUMAN CONTROL POINT 3** — Show the PR title, URL, check results, and squash-merge plan.
> Wait for the user to reply with an explicit "merge" command before proceeding.
> If the user does not say "merge", stop here.

## Step 3 — Squash merge

```bash
gh pr merge --squash --delete-branch
```

## Step 4 — Return to master

```bash
git checkout master
git pull
```

## Step 5 — Update AI log

Find the log file at `docs/ailog/` matching the issue number embedded in the branch name
(`feat/{####}-*`). If found, append:

```markdown
## HCP 3 — Merge Approved

**Approved:** YYYY-MM-DD HH:MM

---

## Merge Complete

**Commit:** {merged commit SHA from gh pr view output}
**Merged:** YYYY-MM-DD HH:MM
```

## Finishing

Report: merged commit SHA, branch deleted, now on master.
