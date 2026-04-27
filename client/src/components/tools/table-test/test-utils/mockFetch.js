import { vi } from 'vitest';

export function mockFetch(data, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
  });
}
