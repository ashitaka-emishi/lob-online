# Implementation Plan: M6 Domain Bug Fixes

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Approval before starting task execution; approval before opening PR.

## Risk Classification

**Risk:** High
**Reason:** All four fixes modify production combat/morale resolution paths that affect game outcomes.

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

## Phase 1 — Fix fire combat SP column (#574)

### Task 1.1 — Locate and fix `computeCombatColumn` in `fire.js`

Find the combat column lookup in `server/src/engine/combat/fire.js`. Confirm it reads
defender SPs. Change to read attacker effective SPs (attacker base SPs × ½ if attacker
is `disorganized`). Add `// LOB §5.1 — combat column determined by attacker effective SPs`.

### Task 1.2 — Add regression test for attacker-SP column

In the existing fire combat test file, add a test that fires a 4-SP attacker against an
8-SP defender and confirms the column corresponds to 4 SPs (not 8).

---

## Phase 2 — Fix Opening Volley direction (#575)

### Task 2.1 — Reverse OV firer/target in `fire.js`

In the OV resolution code path in `fire.js`, swap the `firerUnit` and `targetUnit` roles
so the inactive defender fires at the moving attacker. The `movedThisActivation` gating
logic on the attacker is correct and stays unchanged. Add `// LOB §5.4a — OV fired by
inactive defender against moving attacker`.

### Task 2.2 — Reverse OV firer/target in `melee.js`

Same fix in the close combat Opening Volley path if it mirrors the fire path. Add matching
rule citation.

### Task 2.3 — Add regression test for OV direction

Test that after a move+fire sequence, the SP loss from OV is applied to the attacker unit,
not the defender.

---

## Phase 3 — Fix CBF trigger (#576)

### Task 3.1 — Gate CBF marker behind arty-vs-arty check in `fire.js`

Find the `cbfMarker = true` assignment. Wrap it: only set when both attacking unit and
defending unit have `weaponClass === 'artillery'` (or the OOB arty flag). Add
`// LOB §5.8 — CBF marker: arty-vs-arty SP loss only`.

### Task 3.2 — Add regression test for CBF gating

Test that infantry firing on artillery does NOT set CBF. Test that arty firing on arty
DOES set CBF when SP loss occurs.

---

## Phase 4 — Fix morale cascade scope (#577)

### Task 4.1 — Replace hex-scope cascade with brigade-hierarchy cascade in `morale.js`

In the cascade logic, replace the gather-by-hex with a gather-by-brigadeId lookup against
the OOB data. Given the unit's `brigadeId`, find sibling units in the same brigade and the
brigade commander. Cascade the morale check up to the brigade commander per LOB §6.3.
Add `// LOB §6.3 — cascade travels brigade hierarchy, not hex scope`.

### Task 4.2 — Add regression test for brigade cascade

Test that a morale cascade from unit A only affects units in the same brigade as A, not
a separate-brigade unit co-located in the same hex.

### Task 4.3 — Run `npm run quality:strict` and fix any issues
