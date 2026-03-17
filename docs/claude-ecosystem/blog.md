# Why lob-online Uses an Agent Ecosystem for AI-Assisted Development

> **Note:** This post describes the specific agent ecosystem built for the **lob-online**
> project. The patterns are transferable, but the configuration — agent names, skill files,
> workflow steps — is generated and project-specific. If you are implementing something
> similar, treat this as a worked example, not a universal recipe.

---

When we started building lob-online — an online implementation of the _Line of Battle v2.0_
wargame system — we knew AI assistance would be central to the development process. The
question was not _whether_ to use AI, but _how_ to use it without losing engineering
discipline. The answer was a structured ecosystem of specialised agents and reusable skills,
with human control points at every consequential decision.

## The Problem with Unstructured AI Assistance

The instinctive way to use an AI coding assistant is conversational: describe what you want,
get code back, iterate. This works well for isolated tasks. It breaks down when the tasks are
consequential — filing a GitHub issue that will guide weeks of implementation, merging a PR
that modifies shared data files, or making a rules call on a published board game that has a
correct answer you cannot afford to get wrong.

The failure mode is not that the AI produces bad output. It is that there is no discipline
around _when_ to act on that output. The AI files the issue before you have confirmed the
acceptance criteria are testable. It merges the PR before the lint check has run. It
implements game logic based on the most plausible reading of the rules rather than the
authoritative one. Each individual error is small. Accumulated across a project, they
compound into a codebase where the rules are wrong, the history is opaque, and no one is
quite sure why things are the way they are.

## Three Layers: Agents, Skills, and Orchestration

lob-online's ecosystem is built from three interlocking primitives. Understanding how they
relate to each other is the key to understanding how the whole thing holds together.

### Layer 1 — Agents: scope and responsibility

An **agent** is a specialised AI subprocess with a defined responsibility boundary. The
`devops` agent handles build, test, start, and stop operations. The `rules-lawyer` agent is
the authoritative wargame rules arbiter — its rulings cannot be overridden by any other
agent.

Each agent has two constraints baked in: an **allowed-tools list** (Bash, Read, Write, and
so on) that limits what the subprocess can touch, and a **system prompt** that encodes its
responsibilities and what it must not do. These constraints mean an agent cannot accidentally
exceed its scope, even if the engineer asks it to. The `rules-lawyer` has no Bash access and
cannot write files.

Agents answer the question: _what is this AI subprocess allowed to do, and what is it
responsible for?_

### Layer 2 — Skills: composable procedures

A **skill** is a reusable Markdown prompt file that encodes a step-by-step procedure.
Skills are lighter than agents — they run in the current context rather than a separate
subprocess, and they have no tool allowlist of their own. What they do have is structure:
each skill is a numbered sequence of steps, each step describes exactly what to run and what
to check, and many steps include an explicit human control point.

Skills compose freely. The `/dev-build` skill (owned by `devops`) runs format, lint, and
build in order, stopping on the first failure. The `/pr-create` skill chains `/dev-build`
as a prerequisite before opening a PR. Skill ownership records accountability; cross-agent
skill calls are normal and expected.

This composability is the key distinction from agents. An agent defines a scope boundary.
A skill defines a procedure that can freely cross those boundaries to get a job done.
Skills answer the question: _what steps, in what order, must be taken to complete this task?_

### Layer 3 — Orchestration: plugins with gate checkpoints

