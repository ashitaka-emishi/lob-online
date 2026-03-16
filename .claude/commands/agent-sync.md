---
description: Read-only drift check between design.md files and .claude/agents/*.md
allowed-tools: Read, Glob
---

Read-only verification. Check that every `.claude/agents/<name>.md` matches its
`docs/agents/<name>/design.md` section 4. Run any time to detect drift without modifying files.

## Steps

1. List all `.md` files in `.claude/agents/`; derive each agent name from the filename
2. For each agent:
   a. Check that `docs/agents/<name>/design.md` exists; if not, flag as MISSING DESIGN
   b. Read `design.md` and locate `## 4. Agent Definition`; if missing, flag as MISSING SECTION 4
   c. Extract the YAML frontmatter from section 4 (name, description, tools fields)
   d. Read `.claude/agents/<name>.md` and extract its YAML frontmatter
   e. Compare the two frontmatter blocks field by field:
   - `name` must match exactly
   - `description` must match exactly (ignoring YAML multi-line formatting differences)
   - `tools` list must contain the same entries (order-insensitive)
     f. Extract the Key Files list from section 4 of `design.md`; for each listed path, check
     that the file or directory exists on disk
3. Produce a report for each agent in this format:
   ```
   [devops]        IN SYNC
   [project-manager] DRIFT — description mismatch
   [code-review]   IN SYNC
   [rules-lawyer]  MISSING KEY FILE: docs/agents/rules-lawyer/design.md
   ```
4. If all agents are in sync and all key files exist:
   - Print "All agents in sync" and exit
5. If any agent has drift or missing files:
   - Print the structured report
   - Print "Run /agent-regenerate to fix drift; create missing files manually"
   - Do NOT modify any files

## Notes

- This skill is intentionally read-only; it never writes to disk
- YAML `description` comparison should strip leading/trailing whitespace and collapse internal
  whitespace differences caused by YAML block scalar formatting (e.g., `>` vs inline)
- A missing `docs/agents/<name>/` directory is reported as MISSING DESIGN, not an error
- Run after any manual edit to `design.md` or `.claude/agents/<name>.md` to verify consistency
