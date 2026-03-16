# Contributing to lob-online

lob-online is an online implementation of the _Line of Battle v2.0_ wargame system, starting
with the _South Mountain_ scenario. Contributions are welcome.

## Prerequisites

- **Node.js 20+** and **npm 10+**
- A Discord application (for OAuth) — optional for most development work

## Setup

```bash
git clone https://github.com/<org>/lob-online.git
cd lob-online
npm install
cp .env.example .env   # fill in secrets before running the server
```

## Running the project

Using the devops skills (recommended):

```
/start    # launches server (port 3000) and Vite dev client (port 5173)
/stop     # graceful shutdown
```

Or manually in separate terminals:

```bash
npm run dev:server   # Express + Socket.io, hot-reload via --watch
npm run dev:client   # Vite dev server
```

Map editor dev tool (terrain digitization only):

```bash
npm run dev:map-editor
```

## Code quality

Before committing, all three checks must pass:

```bash
npm run format        # auto-fix formatting (Prettier)
npm run lint          # ESLint
npm run test          # Vitest
```

The `/build` skill runs these in sequence. CI enforces the same checks on every push and PR.

See the **Coding Standards** section in `CLAUDE.md` for the full style guide.

## Branch and PR workflow

1. Branch off `master`. Branch name prefix convention:
   - `feat/` — new feature
   - `fix/` — bug fix
   - `docs/` — documentation only
   - `refactor/` — code restructuring without behavior change
   - `test/` — tests only
   - `build/` — tooling, CI, dependencies

2. Make your changes. Every session that produces code changes should append a devlog entry to
   `docs/devlog/YYYY-MM-DD.md` (see below).

3. Open a pull request using the `/create-pr` skill, which runs CI checks locally, writes the
   devlog entry, and calls `gh pr create`. Do not use `gh pr create` directly.

4. PRs require CI to pass. Squash-merge is preferred to keep `master` history clean.

## Commit messages

Imperative mood, present tense. Prefix with a type:

```
feat: add LOS calculation for elevated terrain
fix: correct hexside elevation comparison off-by-one
docs: update map editor design spec
refactor: extract terrain cost lookup into helper
test: add coverage for slope impassability rule
build: bump vitest to 4.x
chore: update .gitignore for test-results/
```

## Testing

- New features must include tests. Co-locate them as `feature.test.js` next to the source file.
- Server tests run in the Node environment; client tests run in jsdom (configured in
  `vitest.config.js`).
- Check coverage: `npm run test:coverage`. The 70% line threshold is enforced in CI.

## Devlog

Every working session that produces code or design changes gets a devlog entry:

- File: `docs/devlog/YYYY-MM-DD.md` (create if it doesn't exist for today)
- Format: `## HH:MM — Title` section, 3–5 paragraphs of prose
- Index: update the table in `docs/devlog.md` with the day's summary

The `/wrap-plan` skill handles this automatically after implementing a plan.

## Game rules questions

Use the `rules-lawyer` agent. It has access to all source PDFs in `docs/reference/` and
applies the correct SM errata and override priority hierarchy when sources conflict.
