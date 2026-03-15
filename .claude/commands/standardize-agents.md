# Skill: standardize-agents

Normalize all agent `prompt.md` files against the template, then regenerate `design.md` and
`.claude/agents/<name>.md` for each agent. Run this when prompt files have drifted from the
standard structure or when template headings have changed.

## Steps

1. Read `docs/agents/PROMPT_TEMPLATE.md` and `docs/agents/DESIGN_TEMPLATE.md`
2. List all agent directories under `docs/agents/` (skip `README.md` and template files)
3. For each agent directory found:
   a. Read `docs/agents/<name>/prompt.md`
   b. Check that all required template sections are present: Purpose, Responsibilities, Tools,
   Guiding Principles (Skills/Operations and Domain-Specific Context are optional)
   c. Add any missing section headings with placeholder text; normalize existing headings to
   match the template exactly
   d. Write the updated `prompt.md` back to disk
4. For each agent:
   a. Read the standardized `prompt.md`
   b. Regenerate `docs/agents/<name>/design.md` using the DESIGN_TEMPLATE structure:
   - Section 1 Overview from prompt Purpose + Guiding Principles
   - Section 2 domain-specific section from prompt Domain-Specific Context or Skills details
   - Section 3 Skills from prompt Skills/Operations (omit section entirely if none)
   - Section 4 Agent Definition — preserve YAML frontmatter verbatim from existing agent file;
     add/update Agent Responsibilities, What the Agent Does NOT Do, Key Files subsections
   - Section 5 Implementation Checklist — update paths to `docs/agents/<name>/`
     c. Preserve domain-specific detail that exists in the current `design.md` but is not in
     the prompt (e.g., npm script tables, port reference tables, GitHub API commands)
     d. Write the updated `design.md`
5. For each agent: extract `## 4. Agent Definition` from `design.md` and rewrite
   `.claude/agents/<name>.md` — the YAML frontmatter block followed by the agent body text
   derived from the Responsibilities and Key Files subsections
6. Run `/build`
7. Report a per-agent summary: which sections were added, which files were regenerated

## Notes

- Section 4 heading (`## 4. Agent Definition`) must never be renamed — `/regenerate-agents`
  and `/sync-agents` locate content by this exact heading
- If a `prompt.md` file is missing for an agent directory, warn and skip that agent
- Do not remove existing detail from `design.md` — only add structure and normalize headings
