---
description: Write a devlog entry for this PR, then create the pull request on GitHub
allowed-tools: Read, Edit, Glob, Bash
---

You are about to create a pull request. Work through these two tasks in order.

## Task 1 — Devlog Entry

Run `date +%Y-%m-%d` to get today's date and `date +%H%M` for the current time.

Run `git log main..HEAD --oneline` to see all commits on this branch. Run `git diff main...HEAD
--stat` to see which files changed. Use this to understand the full scope of what the PR contains.

The daily devlog file is `docs/devlog/YYYY-MM-DD.md`. Check whether it already exists:

**If the file does not exist:** create it with the following structure:

```
# YYYY-MM-DD

## HH:MM — PR: Full readable title

3–5 paragraphs of prose.
```

**If the file already exists:** append a new section at the end:

```

## HH:MM — PR: Full readable title

3–5 paragraphs of prose.
```

Each entry should cover:

- What the PR delivers and the motivation behind it
- Key design decisions made during implementation and why they were made that way
- Any non-obvious tradeoffs or constraints future readers should know about
- What was explicitly deferred to a later PR, if applicable

After writing or appending the entry, update `docs/devlog.md`:

- If a row for today's file (`devlog/YYYY-MM-DD.md`) already exists in the index table,
  update its summary to reflect all entries for the day.
- If no row exists yet for today, append a new row at the bottom with the filename linked.

Commit the devlog file before creating the PR so it is included in the branch:

```
git add docs/devlog/YYYY-MM-DD.md docs/devlog.md
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