The orchestration layer sequences agents and skills into pipelines. lob-online uses the
[wshobson/agents](https://github.com/wshobson/agents) plugin marketplace for this layer —
specifically the `conductor` plugin (SDLC track management) and `agent-teams` plugin
(parallel multi-agent workflows).

`conductor` organises work into **tracks**: a spec document, a phased implementation plan,
and TDD task execution with checkpoints at phase boundaries. `/conductor:new-track` replaces
the old `/issue-intake` + `/issue-implement` pair. `agent-teams` spawns multiple specialised
reviewer or implementer agents in parallel; `/team-review` replaces the old `/pr-review`.

The relationship between the three layers: **agents** define what each subprocess is allowed
to do; **skills** compose agents into procedures with human control points; **orchestration**
sequences those procedures with gate checkpoints, making pipelines inspectable and driving
them with minimal manual invocation.

## A Typical Session: From Idea to Merged PR

Here is how all three layers cooperate in a typical feature implementation:

1. **Track creation** — The engineer runs `/conductor:new-track`. Conductor gathers the
   intent, consults `rules-lawyer` if the feature touches game mechanics, and writes a spec
   and phased implementation plan. A checkpoint gate stops before any code is written.

2. **Implementation** — `/conductor:implement` is invoked. Conductor works through the
   track's tasks in TDD order, pausing at phase boundaries for engineer approval.

3. **Build and test** — After implementation, `/dev-build` and `/dev-test` (both owned by
   `devops`) run. The engineer says "push" before any code reaches GitHub.

4. **PR review** — `/team-review` is invoked, spawning parallel reviewers across security,
   performance, architecture, and testing dimensions. Findings are presented and triaged.

5. **Merge** — `/pr-merge` runs a final CI check and squash-merges only after the engineer
   says "merge."

6. **Close** — `/issue-close` posts a merge summary comment and closes the GitHub issue;
   the engineer must say "close" explicitly.

The entire session is recorded in a structured ailog file committed to the repository as a
permanent audit trail.

## How the Guardrails Provide Confidence

The ecosystem's confidence model rests on five mechanisms working together:

- **Human control points** stop the AI before every irreversible action. The AI never files
  an issue, pushes code, or merges a PR without an explicit human signal.
- **CI gates** (lint, format check, tests) run locally before any PR is opened and again in
  GitHub Actions before merge. A PR cannot be squash-merged if CI is red.
- **The rules-lawyer gate** ensures that any issue touching game mechanics is reviewed by the
  `rules-lawyer` agent before acceptance criteria are written. This catches rules
  misunderstandings at the cheapest possible moment — before any code is written.
- **AI execution logs (ailog)** capture every planning decision and human approval as a
  permanent record. They answer "why was this implemented this way?" without archaeology.
- **The devlog** provides human-readable narrative for every working session — design
  decisions, tradeoffs, and what was deferred — written at the time the decision was made.

None of these mechanisms is novel in isolation. What makes the ecosystem valuable is that
they are _enforced by the workflow_, not left to individual discipline. The AI cannot skip
the lint check because the skill stops on lint failure. It cannot skip HCP 1 because the
prompt will not continue without the required signal. The guardrails are baked in, not bolted
on.

## What We Would Do Differently

The ecosystem was built incrementally over multiple sessions, and a few decisions required
revision. The most important: we initially built a hand-rolled Node.js orchestrator runtime
and four JSON workflow definitions to sequence agents and skills. When the wshobson/agents
plugin marketplace matured, we migrated to `conductor` and `agent-teams` — removing ~3000
lines of bespoke orchestration code and gaining parallel debugging, parallel review, and
track-based SDLC management in exchange.

The lesson is to defer building orchestration infrastructure until you have concrete evidence
that existing tools cannot solve the problem. The lob-specific orchestrator was a useful
learning exercise, but the plugin layer proved more capable and maintainable.

## Using This Pattern in Your Own Project

If you are reading this as a developer on a different project — or using Codex, Copilot, or
another AI assistant rather than Claude Code — the underlying pattern still applies:

1. Give each AI responsibility a name and a scope boundary
2. Encode step-by-step procedures in reusable prompt files
3. Put a human approval gate before every irreversible action
4. Log every AI planning decision and human approval as a committed artifact

The lob-online configuration is project-specific. The agents reference game rules, specific
data file paths, and workflow conventions that will not match your project. But the
architecture — agents with explicit scopes, skills as composable procedures, HCPs as
mandatory stops — is a pattern that transfers.
