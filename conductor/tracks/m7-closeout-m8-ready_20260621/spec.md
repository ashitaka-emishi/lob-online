# Specification: M7 Closeout — Doc-Sync and M8 Readiness

**Track ID:** m7-closeout-m8-ready_20260621
**Type:** Chore
**Created:** 2026-06-21
**Status:** Draft

## Summary

Sync project documentation to reflect M7 completion, audit open debt items for M8 blockers,
and produce a written go/no-go assessment before M8 scoping begins.

## Context

PR #632 (M7 — Special Rules + Victory Conditions) merged on 2026-06-18. CLAUDE.md still
describes the current phase as M5.5 complete / starting M7, and the HLD still lists M7 as
Planned. The debt register has 10 open items; two (especially #612, CLOSE_COMBAT/FIRE_COMBAT
payload validation) are potential M8 blockers. Before the M8 track is created, documentation
must be current and the debt posture reviewed.

## Acceptance Criteria

- [ ] `CLAUDE.md` — "Current state" paragraph updated: M7 complete, M8 is next
- [ ] `docs/designs/high-level-design.md` — M7 milestone row marked ✅; all M7 rule-coverage
      rows updated to "Engine ✅" or "Wired ✅"; M8 section reviewed for accuracy
- [ ] `docs/agents/*/design.md` files checked for stale M7/M8 references and updated if needed
- [ ] All 10 open debt items (#562, #563, #612, #613, #616, #617, #618, #621, #633, #634)
      assessed against M8 scope; each marked blocker or safe-to-defer
- [ ] Devlog entry written (2026-06-21) with go/no-go recommendation for M8
- [ ] `npm run quality:strict` passes (no regressions from doc edits)

## Dependencies

- PR #632 merged (done — 32029fc)
- PR #635 (conductor track closeout) — pending CodeQL; doc-sync can proceed in parallel

## Out of Scope

- Implementing any M8 features
- Resolving any open debt items (assessment only, no fixes)
- Scoping the M8 track (a separate `/conductor:new-track` follows this one)

## Technical Notes

Run `/doc-sync` skill first — it diffs the branch against master and updates stale facts
directly. Then manually audit the HLD rule-coverage table and M8 section. Debt review is
a reading task only: read `docs/tech-debt/report.md` Open Debt Items and cross-reference
against the HLD M8 scope to determine blocker status.
