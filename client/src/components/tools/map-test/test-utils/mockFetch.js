/**
 * Shared fetch mock for map-test panel tests (#299).
 * Returns a vi.fn() that resolves with a minimal Response-like object.
 *
 * @param {*} data   - JSON body returned by res.json()
 * @param {boolean} ok - whether the response is successful (default true)
 */
import { vi } from 'vitest';

export function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(data),
  });
}
