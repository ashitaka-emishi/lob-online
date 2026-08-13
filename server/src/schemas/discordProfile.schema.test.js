import { describe, it, expect } from 'vitest';

import { DiscordProfileSchema } from './discordProfile.schema.js';

describe('DiscordProfileSchema', () => {
  it('accepts a valid profile', () => {
    const result = DiscordProfileSchema.safeParse({
      id: 'discord-1',
      username: 'Alice',
      avatar: 'abc123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid profile with a null avatar', () => {
    const result = DiscordProfileSchema.safeParse({
      id: 'discord-1',
      username: 'Alice',
      avatar: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid profile with avatar omitted entirely', () => {
    const result = DiscordProfileSchema.safeParse({ id: 'discord-1', username: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing id', () => {
    const result = DiscordProfileSchema.safeParse({ username: 'Alice', avatar: null });
    expect(result.success).toBe(false);
  });

  it('rejects an empty-string id', () => {
    const result = DiscordProfileSchema.safeParse({ id: '', username: 'Alice', avatar: null });
    expect(result.success).toBe(false);
  });

  it('rejects a missing username', () => {
    const result = DiscordProfileSchema.safeParse({ id: 'discord-1', avatar: null });
    expect(result.success).toBe(false);
  });

  it('rejects a non-string id', () => {
    const result = DiscordProfileSchema.safeParse({ id: 12345, username: 'Alice', avatar: null });
    expect(result.success).toBe(false);
  });

  it('rejects a non-string, non-null avatar', () => {
    const result = DiscordProfileSchema.safeParse({
      id: 'discord-1',
      username: 'Alice',
      avatar: 42,
    });
    expect(result.success).toBe(false);
  });
});
