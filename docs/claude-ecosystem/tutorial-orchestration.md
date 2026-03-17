# Tutorial: Creating a Workflow Definition

> **Note:** This tutorial describes the orchestration layer built for the **lob-online**
> project. File paths, schema details, and runtime behaviour are project-specific. Treat this
> as a worked pattern — your own ecosystem will have different agents, steps, and gate prompts.

This tutorial walks through creating a new declarative workflow definition: the `.workflow.json`
file that sequences agents and skills into a pipeline, the companion `.states.md` state machine
document, and the registry entries required for the runtime to resolve each step.

---

## Prerequisites

- The agents and skills that the workflow will call are already defined (see
  [tutorial-new-agent.md](tutorial-new-agent.md))
- Each agent/skill has an entry in `.claude/agents/registry.json` with a unique `id`
- `server/src/orchestrator/` is present in the project (schemas, registry, runtime modules)

---

## Concepts: how the runtime executes a workflow

Before writing any files, it helps to understand the execution model.

### Steps

Every workflow is a flat, ordered array of **steps**. Each step is either an **agent step**
or a **gate step**:

- **Agent step** — has a non-null `agentId`. The runtime resolves the id through the registry,
  builds the step's input by resolving `inputMap` expressions against prior step outputs, then
  calls `dispatch(agentId, resolvedInput, step)`. The return value is stored in `stepResults`
  under the step's `id` and is available to later steps via `inputMap`.

- **Gate step** — has `agentId: null` and a `gateConfig`. The runtime presents the gate prompt
  to the engineer (CLI readline by default), records their choice and an optional note in
  `gateDecisions`, and routes to the next step based on the choice's `nextStep` value.

### Loop-back routing

A gate choice with a non-null `nextStep` restarts execution at that earlier step. The
`WorkflowInstance` state is preserved — prior `stepResults` and `gateDecisions` are kept —
so the re-run sees all outputs from the first pass. Loop-back choices are how a workflow
handles "revise" or "fix" paths without branching into a separate workflow.

### `inputMap` and JSONPath

Each step has an `inputMap` — a map from input key names to JSONPath expressions. The runtime
resolves these against the accumulated `stepResults` using the subset syntax `$.stepId` or
`$.stepId.field.subfield`. If a step's output is `{ issueNumber: 42 }` and a later step has
`inputMap: { "issue": "$.prior-step.issueNumber" }`, the later step receives `{ issue: 42 }`.

### `onError` policy

Each step has an `onError` field: `"halt"` (default) stops the workflow and persists a failed
`WorkflowInstance`; `"continue_with_warning"` logs the error and stores a warning in
`stepResults`, allowing the workflow to proceed.

### Persistence

After every step the runtime writes a `WorkflowInstance` JSON file to `docs/ailog/` as
`{runId}-instance.json`. This gives you a checkpoint of execution state at every transition —
useful for debugging a failed workflow or auditing what decisions were made.

---

## Step 1 — Plan the pipeline

Before writing JSON, map the pipeline on paper:

1. List the steps in order
2. Mark which steps are agent steps and which are gate steps
3. For each gate step, decide the choices and whether any choice loops back to an earlier step
4. Identify which step outputs need to flow into later steps via `inputMap`

A simple notation:

```
[agent: issue-start] → [gate: plan-ok?]
  → approve: [agent: branch] → [agent: implement] → [gate: push?]
    → push: [agent: pr-create] → ...
  → revise: back to issue-start
```

---

## Step 2 — Create the workflow directory

```bash
mkdir -p docs/workflows/<workflow-id>
```

Each workflow lives in its own subdirectory under `docs/workflows/`. The directory name
should match the workflow's `id` field.

---

## Step 3 — Write `<workflow-id>.workflow.json`

Create `docs/workflows/<workflow-id>/<workflow-id>.workflow.json`. The schema has four top-level
fields:

```json
{
  "id": "my-workflow",
  "name": "My Workflow",
  "description": "One sentence describing what this workflow does end-to-end.",
  "steps": [ ... ]
}
```

### Agent step shape

```json
{
  "id": "step-id",
  "name": "Human-readable step name",
  "agentId": "registry-id",
  "inputMap": {
    "key": "$.prior-step-id.outputField"
  },
  "onError": "halt"
}
```

- `agentId` must match an `id` in `.claude/agents/registry.json`
- `inputMap` can be `{}` if no prior step output is needed
- `onError` is `"halt"` or `"continue_with_warning"`

### Gate step shape

```json
{
  "id": "gate-id",
  "name": "Gate: Human-readable description (HCP N)",
  "agentId": null,
  "inputMap": {},
  "onError": "halt",
  "gateConfig": {
    "prompt": "What the engineer sees. Describe the current state and what they are deciding.",
    "choices": [
      {
        "label": "Proceed — continue to next step",
        "value": "proceed",
        "onChoice": { "nextStep": null }
      },
      {
        "label": "Revise — return to earlier step",
        "value": "revise",
        "onChoice": { "nextStep": "earlier-step-id" }
      }
    ],
    "defaultChoice": "proceed"
  }
}
```

- `nextStep: null` advances to the step immediately after the gate
- `nextStep: "step-id"` loops back to that step; it must be a valid step `id` in this workflow
- `defaultChoice` is the value selected if the engineer presses Enter without typing

### Worked example: a two-step pipeline with one gate

