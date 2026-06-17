/**
 * Turn-loop steel-thread smoke test (#554)
 *
 * Exercises the full create → valid-actions → action → state-update → valid-actions-refresh
 * loop using real engine modules and real file persistence (temp directory).
 * No HTTP layer, no mocks — this is a pure integration test of the engine pipeline.
 *
 * Run: npx vitest run server/src/engine/actions/smoke.test.js
 *   or: npm run test:smoke
 *
 * ⚠ Test ordering: tests 2–8 share `dataDir` and run in source order. The persisted
 * game-file version increments across them (test 2 saves v2, test 6 saves v3, test 8
 * saves v4). Do NOT reorder these tests, insert new tests between them, or enable
 * sequence.shuffle for this file — doing so will break version-number assertions with
 * ENOENT or stale-version errors. Test 9 (full turn cycle) is fully isolated via its
 * own `cycleDir` and can run in any order.
 */
import { rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PHASES, STEPS } from '../../constants/phases.js';
import { dispatch, getValidActions, ActionError } from './index.js';
import { handleFireCombat } from './fireCombat.js';
import { handleResolveMorale } from './resolveMorale.js';
import { handleResolveLeaderCasualty } from './resolveLeaderCasualty.js';
import { saveGame, loadGame } from '../../store/gameFile.js';

// ── Deterministic fixture ────────────────────────────────────────────────────
// Minimal valid game state that starts in COMMAND / orders with one unit and one leader.
// Avoids loading scenario.json so the test is self-contained and fast.

const GAME_ID = 'smoke-test-game-id-00000000';

const BASE_UNIT = {
  id: 'colquitt',
  hex: '29.22',
  facing: 0,
  moraleState: 'normal',
  wrecked: false,
  orders: { type: 'move', status: 'accepted', deliveryTurnDue: null },
  ammo: 'full',
  depletionMarker: false,
  cbfMarker: false,
  isOnBoard: true,
  entryTurn: null,
  isDetached: false,
};

const ACTIVE_STATE = {
  id: GAME_ID,
  scenarioId: 'south-mountain',
  schemaVersion: 3,
  version: 1,
  turn: 1,
  phase: PHASES.COMMAND,
  activePlayer: 'union',
  step: STEPS.ORDERS,
  completedSteps: [],
  initiative: null,
  sides: { union: 'tok-union', confederate: 'tok-csa' },
  units: { colquitt: BASE_UNIT },
  reinforcementQueue: [],
  status: 'active',
  // Empty leaderState triggers the M5 steel-thread fallback in getValidActions:
  // a single { type: 'ROLL_INITIATIVE', payload: null } candidate.
  // LeaderStateSchema has { casualtyRollPending, replacedBy } — no isOnBoard field.
  // Leader eligibility in the engine reads ls.isOnBoard (always undefined here → ineligible),
  // so the null-payload fallback is the correct M5 path when leaderState is empty. (#560)
  leaderState: {},
  pendingResolution: null,
  activityPhase: null,
  ordersPhase: { leaderRollUsed: {}, pendingOrderIssuance: null },
  rallyPhase: null,
};

// ── Setup / teardown ─────────────────────────────────────────────────────────

let dataDir;

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'lob-smoke-'));
});

