# issue-implement — State Machine

## 1. Description

The `issue-implement` workflow drives the full ticket-to-merge cycle for a GitHub issue.
It sequences issue-start, branch creation, implementation, doc-sync, ecosystem-docs-generate,
build, test, PR creation, code review, merge, and issue close, with five human gate checkpoints:

- **HCP 1** (gate-plan) — engineer approves the implementation plan before any code is written
- **HCP 2** (gate-impl) — engineer approves build/test results before the branch is pushed
- **HCP 2b** (gate-review) — engineer decides how to handle PR review findings
- **HCP 3** (gate-merged) — engineer confirms the final squash merge
- **HCP 4** (gate-close) — engineer confirms closing the GitHub issue after merge

Loop-back choices at each gate return execution to the appropriate earlier step while
preserving accumulated `WorkflowInstance` state (step outputs, prior gate decisions).

## 2. State Diagram

```mermaid
stateDiagram-v2
    [*] --> issue_start : start

    issue_start --> gate_plan : plan drafted (HCP 1)
    gate_plan --> branch : proceed
    gate_plan --> issue_start : revise

    branch --> implement : branch created
    implement --> doc_sync : code written
    doc_sync --> ecosystem_docs : project docs synced
    ecosystem_docs --> build : ecosystem docs regenerated
    build --> test : build passed
    test --> gate_impl : tests ran (HCP 2)
    gate_impl --> pr_create : push
    gate_impl --> implement : fix

    pr_create --> pr_review : PR open
    pr_review --> gate_review : review complete (HCP 2b)
    gate_review --> pr_merge : accept
    gate_review --> implement : fix-all / fix-errors

    pr_merge --> gate_merged : checks pass (HCP 3)
    gate_merged --> gate_close : merge
    gate_merged --> [*] : hold

    gate_close --> close_issue : close (HCP 4)
    gate_close --> [*] : skip
    close_issue --> [*] : done
```

## 3. Gate Checkpoint Table

| Step ID       | Prompt summary                                      | Choices                     | Default | Loop-back risk                                |
| ------------- | --------------------------------------------------- | --------------------------- | ------- | --------------------------------------------- |
| `gate-plan`   | Plan + AC checklist shown; proceed or revise        | proceed, revise             | proceed | `revise` → re-runs `issue-start`              |
| `gate-impl`   | Build + test results shown; push or fix             | push, fix                   | push    | `fix` → re-runs `implement`; may loop on test |
| `gate-review` | PR review findings; accept, fix-all, or fix-errors  | accept, fix-all, fix-errors | accept  | `fix-*` → re-runs `implement`; may loop       |
| `gate-merged` | Final merge approval; merge or hold                 | merge, hold                 | merge   | `hold` terminates; no loop                    |
| `gate-close`  | Issue close confirmation after merge; close or skip | close, skip                 | close   | `skip` terminates; no loop                    |
