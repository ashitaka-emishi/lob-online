import { describe, it, expect } from 'vitest';
import { computeTurnTime } from './turnTime.js';

// South Mountain scenario fixture — mirrors the real scenario.json structure
const SM_SCENARIO = {
  turnStructure: {
    firstTurn: '09:00',
    date: '1862-09-14',
  },
  lightingSchedule: [
    { startTurn: 1, condition: 'day', visibilityHexes: 999 },
    { startTurn: 39, condition: 'twilight', visibilityHexes: 10 },
    { startTurn: 40, condition: 'twilight', visibilityHexes: 8 },
    { startTurn: 41, condition: 'twilight', visibilityHexes: 6 },
    { startTurn: 42, condition: 'twilight', visibilityHexes: 4 },
    { startTurn: 43, condition: 'twilight', visibilityHexes: 2 },
    { startTurn: 44, condition: 'twilight', visibilityHexes: 2 },
    { startTurn: 45, condition: 'night', visibilityHexes: 2 },
  ],
};

describe('computeTurnTime — daytime turns (15-min increments)', () => {
  it('turn 1 is 09:00 (game start)', () => {
    const result = computeTurnTime(1, SM_SCENARIO);
    expect(result.time).toBe('09:00');
  });

  it('turn 2 is 09:15', () => {
    const result = computeTurnTime(2, SM_SCENARIO);
    expect(result.time).toBe('09:15');
  });

  it('turn 10 is 11:15 (turn 1 + 9 × 15 min)', () => {
    const result = computeTurnTime(10, SM_SCENARIO);
    expect(result.time).toBe('11:15');
  });

  it('turn 38 is 18:15 (last full-day turn)', () => {
    const result = computeTurnTime(38, SM_SCENARIO);
    expect(result.time).toBe('18:15');
  });

  it('turn 1 condition is day', () => {
    const result = computeTurnTime(1, SM_SCENARIO);
    expect(result.condition).toBe('day');
  });

  it('turn 1 visibilityHexes is 999', () => {
    const result = computeTurnTime(1, SM_SCENARIO);
    expect(result.visibilityHexes).toBe(999);
  });

  it('turn 38 condition is day', () => {
    const result = computeTurnTime(38, SM_SCENARIO);
    expect(result.condition).toBe('day');
  });
});

describe('computeTurnTime — twilight turns (15-min increments)', () => {
  it('turn 39 is 18:30 (first twilight turn)', () => {
    const result = computeTurnTime(39, SM_SCENARIO);
    expect(result.time).toBe('18:30');
  });

  it('turn 39 condition is twilight', () => {
    const result = computeTurnTime(39, SM_SCENARIO);
    expect(result.condition).toBe('twilight');
  });

  it('turn 39 visibilityHexes is 10', () => {
    const result = computeTurnTime(39, SM_SCENARIO);
    expect(result.visibilityHexes).toBe(10);
  });

  it('turn 44 is 19:45 (last twilight turn)', () => {
    const result = computeTurnTime(44, SM_SCENARIO);
    expect(result.time).toBe('19:45');
  });

  it('turn 44 visibilityHexes is 2', () => {
    const result = computeTurnTime(44, SM_SCENARIO);
    expect(result.visibilityHexes).toBe(2);
  });
});

describe('computeTurnTime — night turns (30-min increments)', () => {
  it('turn 45 is 20:00 (first night turn)', () => {
    const result = computeTurnTime(45, SM_SCENARIO);
    expect(result.time).toBe('20:00');
  });

  it('turn 45 condition is night', () => {
    const result = computeTurnTime(45, SM_SCENARIO);
    expect(result.condition).toBe('night');
  });

  it('turn 45 visibilityHexes is 2', () => {
    const result = computeTurnTime(45, SM_SCENARIO);
    expect(result.visibilityHexes).toBe(2);
  });

  it('turn 46 is 20:30 (second night turn, 30-min step)', () => {
    const result = computeTurnTime(46, SM_SCENARIO);
    expect(result.time).toBe('20:30');
  });

  it('turn 47 is 21:00', () => {
    const result = computeTurnTime(47, SM_SCENARIO);
    expect(result.time).toBe('21:00');
  });
});

describe('computeTurnTime — scenario date', () => {
  it('returns the scenario date', () => {
    const result = computeTurnTime(1, SM_SCENARIO);
    expect(result.date).toBe('1862-09-14');
  });
});

describe('computeTurnTime — edge cases (L4)', () => {
  it('scenario without lightingSchedule returns day/999 for any turn', () => {
    const scenario = { turnStructure: { firstTurn: '09:00', date: '1862-09-14' } };
    const result = computeTurnTime(5, scenario);
    expect(result.condition).toBe('day');
    expect(result.visibilityHexes).toBe(999);
  });

  it('explicit empty lightingSchedule array returns day/999 sentinel', () => {
    const scenario = {
      turnStructure: { firstTurn: '09:00', date: '1862-09-14' },
      lightingSchedule: [],
    };
    const result = computeTurnTime(1, scenario);
    expect(result.condition).toBe('day');
    expect(result.visibilityHexes).toBe(999);
  });

  it('turnNumber=0 returns firstTurn time (loop does not run)', () => {
    const result = computeTurnTime(0, SM_SCENARIO);
    expect(result.time).toBe('09:00');
  });
});
