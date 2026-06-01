import { describe, it, expect } from 'vitest';
import { findNodePathInTree } from './findNodePath.js';

const OOB = {
  _status: 'available',
  union: {
    army: 'AotP',
    id: 'usa-army',
    corps: [
      {
        id: '1c',
        name: '1 Corps',
        divisions: [
          {
            id: '1d-1c',
            name: '1/1',
            brigades: [
              {
                id: '1b-1d-1c',
                name: '1/1/1',
                regiments: [{ id: '22ny', name: '22nd NY' }],
              },
            ],
          },
        ],
      },
    ],
  },
  confederate: {
    army: 'AoNV',
    id: 'csa-army',
    corps: [{ id: '1c-csa', name: '1 CSA Corps', divisions: [] }],
  },
};

describe('findNodePathInTree', () => {
  it('returns null for null oob', () => {
    expect(findNodePathInTree(null, '22ny')).toBeNull();
  });

  it('returns null for null nodeId', () => {
    expect(findNodePathInTree(OOB, null)).toBeNull();
  });

  it('returns null when id does not exist', () => {
    expect(findNodePathInTree(OOB, 'nonexistent')).toBeNull();
  });

  it('finds a top-level corps node', () => {
    expect(findNodePathInTree(OOB, '1c')).toBe('union.corps.0');
  });

  it('finds a division nested under corps', () => {
    expect(findNodePathInTree(OOB, '1d-1c')).toBe('union.corps.0.divisions.0');
  });

  it('finds a brigade nested under division', () => {
    expect(findNodePathInTree(OOB, '1b-1d-1c')).toBe('union.corps.0.divisions.0.brigades.0');
  });

  it('finds a deeply nested regiment', () => {
    expect(findNodePathInTree(OOB, '22ny')).toBe(
      'union.corps.0.divisions.0.brigades.0.regiments.0'
    );
  });

  it('finds a node on the confederate side', () => {
    expect(findNodePathInTree(OOB, '1c-csa')).toBe('confederate.corps.0');
  });

  it('skips _-prefixed keys during traversal', () => {
    const oobWithUnderscore = {
      union: {
        id: 'usa-army',
        _synthetic: { id: 'should-not-find' },
        corps: [{ id: '1c', name: '1 Corps', divisions: [] }],
      },
      confederate: {},
    };
    expect(findNodePathInTree(oobWithUnderscore, 'should-not-find')).toBeNull();
    expect(findNodePathInTree(oobWithUnderscore, '1c')).toBe('union.corps.0');
  });

  it('returns first match when multiple nodes share an id (unlikely but defined)', () => {
    const oobDupe = {
      union: {
        corps: [
          { id: 'dup', name: 'First' },
          { id: 'dup', name: 'Second' },
        ],
      },
      confederate: {},
    };
    expect(findNodePathInTree(oobDupe, 'dup')).toBe('union.corps.0');
  });
});
