---
description: [One sentence — appears in Claude Code skill selector]
allowed-tools: [Bash, Read, Edit, Write, Glob, Grep — list only what this skill actually uses]
---

[One-sentence purpose statement.]

## Step 1 — [Action Name]

[Instructions.]

```bash
# command or code block
```

<!-- Repeat Step N blocks as needed -->

> **HUMAN CONTROL POINT** — [condition that triggers the pause].
> Wait for [approval word] before continuing. Do not [prohibited action] automatically.

## Finishing

If all steps pass, report: [one-line success format].

If any step fails, report the step name and relevant error output, then stop.

## Notes

- [Design decision, constraint, or cross-reference worth preserving]

<!--
AUTHORING RULES (remove this block before committing):

- `description` must be one sentence; it is the text shown in the skill selector.
- `allowed-tools` must list only tools this skill directly invokes (not what sub-skills use).
- Every HCP must state a condition, an approval word, and an explicit prohibition.
- Cross-references to other skills use `/skill-name` syntax.
- File name convention: `<category>-<verb>.md` (e.g. `dev-build.md`, `issue-start.md`).
- After creating the skill:
    1. Add it to `.claude/README.md` skills table under the appropriate category.
    2. Add it to `docs/architecture.md` skills table.
    3. Add `Skill(<name>)` to `.claude/settings.local.json` permissions.
    4. Run `/dev-build` to confirm no lint/format issues.
-->