```json
{
  "id": "example",
  "name": "Example Workflow",
  "description": "Draft a document, get approval, then publish.",
  "steps": [
    {
      "id": "draft",
      "name": "Draft Document",
      "agentId": "docs-writer",
      "inputMap": {},
      "onError": "halt"
    },
    {
      "id": "gate-approve",
      "name": "Gate: Approve Draft",
      "agentId": null,
      "inputMap": {},
      "onError": "halt",
      "gateConfig": {
        "prompt": "The draft is ready. Review docs/draft.md and choose an action.",
        "choices": [
          {
            "label": "Approve — publish",
            "value": "approve",
            "onChoice": { "nextStep": null }
          },
          {
            "label": "Revise — return to drafting",
            "value": "revise",
            "onChoice": { "nextStep": "draft" }
          }
        ],
        "defaultChoice": "approve"
      }
    },
    {
      "id": "publish",
      "name": "Publish",
      "agentId": "docs-publisher",
      "inputMap": {
        "draftPath": "$.draft.outputPath"
      },
      "onError": "halt"
    }
  ]
}
```

---

## Step 4 — Write `<workflow-id>.states.md`

Every workflow definition must have a companion state machine document at
`docs/workflows/<workflow-id>/<workflow-id>.states.md`. This file serves as human-readable
documentation, makes the loop-back risks explicit, and renders as a diagram in GitHub.

The file has three sections:

### §1 Description

One paragraph summarising the workflow's purpose, the HCPs it contains, and the loop-back
paths available.

### §2 State diagram (Mermaid)

```markdown
\`\`\`mermaid
stateDiagram-v2
[*] --> step_id : start

    step_id --> gate_id : output produced
    gate_id --> next_step : proceed
    gate_id --> step_id : revise

    next_step --> [*] : done

\`\`\`
```

Use underscores in Mermaid state names (the step ids use hyphens, which Mermaid does not
allow in unquoted state identifiers). Each arrow label briefly describes the transition
condition or choice value.

### §3 Gate checkpoint table

```markdown
| Step ID   | Prompt summary             | Choices         | Default | Loop-back risk             |
| --------- | -------------------------- | --------------- | ------- | -------------------------- |
| `gate-id` | What the engineer is asked | approve, revise | approve | `revise` → re-runs `draft` |
```

The "loop-back risk" column flags choices that return to an earlier step — important for
understanding what state is preserved and what is re-run.

---

## Step 5 — Verify registry entries

Every `agentId` referenced in the workflow must have a matching entry in
`.claude/agents/registry.json`. The runtime calls `resolveAgent(agentId)` before dispatching
each step and throws `Unknown agent id "<id>"` if the entry is missing.

```bash
# List all agentIds used in the workflow
grep '"agentId"' docs/workflows/<workflow-id>/<workflow-id>.workflow.json \
  | grep -v 'null' | sort -u

# Confirm each id exists in the registry
grep '"id"' .claude/agents/registry.json
```

---

## Step 6 — Validate the workflow definition

The runtime validates the definition against `WorkflowDefinitionSchema` at startup. You can
check it manually with a quick Node.js snippet:

```js
import { WorkflowDefinitionSchema } from './server/src/orchestrator/schemas.js';
import definition from './docs/workflows/my-workflow/my-workflow.workflow.json' assert { type: 'json' };

const result = WorkflowDefinitionSchema.safeParse(definition);
if (!result.success) console.error(result.error.issues);
else console.log('Valid:', result.data.steps.length, 'steps');
```

Or run the test suite — `npm test` covers schema validation and will catch malformed step
definitions:

```bash
npm test
```

---

## Step 7 — Run `/dev-build` to confirm no breakage

```
/dev-build
```

This catches JSON syntax errors (ESLint's `json` plugin) and Prettier formatting issues in
the new files.

---

## Worked Example: `issue-intake` workflow

The `issue-intake` workflow at
`docs/workflows/issue-intake/issue-intake.workflow.json` is the simplest of the four
lob-online workflows. Here is how each step of this tutorial applied:

**Step 1 — Plan:**

```
[issue-intake: gather]
  → [gate: file-issue (HCP 1)]
    → file: [issue-intake: create-issue]
    → revise: back to gather
```

**Step 2 — Directory:** `docs/workflows/issue-intake/`

**Step 3 — `.workflow.json`:** 3 steps, 1 gate. The `create-issue` step runs `gh issue create`
after the engineer approves the draft at the gate.

**Step 4 — `.states.md`:** Mermaid diagram with 3 states; gate checkpoint table with 1 row
noting that `revise` loops back to `gather`.

**Step 5 — Registry:** `issue-intake` was already registered. No new entries needed.

**Step 6 — Validation:** `npm test` passes; schema validation in `schemas.test.js` covers
the `WorkflowDefinitionSchema`.

---

## Summary

| Step | File(s)                                  | Notes                                            |
| ---- | ---------------------------------------- | ------------------------------------------------ |
| 1    | (planning only)                          | Map steps, gates, loop-backs, and inputMap flows |
| 2    | `docs/workflows/<id>/` directory         | One directory per workflow                       |
| 3    | `docs/workflows/<id>/<id>.workflow.json` | Agent steps + gate steps; reference registry ids |
| 4    | `docs/workflows/<id>/<id>.states.md`     | Description + Mermaid diagram + gate table       |
| 5    | `.claude/agents/registry.json`           | Every referenced `agentId` must have an entry    |
| 6    | (validation)                             | `npm test` or manual Zod parse                   |
| 7    | (build check)                            | `/dev-build` — format, lint, build               |
