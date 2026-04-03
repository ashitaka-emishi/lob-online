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
    expect(buildDisplayTree(null, EMPTY_LEADERS, null, 'union')).toEqual([]);
  });

  it('returns empty array when leaders is null', () => {
    expect(buildDisplayTree(makeOob(), null, null, 'union')).toEqual([]);
  });

  it('returns a single army node at the root', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, null, 'union');
    expect(tree).toHaveLength(1);
    expect(tree[0].nodeType).toBe('army');
    expect(tree[0].node.id).toBe('usa-army');
  });

  it('army node carries army-level _supply', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, null, 'union');
    expect(tree[0].node._supply).toMatchObject({ id: 'usa-train', name: 'AotP Supply' });
  });
});

// ── buildDisplayTree — corps supply (#234) ────────────────────────────────────

describe('buildDisplayTree — corps supply node (#234)', () => {
  it('corps node without supply has no _supply property', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, null, 'union');
    const corpsNodes = tree[0].node.corps;
    expect(corpsNodes[0]._supply).toBeUndefined();
  });

  it('corps node with supply carries _supply', () => {
    const oob = makeOob({ supply: { id: '1c-supply', name: '1 Corps Supply' } });
    const tree = buildDisplayTree(oob, EMPTY_LEADERS, null, 'union');
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
    const tree = buildDisplayTree(oob, EMPTY_LEADERS, null, 'union');
    const [c1, c9] = tree[0].node.corps;
    expect(c1._supply.id).toBe('1c-supply');
    expect(c9._supply.id).toBe('9c-supply');
  });
});

// ── buildDisplayTree — confederate top-level ──────────────────────────────────

describe('buildDisplayTree — confederate top-level', () => {
  it('returns a single wing node at the root', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, null, 'confederate');
    expect(tree).toHaveLength(1);
    expect(tree[0].nodeType).toBe('wing');
  });

  it('wing node carries _supply from supplyWagon', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, null, 'confederate');
    expect(tree[0].node._supply).toMatchObject({ id: 'csa-wagon', name: 'Wing Supply Wagon' });
  });
});

// ── buildDisplayTree — succession variants (#235) ─────────────────────────────

const LEADERS_WITH_BRIGADE = {
  union: {},
  confederate: {
    brigades: [{ id: 'walker', name: 'Joseph Walker', commandsId: 'wj', commandLevel: 'brigade' }],
  },
};

const SUCCESSION_FIXTURE = {
  union: [],
  confederate: [
    {
      id: 'walker-promoted',
      name: 'Col Joseph Walker (Promoted)',
      baseLeaderId: 'walker',
      commandLevel: 'brigade',
      commandsId: null,
      commandValue: 0,
      moraleValue: 1,
    },
  ],
};

const OOB_WITH_WJ_BRIGADE = {
  union: makeOob().union,
  confederate: {
    army: 'Army of Northern Virginia',
    wing: "Longstreet's Wing",
    supplyWagon: { id: 'csa-wagon', name: 'Wing Supply Wagon' },
    independent: { cavalry: [], artillery: [] },
    reserveArtillery: { batteries: [] },
    divisions: [
      {
        id: 'jd',
        name: "Jones's Division",
        wreckThreshold: 2,
        brigades: [
          {
            id: 'wj',
            name: "Walker's Brigade",
            wreckThreshold: 2,
            regiments: [],
          },
        ],
      },
    ],
  },
};

describe('buildDisplayTree — succession variants (#235)', () => {
  it('leader without variants has no _variants on its node', () => {
    const tree = buildDisplayTree(OOB_WITH_WJ_BRIGADE, LEADERS_WITH_BRIGADE, null, 'confederate');
    const brigade = tree[0].node.divisions[0].brigades[0];
    expect(brigade._leader).toBeDefined();
    expect(brigade._leader._variants).toBeUndefined();
  });

  it('leader with a matching succession variant has _variants attached', () => {
    const tree = buildDisplayTree(
      OOB_WITH_WJ_BRIGADE,
      LEADERS_WITH_BRIGADE,
      SUCCESSION_FIXTURE,
      'confederate'
    );
    const brigade = tree[0].node.divisions[0].brigades[0];
    expect(brigade._leader._variants).toHaveLength(1);
    expect(brigade._leader._variants[0].id).toBe('walker-promoted');
  });

  it('null succession returns tree without _variants', () => {
    const tree = buildDisplayTree(OOB_WITH_WJ_BRIGADE, LEADERS_WITH_BRIGADE, null, 'confederate');
    const brigade = tree[0].node.divisions[0].brigades[0];
    expect(brigade._leader._variants).toBeUndefined();
  });
});

