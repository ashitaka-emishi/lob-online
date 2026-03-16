---
description: Rebuild .claude/agents/*.md from design.md Section 4; verify with /dev-build
allowed-tools: Read, Write, Edit, Glob, Bash
---

Rebuild all `.claude/agents/*.md` files from section 4 of each `docs/agents/<name>/design.md`.
Use this after editing `design.md` files to sync the agent definitions without touching
`prompt.md` or the rest of `design.md`.

## Steps

1. List all directories under `docs/agents/`; skip entries that are not directories (e.g.,
   `README.md`, `PROMPT_TEMPLATE.md`, `DESIGN_TEMPLATE.md`)
2. For each agent directory:
   a. Check that `docs/agents/<name>/design.md` exists; if not, warn and skip
   b. Read `design.md` and locate the `## 4. Agent Definition` section
   c. Extract the content of section 4: YAML frontmatter block, Agent Responsibilities
   subsection, What the Agent Does NOT Do subsection, and Key Files subsection
   d. Construct the new agent file:
   - Start with the YAML frontmatter (the `---`-delimited block)
   - Add a blank line, then the agent body: a first-person "You are the X agent" intro,
     followed by Responsibilities, What This Agent Does NOT Do, and Key Files as `##` sections
     e. Rewrite `.claude/agents/<name>.md` with the constructed content
3. Run `/dev-build`
4. Report which agent files were regenerated and which were skipped (with skip reason)

## Notes

- The heading `## 4. Agent Definition` must be present in `design.md` for extraction to work;
  if it is missing, warn with the exact heading expected and skip that agent
- YAML frontmatter is the block between the first `---` and second `---` inside section 4
- Do not modify `design.md` or `prompt.md` — only `.claude/agents/<name>.md` is rewritten
- If `.claude/agents/<name>.md` does not yet exist, create it
