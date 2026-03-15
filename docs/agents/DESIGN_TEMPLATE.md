# [Agent Name] Agent Design

## 1. Overview

[Role summary — what the agent does and why it exists in this project.]

### Guiding Principles

- **[Principle]** — [explanation]

---

## 2. [Domain-Specific Section]

<!-- devops: Directory Layout; project-manager: GitHub Environment;
     code-review: Directory Layout; rules-lawyer: Source Library -->

---

## 3. Skills

<!-- omit entirely if agent owns no skills -->

### `skill-name` — `.claude/commands/skill-name.md`

[Purpose and steps]

---

## 4. Agent Definition

<!-- KEY DESIGN RULE: This section heading must never be renamed.
     The /regenerate-agents and /sync-agents skills locate content here. -->

**File:** `.claude/agents/<name>.md`

```yaml
---
name: <name>
description: >
  [One-paragraph description used by Claude Code to route tasks to this agent.]
tools: [Tool1, Tool2]
---
```

### Agent Responsibilities

- [Responsibility]

### What the Agent Does NOT Do

- [Exclusion]

### Key Files

- `path/to/file` — [why relevant]

---

## 5. Implementation Checklist

- [ ] `docs/agents/<name>/prompt.md`
- [ ] `docs/agents/<name>/design.md`
- [ ] `.claude/agents/<name>.md`
- [ ] `CLAUDE.md` updated
