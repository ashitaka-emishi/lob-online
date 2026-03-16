---
issue: 32
title: Add orchestration agent with blocking-gate workflow engine
date: 2026-03-16
milestone: v1.0 — MVP
---

## Description

The existing SDLC pipeline has well-defined agents for issue intake (`issue-intake`) and issue implementation (`issue-implement`), but no layer to sequence them, manage handoffs between steps, or enforce human control points programmatically. This issue adds an Orchestration Agent — a Node.js runtime that reads a declarative `WorkflowDefinition` JSON, executes steps by invoking registered skills and agents by id, pauses at blocking `GateDef` checkpoints for human input, and persists a `WorkflowInstance` JSON co-located with the existing ailog. The first workflow implemented is `sdlc-feature` (draft → review → test → deploy); the existing `issue-intake` and `issue-implement` sequences are also formalised as workflow definitions and state machine documents.

## Acceptance Criteria

- [ ] `WorkflowDefinition`, `StepDef`, `GateDef`, `WorkflowInstance`, and `AgentManifest` types are defined as Zod schemas in `server/src/orchestrator/schemas.js` and validated at load time
- [ ] A shared agent registry file at `.claude/agents/registry.json` holds all `AgentManifest` entries; workflow definitions reference agents by `id` only
- [ ] `WorkflowDefinition` JSON files live under `docs/workflows/{name}/{name}.workflow.json`; each is accompanied by `{name}.states.md` containing: (1) prose description, (2) Mermaid `stateDiagram-v2` diagram with gate choices as labelled transitions, (3) gate checkpoint table (step id, prompt, choices, default, loop-back risk)
- [ ] Orchestrator runtime (`server/src/orchestrator/runtime.js`) executes steps in declaration order, resolving `inputMap` JSONPath expressions against prior step outputs stored in `WorkflowInstance.stepResults`
- [ ] Orchestrator resolves and invokes skills and agents by `agentId` via the shared registry — no raw LLM calls or subprocess spawning
- [ ] Gate steps (`agentId: null`) pause execution, display the templated `GateDef.prompt` via a CLI readline interface, and record the human's choice + optional note + timestamp in `WorkflowInstance.gateDecisions`
- [ ] Loop-back routing works correctly: a gate choice whose `onChoice.nextStep` points to an earlier step restarts from that step with the accumulated state intact
- [ ] `WorkflowInstance` JSON is persisted to `docs/ailog/` alongside the existing ailog entry for the same run, using the naming pattern `YYYY_MM_DD-LOB-{####}-instance.json`
- [ ] `sdlc-feature` workflow fully implemented: steps `draft-spec → [gate-spec] → generate-code → review-code → [gate-code-review] → run-tests → [gate-test-results] → prepare-deploy → [gate-deploy] → deploy-exec`
- [ ] `sdlc-feature.workflow.json` + `sdlc-feature.states.md` created under `docs/workflows/sdlc-feature/`
- [ ] `issue-intake` workflow formalised as `docs/workflows/issue-intake/issue-intake.workflow.json` + `issue-intake.states.md`; captures the 6-step branch → gather → HCP-file → commit → pr-create → HCP-merge sequence with its two `GateDef` checkpoints
- [ ] `issue-implement` workflow formalised as `docs/workflows/issue-implement/issue-implement.workflow.json` + `issue-implement.states.md`; captures the issue-start → HCP1 → branch → implement → build → test → HCP2 → pr-create → pr-review → HCP2b → pr-merge → HCP3 sequence
- [ ] Unit tests cover: step sequencing, gate pause/resume, loop-back routing, registry resolution, `onError: 'halt'` vs `onError: 'continue_with_warning'`, JSONPath inputMap resolution
- [ ] `/dev-build` passes (format, lint, build)
- [ ] Vitest line coverage ≥ 70% on all new orchestrator source files

## Files to Create / Modify

| File                                                           | Action                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `server/src/orchestrator/schemas.js`                           | CREATE — Zod schemas for all five domain types                      |
| `server/src/orchestrator/runtime.js`                           | CREATE — step executor, gate handler, instance persistence          |
| `server/src/orchestrator/registry.js`                          | CREATE — loads and resolves `AgentManifest` entries from registry   |
| `server/src/orchestrator/schemas.test.js`                      | CREATE                                                              |
| `server/src/orchestrator/runtime.test.js`                      | CREATE                                                              |
| `.claude/agents/registry.json`                                 | CREATE — programmatic `AgentManifest` registry                      |
| `docs/workflows/sdlc-feature/sdlc-feature.workflow.json`       | CREATE                                                              |
| `docs/workflows/sdlc-feature/sdlc-feature.states.md`           | CREATE                                                              |
| `docs/workflows/issue-intake/issue-intake.workflow.json`       | CREATE                                                              |
| `docs/workflows/issue-intake/issue-intake.states.md`           | CREATE                                                              |
| `docs/workflows/issue-implement/issue-implement.workflow.json` | CREATE                                                              |
| `docs/workflows/issue-implement/issue-implement.states.md`     | CREATE                                                              |
| `docs/architecture.md`                                         | MODIFY — add Orchestration Agent to agent table and Mermaid diagram |
| `CLAUDE.md`                                                    | MODIFY — document orchestration agent and workflow invocation       |

## Tests Required

- `schemas.test.js`: Zod parse succeeds on a valid `WorkflowDefinition`; rejects missing required fields; rejects unknown `onError` values
- `runtime.test.js`: two-step workflow executes steps in order and produces correct `stepResults`; gate step pauses and resumes correctly on mock readline input; loop-back choice re-queues the target step; `onError: 'halt'` stops execution and sets `status: 'failed'`; JSONPath `inputMap` expression correctly extracts a nested value from a prior step's output
- `registry.test.js`: resolves a known agent id; throws on unknown id; loads all entries from the registry file

## Rules / Data Dependencies

None — no game mechanics involved.

## Depends On

None.

## Milestone

v1.0 — MVP

## Out of Scope (v1)

- HTTP-based gate interface (design the CLI handler as a swappable module, don't build the HTTP version)
- Multi-agent parallelism
- Workflow versioning / migration tooling

## Resolved Design Decisions

- **WorkflowInstance persistence:** JSON file in `docs/ailog/`, co-located with existing ailog entries for the same run — naming pattern `YYYY_MM_DD-LOB-{####}-instance.json`
- **Agent registry:** `.claude/agents/registry.json` — single source of truth alongside existing agent definitions
- **Invocation model:** orchestrator calls skills and agents by registry `id` — not subprocess or direct LLM calls
