# Implementation Plan: Agentic Quality Rails — Conductor Workflow Hardening

**Track ID:** agentic-quality-rails_20260506
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-06
**Status:** [ ] Not Started

## Interaction Mode

**Mode:** Autonomous
**Human control points:** Review spec and plan before implementation begins; confirm before committing.

## Risk Classification

**Risk:** Low
**Reason:** Documentation and npm script additions only. No runtime behavior changes, no schema changes, no auth/session/rules-engine paths touched.

## Quality Gates

- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Lint and format checks clean
- [ ] Tests green with no unexpected warnings
- [ ] Ready for `/team-review`

---

## Overview

Three implementation phases: (1) commit the already-modified working-tree files that add the second-pass trigger policy; (2) create the new quality rails rule file and update all remaining command/workflow/rules docs; (3) add the `quality:strict` npm script and update the example track. All work is documentation + one npm script — no application code changes.

## Phase 1: Commit Existing Second-Pass Trigger Work

The working tree already contains partial implementation from the second-pass trigger additions. Commit these on a feature branch so subsequent changes build on a clean baseline.

### Tasks

- [x] Task 1.1: Create feature branch `feat/347-agentic-quality-rails` from master
- [ ] Task 1.2: Stage and commit the already-modified files:
  - `.claude/README.md` (review/debt skills table)
  - `.claude/commands/pr-merge.md` (second-pass check before merge)
  - `.claude/commands/team-review.md` (Phase 6 second-pass trigger, Phase 7 debt scoring)
  - `.claude/commands/tech-debt-report.md` (second-pass confirmation + report section)
  - `docs/designs/high-level-design.md` (second-pass standard)
  - `docs/tech-debt/README.md` (targeted second-pass section)
  - `docs/tech-debt/ai-efficiency-quality-assessment.md` (recommendation reordering)

### Verification

- [ ] `git status` shows working tree clean after commit
- [ ] `npm run lint && npm run format:check` pass

## Phase 2: Quality Rails Rule File + Workflow/Command Updates

Create the new rule file and update all remaining docs per the acceptance criteria.

### Tasks

- [ ] Task 2.1: Create `.claude/rules/agentic-quality-rails.md` with:
  - Interaction modes: Autonomous (default) and Checkpointed (high-risk triggers)
  - Risk classes: Low / Medium / High with definitions
  - Warning-free completion policy
  - Immediate debt-capture policy
  - Strict closeout quality gates
  - Required track metadata fields (Interaction Mode, Risk Classification, Human Control Points, Quality Gates, Debt Budget, Completion Contract)

- [ ] Task 2.2: Update `.claude/rules/sdlc.md` to reference the quality rails rule file in the lifecycle description (Track creation and Implementation loop steps)

- [ ] Task 2.3: Update `conductor/workflow.md` to document required track sections: Interaction Mode, Risk Classification, Human Control Points, Quality Gates, Debt Budget, Completion Contract — with Autonomous/Checkpointed definitions and trigger list

- [ ] Task 2.4: Update `.claude/commands/dev-test.md` to require scanning captured test output for unexpected warnings (Vue warnings, unhandled promise rejections, unexpected `console.warn`/`console.error`); flag these as blockers equivalent to test failures unless classified as accepted prototype noise

- [ ] Task 2.5: Update `.claude/commands/plan-wrap.md` to:
  - Run gates in order: `validate-data`, `lint`, `format:check`, `test`, `build`
  - Stop if tests pass but emit unexpected warnings (unless explicitly classified as accepted prototype noise)
  - Document the accepted-noise classification format

- [ ] Task 2.6: Update `.claude/commands/team-review.md`:
  - Change default reviewers from `security,performance,architecture` to `security,architecture,testing,maintainability`
  - Add conditional reviewer guidance: use `performance` when hot paths or algorithms changed; `domain` when rules-engine/movement/LOS/combat touched; `accessibility` when UI components changed

### Verification

- [ ] `npm run lint && npm run format:check` pass
- [ ] All new/updated files are consistent (same trigger conditions across all docs)

## Phase 3: Quality Script + Example Track Update

### Tasks

- [ ] Task 3.1: Add `quality:strict` script to `package.json` that runs `validate-data && lint && format:check && test && build` in sequence (chain existing scripts, no new tooling)

### Verification

- [ ] `npm run quality:strict` exits 0
- [ ] `npm run test` passes with no unexpected warnings

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes cleanly
- [ ] No unexpected test warnings
- [ ] `conductor/tracks.md` updated with this track
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
