---
description: Close a GitHub issue with a merge summary comment after PR is merged
allowed-tools: Bash
---

Close the GitHub issue for the current feature branch after a successful PR merge.

## Step 1 — Resolve issue number

Accept `<number>` as an argument, or derive it from the current branch name:

```bash
git branch --show-current
```

Extract the issue number from the branch pattern `feat/{number}-{slug}`.

## Step 2 — Resolve merged commit SHA

Accept `<mergeCommit>` as an argument, or look it up:

```bash
gh pr view --state merged --json mergeCommit --jq '.mergeCommit.oid' 2>/dev/null | head -c 12
```

## Step 3 — Close the issue

```bash
gh issue close <number> --comment "Delivered in <mergeCommit>. All acceptance criteria met."
```

Substitute `<number>` with the resolved issue number and `<mergeCommit>` with the short SHA.

## Finishing

Report the closed issue URL.
