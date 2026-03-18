# Implementation Plan: Technical Debt Tracking System

**Track ID:** tech-debt-tracking_20260318
**Spec:** [spec.md](./spec.md)
**Created:** 2026-03-18
**Status:** [x] Complete

## Overview

Three phases: (1) establish the data structure and conventions (directory layout, filename convention, debt score scale docs), (2) build the `/tech-debt-report` skill that guides the user through deferred-item scoring and per-PR report generation, (3) integrate the skill into the SDLC workflow and update the aggregated project-wide report on each run.

---

## Phase 1: Foundation — Directory Layout & Conventions

Establish the file structure, report templates, and debt score reference so Phase 2 has a concrete target to write to.

### Tasks

- [x] Task 1.1: Create `docs/tech-debt/` directory with a `README.md` that documents the debt score scale (1–5 logarithmic), filename convention (`pr-{number}_{YYYY-MM-DD}.md`), and the purpose of each file in the directory.
- [x] Task 1.2: Create `docs/tech-debt/report.md` — the aggregated project-wide debt report — seeded with the skeleton structure: executive summary, debt-over-time section (placeholder), risk section, and an empty open debt items table.
- [x] Task 1.3: Create `docs/tech-debt/reports/` subdirectory with a `.gitkeep` so the directory is tracked.

### Verification

- [x] `docs/tech-debt/README.md`, `docs/tech-debt/report.md`, and `docs/tech-debt/reports/.gitkeep` exist and are committed.
- [x] Debt score scale and filename convention are clearly documented and consistent with the spec.

---

## Phase 2: `/tech-debt-report` Skill

Build the skill that a developer runs after completing PR review resolution. The skill guides the user through classifying each deferred finding, generates the per-PR report, and updates the aggregated report.

### Tasks

- [x] Task 2.1: Create `.claude/commands/tech-debt-report.md` — the skill prompt. The skill should:
  - Accept optional PR number argument (prompts if not supplied).
  - Enumerate deferred findings from the review (user provides or pastes them).
  - For each deferred item: prompt for linked issue number, debt score (1–5 with scale reminder), and a 1–3 sentence assessment summary.
  - Generate the per-PR report in `docs/tech-debt/reports/pr-{number}_{YYYY-MM-DD}.md` using the template from Task 2.2.
  - Read existing `docs/tech-debt/report.md`, append new debt items to the open items table, update the debt-over-time section, recalculate the executive summary, and write the updated file.
- [x] Task 2.2: Define the per-PR report template (embedded in the skill or as a reference in `docs/tech-debt/README.md`). Template sections: PR reference, review date, reviewer, list of fixed findings (count only), deferred findings table (issue | title | score | assessment), total debt added this PR.
- [x] Task 2.3: Define the aggregated report update rules in the skill: open items ordered by score descending (ties broken by date, newest first); executive summary recalculates total open items, total debt score sum, and highest-risk item; debt-over-time appends one row per PR run with date and cumulative score.

### Verification

- [x] Skill file exists at `.claude/commands/tech-debt-report.md`.
- [x] Dry-run the skill manually against a synthetic PR with 2 deferred items: confirm per-PR report is generated correctly and aggregated report is updated correctly.
- [x] Per-PR report filename matches convention.
- [x] Aggregated report open items are ordered most-impactful first.

---

## Phase 3: SDLC Integration & Documentation

Hook the skill into the established development workflow so it runs naturally after review resolution, and update all relevant documentation.

### Tasks

- [x] Task 3.1: Update `CLAUDE.md` — add `/tech-debt-report` to the workflow table and note it should be run after `/team-review` resolution is complete.
- [x] Task 3.2: Update `conductor/workflow.md` — add `/tech-debt-report` to the SDLC Commands table after `/team-review`.
- [x] Task 3.3: Update `.claude/rules/sdlc.md` — add a note in the PR/review section that after resolving review findings, run `/tech-debt-report` to score deferred items and update the debt register.
- [x] Task 3.4: Update `docs/high-level-design.md` (if it has a dev-tooling or workflow section) to mention the technical debt tracking system and where reports live.

### Verification

- [x] All three workflow docs (`CLAUDE.md`, `conductor/workflow.md`, `.claude/rules/sdlc.md`) reference `/tech-debt-report`.
- [x] `docs/tech-debt/README.md` is complete and accurate.
- [x] Full end-to-end walkthrough: simulate a PR with one deferred item, run `/tech-debt-report`, confirm both reports are correct and docs are consistent.

---

## Final Verification

- [x] All acceptance criteria in `spec.md` are met.
- [x] `docs/tech-debt/` directory structure is correct and all files are committed.
- [x] `/tech-debt-report` skill is usable from a clean context.
- [x] Aggregated report reflects the synthetic test run from Phase 2.
- [x] SDLC docs updated and consistent.
- [x] Ready for review.

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
