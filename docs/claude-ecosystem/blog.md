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

## Agents vs. Skills: Two Levels of Responsibility

lob-online's ecosystem has two primitives: **agents** and **skills**.

An **agent** is a specialised AI subprocess with a defined scope. The `devops` agent handles
build, test, start, and stop operations. The `rules-lawyer` agent is the authoritative
wargame rules arbiter — its rulings cannot be overridden by other agents. The `issue-intake`
agent manages the full lifecycle of creating a GitHub issue, from first draft to merged PR.
Agents have an explicit tool allowlist (Bash, Read, Write, etc.) and a system prompt that
encodes their responsibilities and constraints.

A **skill** is a reusable Markdown prompt file that encodes a step-by-step procedure. Skills
are simpler than agents — they do not have their own subprocess or tool allowlist. Instead,
they run in the current context and can call agents and other skills. The `/dev-build` skill
runs format, lint, and build in order and stops on the first failure. The `/issue-implement`
skill sequences eight sub-skills from issue start to squash merge.

The distinction matters for routing: when you say "review this PR," Claude Code invokes the
`code-review` agent, which owns the `/pr-review` skill. The agent's scope ensures that PR
review does not accidentally trigger a deployment or file a new issue.

## A Typical Session: From Idea to Merged PR

Here is how the ecosystem handles a typical feature implementation end-to-end:

1. **Issue intake** — The engineer describes the feature in plain language. The `issue-intake`
   agent opens a branch, iteratively refines the draft with the engineer, consults the
   `rules-lawyer` if the feature touches game mechanics, and waits for explicit approval
   before filing the GitHub issue. The issue body is committed as a `docs/intake/` artifact.

2. **Implementation** — The engineer runs `/issue-implement <number>`. The `project-manager`
   agent fetches the issue, proposes an implementation plan, and presents **HCP 1**: the
   workflow does not proceed until the engineer says "proceed."

3. **Build and test** — After coding, the agent runs `/dev-build` (format → lint → build)
   and `/dev-test`. It presents the results and waits for **HCP 2**: the engineer says "push"
   before any code reaches GitHub.

4. **PR review** — The `code-review` agent examines the diff for dead code, coverage gaps,
   and standards violations. It presents a structured findings table and waits for **HCP 2b**:
   the engineer decides whether to fix everything, fix errors only, or accept as-is.

5. **Merge** — `/pr-merge` runs a final CI check and presents **HCP 3**: the PR is not
   squash-merged until the engineer says "merge."

The entire session — from plan approval to merge SHA — is recorded in a structured ailog
file (`docs/ailog/YYYY_MM_DD-LOB-{####}.md`) committed to the repository as a permanent
audit trail.

## The Declarative Workflow Layer

Skills encode procedures as Markdown prompts. But as the skill count grew, a second
representation became useful: **workflow definitions** — JSON files in `docs/workflows/`
that describe the same pipelines declaratively, as ordered step sequences with gate
checkpoints.

Each workflow definition (`*.workflow.json`) lists steps with `agentId` references
(resolved through `.claude/agents/registry.json`) and `inputMap` expressions
(`$.stepId.field`) that thread output from one step into the next. Gate steps have
`gateConfig` objects describing the choices and the loop-back target if the engineer
chooses to revise rather than proceed.

The `server/src/orchestrator/` Node.js runtime can execute these definitions
programmatically: it validates the definition against a Zod schema, iterates the step
sequence, dispatches agent steps via an injectable `dispatch` function, presents CLI gate
prompts to the engineer, handles loop-back routing, and persists a `WorkflowInstance` JSON
record to `docs/ailog/` alongside the human-readable ailog Markdown.

Today the workflow definitions formalise what the skills already do — they are
documentation as much as executable specifications. In a later phase, the runtime will drive
the `issue-implement` pipeline directly, replacing the chained skill invocations with a
single `runWorkflow` call. The architecture is designed so that transition requires no
changes to the skill files: the runtime's `dispatch` interface maps the same agent ids to
the same Markdown prompts.

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
revision. The most important: we initially had `issue-intake` as a flat skill owned by the
`project-manager` agent. When we needed the intake workflow to have its own branch/PR
lifecycle, we had to promote it to a first-class agent — a refactor that touched eight files.
If we had modelled intake as a standalone agent from the start, that work would not have been
needed.

The lesson is to be generous with agent scope when the workflow is genuinely distinct. Skills
are great for procedures that compose naturally with other skills. Agents are better when a
workflow needs its own branch, its own set of constraints, or its own collaborator graph.

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
