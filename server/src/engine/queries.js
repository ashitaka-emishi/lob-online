/**
 * Read-side query predicates for game state.
 *
 * These helpers centralise common checks so callers do not replicate
 * structural assumptions about the state shape.
 */

/**
 * LOB §10.3 / SM §2.3 — True when the unit holds its own order state (divisions and detached
 * brigades). False for brigades within a non-detached division, which inherit their effective
 * order from the parent at query time (LOB §10.3f).
 *
 * Centralises the null-check so query code does not need to replicate it. Note that
 * `orders: null` (non-order-holder) and `orders: { status: 'none' }` (order-holder with no
 * active order) are semantically distinct: only non-null `orders` means the unit is the
 * authoritative order level (#364).
 *
 * @param {{ orders: object|null }} unit
 * @returns {boolean}
 */
export function isOrderHolder(unit) {
  return unit.orders !== null;
}
