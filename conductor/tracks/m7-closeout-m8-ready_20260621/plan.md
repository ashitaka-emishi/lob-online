# Implementation Plan: M7 Closeout — Doc-Sync and M8 Readiness

**Track ID:** m7-closeout-m8-ready_20260621
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-21
**Status:** [~] In Progress

## Overview

Three-phase chore: (1) run `/doc-sync` to update CLAUDE.md and HLD automatically,
(2) manually audit and patch the HLD rule-coverage table and M8 section, and (3) review
open debt items for M8 blockers and write the devlog go/no-go entry.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** Phase 3 go/no-go assessment (user confirms blocker calls before
devlog is committed)

## Risk Classification

**Risk:** Low
**Reason:** Documentation-only changes; no production code modified.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

---

## Phase 1: Automated Doc-Sync

Run the `/doc-sync` skill to diff master..HEAD and update stale facts in CLAUDE.md, HLD,
and agent design docs automatically.

### Tasks

- [x] Task 1.1: Create feature branch `chore/m7-closeout-m8-ready`
- [x] Task 1.2: Run `/doc-sync` — updates CLAUDE.md "Current state" and any stale HLD/agent-doc facts it detects
- [x] Task 1.3: Review `/doc-sync` output — confirm CLAUDE.md now says M7 complete and M8 is next; flag any stale facts it missed

### Verification

- [ ] `CLAUDE.md` "Current state" paragraph describes M7 as complete
- [ ] No lint/format errors introduced by doc edits

---

## Phase 2: HLD Rule-Coverage Audit

Manually update the HLD Milestone Overview and rule-coverage table for M7 and M8.

### Tasks

- [ ] Task 2.1: Mark M7 row ✅ in HLD §2 Milestone Overview table
- [ ] Task 2.2: Update rule-coverage table — all M7 rows that say "Planned" → "Wired ✅" for delivered items; confirm correct milestone column values
- [ ] Task 2.3: Review HLD M8 section (§ "M8 — Production Persistence + Multiplayer") for accuracy — check deliverables list matches current codebase expectations; update any stale references
- [ ] Task 2.4: Check agent design docs (`docs/agents/*/design.md`) for M7/M8 references — update stale milestone language

### Verification

- [ ] HLD Milestone Overview shows M7 ✅
- [ ] Rule-coverage table has no "Planned" entries for M7-delivered items
- [ ] M8 section deliverables match what's actually planned

---

## Phase 3: Debt Review and Go/No-Go

Read the open debt register and assess each item against M8 scope. Write the devlog entry.

### Tasks

- [ ] Task 3.1: Read `docs/tech-debt/report.md` Open Debt Items — list all 10 items with scores and milestones
- [ ] Task 3.2: Cross-reference each item against HLD M8 scope; classify as BLOCKER, MUST-RESOLVE-BEFORE-M8, or SAFE-TO-DEFER: - #612 (score 4) — CLOSE_COMBAT payload validation: auth/security surface → likely MUST-RESOLVE - #633 (score 4) — artillery depletion bands: rules-engine correctness → assess against M8 scope - #616 (score 3) — §7.0 SP gate: domain correctness → assess - #617 (score 3) — §9.1a leader loss scope: domain → assess - #613 (score 3) — §6.3 rally thresholds: dead code until M8 wiring → assess - #634 (score 3) — terrain VP wiring: deferred to M8 → MUST-RESOLVE in M8 - #562 (score 4) — side token binding: M8 multiplayer prerequisite → BLOCKER for M8 auth - #563 (score 3) — re-join side enforcement: M8 auth → BLOCKER for M8 auth - #618 (score 2) — §6.4 asymmetry: domain → assess - #621 (score 2) — Fluke/AR rule basis: M7 ambiguity → assess
- [ ] Task 3.3: **HUMAN CONTROL POINT** — Present blocker/defer classification to user; get confirmation before writing devlog
- [ ] Task 3.4: Write devlog entry `docs/devlog/2026-06-21.md` with: M7 delivery summary, debt posture, go/no-go recommendation, and any pre-M8 debt items that should be addressed before the M8 track is created
- [ ] Task 3.5: Update `docs/devlog.md` index
- [ ] Task 3.6: Run `npm run quality:strict` — confirm all gates pass
- [ ] Task 3.7: Commit all changes and open PR with `/pr-create`

### Verification

- [ ] All 10 debt items classified with written rationale
- [ ] Devlog go/no-go entry committed
- [ ] `npm run quality:strict` green

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes
- [ ] CLAUDE.md, HLD, and agent docs reflect M7 complete / M8 next
- [ ] Debt register blocker assessment documented in devlog
- [ ] Ready for `/team-review` (or fast-path merge given docs-only scope)
