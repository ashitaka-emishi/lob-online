---
issue: 23
title: Add .claude ecosystem tutorials and introductory blog
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

With the reference documentation in place (#22), this issue adds the authored narrative layer:
step-by-step tutorials for creating and modifying agents, and a short introductory blog post
explaining why and how lob-online uses an agent ecosystem for AI-assisted development. Content
is written for a developer audience who may be using Codex or another AI assistant rather than
Claude Code directly, so each tutorial includes both the Claude-assisted path and the equivalent
manual steps. All files live under `docs/claude-ecosystem/` alongside the reference docs.

## Acceptance Criteria

- [ ] `docs/claude-ecosystem/tutorial-new-agent.md` created: step-by-step walkthrough for
      creating a new agent — author `design.md` and `prompt.md`, write `.claude/agents/` file with
      valid frontmatter, add to `settings.local.json` allow list, run `/agent-sync` (or manually
      diff frontmatter); includes a worked example
- [ ] `docs/claude-ecosystem/tutorial-modify-agent.md` created: step-by-step walkthrough for
      modifying an existing agent — edit `design.md §4`, run `/agent-regenerate` (or manually
      update `.claude/agents/` file), verify with `/agent-sync`; covers the "why §4 is the source
      of truth" principle
- [ ] `docs/claude-ecosystem/blog.md` created: 500–800 word post covering why the project uses
      an agent ecosystem, how agents and skills differ, what a typical session looks like
      end-to-end, and how the guardrails (HCPs, CI gates, ailog) give the team confidence when AI
      is driving implementation
- [ ] Both tutorials note that the lob-online configuration is generated and project-specific;
      readers implementing their own ecosystem should treat these as a pattern, not a template to
      copy verbatim
- [ ] `/dev-build` passes (format clean, lint clean, build succeeded)

## Files to Create / Modify

| File                                             | Action |
| ------------------------------------------------ | ------ |
| `docs/claude-ecosystem/tutorial-new-agent.md`    | CREATE |
| `docs/claude-ecosystem/tutorial-modify-agent.md` | CREATE |
| `docs/claude-ecosystem/blog.md`                  | CREATE |

## Tests Required

No unit tests. `/dev-build` must pass (format clean, lint clean, build succeeded).

## Rules / Data Dependencies

None — no game mechanics involved.

## Depends On

\#22

## Milestone

`v1.0 — MVP`
