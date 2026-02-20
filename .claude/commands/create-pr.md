---
description: Write a devlog entry for this PR, then create the pull request on GitHub
allowed-tools: Read, Edit, Glob, Bash
---

You are about to create a pull request. Work through these two tasks in order.

## Task 1 — Devlog Entry

Run `date +%Y-%m-%d-%H%M` to get the current timestamp. List `docs/diary/` to see the most
recent entry and confirm the naming convention.

Run `git log main..HEAD --oneline` to see all commits on this branch. Run `git diff main...HEAD
--stat` to see which files changed. Use this to understand the full scope of what the PR contains.

Create a new file at `docs/diary/TIMESTAMP-pr-short-title.md` where:

- `TIMESTAMP` is the output of the date command above
- `short-title` is a kebab-case slug (3–6 words) describing what the PR delivers

File contents format:

- First line: `# YYYY-MM-DD — PR: Full readable title` (derive the date portion from the timestamp)
- Blank line
- 3–5 paragraphs of prose — no sub-headers within the entry

The entry should cover:

- What the PR delivers and the motivation behind it
- Key design decisions made during implementation and why they were made that way
- Any non-obvious tradeoffs or constraints future readers should know about
- What was explicitly deferred to a later PR, if applicable

After writing the file, append a row to the index table in `docs/DEVLOG.md` (newest entries at
the bottom of the table) with the filename linked and a one-line summary.

Commit the diary file before creating the PR so it is included in the branch:

```
git add docs/diary/TIMESTAMP-pr-short-title.md docs/DEVLOG.md
git commit -m "docs: add diary entry for PR"
```

## Task 2 — Create the Pull Request

Run `git log main..HEAD --oneline` to review the commits. Draft a PR title (under 70 characters)
and body. The body should follow this format:

```
## Summary
- [bullet points, 2–4 items]

## Changes
- [files or components changed, briefly]

## Test plan
- [ ] lint passes
- [ ] format:check passes
- [ ] tests pass
- [any manual verification steps specific to this PR]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Run the following to confirm CI checks pass locally before opening the PR:

```
npm run lint
npm run format:check
npm run test
```

If any check fails, stop and report the failure. Do not open the PR until all three pass.

Once checks pass, push the branch if needed and create the PR:

```
gh pr create --title "..." --body "..."
```

Return the PR URL when done.
