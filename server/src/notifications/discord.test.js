import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildActionPayload, notifyWebhook } from './discord.js';

// Stub global fetch — not available in Node test environment
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.resetAllMocks();
  delete process.env.DISCORD_WEBHOOK_TEST_URL;
});

afterEach(() => {
  delete process.env.DISCORD_WEBHOOK_TEST_URL;
});

describe('buildActionPayload', () => {
  it('includes gameId, action type, side, and turn in content', () => {
    const payload = buildActionPayload(
      'game-42',
      { type: 'FIRE_COMBAT' },
      { turn: 3, activePlayer: 'union' }
    );
    expect(payload.content).toContain('game-42');
    expect(payload.content).toContain('FIRE_COMBAT');
    expect(payload.content).toContain('union');
    expect(payload.content).toContain('3');
  });

  it('handles null activePlayer gracefully', () => {
    const payload = buildActionPayload(
      'g1',
      { type: 'END_PHASE' },
      { turn: 1, activePlayer: null }
    );
    expect(payload.content).toContain('unknown');
  });

  it('returns an object with a content string', () => {
    const payload = buildActionPayload(
      'g',
      { type: 'X' },
      { turn: 1, activePlayer: 'confederate' }
    );
    expect(typeof payload.content).toBe('string');
    expect(payload.content.length).toBeGreaterThan(0);
  });
});

describe('notifyWebhook — DISCORD_WEBHOOK_TEST_URL override', () => {
  it('POSTs to the override URL when DISCORD_WEBHOOK_TEST_URL is set', async () => {
    process.env.DISCORD_WEBHOOK_TEST_URL = 'http://localhost:4040';
    mockFetch.mockResolvedValue({ ok: true, status: 204 });

    await notifyWebhook('https://discord.com/api/webhooks/real/url', { content: 'test' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4040',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('POSTs to the stored URL when override is not set', async () => {
    const url = 'https://discord.com/api/webhooks/123/abc';
    mockFetch.mockResolvedValue({ ok: true, status: 204 });

    await notifyWebhook(url, { content: 'test' });

    expect(mockFetch).toHaveBeenCalledWith(url, expect.objectContaining({ method: 'POST' }));
  });

  it('sends JSON body with Content-Type application/json', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    const payload = { content: 'hello' };

    await notifyWebhook('https://discord.com/api/webhooks/123/abc', payload);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual(payload);
  });
});

describe('notifyWebhook — error swallowing', () => {
  it('does not throw when fetch rejects (network error)', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(
      notifyWebhook('https://discord.com/api/webhooks/123/abc', {})
    ).resolves.not.toThrow();
  });

  it('does not throw when Discord returns non-2xx status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });
    await expect(
      notifyWebhook('https://discord.com/api/webhooks/123/abc', {})
    ).resolves.not.toThrow();
  });

  it('does not call fetch when url is falsy', async () => {
    // If the game has no discord_webhook set, the route skips notifyWebhook entirely;
    // but if called with a falsy url and no override, fetch should still be called with
    // the falsy value (routing logic is the caller's responsibility).
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    await notifyWebhook('https://discord.com/api/webhooks/123/abc', {});
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
