# lob-online Claude Ecosystem

> **Note:** This documentation describes the agent and skill configuration generated for the
> **lob-online** project specifically. Every project using Claude Code will have its own
> ecosystem shaped by its domain, workflow, and team conventions. Treat this as a worked
> example, not a universal template.

lob-online uses a structured set of Claude Code **agents** and **skills** to automate its
software development lifecycle — from scoping an idea to merging a reviewed, tested pull
request. Agents are specialised AI subprocesses with focused responsibilities; skills are
reusable Markdown prompt files that encode step-by-step procedures. Together they form a
lightweight but disciplined pipeline that keeps human judgment at every consequential decision
point while letting AI handle the repetitive scaffolding.

This hub is written for developers who are new to the project or working with AI tooling other
than Claude Code (e.g., GitHub Copilot / Codex). Every section includes both the Claude Code
invocation and the equivalent manual steps so the procedures are accessible regardless of which
AI assistant you use.

---

## Contents

| Document                                               | What it covers                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [agents.md](agents.md)                                 | Reference for each agent: purpose, collaborators, owned skills, allowed tools         |
| [skills.md](skills.md)                                 | Reference for each skill: purpose, owning agent, Claude Code usage, manual equivalent |
| [network-diagram.md](network-diagram.md)               | Mermaid diagrams: agent ownership, skill dependencies, SDLC sequence                  |
| [guardrails-and-logging.md](guardrails-and-logging.md) | How the ecosystem enforces quality and maintains an audit trail                       |
| [tutorial-new-agent.md](tutorial-new-agent.md)         | Step-by-step: create a new agent from scratch, with worked example                    |
| [tutorial-modify-agent.md](tutorial-modify-agent.md)   | Step-by-step: modify an existing agent; why design.md §4 is the source of truth       |
| [blog.md](blog.md)                                     | Introductory post: why lob-online uses an agent ecosystem and how the guardrails work |

---

## Quick-Start: Common Workflows

### Create a new GitHub issue

```
/issue-intake
```

Manual: open an `intake/{slug}` branch, draft the issue body following the template in
`.github/ISSUE_TEMPLATE/feature.md`, run `gh issue create`, commit the artifact to
`docs/intake/`, and open a PR.

### Implement an issue end-to-end

```
/issue-implement <number>
```

Manual: run `gh issue view <number>` to read the issue and draft an implementation plan.
Review the AC checklist and confirm your approach before writing any code. Create the branch
with `git checkout -b feat/<number>-<slug>`. Implement all ACs, then run
`npm run lint && npm run format:check && npm test`. Open a PR with `gh pr create`, get a
review pass, and squash-merge with `gh pr merge --squash --delete-branch` when approved.

### Build, lint, and format check

```
/dev-build
```

Manual: `npm run format && npm run lint && npm run build`

### Run the test suite

```
/dev-test
```

Manual: `npm test`
