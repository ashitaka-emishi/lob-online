# Implementation Plan: OOB Editor Display/Data Bugs (#506)

**Track ID:** oob-editor-bugs_20260604
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-04
**Status:** [~] In Progress

## Overview

Fix four independent bugs in the OOB Editor client-side components and utilities. Each bug is isolated to a specific file or small surface. Fixes are applied in order of complexity (simplest first). No new tests are needed beyond verifying existing coverage still passes; manual verification via `npm run dev:oob-editor` confirms visual correctness.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals

## Risk Classification

**Risk:** Medium
**Reason:** Client-only fixes to Vue components and a JS utility; no schema, server, or persistence changes.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

---

## Phase 1: Bug 4 — specialRules [object Object]

Simplest fix: display `specialRules` as pretty-printed JSON and parse on save.

### Tasks

- [~] Task 1.1: In `OobDetailPanel.vue`, replace `:value="node.specialRules ?? ''"` with a computed getter that calls `JSON.stringify(node.specialRules, null, 2)` when the value is an object and passes through strings unchanged.
- [ ] Task 1.2: On save, wrap the textarea value in `JSON.parse()` when the field is `specialRules` and the string is valid JSON; otherwise store as-is (fall back to string if parse fails).
- [ ] Task 1.3: Verify in the OOB editor that selecting a leader with a structured `specialRules` shows readable JSON, and that saving round-trips correctly.

### Verification

- [ ] `npm run lint` passes
- [ ] Selecting any leader with structured `specialRules` shows formatted JSON, not `[object Object]`

---

## Phase 2: Bug 1 — Supply/HQ nodes missing back-counter slot

### Tasks

- [ ] Task 2.1: Read `OobDetailPanel.vue:260–265` to understand how `CounterImageWidget` is called for Supply/HQ vs. leader nodes.
- [ ] Task 2.2: Determine the correct `mode` prop value for Supply/HQ counter slots (should expose both front and back slots as regiment/battery nodes do).
- [ ] Task 2.3: Update the `CounterImageWidget` call for Supply/HQ nodes to pass the appropriate `mode` prop (or remove the `mode` guard inside the widget if `mode="leader"` is the only path that shows back slot).

### Verification

- [ ] Selecting an HQ or Supply node shows both front and back counter image slots
- [ ] `npm run lint` passes

---

## Phase 3: Bug 3 — Walker (Promoted) phantom node

### Tasks

- [ ] Task 3.1: Read `oobTreeTransform.js` `buildVariantsMap` and the section that assembles the CSA leader list, to trace why `walker-promoted` appears as a top-level node.
- [ ] Task 3.2: Read `succession.json` to confirm `baseLeaderId` is set correctly for `walker-promoted`.
- [ ] Task 3.3: Fix the variant-filtering logic so that any leader entry whose `id` appears as a variant ID in the variants map is excluded from the flat top-level list.
- [ ] Task 3.4: Verify the CSA tree no longer shows Walker (Promoted) as a standalone node; it appears only under Walker.

### Verification

- [ ] CSA OOB tree shows Walker (Promoted) exclusively as a child of Walker
- [ ] `npm run lint` passes
- [ ] `npm run test` still passes (oobTreeTransform tests, if any)

---

## Phase 4: Bug 2 — AotP HQ "path not resolvable"

Most complex fix: synthetic node path forwarding.

### Tasks

- [ ] Task 4.1: Read `OobTreeNode.vue` to understand how `selectNode` is called for synthetic `_hq` nodes and whether a `nodePath` is currently forwarded.
- [ ] Task 4.2: Read `useOobStore.js` `selectNode` action to understand the path resolution logic and where an explicit `nodePath` override can be injected.
- [ ] Task 4.3: In `oobTreeTransform.js`, attach a resolvable `_nodePath` to the synthetic `_hq` object (e.g. the path to the army-level key in `oob.json` that logically owns the HQ, or a direct `['hq']` path convention).
- [ ] Task 4.4: In `OobTreeNode.vue`, forward the `_nodePath` from the synthetic node when calling `selectNode`, bypassing `findNodePathInTree`.
- [ ] Task 4.5: In `useOobStore.js` `selectNode`, accept an optional `explicitPath` argument and use it instead of calling `findNodePathInTree` when provided.
- [ ] Task 4.6: Verify in the OOB editor that clicking the AotP HQ node opens the counter image widget with no error.

### Verification

- [ ] AotP HQ node is selectable; counter image widget renders
- [ ] No "path not resolvable" message appears
- [ ] `npm run lint` passes
- [ ] `npm run test` passes

---

## Final Verification

- [ ] All four acceptance criteria met (back slot, AotP HQ, Walker phantom, specialRules)
- [ ] `npm run quality:strict` passes clean
- [ ] No new ESLint warnings introduced
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