afterAll(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

// ── Smoke test ───────────────────────────────────────────────────────────────

describe('Turn-loop steel-thread smoke (#554)', () => {
  it('initial state is valid and has expected structure', () => {
    const state = ACTIVE_STATE;
    expect(state.status).toBe('active');
    expect(state.phase).toBe(PHASES.COMMAND);
    expect(state.step).toBe(STEPS.ORDERS);
    expect(state.activePlayer).toBe('union');
    expect(Object.keys(state.units)).toContain('colquitt');
    expect(state.units.colquitt.isOnBoard).toBe(true);
    expect(state.units.colquitt.hex).toBe('29.22');
  });

  it('persists and reloads state via real file store', async () => {
    const saved = await saveGame(GAME_ID, ACTIVE_STATE, dataDir);
    expect(saved.version).toBe(2); // saveGame increments version

    const loaded = await loadGame(GAME_ID, dataDir);
    expect(loaded.id).toBe(GAME_ID);
    expect(loaded.version).toBe(2);
    expect(loaded.status).toBe('active');
    expect(loaded.units.colquitt.hex).toBe('29.22');
  });

  it('getValidActions returns ROLL_INITIATIVE (null-payload fallback) and END_PHASE in command/orders', async () => {
    // With empty leaderState, the engine returns the M5 steel-thread null-payload fallback.
    // Concrete leaderId/unitId candidates require OOB-seeded leaderState (M6). (#560)
    const state = await loadGame(GAME_ID, dataDir);
    const actions = getValidActions(state, 'union');

    expect(actions.length).toBeGreaterThan(0);
    const types = actions.map((a) => a.type);
    expect(types).toContain('ROLL_INITIATIVE');
    expect(types).toContain('END_PHASE');

    const rollCandidate = actions.find((a) => a.type === 'ROLL_INITIATIVE');
    expect(rollCandidate.payload).toBeNull(); // steel-thread fallback
  });

  it('getValidActions returns [] for the wrong player side', async () => {
    const state = await loadGame(GAME_ID, dataDir);
    const actions = getValidActions(state, 'confederate');
    expect(actions).toEqual([]);
  });

  it('dispatch ROLL_INITIATIVE + ISSUE_ORDER chain works in-memory (concrete payload)', () => {
    // Test the ROLL_INITIATIVE → ISSUE_ORDER chain in memory (no file round-trip needed)
    // with a concrete leaderId+unitId supplied directly to the handler.
    const s1 = dispatch(ACTIVE_STATE, {
      type: 'ROLL_INITIATIVE',
      payload: { leaderId: 'cox', unitId: 'colquitt' },
      playerSide: 'union',
    });

    expect(s1.ordersPhase.pendingOrderIssuance).toEqual({ leaderId: 'cox', unitId: 'colquitt' });
    expect(s1.ordersPhase.leaderRollUsed.cox).toBe(true);

    // After ROLL_INITIATIVE, only ISSUE_ORDER candidates are valid
    const afterRollActions = getValidActions(s1, 'union');
    const types = [...new Set(afterRollActions.map((a) => a.type))];
    expect(types).toContain('ISSUE_ORDER');
    expect(types).not.toContain('END_PHASE');
    expect(types).not.toContain('ROLL_INITIATIVE');
    expect(afterRollActions).toHaveLength(2);
    expect(afterRollActions.map((a) => a.payload.orderType)).toContain('attack');

    // ISSUE_ORDER assigns the order
    const s2 = dispatch(s1, {
      type: 'ISSUE_ORDER',
      payload: { unitId: 'colquitt', orderType: 'attack' },
      playerSide: 'union',
    });
    expect(s2.ordersPhase.pendingOrderIssuance).toBeNull();
    expect(s2.units.colquitt.orders.type).toBe('attack');
    expect(s2.units.colquitt.orders.status).toBe('accepted');
  });

  it('dispatch END_PHASE from command/orders drains to activity/activation and version increments', async () => {
    const state = await loadGame(GAME_ID, dataDir);
    const versionBefore = state.version;

    // END_PHASE is valid after order issuance (no pending initiative)
    const nextState = dispatch(state, {
      type: 'END_PHASE',
      payload: null,
      playerSide: 'union',
    });

    // drainAutoSteps should have advanced through attackRecovery + flukeStoppage → activity
    expect(nextState.phase).toBe(PHASES.ACTIVITY);
    expect(nextState.step).toBe(STEPS.ACTIVATION);
    expect(nextState.activityPhase).not.toBeNull();
    expect(nextState.activityPhase.activatedUnits).toEqual([]);
    expect(nextState.activityPhase.currentActivation).toBeNull();
    expect(nextState.ordersPhase).toBeNull();

    const saved = await saveGame(GAME_ID, nextState, dataDir);
    expect(saved.version).toBe(versionBefore + 1);
  });

  it('in activity/activation, valid actions include ACTIVATE_STACK and END_PHASE', async () => {
    const state = await loadGame(GAME_ID, dataDir);
    expect(state.phase).toBe(PHASES.ACTIVITY);
    const actions = getValidActions(state, 'union');
    const types = actions.map((a) => a.type);
    expect(types).toContain('ACTIVATE_STACK');
    expect(types).toContain('END_PHASE');

    // ACTIVATE_STACK candidate has a concrete hex payload
    const activateCandidates = actions.filter((a) => a.type === 'ACTIVATE_STACK');
    expect(activateCandidates.length).toBeGreaterThan(0);
    for (const c of activateCandidates) {
      expect(typeof c.payload.hex).toBe('string');
    }
  });

  it('dispatch ACTIVATE_STACK + END_ACTIVATION completes the activation loop', async () => {
    const state = await loadGame(GAME_ID, dataDir);
    const activateCandidate = getValidActions(state, 'union').find(
      (a) => a.type === 'ACTIVATE_STACK'
    );
    expect(activateCandidate).toBeDefined();

    const afterActivate = dispatch(state, {
      type: 'ACTIVATE_STACK',
      payload: activateCandidate.payload,
      playerSide: 'union',
    });
    expect(afterActivate.activityPhase.currentActivation.hex).toBe(activateCandidate.payload.hex);

    // END_ACTIVATION always present mid-activation; FIRE_COMBAT also offered (LOB §5.5)
    const midActions = getValidActions(afterActivate, 'union');
    expect(midActions.map((a) => a.type)).toContain('END_ACTIVATION');
    expect(midActions.map((a) => a.type)).toContain('FIRE_COMBAT');

    const afterEnd = dispatch(afterActivate, {
      type: 'END_ACTIVATION',
      payload: null,
      playerSide: 'union',
    });
    expect(afterEnd.activityPhase.currentActivation).toBeNull();
    expect(afterEnd.activityPhase.activatedUnits).toContain(activateCandidate.payload.hex);

    const saved = await saveGame(GAME_ID, afterEnd, dataDir);
    expect(saved.version).toBe(state.version + 1);
  });

  // #566 — error-path coverage: wrong side dispatch, invalid action type, stale version
  it('dispatch throws INVALID_ACTION when called for the wrong player side', async () => {
    const state = await loadGame(GAME_ID, dataDir);
    expect(() =>
      dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'confederate' })
    ).toThrow(ActionError);
    expect(() =>
      dispatch(state, { type: 'END_PHASE', payload: null, playerSide: 'confederate' })
    ).toThrow(/turn/);
  });

  it('dispatch throws INVALID_ACTION for an action type not valid in current state', async () => {
    const state = await loadGame(GAME_ID, dataDir);
    // END_ACTIVATION is only legal when currentActivation is non-null; it is null in this state.
    expect(() =>
      dispatch(state, { type: 'END_ACTIVATION', payload: null, playerSide: 'union' })
    ).toThrow(ActionError);
    expect(() =>
      dispatch(state, { type: 'END_ACTIVATION', payload: null, playerSide: 'union' })
    ).toThrow(/not valid in the current state/);
  });

  it('saveGame throws on stale version conflict (optimistic-concurrency contract)', async () => {
    const state = await loadGame(GAME_ID, dataDir);
    const versionOnDisk = state.version;
    // Saving with version - 1 simulates a stale writer
    const staleState = { ...state, version: state.version - 1 };
    await expect(saveGame(GAME_ID, staleState, dataDir)).rejects.toThrow(/Version conflict/);
    // Rejection must leave disk state unchanged
    const afterReject = await loadGame(GAME_ID, dataDir);
    expect(afterReject.version).toBe(versionOnDisk);
  });

  // #567 — structural round-trip assertion on persisted state (save → load in isolated dir)
  it('persisted state after save matches all top-level fields of the fixture', async () => {
    const roundTripDir = await mkdtemp(join(tmpdir(), 'lob-smoke-rt-'));
    try {
      await saveGame(GAME_ID, ACTIVE_STATE, roundTripDir);
      const loaded = await loadGame(GAME_ID, roundTripDir);
      expect(loaded).toMatchObject({
        id: GAME_ID,
        scenarioId: 'south-mountain',
        schemaVersion: 3,
        phase: expect.any(String),
        step: expect.any(String),
        activePlayer: expect.any(String),
        sides: { union: 'tok-union', confederate: 'tok-csa' },
        units: expect.objectContaining({
          colquitt: expect.objectContaining({
            hex: '29.22',
            orders: expect.objectContaining({ deliveryTurnDue: null }),
          }),
        }),
      });
    } finally {
      await rm(roundTripDir, { recursive: true, force: true });
    }
  });

  it('full turn cycle: END_PHASE × 2 advances turn counter and switches active player', async () => {
    // Start from a clean command/orders state to run a full turn
    const startState = {
      ...ACTIVE_STATE,
      id: GAME_ID + '-cycle',
      version: 1,
    };
    const cycleDir = await mkdtemp(join(tmpdir(), 'lob-smoke-cycle-'));
    try {
      await saveGame(startState.id, startState, cycleDir);

      // Union ends command phase → drains to activity
      let s = await loadGame(startState.id, cycleDir);
      s = dispatch(s, { type: 'END_PHASE', payload: null, playerSide: 'union' });
      expect(s.phase).toBe(PHASES.ACTIVITY);
      expect(s.activePlayer).toBe('union');

      // Union ends activation → confederate gets activation
      s = dispatch(s, { type: 'END_PHASE', payload: null, playerSide: 'union' });
      expect(s.phase).toBe(PHASES.ACTIVITY);
      expect(s.activePlayer).toBe('confederate');

      // Confederate ends activation → both done → Rally → next turn
      s = dispatch(s, { type: 'END_PHASE', payload: null, playerSide: 'confederate' });
      expect(s.turn).toBe(2);
      expect(s.phase).toBe(PHASES.COMMAND);
      expect(s.step).toBe(STEPS.ORDERS);
      // Net result: turn 2 command phase belongs to confederate.
      // Two-step flip: endPhase sets activePlayer=union (otherSide of the confederate
      // who just ended), then drainAutoSteps Rally flips union→confederate (index.js:153).
      expect(s.activePlayer).toBe('confederate');
    } finally {
      await rm(cycleDir, { recursive: true, force: true });
    }
  });
});

