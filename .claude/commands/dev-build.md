---
description: Format, lint, and build the lob-online project
allowed-tools: Bash
---

Build the lob-online project. Run all three steps in order and stop immediately if any
step fails, reporting the relevant output.

## Step 1 — Format

```
npm run format
```

Prettier rewrites all files in place. Report any files changed.

## Step 2 — Lint

```
npm run lint
```

ESLint checks all source files. If there are errors, report them and stop. Do not proceed
to the build step with lint errors outstanding.

## Step 3 — Build client

```
npm run build
```

Vite compiles `client/` into `client/dist/`. The server has no compile step — it runs as
plain ESM JavaScript directly.

## Finishing

If all three steps pass, report a one-line success summary: format (files changed or
"no changes"), lint (clean), build (output size or "succeeded").

If any step fails, report the step name, the relevant error output, and stop. Do not
proceed to subsequent steps.
