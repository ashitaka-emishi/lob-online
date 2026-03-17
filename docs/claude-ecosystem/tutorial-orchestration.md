# Tutorial: Using Conductor Tracks and Agent-Teams

> **Note:** This tutorial describes the orchestration layer used by the **lob-online**
> project. Command names, track structure, and plugin conventions are project-specific.
> Treat this as a worked pattern — your own ecosystem will have different agents and
> workflows.

lob-online uses the [wshobson/agents](https://github.com/wshobson/agents) plugin marketplace
for SDLC orchestration. Two plugins are installed: `conductor` (track-based feature
delivery) and `agent-teams` (parallel multi-agent workflows). This tutorial explains how to
use each.

---

## Prerequisites

- wshobson/agents installed: `/plugin marketplace add wshobson/agents`
- conductor installed: `/plugin install conductor`
- agent-teams installed: `/plugin install agent-teams`
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.env` (for agent-teams)

---

## Part 1 — Conductor: scoping and implementing a feature

### Step 1 — Create a new track

```
/conductor:new-track
```

Conductor will prompt for the feature intent and write two files in
`conductor/tracks/{slug}/`:

- `spec.md` — what the feature does, why it is needed, and acceptance criteria
- `plan.md` — phased implementation plan with discrete TDD tasks

A checkpoint gate stops before any code is written. Review the spec and plan; ask conductor
to revise if anything is missing before approving.

### Step 2 — Implement the track

```
/conductor:implement
```

Conductor works through the tasks in `plan.md` in order:

1. Writes a failing test for the task
2. Implements the minimum code to make it pass
3. Commits the task
4. Pauses at phase boundaries for engineer approval before continuing

### Step 3 — Check status

```
/conductor:status
```

Shows active tracks, completed phases, remaining tasks, and next actions.

### Step 4 — After implementation

Run the lob-specific post-implementation sequence:

```
/doc-sync
/ecosystem-docs-generate
/dev-build
/dev-test
```

Then create the PR:

```
/pr-create
```

---

## Part 2 — Agent-Teams: parallel workflows

### Parallel PR review

```
/team-review
```

Spawns parallel reviewers across multiple dimensions (security, performance, architecture,
testing). Each reviewer files findings independently; the team lead synthesises a
consolidated report with severity calibration and deduplication.

Replaces the old `/pr-review` skill.

### Parallel debugging

```
/team-debug
```

Spawns multiple agents to investigate competing hypotheses in parallel. Each investigator
gathers evidence to confirm or falsify their hypothesis. The team lead arbitrates the root
cause from the evidence.

Use when you have a complex bug with multiple plausible causes and want to explore all
hypotheses simultaneously rather than sequentially.

### Parallel feature development

```
/team-feature
```

Decomposes a feature into parallel workstreams with explicit file ownership boundaries.
Agents implement their workstream in isolation; integration points are coordinated via
messaging. Use for large features with clearly separable sub-components.

### Checking team status

```
/team-status
```

Shows active team members, task assignments, and progress. Use after spawning a team
while agents are working.

### Shutting down a team

```
/team-shutdown
```

Gracefully signals all agents to wrap up, collects final results, and cleans up resources.

---

## Worked Example: adding a new game mechanic

**Scenario:** Implement movement cost lookup for RSS trails.

1. Check if the feature touches game rules:
   - Yes — invoke `domain-expert` first: "What movement cost does LOB_RULES assign to RSS
     trail hexsides? Do SM_RULES or errata override this?"
   - Record the ruling in your notes.

2. Create a track:

   ```
   /conductor:new-track
   ```

   Describe the feature; paste the domain-expert ruling into the spec when prompted.

3. Implement:

   ```
   /conductor:implement
   ```

4. After implementation, run doc-sync, build, test, and create the PR using the lob-specific
   skills (`/doc-sync`, `/dev-build`, `/dev-test`, `/pr-create`).

5. Review the PR:

   ```
   /team-review
   ```

6. Merge and close:
   ```
   /pr-merge
   /issue-close <number>
   ```

---

## Summary

| Task                | Command                | Notes                                       |
| ------------------- | ---------------------- | ------------------------------------------- |
| Scope a new feature | `/conductor:new-track` | Writes spec + phased plan; gate before code |
| Implement tasks     | `/conductor:implement` | TDD; pauses at phase boundaries             |
| Check SDLC status   | `/conductor:status`    | Active tracks, next actions                 |
| Undo by work unit   | `/conductor:revert`    | Track, phase, or task level                 |
| Parallel PR review  | `/team-review`         | Replaces `/pr-review`                       |
| Parallel debugging  | `/team-debug`          | Competing-hypothesis investigation          |
| Parallel dev        | `/team-feature`        | File-ownership-bounded workstreams          |