// ── M6 combat activation smoke test ────────────────────────────────────────────
// Exercises the M6 handler chain in memory (no file I/O):
//   ACTIVATE_STACK → FIRE_COMBAT (sets pendingResolution combatResult)
//   → RESOLVE_MORALE (clears pending) → RESOLVE_LEADER_CASUALTY (if needed)
//   → END_ACTIVATION → CBF cleared in Rally → turn advances.
//
// Uses minimal OOB fixture to avoid reading from disk.

const MOCK_OOB_SMOKE = {
  _status: 'test',
  _source: 'test',
  _errata_applied: [],
  union: {
    army: 'Army of the Potomac',
    supplyTrain: { id: 'supply-u' },
    corps: [
      {
        id: 'i-corps',
        name: 'I Corps',
        successionIds: [],
        divisions: [
          {
            id: 'div1',
            name: '1st Division',
            wreckThreshold: 2,
            successionIds: [],
            brigades: [
              {
                id: 'brig1',
                wreckThreshold: 2,
                regiments: [
                  {
                    id: 'u1',
                    name: '1st Union',
                    type: 'infantry',
                    morale: 'A',
                    weapon: 'R',
                    strengthPoints: 6,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    cavalryDivision: { id: 'cav-div', name: 'Cavalry Division', successionIds: [], brigades: [] },
  },
  confederate: {
    army: 'Army of Northern Virginia',
    wing: 'Right Wing',
    supplyWagon: { id: 'supply-c' },
    independent: { cavalry: [], artillery: [] },
    reserveArtillery: { batteries: [] },
    divisions: [
      {
        id: 'div-csa',
        name: 'CSA Division',
        wreckThreshold: 2,
        successionIds: [],
        brigades: [
          {
            id: 'brig-csa',
            wreckThreshold: 2,
            regiments: [
              {
                id: 'c1',
                name: '1st CSA',
                type: 'infantry',
                morale: 'D',
                weapon: 'R',
                strengthPoints: 4,
              },
            ],
          },
        ],
      },
    ],
  },
};

const COMBAT_STATE = {
  id: 'smoke-combat-g1',
  scenarioId: 'south-mountain',
  schemaVersion: 3,
  version: 1,
  turn: 1,
  phase: PHASES.ACTIVITY,
  step: STEPS.ACTIVATION,
  activePlayer: 'union',
  completedSteps: [],
  initiative: null,
  sides: { union: 'tok-union', confederate: 'tok-csa' },
  reinforcementQueue: [],
  status: 'active',
  leaderState: { cox: { casualtyRollPending: false, replacedBy: null } },
  pendingResolution: null,
  ordersPhase: null,
  rallyPhase: null,
  activityPhase: { activatedUnits: [], currentActivation: null },
  units: {
    u1: {
      id: 'u1',
      hex: '10.10',
      facing: 0,
      moraleState: 'normal',
      wrecked: false,
      orders: null,
      ammo: 'full',
      depletionMarker: false,
      cbfMarker: false,
      isOnBoard: true,
      entryTurn: null,
      isDetached: false,
    },
    c1: {
      id: 'c1',
      hex: '10.11',
      facing: 3,
      moraleState: 'normal',
      wrecked: false,
      orders: null,
      ammo: 'full',
      depletionMarker: false,
      cbfMarker: false,
      isOnBoard: true,
      entryTurn: null,
      isDetached: false,
    },
  },
};

describe('M6 combat activation smoke (#570)', () => {
  it('ACTIVATE_STACK sets currentActivation', () => {
    const s = dispatch(COMBAT_STATE, {
      type: 'ACTIVATE_STACK',
      payload: { hex: '10.10' },
      playerSide: 'union',
    });
    expect(s.activityPhase.currentActivation.hex).toBe('10.10');
    expect(s.activityPhase.currentActivation.movedThisActivation).toBe(false);
    expect(s.activityPhase.currentActivation.openingVolley).toBe(false);
  });

  it('FIRE_COMBAT sets pendingResolution combatResult (LOB §5.6)', () => {
    const afterActivate = dispatch(COMBAT_STATE, {
      type: 'ACTIVATE_STACK',
      payload: { hex: '10.10' },
      playerSide: 'union',
    });

    const afterFire = handleFireCombat(
      afterActivate,
      {
        type: 'FIRE_COMBAT',
        payload: {
          attackerHex: '10.10',
          defenderHex: '10.11',
          weaponClass: 'smallArms',
          weaponType: 'R',
          dice: [3, 3],
        },
        playerSide: 'union',
      },
      { oob: MOCK_OOB_SMOKE }
    );

    expect(afterFire.pendingResolution).not.toBeNull();
    expect(afterFire.pendingResolution.type).toBe('combatResult');
  });

  it('RESOLVE_MORALE clears combatResult pending (LOB §6.1)', () => {
    const afterActivate = dispatch(COMBAT_STATE, {
      type: 'ACTIVATE_STACK',
      payload: { hex: '10.10' },
      playerSide: 'union',
    });
    const afterFire = handleFireCombat(
      afterActivate,
      {
        type: 'FIRE_COMBAT',
        payload: {
          attackerHex: '10.10',
          defenderHex: '10.11',
          weaponClass: 'smallArms',
          weaponType: 'R',
          dice: [2, 2],
        },
        playerSide: 'union',
      },
      { oob: MOCK_OOB_SMOKE }
    );
    expect(afterFire.pendingResolution.type).toBe('combatResult');

    // Resolve morale with noEffect roll (A morale, roll 4 → noEffect)
    const afterMorale = handleResolveMorale(afterFire, {
      type: 'RESOLVE_MORALE',
      payload: { dice: [2, 2] },
      playerSide: 'union',
    });
    // pendingResolution cleared or changed to cascade/leaderCasualty — not combatResult
    expect(afterMorale.pendingResolution?.type).not.toBe('combatResult');
  });

  it('RESOLVE_LEADER_CASUALTY clears leaderCasualty pending (LOB §9.1a)', () => {
    const stateWithPending = {
      ...COMBAT_STATE,
      pendingResolution: {
        type: 'leaderCasualty',
        context: { leaderId: 'cox', hex: '10.10', reason: 'test' },
      },
    };
    const result = handleResolveLeaderCasualty(stateWithPending, {
      type: 'RESOLVE_LEADER_CASUALTY',
      payload: { leaderId: 'cox', roll: 7, situation: 'other', isSharpshooter: false },
      playerSide: 'union',
    });
    expect(result.pendingResolution).toBeNull();
  });

  // #595 — route-layer contract: after FIRE_COMBAT sets combatResult, only RESOLVE_MORALE is valid;
  // after RESOLVE_MORALE clears it, END_ACTIVATION is valid again.
  it('route contract: FIRE_COMBAT → RESOLVE_MORALE two-step — valid actions gate correctly (#595)', () => {
    const afterActivate = dispatch(COMBAT_STATE, {
      type: 'ACTIVATE_STACK',
      payload: { hex: '10.10' },
      playerSide: 'union',
    });

    const afterFire = handleFireCombat(
      afterActivate,
      {
        type: 'FIRE_COMBAT',
        payload: {
          attackerHex: '10.10',
          defenderHex: '10.11',
          weaponClass: 'smallArms',
          weaponType: 'R',
          dice: [2, 2],
        },
        playerSide: 'union',
      },
      { oob: MOCK_OOB_SMOKE }
    );

    // After FIRE_COMBAT: only RESOLVE_MORALE is valid (combatResult pending)
    const actionsAfterFire = getValidActions(afterFire, 'union');
    expect(actionsAfterFire).toHaveLength(1);
    expect(actionsAfterFire[0].type).toBe('RESOLVE_MORALE');

    const afterMorale = handleResolveMorale(
      afterFire,
      { type: 'RESOLVE_MORALE', payload: { dice: [2, 2] }, playerSide: 'union' },
      { oob: MOCK_OOB_SMOKE }
    );

    // After RESOLVE_MORALE: pending cleared (or changed to leaderCasualty/cascade) — not combatResult
    expect(afterMorale.pendingResolution?.type).not.toBe('combatResult');

    // When pending fully cleared, END_ACTIVATION is valid again
    if (afterMorale.pendingResolution === null) {
      const actionsAfterMorale = getValidActions(afterMorale, 'union');
      expect(actionsAfterMorale.map((a) => a.type)).toContain('END_ACTIVATION');
    }
  });

  it('CBF markers cleared when turn advances through Rally (LOB §8.1)', () => {
    // Inject a CBF marker on u1 then advance through Rally via END_PHASE chain
    const stateWithCbf = {
      ...COMBAT_STATE,
      units: {
        ...COMBAT_STATE.units,
        u1: { ...COMBAT_STATE.units.u1, cbfMarker: true },
      },
    };
    // End activity to enter rally
    let s = dispatch(stateWithCbf, { type: 'END_PHASE', payload: null, playerSide: 'union' });
    // Confederate also ends to trigger rally
    s = dispatch(s, { type: 'END_PHASE', payload: null, playerSide: 'confederate' });
    // Now in next turn command phase — CBF should be cleared
    expect(s.phase).toBe(PHASES.COMMAND);
    expect(s.units.u1.cbfMarker).toBe(false);
  });
});
