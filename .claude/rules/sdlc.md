# Four-Phase SDLC Lifecycle

1. **Design** — run `/design` to collaboratively author `docs/designs/{slug}.md` for any new
   or changed component (orchestrator, skill, or agent). The skill gathers intent, infers
   the component type, drafts the doc using `docs/designs/TEMPLATE.md`, iterates via chat or
   direct file edits, then commits on `design/{slug}` and opens a PR. After merge:
2. **Issue intake** — run `/issue-intake` (one or more times) to break the design into
   well-formed, milestone-assigned GitHub issues. Each issue maps to one acceptance-criteria
   unit of the design.
3. **Implementation loop** — for each issue: `/issue-implement <number>` drives the full
   ticket-to-merge workflow. After merge, optionally update the design doc and create new
   issues for any scope discovered during implementation.
4. **After-action** — run `/plan-wrap` (or `/doc-sync` + `/ecosystem-docs-generate`) to
   verify all docs reflect the delivered state and record a devlog entry.
