# Skill Reference

Skills are Markdown prompt files in `.claude/commands/`. Each encodes a step-by-step
procedure that Claude executes when invoked with `/skill-name` in Claude Code. Skills are
freely composable — any agent or skill may call any other skill.

Every entry below shows the Claude Code invocation and the equivalent manual steps for teams
using other tooling.

---

## DevOps Skills

### `/dev-build`

**Purpose:** Run Prettier, ESLint, and Vite build in sequence. Stop on first failure.

**Owning agent:** `devops`

**Related skills:** called by `/pr-review`, `/code-assess`, `/agent-regenerate`,
`/agent-standardize`

**Claude Code:**

```
/dev-build
```

**Manual equivalent:**

```bash
npm run format        # Prettier rewrites files in place
npm run lint          # ESLint checks all source files
npm run build         # Vite compiles client/ into client/dist/
```

---

### `/dev-start`

**Purpose:** Launch the Express server (port 3000) and Vite dev client (port 5173). Logs
output to `logs/server/` and `logs/client/`. Persists PIDs to `.pids`.

**Owning agent:** `devops`

**Claude Code:**

```
/dev-start
```

**Manual equivalent:**

```bash
node server/src/server.js &       # start server in background
npm run dev -w client &           # start Vite dev client in background
```

---

### `/dev-stop`

**Purpose:** Gracefully terminate both processes using stored PIDs and port scan. Send
SIGKILL after 10 s if graceful shutdown fails. Remove `.pids`.

**Owning agent:** `devops`

**Claude Code:**

```
/dev-stop
```

**Manual equivalent:**

```bash
kill $(cat .pids)     # or kill by port: lsof -ti:3000,5173 | xargs kill
rm -f .pids
```

---

### `/dev-test`

**Purpose:** Run the full Vitest test suite. Capture logs to `logs/test/`. Detect flaky
tests across runs. Correlate failures with server log excerpts.

**Owning agent:** `devops`

**Claude Code:**

```
/dev-test
```

**Manual equivalent:**

```bash
npm test
# or with coverage:
npm run test:coverage
```

---

## Issue Workflow Skills

### `/issue-intake`

**Purpose:** Guide the creation of a well-formed GitHub issue with a full branch/PR
lifecycle: open `intake/{slug}` branch → gather and refine draft → file issue (HCP) →
commit `docs/intake/` artifact → open PR (HCP) → merge.

**Owning agent:** `issue-intake`

**Related skills:** calls `/pr-create`, `/pr-merge`; consults `rules-lawyer` agent for
game-logic issues

**Claude Code:**

```
/issue-intake
```

**Manual equivalent:**

```bash
git checkout -b intake/{slug}
# Draft issue body following .github/ISSUE_TEMPLATE/feature.md
gh issue create --title "..." --body "..." --milestone "v1.0 — MVP"
# Write docs/intake/YYYY-MM-DD-{slug}.md with the full issue body
git add docs/intake/... && git commit -m "docs(intake): ... (#N)"
git push -u origin intake/{slug}
gh pr create ...      # open PR, get review, merge
gh pr merge --squash --delete-branch
git checkout master && git pull
```

---

### `/issue-start`

**Purpose:** Fetch a GitHub issue, display a one-paragraph plan and AC checklist, create the
AI log file, and wait for HCP 1 approval before any code is written.

**Owning agent:** `project-manager`

**Claude Code:**

```
/issue-start <number>
```

**Manual equivalent:**

```bash
gh issue view <number>
# Read the AC list, draft an implementation plan, review for dependencies
# Create docs/ailog/YYYY_MM_DD-LOB-{####}.md manually
```

---

### `/issue-branch`

**Purpose:** Create a `feat/{id}-{slug}` branch from the issue title. Append a branch-created
entry to the AI log.

**Owning agent:** `project-manager`

**Claude Code:**

```
/issue-branch <number>
```

**Manual equivalent:**

```bash
# Derive slug: lowercase, strip punctuation, replace spaces with hyphens, truncate to 40 chars
git checkout -b feat/<number>-<slug>
```

---

### `/issue-implement`

**Purpose:** Orchestrate the full ticket-to-merge workflow. Sequences `/issue-start`,
`/issue-branch`, implementation, `/dev-build`, `/dev-test`, `/pr-create`, `/pr-review`, and
`/pr-merge` with human control points at each consequential gate.

**Owning agent:** `project-manager`

