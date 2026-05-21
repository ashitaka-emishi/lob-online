import { describe, it, expect } from 'vitest';

import { isOrderHolder } from './queries.js';

describe('isOrderHolder', () => {
  it('returns false when orders is null', () => {
    expect(isOrderHolder({ orders: null })).toBe(false);
  });

  it('returns true when orders is a non-null object', () => {
    expect(
      isOrderHolder({ orders: { type: 'move', status: 'accepted', deliveryTurnDue: null } })
    ).toBe(true);
  });

  it('returns true when orders has status none (order-holder with no active order)', () => {
    expect(isOrderHolder({ orders: { type: null, status: 'none', deliveryTurnDue: null } })).toBe(
      true
    );
  });
});