// ── buildDisplayTree — union-side succession variants (#246) ──────────────────

const LEADERS_WITH_UNION_BRIGADE = {
  union: {
    brigades: [{ id: 'reno', name: 'Jesse Reno', commandsId: 'reno-bde', commandLevel: 'brigade' }],
  },
  confederate: {},
};

const OOB_WITH_RENO_BRIGADE = {
  union: {
    army: 'Army of the Potomac',
    supplyTrain: { id: 'usa-train', name: 'AotP Supply' },
    corps: [
      {
        ...MINIMAL_CORPS,
        id: '9c',
        divisions: [
          {
            id: '1d-9c',
            name: '1st Division (9 Corps)',
            wreckThreshold: 2,
            brigades: [
              { id: 'reno-bde', name: "Reno's Brigade", wreckThreshold: 2, regiments: [] },
            ],
          },
        ],
      },
    ],
    cavalryDivision: MINIMAL_CAV_DIV,
  },
  confederate: makeOob().confederate,
};

const SUCCESSION_WITH_UNION_VARIANT = {
  union: [
    {
      id: 'reno-promoted',
      name: 'Brig Gen Jesse Reno (Promoted)',
      baseLeaderId: 'reno',
      commandLevel: 'brigade',
      commandsId: null,
      commandValue: 0,
      moraleValue: 1,
    },
  ],
  confederate: [],
};

describe('buildDisplayTree — union-side succession variants (#246)', () => {
  it('union brigade leader with matching variant has _variants attached', () => {
    const tree = buildDisplayTree(
      OOB_WITH_RENO_BRIGADE,
      LEADERS_WITH_UNION_BRIGADE,
      SUCCESSION_WITH_UNION_VARIANT,
      'union'
    );
    const brigade = tree[0].node.corps[0].divisions[0].brigades[0];
    expect(brigade._leader).toBeDefined();
    expect(brigade._leader._variants).toHaveLength(1);
    expect(brigade._leader._variants[0].id).toBe('reno-promoted');
  });

  it('union brigade leader without succession has no _variants', () => {
    const tree = buildDisplayTree(
      OOB_WITH_RENO_BRIGADE,
      LEADERS_WITH_UNION_BRIGADE,
      { union: [], confederate: [] },
      'union'
    );
    const brigade = tree[0].node.corps[0].divisions[0].brigades[0];
    expect(brigade._leader).toBeDefined();
    expect(brigade._leader._variants).toBeUndefined();
  });
});

// ── buildDisplayTree — cavalry division Pleasonton variants (#246) ────────────

const LEADERS_WITH_PLEASONTON = {
  union: {
    cavalry: [
      {
        id: 'pleasonton',
        name: 'Alfred Pleasonton',
        commandsId: 'cav-div',
        commandLevel: 'cavalry',
      },
    ],
  },
  confederate: {},
};

const SUCCESSION_WITH_PLEASONTON_VARIANT = {
  union: [
    {
      id: 'pleasonton-promoted',
      name: 'Brig Gen Alfred Pleasonton (Promoted)',
      baseLeaderId: 'pleasonton',
      commandLevel: 'cavalry',
      commandsId: null,
      commandValue: 0,
      moraleValue: 1,
    },
  ],
  confederate: [],
};

describe('buildDisplayTree — cavalry division Pleasonton variants (#246)', () => {
  it('Pleasonton leader with a succession variant has _variants on cavalry division _leader', () => {
    const tree = buildDisplayTree(
      makeOob(),
      LEADERS_WITH_PLEASONTON,
      SUCCESSION_WITH_PLEASONTON_VARIANT,
      'union'
    );
    const cavDiv = tree[0].node.cavalryDivision;
    expect(cavDiv._leader).toBeDefined();
    expect(cavDiv._leader.id).toBe('pleasonton');
    expect(cavDiv._leader._variants).toHaveLength(1);
    expect(cavDiv._leader._variants[0].id).toBe('pleasonton-promoted');
  });

  it('Pleasonton without succession variants has no _variants', () => {
    const tree = buildDisplayTree(
      makeOob(),
      LEADERS_WITH_PLEASONTON,
      { union: [], confederate: [] },
      'union'
    );
    const cavDiv = tree[0].node.cavalryDivision;
    expect(cavDiv._leader).toBeDefined();
    expect(cavDiv._leader._variants).toBeUndefined();
  });

  it('cavalry division without Pleasonton in leaders has no _leader', () => {
    const tree = buildDisplayTree(makeOob(), EMPTY_LEADERS, null, 'union');
    const cavDiv = tree[0].node.cavalryDivision;
    expect(cavDiv._leader).toBeUndefined();
  });
});
