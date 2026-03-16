---
description: Create the feat/{id}-{slug} branch for the given issue number
allowed-tools: Bash, Read
---

Create a feature branch for the given issue number.

## Step 1 — Fetch issue title

```bash
gh issue view <number> --json title --jq '.title'
```

## Step 2 — Derive slug

Transform the title:

1. Lowercase all characters
2. Strip all punctuation except hyphens
3. Replace spaces with hyphens
4. Collapse consecutive hyphens to one
5. Truncate to 40 characters
6. Strip leading/trailing hyphens

Example: "Add Cypress E2E tests for map editor sync" → `add-cypress-e2e-tests-for-map-editor`

Branch name: `feat/{issue-id}-{slug}`

## Step 3 — Create branch

```bash
git checkout -b feat/{issue-id}-{slug}
```

## Step 4 — Update AI log

Find the log file at `docs/ailog/` matching `*-LOB-{####}.md` (zero-padded issue number).
If found, append:

```markdown
## Branch Created

`feat/{####}-{slug}` — YYYY-MM-DD HH:MM

---
```

## Finishing

Report:

- Branch name created
- Reminder: every commit's first line must start with `#{issue-id} ` (e.g., `#12 feat: add cypress config`)
