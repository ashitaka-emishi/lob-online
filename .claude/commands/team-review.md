---
description: 'Launch a multi-reviewer parallel code review with specialized review dimensions, apply the second-pass trigger policy, then run /tech-debt-report'
argument-hint: '<target> [--reviewers security,architecture,testing,maintainability] [--base-branch main]'
---

# Team Review

Orchestrate a multi-reviewer parallel code review where each reviewer focuses on a specific quality dimension. Produces a consolidated, deduplicated report organized by severity. Applies the second-pass trigger policy after review fixes, then automatically runs `/tech-debt-report` at the end to score any deferred findings.

## Pre-flight Checks

1. Verify `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set
2. Parse `$ARGUMENTS`:
   - `<target>`: file path, directory, git diff range (e.g., `main...HEAD`), or PR number (e.g., `#123`)
   - `--reviewers`: comma-separated dimensions (default: `security,architecture,testing,maintainability`)
   - `--base-branch`: base branch for diff comparison (default: `main`)

## Reviewer Selection

The default set (`security,architecture,testing,maintainability`) covers most PRs. Add
reviewers conditionally based on what the PR touches:

| Add reviewer    | When the PR touches                                                             |
| --------------- | ------------------------------------------------------------------------------- |
| `performance`   | Hot paths, algorithmic changes, rendering loops, O(n) data structures           |
| `domain`        | Rules-engine logic: movement, LOS, combat, morale, orders, or SM-specific rules |
| `accessibility` | Vue UI components, forms, or any user-facing interactive elements               |

To override the defaults, pass `--reviewers` explicitly, e.g.:
`/team-review #123 --reviewers security,architecture,testing,maintainability,domain`

## Phase 1: Target Resolution

1. Determine target type:
   - **File/Directory**: Use as-is for review scope
   - **Git diff range**: Use Bash to run `git diff {range} --name-only` to get changed files
   - **PR number**: Use Bash to run `gh pr diff {number} --name-only` to get changed files
2. Collect the full diff content for distribution to reviewers
3. Display review scope to user: "{N} files to review across {M} dimensions"

## Phase 2: Team Spawn

1. Use `Teammate` tool with `operation: "spawnTeam"`, team name: `review-{timestamp}`
2. For each requested dimension, use `Task` tool to spawn a teammate:
   - `name`: `{dimension}-reviewer` (e.g., "security-reviewer")
   - `subagent_type`: "agent-teams:team-reviewer"
   - `prompt`: Include the dimension assignment, target files, and diff content
3. Use `TaskCreate` for each reviewer's task:
   - Subject: "Review {target} for {dimension} issues"
   - Description: Include file list, diff content, and dimension-specific checklist

## Phase 3: Monitor and Collect

1. Wait for all review tasks to complete (check `TaskList` periodically)
2. As each reviewer completes, collect their structured findings
3. Track progress: "{completed}/{total} reviews complete"

## Phase 4: Consolidation

1. **Deduplicate**: Merge findings that reference the same file:line location
2. **Resolve conflicts**: If reviewers disagree on severity, use the higher rating
3. **Organize by severity**: Group findings as Critical, High, Medium, Low
4. **Cross-reference**: Note findings that appear in multiple dimensions

## Phase 5: Report and Cleanup

1. Present consolidated report:

   ```
   ## Code Review Report: {target}

   Reviewed by: {dimensions}
   Files reviewed: {count}

   ### Critical ({count})
   [findings...]

   ### High ({count})
   [findings...]

   ### Medium ({count})
   [findings...]

   ### Low ({count})
   [findings...]

   ### Summary
   Total findings: {count} (Critical: N, High: N, Medium: N, Low: N)
   ```

2. Send `shutdown_request` to all reviewers
3. Call `Teammate` cleanup to remove team resources

## Phase 6: Second-Pass Trigger Check

After the user or implementer fixes review findings, inspect the incremental diff created by those
fixes. Do **not** automatically rerun a full `/team-review` for every low-risk cleanup. Instead,
require a targeted second-pass review only when the fix diff touches one or more high-risk surfaces:

- Auth, authorization, sessions, tokens, permissions, or any route that grants access to game state.
- Persistence, migrations, save/load paths, cache invalidation, or data validation schemas.
- Shared rules-engine logic, movement, LOS, combat, morale, orders, or other domain-critical paths.
- Shared Vue stores, composables, editor orchestration, or API/client contract boundaries.
- More than roughly 300-500 production LOC, or broad multi-file refactors whose behavior is hard to
  reason about from local tests alone.

If no trigger applies, record: "Second-pass review not required: low-risk/local cleanup only."

If a trigger applies:

1. Run a targeted review of only the incremental fix diff, using the relevant dimensions:
   - security for auth/session/token/API access changes
   - architecture for shared boundaries, stores, composables, persistence, or broad refactors
   - performance for hot paths or algorithmic changes
   - testing for changed test strategy, fixtures, or coverage gaps
2. Present any second-pass findings separately from the original findings.
3. Require each second-pass finding to be either fixed in place or deferred as a debt issue before
   proceeding.
4. Record the trigger reason and the second-pass outcome so `/tech-debt-report` can include it.

## Phase 7: Debt Scoring

After findings are presented and the team is shut down, run `/tech-debt-report` to score
any deferred findings and update the project-wide debt register. Include the second-pass trigger
decision and outcome in the context passed to `/tech-debt-report`.

Tell the user:

```
Review complete. Running /tech-debt-report to score deferred findings…
```

Then invoke the `/tech-debt-report` skill, passing the PR number as the argument if one
was provided as the review target (e.g., `#123` → argument `123`). If the target was a
file path or diff range rather than a PR number, prompt the user for the PR number before
proceeding, or skip if they confirm there is no open PR yet.

The tech-debt-report workflow will guide through scoring each deferred finding, updating
`docs/tech-debt/reports/` and `docs/tech-debt/report.md`, and committing the result.