**Human control points:**

- **HCP 1** — approve implementation plan before branch creation
- **HCP 2** — approve push after build + test pass
- **HCP 2b** — triage PR review findings (fix all / fix errors only / accept)
- **HCP 3** — approve final merge

**Claude Code:**

```
/issue-implement <number>
```

**Manual equivalent:** run each sub-skill's manual steps in sequence (see entries above and
the PR and plan skills below).

---

## PR and Plan Skills

### `/pr-create`

**Purpose:** Write a devlog entry, run all three CI checks locally, and open a GitHub pull
request.

**Owning agent:** unowned (callable by any agent or skill)

**Claude Code:**

```
/pr-create
```

**Manual equivalent:**

```bash
# Append entry to docs/devlog/YYYY-MM-DD.md
npm run lint && npm run format:check && npm test
gh pr create --title "..." --body "..."
```

---

### `/pr-review`

**Purpose:** Build and test gate, then analyse the current PR diff for defects, dead code,
coverage gaps, and standards violations. Posts structured findings with severity levels.

**Owning agent:** `code-review`

**Related skills:** calls `/dev-build`, `/dev-test` as prerequisites

**Claude Code:**

```
/pr-review
```

**Manual equivalent:**

```bash
npm run lint && npm test
gh pr diff            # read the diff
# Review against standards in CLAUDE.md
```

---

### `/pr-merge`

**Purpose:** Run final CI check, present HCP 3 for merge approval, squash-merge the PR, and
delete the branch.

**Owning agent:** unowned

**Claude Code:**

```
/pr-merge
```

**Manual equivalent:**

```bash
npm run lint && npm run format:check && npm test
gh pr merge --squash --delete-branch
git checkout master && git pull
```

---

### `/plan-wrap`

**Purpose:** Post-implementation wrap-up: verify build passes, write a devlog entry, review
`CLAUDE.md` for needed updates, and assess whether `high-level-design.md` requires revision.

**Owning agent:** unowned

**Claude Code:**

```
/plan-wrap
```

**Manual equivalent:**

```bash
npm run lint && npm run format:check && npm test
# Append entry to docs/devlog/YYYY-MM-DD.md
# Review CLAUDE.md and docs/high-level-design.md for accuracy
```

---

## Code Review Skills

### `/code-assess`

**Purpose:** Full source audit for duplicate code, dead code, test coverage gaps, and
refactoring opportunities. Writes findings to `docs/assess-YYYY-MM-DD.md`.

**Owning agent:** `code-review`

**Related skills:** calls `/dev-build`, `/dev-test` as prerequisites

**Claude Code:**

```
/code-assess
```

**Manual equivalent:**

```bash
npm run lint && npm test
# Read source files; look for dead exports, duplicate logic, untested paths
```

---

## Agent Maintenance Skills

### `/agent-sync`

**Purpose:** Read-only drift check. Compares frontmatter in `.claude/agents/*.md` against
the `## 4. Agent Definition` block in each `docs/agents/<name>/design.md`. Reports any
mismatches. Never modifies files.

**Owning agent:** unowned

**Claude Code:**

```
/agent-sync
```

**Manual equivalent:**

```bash
# For each agent, diff the YAML block in design.md §4 against .claude/agents/<name>.md
# Fields to compare: name, description (whitespace-normalized), tools list
```

---

### `/agent-regenerate`

**Purpose:** Rebuild `.claude/agents/*.md` from the `## 4. Agent Definition` block in each
`design.md`. Runs `/dev-build` afterward to confirm no format issues.

**Owning agent:** unowned

**Related skills:** calls `/dev-build`

**Claude Code:**

```
/agent-regenerate
```

**Manual equivalent:**

```bash
# For each agent, copy the YAML frontmatter and prose from design.md §4
# into .claude/agents/<name>.md; then run npm run format && npm run lint
```

---

### `/agent-standardize`

**Purpose:** Normalize `prompt.md` files against `PROMPT_TEMPLATE.md`; cascade changes
through `design.md` and agent files; run `/dev-build` to verify.

**Owning agent:** unowned

**Related skills:** calls `/dev-build`

**Claude Code:**

```
/agent-standardize
```

**Manual equivalent:**

```bash
# Compare each docs/agents/<name>/prompt.md against docs/agents/PROMPT_TEMPLATE.md
# Update design.md and .claude/agents/<name>.md to match
# Run npm run format && npm run lint
```
