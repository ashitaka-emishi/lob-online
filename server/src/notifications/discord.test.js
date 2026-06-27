import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildActionPayload, isAllowedDiscordWebhook, notifyWebhook } from './discord.js';

// Stub global fetch — not available in Node test environment
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.resetAllMocks();
  delete process.env.DISCORD_WEBHOOK_URL;
  delete process.env.NODE_ENV;
});

afterEach(() => {
  delete process.env.DISCORD_WEBHOOK_URL;
  delete process.env.NODE_ENV;
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

  it('sets allowed_mentions to suppress @everyone/@here injection', () => {
    const payload = buildActionPayload('g', { type: 'X' }, { turn: 1, activePlayer: 'union' });
    expect(payload.allowed_mentions).toEqual({ parse: [] });
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

  it('uses "?" placeholder when turn is undefined', () => {
    const payload = buildActionPayload('g', { type: 'X' }, { activePlayer: 'union' });
    expect(payload.content).toContain('(turn ?)');
  });
});

describe('isAllowedDiscordWebhook', () => {
  it('accepts canonical discord.com webhooks', () => {
    expect(isAllowedDiscordWebhook('https://discord.com/api/webhooks/123/abc')).toBe(true);
  });

  it('accepts discordapp.com webhooks', () => {
    expect(isAllowedDiscordWebhook('https://discordapp.com/api/webhooks/123/abc')).toBe(true);
  });

  it('accepts ptb.discord.com webhooks', () => {
    expect(isAllowedDiscordWebhook('https://ptb.discord.com/api/webhooks/123/abc')).toBe(true);
  });

  it('accepts canary.discord.com webhooks', () => {
    expect(isAllowedDiscordWebhook('https://canary.discord.com/api/webhooks/123/abc')).toBe(true);
  });

  it('rejects http://discord.com (http not https)', () => {
    expect(isAllowedDiscordWebhook('http://discord.com/api/webhooks/123/abc')).toBe(false);
  });

  it('rejects path-injection spoof (discord.com in path, not hostname)', () => {
    expect(isAllowedDiscordWebhook('https://evil.example.com/discord.com/api/webhooks')).toBe(
      false
    );
  });

  it('rejects subdomain spoof (discord.com.evil.com)', () => {
    expect(isAllowedDiscordWebhook('https://discord.com.evil.com/hook')).toBe(false);
  });

  it('rejects http://localhost', () => {
    expect(isAllowedDiscordWebhook('http://localhost/hook')).toBe(false);
  });

  it('rejects http://127.0.0.1', () => {
    expect(isAllowedDiscordWebhook('http://127.0.0.1/hook')).toBe(false);
  });

  it('rejects arbitrary external URLs', () => {
    expect(isAllowedDiscordWebhook('https://evil.example.com/hook')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isAllowedDiscordWebhook('')).toBe(false);
  });
});

describe('notifyWebhook — DISCORD_WEBHOOK_URL override', () => {
  it('POSTs to the override URL when DISCORD_WEBHOOK_URL is set (non-production)', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'http://localhost:4040';
    mockFetch.mockResolvedValue({ ok: true, status: 204 });

    await notifyWebhook('https://discord.com/api/webhooks/real/url', { content: 'test' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4040',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('ignores DISCORD_WEBHOOK_URL in production and POSTs to stored URL', async () => {
    process.env.DISCORD_WEBHOOK_URL = 'http://localhost:4040';
    process.env.NODE_ENV = 'production';
    mockFetch.mockResolvedValue({ ok: true, status: 204 });

    const url = 'https://discord.com/api/webhooks/123/abc';
    await notifyWebhook(url, { content: 'test' });

    expect(mockFetch).toHaveBeenCalledWith(url, expect.objectContaining({ method: 'POST' }));
    // NODE_ENV restored by afterEach
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

describe('notifyWebhook — allowlist re-validation', () => {
  it('skips fetch when stored URL fails the Discord allowlist (non-override path)', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    await notifyWebhook('https://evil.example.com/hook', { content: 'test' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('skips fetch when stored URL uses http (non-override path)', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    await notifyWebhook('http://discord.com/api/webhooks/123/abc', { content: 'test' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('skips fetch when stored URL is invalid even when DISCORD_WEBHOOK_URL override is set (#651)', async () => {
    // Defense in depth: re-validate the stored webhook at egress regardless of override.
    // Previously the allowlist check was skipped when an override was active.
    process.env.DISCORD_WEBHOOK_URL = 'http://localhost:4040';
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    await notifyWebhook('https://evil.example.com/hook', { content: 'test' });
    expect(mockFetch).not.toHaveBeenCalled();
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

  it('calls fetch exactly once on a successful POST', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    await notifyWebhook('https://discord.com/api/webhooks/123/abc', {});
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
