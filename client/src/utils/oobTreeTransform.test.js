import { describe, it, expect } from 'vitest';
import { buildDisplayTree } from './oobTreeTransform.js';

// ── Minimal fixtures ──────────────────────────────────────────────────────────

const MINIMAL_BRIGADE = { id: 'test-brig', name: 'Test Brigade', wreckThreshold: 2, regiments: [] };
const MINIMAL_DIVISION = {
  id: 'test-div',
  name: 'Test Division',
  wreckThreshold: 2,
  brigades: [MINIMAL_BRIGADE],
};
const MINIMAL_CORPS = { id: 'test-corps', name: 'Test Corps', divisions: [MINIMAL_DIVISION] };
const MINIMAL_CAV_DIV = { id: 'cav-div', name: 'Cavalry Division', brigades: [MINIMAL_BRIGADE] };

function makeOob(corpsOverrides = {}) {
  return {
    union: {
      army: 'Army of the Potomac',
      supplyTrain: { id: 'usa-train', name: 'AotP Supply' },
      corps: [{ ...MINIMAL_CORPS, ...corpsOverrides }],
      cavalryDivision: MINIMAL_CAV_DIV,
    },
    confederate: {
      army: 'Army of Northern Virginia',
      wing: "Longstreet's Wing",
      supplyWagon: { id: 'csa-wagon', name: 'Wing Supply Wagon' },
      independent: { cavalry: [], artillery: [] },
      reserveArtillery: { batteries: [] },
      divisions: [],
    },
  };
}

const EMPTY_LEADERS = { union: {}, confederate: {} };

// ── buildDisplayTree — union top-level structure ──────────────────────────────

describe('buildDisplayTree — union top-level', () => {
  it('returns empty array when oob is null', () => {
    expect(buildDisplayTree(null, EMPTY_LEADERS, 'union')).toEqual([]);
  });

  it('returns empty array when leaders is null', () => {
    expect(buildDisplayTree(makeOob(), null, 'union')).toEqual([]);
  });

  it('returns a single army node at the root', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, 'union');
    expect(tree).toHaveLength(1);
    expect(tree[0].nodeType).toBe('army');
    expect(tree[0].node.id).toBe('usa-army');
  });

  it('army node carries army-level _supply', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, 'union');
    expect(tree[0].node._supply).toMatchObject({ id: 'usa-train', name: 'AotP Supply' });
  });
});

// ── buildDisplayTree — corps supply (#234) ────────────────────────────────────

describe('buildDisplayTree — corps supply node (#234)', () => {
  it('corps node without supply has no _supply property', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, 'union');
    const corpsNodes = tree[0].node.corps;
    expect(corpsNodes[0]._supply).toBeUndefined();
  });

  it('corps node with supply carries _supply', () => {
    const oob = makeOob({ supply: { id: '1c-supply', name: '1 Corps Supply' } });
    const tree = buildDisplayTree(oob, EMPTY_LEADERS, 'union');
    expect(tree[0].node.corps[0]._supply).toMatchObject({
      id: '1c-supply',
      name: '1 Corps Supply',
    });
  });

  it('corps _supply is independent per corps', () => {
    const oob = {
      union: {
        army: 'Army of the Potomac',
        supplyTrain: { id: 'usa-train', name: 'AotP Supply' },
        corps: [
          { ...MINIMAL_CORPS, id: '1c', supply: { id: '1c-supply', name: '1 Corps Supply' } },
          { ...MINIMAL_CORPS, id: '9c', supply: { id: '9c-supply', name: '9 Corps Supply' } },
        ],
        cavalryDivision: MINIMAL_CAV_DIV,
      },
      confederate: makeOob().confederate,
    };
    const tree = buildDisplayTree(oob, EMPTY_LEADERS, 'union');
    const [c1, c9] = tree[0].node.corps;
    expect(c1._supply.id).toBe('1c-supply');
    expect(c9._supply.id).toBe('9c-supply');
  });
});

// ── buildDisplayTree — confederate top-level ──────────────────────────────────

describe('buildDisplayTree — confederate top-level', () => {
  it('returns a single wing node at the root', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, 'confederate');
    expect(tree).toHaveLength(1);
    expect(tree[0].nodeType).toBe('wing');
  });

  it('wing node carries _supply from supplyWagon', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, 'confederate');
    expect(tree[0].node._supply).toMatchObject({ id: 'csa-wagon', name: 'Wing Supply Wagon' });
  });
});
