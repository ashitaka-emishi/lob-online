# Four-Phase SDLC Lifecycle

1. **Design** — run `/design` to collaboratively author `docs/designs/{slug}.md` for any new
   or changed component (orchestrator, skill, or agent). The skill gathers intent, infers
   the component type, drafts the doc using `docs/designs/TEMPLATE.md`, iterates via chat or
   direct file edits, then commits on `design/{slug}` and opens a PR. After merge:
2. **Track creation** — run `/conductor:new-track` to break the design into a tracked,
   milestone-assigned work unit with a spec and phased implementation plan.
3. **Implementation loop** — run `/conductor:implement` to execute tasks within the track
   following the TDD workflow. After merge, optionally update the design doc and create new
   tracks for any scope discovered during implementation.
4. **After-action** — run `/plan-wrap` (or `/doc-sync` + `/ecosystem-docs-generate`) to
   verify all docs reflect the delivered state and record a devlog entry.
