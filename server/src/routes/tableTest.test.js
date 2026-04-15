/**
 * Tests for server/src/routes/tableTest.js
 *
 * Engine table modules are mocked — their correctness is verified in their own
 * unit tests. These tests verify the route layer: correct HTTP shapes,
 * required-param validation, and engine delegation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// ─── Mock engine modules ───────────────────────────────────────────────────────

vi.mock('../engine/tables/combat.js', () => ({
  combatResult: vi.fn(),
  openingVolleyResult: vi.fn(),
}));

vi.mock('../engine/tables/charge.js', () => ({
  closingRollResult: vi.fn(),
}));

vi.mock('../engine/tables/command.js', () => ({
  commandRollResult: vi.fn(),
  orderDeliveryTurns: vi.fn(),
  flukeStoppageResult: vi.fn(),
  attackRecoveryResult: vi.fn(),
  zeroRuleResult: vi.fn(),
  AWARENESS_TURNS: { onFire: 1, normal: 2, notSoSure: 4, comatose: 8 },
  DISTANCE_TURNS: { withinRadius: 1, beyondRadius: 2, beyondRadiusFar: 3 },
}));

vi.mock('../engine/tables/leader-loss.js', () => ({
  leaderLossResult: vi.fn(),
}));

vi.mock('../engine/tables/morale.js', () => ({
  moraleResult: vi.fn(),
  moraleTransition: vi.fn(),
  MORALE_STATES: ['bl', 'normal', 'shaken', 'dg', 'rout'],
}));

import { combatResult, openingVolleyResult } from '../engine/tables/combat.js';
import { closingRollResult } from '../engine/tables/charge.js';
import {
  commandRollResult,
  orderDeliveryTurns,
  flukeStoppageResult,
  attackRecoveryResult,
  zeroRuleResult,
} from '../engine/tables/command.js';
import { leaderLossResult } from '../engine/tables/leader-loss.js';
import { moraleResult, moraleTransition } from '../engine/tables/morale.js';

// ─── App setup ────────────────────────────────────────────────────────────────

let app;

beforeEach(async () => {
  vi.clearAllMocks();
  const routerModule = await import('./tableTest.js');
  app = express();
  app.use(express.json());
  app.use('/api/tools/table-test', routerModule.default);
});

// ─── POST /combat ─────────────────────────────────────────────────────────────

describe('POST /combat', () => {
  it('returns result shape with valid inputs', async () => {
    combatResult.mockReturnValue({
      resultType: 'full',
      spLoss: 2,
      moraleCheckRequired: true,
      leaderLossCheckRequired: true,
      finalColumn: '4-5',
      depletionBand: 'right',
    });

    const res = await request(app)
      .post('/api/tools/table-test/combat')
      .send({ effectiveSPs: 5, netColumnShifts: 0, diceRoll: 8 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      resultType: 'full',
      spLoss: 2,
      moraleCheckRequired: true,
      leaderLossCheckRequired: true,
      finalColumn: '4-5',
      depletionBand: 'right',
    });
    expect(combatResult).toHaveBeenCalledWith(5, 0, 8);
  });

  it('returns 400 when effectiveSPs is missing', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/combat')
      .send({ netColumnShifts: 0, diceRoll: 8 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when diceRoll is out of 2d6 range', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/combat')
      .send({ effectiveSPs: 5, netColumnShifts: 0, diceRoll: 13 });
    expect(res.status).toBe(400);
  });
});

// ─── POST /opening-volley ─────────────────────────────────────────────────────

describe('POST /opening-volley', () => {
  it('returns spLoss with valid inputs', async () => {
    openingVolleyResult.mockReturnValue({ spLoss: 1 });

    const res = await request(app)
      .post('/api/tools/table-test/opening-volley')
      .send({ condition: 'charge', diceRoll: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ spLoss: 1 });
    expect(openingVolleyResult).toHaveBeenCalledWith('charge', 5);
  });

  it('returns 400 when condition is missing', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/opening-volley')
      .send({ diceRoll: 5 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when condition is invalid', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/opening-volley')
      .send({ condition: 'badCondition', diceRoll: 5 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when diceRoll is out of 1d6 range', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/opening-volley')
      .send({ condition: 'range1', diceRoll: 7 });
    expect(res.status).toBe(400);
  });
});

// ─── POST /morale ─────────────────────────────────────────────────────────────

describe('POST /morale', () => {
  it('returns morale result with valid inputs', async () => {
    moraleResult.mockReturnValue({
      effectiveRoll: 9,
      type: 'shaken',
      retreatHexes: 1,
      spLoss: 0,
      leaderLossCheck: false,
    });

    const res = await request(app)
      .post('/api/tools/table-test/morale')
      .send({ rating: 'C', modifiers: { isShakenOrDG: true }, diceRoll: 8 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ effectiveRoll: 9, type: 'shaken' });
    expect(moraleResult).toHaveBeenCalledWith('C', { isShakenOrDG: true }, 8);
  });

  it('returns 400 when rating is missing', async () => {
    const res = await request(app).post('/api/tools/table-test/morale').send({ diceRoll: 8 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when rating is invalid', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/morale')
      .send({ rating: 'Z', diceRoll: 8 });
    expect(res.status).toBe(400);
  });

  it('defaults modifiers to empty object when not provided', async () => {
    moraleResult.mockReturnValue({
      effectiveRoll: 8,
      type: 'noEffect',
      retreatHexes: 0,
      spLoss: 0,
      leaderLossCheck: false,
    });

    const res = await request(app)
      .post('/api/tools/table-test/morale')
      .send({ rating: 'B', diceRoll: 8 });

    expect(res.status).toBe(200);
    expect(moraleResult).toHaveBeenCalledWith('B', {}, 8);
  });
});

// ─── POST /morale-transition ──────────────────────────────────────────────────

describe('POST /morale-transition', () => {
  it('returns transition result with valid inputs', async () => {
    moraleTransition.mockReturnValue({ newState: 'dg', suppressRetreatsAndLosses: false });

    const res = await request(app)
      .post('/api/tools/table-test/morale-transition')
      .send({ currentState: 'shaken', incomingResult: 'shaken' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ newState: 'dg', suppressRetreatsAndLosses: false });
  });

  it('returns 400 when currentState is missing', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/morale-transition')
      .send({ incomingResult: 'shaken' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when currentState is invalid', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/morale-transition')
      .send({ currentState: 'superFleeing', incomingResult: 'shaken' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when moraleTransition returns null', async () => {
    moraleTransition.mockReturnValue(null);

    const res = await request(app)
      .post('/api/tools/table-test/morale-transition')
      .send({ currentState: 'bl', incomingResult: 'unknownResult' });
    expect(res.status).toBe(400);
  });
});

// ─── POST /closing-roll ───────────────────────────────────────────────────────

describe('POST /closing-roll', () => {
  it('returns result with valid inputs', async () => {
    closingRollResult.mockReturnValue({ pass: true, threshold: 3, modifiedRoll: 4 });

    const res = await request(app)
      .post('/api/tools/table-test/closing-roll')
      .send({ moraleRating: 'B', modifiers: { isRear: true }, diceRoll: 3 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pass: true, threshold: 3, modifiedRoll: 4 });
    expect(closingRollResult).toHaveBeenCalledWith('B', { isRear: true }, 3);
  });

  it('returns 400 when moraleRating is missing', async () => {
    const res = await request(app).post('/api/tools/table-test/closing-roll').send({ diceRoll: 3 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when moraleRating is invalid', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/closing-roll')
      .send({ moraleRating: 'X', diceRoll: 3 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when diceRoll is out of 1d6 range', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/closing-roll')
      .send({ moraleRating: 'A', diceRoll: 0 });
    expect(res.status).toBe(400);
  });
});

// ─── POST /leader-loss ────────────────────────────────────────────────────────

describe('POST /leader-loss', () => {
  it('returns result with valid inputs', async () => {
    leaderLossResult.mockReturnValue({ result: 'wounded' });

    const res = await request(app)
      .post('/api/tools/table-test/leader-loss')
      .send({ situation: 'other', isSharpshooter: false, diceRoll: 11 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: 'wounded' });
    expect(leaderLossResult).toHaveBeenCalledWith('other', false, 11);
  });

  it('returns 400 when situation is missing', async () => {
    const res = await request(app).post('/api/tools/table-test/leader-loss').send({ diceRoll: 11 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when situation is invalid', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/leader-loss')
      .send({ situation: 'badSituation', diceRoll: 11 });
    expect(res.status).toBe(400);
  });
});

// ─── POST /command-roll ───────────────────────────────────────────────────────

describe('POST /command-roll', () => {
  it('returns result with valid inputs', async () => {
    commandRollResult.mockReturnValue({ yes: true, modifiedRoll: 12 });

    const res = await request(app)
      .post('/api/tools/table-test/command-roll')
      .send({ commandValue: 3, isReserve: false, isDeployment: false, diceRoll: 9 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ yes: true, modifiedRoll: 12 });
    expect(commandRollResult).toHaveBeenCalledWith(3, false, false, 9);
  });

  it('returns 400 when commandValue is missing', async () => {
    const res = await request(app).post('/api/tools/table-test/command-roll').send({ diceRoll: 9 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when diceRoll is out of 2d6 range', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/command-roll')
      .send({ commandValue: 3, diceRoll: 1 });
    expect(res.status).toBe(400);
  });
});

// ─── POST /order-delivery ─────────────────────────────────────────────────────

describe('POST /order-delivery', () => {
  it('returns turnsToDeliver with valid inputs', async () => {
    orderDeliveryTurns.mockReturnValue({ turnsToDeliver: 4 });

    const res = await request(app)
      .post('/api/tools/table-test/order-delivery')
      .send({ armyCOType: 'normal', distanceCategory: 'beyondRadius' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ turnsToDeliver: 4 });
    expect(orderDeliveryTurns).toHaveBeenCalledWith('normal', 'beyondRadius', false);
  });

  it('returns 400 when armyCOType is missing', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/order-delivery')
      .send({ distanceCategory: 'withinRadius' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when armyCOType is invalid', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/order-delivery')
      .send({ armyCOType: 'legendary', distanceCategory: 'withinRadius' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when distanceCategory is invalid', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/order-delivery')
      .send({ armyCOType: 'normal', distanceCategory: 'veryFarAway' });
    expect(res.status).toBe(400);
  });
});

// ─── POST /fluke-stoppage ─────────────────────────────────────────────────────

describe('POST /fluke-stoppage', () => {
  it('returns result with valid inputs', async () => {
    flukeStoppageResult.mockReturnValue({
      step1EffectiveRoll: 5,
      basePass: false,
      step2Required: true,
      step2EffectiveRoll: 8,
      step2Threshold: 7,
      stoppage: false,
    });

    const res = await request(app)
      .post('/api/tools/table-test/fluke-stoppage')
      .send({ commandValue: 3, hasReserve: false, isNight: false, step1Roll: 5, step2Roll: 8 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ basePass: false, stoppage: false });
    expect(flukeStoppageResult).toHaveBeenCalledWith(3, false, false, 5, 8);
  });

  it('returns 400 when commandValue is missing', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/fluke-stoppage')
      .send({ step1Roll: 5 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when step1Roll is missing', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/fluke-stoppage')
      .send({ commandValue: 3 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when step1Roll is out of 2d6 range', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/fluke-stoppage')
      .send({ commandValue: 3, step1Roll: 1 });
    expect(res.status).toBe(400);
  });
});

// ─── POST /attack-recovery ────────────────────────────────────────────────────

describe('POST /attack-recovery', () => {
  it('returns result with valid inputs', async () => {
    attackRecoveryResult.mockReturnValue({
      step1Threshold: 9,
      basePass: true,
      step2Required: true,
      step2EffectiveRoll: 8,
      step2Threshold: 8,
      recovered: true,
    });

    const res = await request(app)
      .post('/api/tools/table-test/attack-recovery')
      .send({ divisionStatus: 'wrecked', commandValue: 3, step1Roll: 10, step2Roll: 8 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ recovered: true });
    expect(attackRecoveryResult).toHaveBeenCalledWith('wrecked', 3, 10, 8);
  });

  it('returns 400 when divisionStatus is missing', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/attack-recovery')
      .send({ commandValue: 3, step1Roll: 10 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when divisionStatus is invalid', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/attack-recovery')
      .send({ divisionStatus: 'devastated', commandValue: 3, step1Roll: 10 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when step1Roll is out of 2d6 range', async () => {
    const res = await request(app)
      .post('/api/tools/table-test/attack-recovery')
      .send({ divisionStatus: 'clean', commandValue: 3, step1Roll: 13 });
    expect(res.status).toBe(400);
  });
});

// ─── POST /zero-rule ──────────────────────────────────────────────────────────

describe('POST /zero-rule', () => {
  it('returns ma with valid input', async () => {
    zeroRuleResult.mockReturnValue({ ma: 'full' });

    const res = await request(app).post('/api/tools/table-test/zero-rule').send({ diceRoll: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ma: 'full' });
    expect(zeroRuleResult).toHaveBeenCalledWith(5);
  });

  it('returns 400 when diceRoll is missing', async () => {
    const res = await request(app).post('/api/tools/table-test/zero-rule').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when diceRoll is out of 1d6 range', async () => {
    const res = await request(app).post('/api/tools/table-test/zero-rule').send({ diceRoll: 0 });
    expect(res.status).toBe(400);
  });
});
