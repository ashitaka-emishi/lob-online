---
issue: 22
title: Create .claude ecosystem reference documentation
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

The `.claude/` directory drives lob-online's AI-assisted development lifecycle through a set of
agents and skills, but there is no unified reference hub aimed at developers who are new to the
project or using different AI tooling (e.g., GitHub Copilot / Codex). This issue creates
`docs/claude-ecosystem/` as that hub — a self-contained reference covering agents, skills,
network diagrams, usage guidance (both Claude Code slash-command and equivalent manual steps),
and a dedicated section on how the ecosystem maintains guardrails and an audit trail. The hub
opens with a disclaimer that this is lob-online's generated ecosystem; individual projects will
vary.

## Acceptance Criteria

- [ ] `docs/claude-ecosystem/README.md` created: one-paragraph overview stating this documents
      lob-online's specific agent ecosystem (generated configuration — individual projects will
      vary); TOC linking all sections
- [ ] `docs/claude-ecosystem/agents.md` created: for each agent — name, purpose, collaborators,
      owned skills (linked to skills.md anchors), allowed tools
- [ ] `docs/claude-ecosystem/skills.md` created: for each skill — name, purpose, owning agent,
      related skills, usage via Claude Code slash-command, equivalent manual bash steps for
      non-Claude users
- [ ] `docs/claude-ecosystem/network-diagram.md` created: Mermaid diagrams covering agent→skill
      ownership, skill→skill dependency graph, full SDLC sequence (intake → implement → review →
      merge)
- [ ] `docs/claude-ecosystem/guardrails-and-logging.md` created: explains (a) Human Control
      Points — what they are, where they appear, what happens if skipped; (b) CI gates —
      lint/format/test must pass before merge; (c) rules-lawyer gate — game-logic issues must be
      reviewed before filing; (d) ailog — AI execution logs at `docs/ailog/` as a permanent audit
      trail of AI planning and human approvals; (e) devlog — per-session diary at `docs/devlog/`
      capturing design decisions
- [ ] `.claude/README.md` updated: Documentation table includes link to
      `docs/claude-ecosystem/README.md`
- [ ] `/dev-build` passes (format clean, lint clean, build succeeded)

## Files to Create / Modify

| File                                              | Action |
| ------------------------------------------------- | ------ |
| `docs/claude-ecosystem/README.md`                 | CREATE |
| `docs/claude-ecosystem/agents.md`                 | CREATE |
| `docs/claude-ecosystem/skills.md`                 | CREATE |
| `docs/claude-ecosystem/network-diagram.md`        | CREATE |
| `docs/claude-ecosystem/guardrails-and-logging.md` | CREATE |
| `.claude/README.md`                               | MODIFY |

## Tests Required

No unit tests. `/dev-build` must pass (format clean, lint clean, build succeeded).

## Rules / Data Dependencies

None — no game mechanics involved.

## Depends On

None.

## Milestone

`v1.0 — MVP`
