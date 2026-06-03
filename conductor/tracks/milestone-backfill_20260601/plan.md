# Implementation Plan: Milestone Backfill — M1/M2, Issue Assignment, Leader Counter Upload

**Track ID:** milestone-backfill_20260601
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-01
**Status:** [x] Complete

## Overview

Three sequential steps: (1) create M1 and M2 milestones in GitHub and mark both closed,
(2) bulk-assign the ~100+ untagged historical issues to their correct milestone, and
(3) open the leader counter upload feature issue. All work is `gh` CLI — no code changes.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond task completion.

## Risk Classification

**Risk:** Low
**Reason:** GitHub metadata changes only — no code, schema, or data modifications.

## Quality Gates

- [ ] All M2 issues visible under the M2 milestone in GitHub
- [ ] New leader upload issue created and linked to the correct milestone
- [ ] No issues accidentally double-assigned or moved from existing milestones

## Debt Budget

**Allowed new deferred debt:** 0.

## Completion Contract

- [ ] All plan tasks complete
- [ ] M1 and M2 milestones exist and are closed in GitHub
- [ ] Untagged issues assigned to correct milestones
- [ ] New leader upload issue created

---

## Phase 1: Create Milestones

Create M1 and M2 with accurate descriptions reflecting the HLD. Both are complete so state is `closed`.

### Tasks

- [ ] Task 1.1: Create "M1: Scaffold" milestone — state closed, description: "Initial scaffold:
      tech stack selection, Express + Socket.io server, data models (map/scenario/oob/leaders/
      succession JSON), Zod validation schemas, Vitest suites, ESLint/Prettier, GitHub Actions CI."
- [ ] Task 1.2: Create "M2: Dev Tools" milestone — state closed, description: "Dev tools:
      map editor (elevation, terrain, linear features, wedge editor, LOS test, click/paint modes,
      localStorage autosave, versioned backups, push/pull sync); scenario editor (turn structure,
      lighting, rules fields); OOB editor (hierarchy tree, unit detail, leader succession, counter
      image widget); counter auto-detection script."

### Verification

- [ ] `gh api repos/ashitaka-emishi/lob-online/milestones` lists M1 and M2.

---

## Phase 2: Assign Issues to Milestones

### M2 Issue List (map editor, OOB editor, scenario editor, counter detection)

The following closed issues belong to M2:

**Map editor features/perf/refactor:**
#11, #12, #15, #27, #40, #53, #54, #63, #80, #81, #87, #88, #92, #93, #94, #96, #97,
#100, #101, #102, #103, #104, #105, #106, #110, #111, #112, #114, #115, #116, #118, #119,
#123, #124, #125, #126, #127, #128, #129, #130, #133, #151, #152, #153, #154, #155,
#159, #160, #161, #162, #163, #164, #165, #166, #167, #169, #170, #175, #176,
#180, #181, #182, #183, #184, #185, #416, #417, #418, #419

**OOB editor features/perf/refactor:**
#202, #203, #206, #209, #210, #211, #212, #213, #215, #222, #244, #249, #250

**Process/chore issues that shipped with M2 work:**
#22, #23, #32, #36, #44, #46, #61, #67, #68, #73, #77, #82, #84

### M3 untagged issues

**Rules engine and testing tools:**
#346 (test consolidation), #347 (conductor quality rails)

### M4 untagged issues

**Game state, session, lobby:**
#360, #361 (schema issues fixed in pre-M5 sprint)

### M5 untagged issues

**Turn structure, orders, dispatch, game map:**
#362, #363, #364, #365, #366, #367, #368, #369, #370, #371, #372,
#377, #378, #379, #380, #381, #382, #383, #384, #385, #387, #388, #389,
#393, #394, #421, #422, #423, #424, #425, #426, #427, #428, #429, #430,
#431, #432, #434, #435, #436, #438, #439, #440, #441, #442, #443, #444,
#445, #446, #447, #452, #453, #454, #455, #456, #457, #458, #459,
#461, #462, #463, #464, #476, #477, #478, #479, #480, #481, #482

### M8 untagged issues

**Production auth, rate limiting, security:**
#350, #410

### Tasks

- [ ] Task 2.1: Record M2 milestone number from Task 1.2 output.
- [ ] Task 2.2: Assign map editor issues to M2 (batch via `gh issue edit --milestone`).
- [ ] Task 2.3: Assign OOB editor issues to M2.
- [ ] Task 2.4: Assign process/chore issues to M2.
- [ ] Task 2.5: Assign M3 stragglers to M3.
- [ ] Task 2.6: Assign M4 stragglers to M4.
- [ ] Task 2.7: Assign M5 stragglers to M5.
- [ ] Task 2.8: Assign M8 stragglers to M8.

### Verification

- [ ] Spot-check 5 issues from each milestone group to confirm assignment.

---

## Phase 3: Create Leader Counter Upload Issue

Open a new GitHub issue for the OOB editor upload flow that allows assigning counter images
to leader nodes (which currently render as fallback rects on the game map because their
`counterRef.front` is null).

### Tasks

- [ ] Task 3.1: Create issue with title "OOB editor: upload and link counter images for leader units".
- [ ] Task 3.2: Apply labels: `feature`, `oob-editor` (create labels if missing).
- [ ] Task 3.3: Assign issue to M2 milestone (M2 = dev tools — OOB editor belongs there).

### Verification

- [ ] Issue is visible in GitHub with correct milestone and labels.

---

## Final Verification

- [ ] `gh milestone list` shows M1 and M2 with correct descriptions and closed state.
- [ ] Representative M2 issues confirm milestone assignment.
- [ ] New leader upload issue exists and is linked.
