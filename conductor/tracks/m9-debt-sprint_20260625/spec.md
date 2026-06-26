# Spec: M9 Debt Sprint — Remaining Open Items

**Track ID:** m9-debt-sprint_20260625
**Issues:** #627 #628 #629 #650 #651 #652 #664

## Goal

Close all remaining open tech-debt issues filed during M6–M8 that were deferred to M9.
No new features — correctness, documentation, and test-coverage fixes only.

## Issues

| #    | Title                                                                                      | Score |
| ---- | ------------------------------------------------------------------------------------------ | ----- |
| #664 | Harden new-join faction check for both DB columns                                          | 2     |
| #652 | Attach req.gameRow in requireSide to eliminate redundant getGame()                         | 2     |
| #651 | Validate discord_webhook at egress point, not only at create-route                         | 2     |
| #650 | Resolve DISCORD_WEBHOOK_URL env override at call edge, not inside transport                | 1     |
| #629 | Wire real arty-vs-arty fixture in fireCombat.test.js CBF positive case                     | 2     |
| #628 | Document module-init data load as hard import-time dependency                              | 1     |
| #627 | Cascade morale effect is hex-scoped despite brigade-scope detection (domain clarification) | 3     |

## Acceptance Criteria

- All 7 issues closed
- `npm run quality:strict` passes
- Net open tech-debt score reduced by ≥ 13 points
