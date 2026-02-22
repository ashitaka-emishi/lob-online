---
description: Write a devlog entry and update documentation after a plan is implemented
allowed-tools: Read, Edit, Glob, Bash
---

You have just finished implementing a plan. Work through these four tasks in order.

## Task 0 — Verify the Build

Run the following three commands and report their results before proceeding:

```
npm run lint
npm run format:check
npm run test
```

If any command fails, stop immediately and report the failure with the relevant output. Do not
proceed to documentation tasks until all three pass. Fix any issues first, then re-run to confirm
before continuing.

## Task 1 — Devlog Entry

Run `date +%Y-%m-%d` to get today's date and `date +%H%M` for the current time.

The daily devlog file is `docs/devlog/YYYY-MM-DD.md`. Check whether it already exists:

**If the file does not exist:** create it with the following structure:

```
# YYYY-MM-DD

## HH:MM — Full readable title

3–5 paragraphs of prose.
```

**If the file already exists:** append a new section at the end:

```

## HH:MM — Full readable title

3–5 paragraphs of prose.
```

Each entry should cover:

- What was built and why it was structured the way it was
- Any significant architectural or design decisions made during implementation
- Non-obvious constraints or tradeoffs that future readers should know about
- What was explicitly deferred and why, if applicable

After writing or appending the entry, update `docs/devlog.md`:

- If a row for today's file (`devlog/YYYY-MM-DD.md`) already exists in the index table,
  update its summary to reflect all entries for the day (e.g., "Map design spec; docs reorg").
- If no row exists yet for today, append a new row at the bottom with the filename linked.

Write the entry now before moving to Task 2.

## Task 2 — CLAUDE.md Review

Read `CLAUDE.md`. Check each of these fields against what was actually implemented:

- **"Current state:" paragraph** — Does it still accurately describe the project phase and what
  exists? Update if the plan moved the project to a new phase or completed something significant.
- **Data Models table** — Are the file paths, descriptions, and status notes still accurate? If
  new data files were added or an existing file's contents changed substantially, update the
  relevant row.
- **Developer Tools section** — If new dev tools were added or removed, update accordingly.

Apply only changes that reflect real differences between the current text and the current state of
the codebase. Do not reword content that is still accurate. If nothing needs updating, note that
and move on.

## Task 3 — HLD.md Assessment

Read the Implementation Status callout block at the top of `docs/high-level-design.md` (the blockquote near
the top, before Section 1).

Ask: did the plan add or change anything that belongs in that status summary — either moving
something from "Planned" to "Completed," or adding a newly planned item the HLD should track?

If yes, update the callout block only. Do not rewrite HLD sections unless the plan introduced a
substantial architectural change (new subsystem, changed component boundary, new API surface) —
in which case identify the specific section that needs updating and make the targeted edit.

If the plan was purely implementation work within an already-designed component, no HLD edit is
needed. State that conclusion explicitly.

## Finishing

After completing all three tasks, print a one-paragraph summary of what was updated and what (if
anything) was left unchanged, so the session record is clear.
