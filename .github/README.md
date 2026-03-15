# .github — GitHub Repository Automation

This directory contains GitHub-specific configuration: issue templates, the pull request
template, and CI/CD workflow definitions.

---

## Issue Templates — `ISSUE_TEMPLATE/`

### `feature.md`

Template for all work items filed in this repository. Every issue must be AI-implementable
without follow-up questions — it requires an imperative title, a short description, bulleted
acceptance criteria, explicit file paths, and test requirements. Game-logic features must also
cite rule references (`LOB_RULES §X`, `SM_RULES §Y`, etc.) and note any `rules-lawyer`
consultation. See `docs/agents/project-manager/design.md` for the full intake process.

---

## Pull Request Template — `pull_request_template.md`

Checklist enforced on every PR:

- `npm run lint` passes
- `npm run format:check` passes
- `npm test` passes
- Manual smoke test described
- Devlog entry written in `docs/devlog/YYYY-MM-DD.md`

Use the `/create-pr` skill rather than calling `gh pr create` directly — it runs the build
checks locally, writes the devlog entry, and then opens the PR.

---

## Workflows — `workflows/`

### `ci.yml`

Runs on every push and pull request to `main`. Executes `npm run lint`,
`npm run format:check`, and `npm run test` in a Node.js 20 environment. PRs cannot merge
unless all three checks pass.

### `deploy.yml`

Production deployment pipeline. Triggered on push to `main` after CI passes. Builds the
Vite client (`npm run build`) and deploys the server and built assets to the DigitalOcean
Droplet via PM2 (`ecosystem.config.cjs`).
