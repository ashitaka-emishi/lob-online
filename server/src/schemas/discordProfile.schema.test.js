import { describe, it, expect } from 'vitest';

import { DiscordProfileSchema } from './discordProfile.schema.js';

const SNOWFLAKE = '123456789012345678';

describe('DiscordProfileSchema', () => {
  it('accepts a valid profile', () => {
    const result = DiscordProfileSchema.safeParse({
      id: SNOWFLAKE,
      username: 'Alice',
      avatar: 'abc123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid profile with a null avatar', () => {
    const result = DiscordProfileSchema.safeParse({
      id: SNOWFLAKE,
      username: 'Alice',
      avatar: null,
    });
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
    const result = DiscordProfileSchema.safeParse({ id: SNOWFLAKE, avatar: null });
    expect(result.success).toBe(false);
  });

  it('rejects a non-string id', () => {
    const result = DiscordProfileSchema.safeParse({ id: 12345, username: 'Alice', avatar: null });
    expect(result.success).toBe(false);
  });

  it('rejects a non-string, non-null avatar', () => {
    const result = DiscordProfileSchema.safeParse({
      id: SNOWFLAKE,
      username: 'Alice',
      avatar: 42,
    });
    expect(result.success).toBe(false);
  });

  // #700 review, second pass — id must be a Discord snowflake (numeric string). Structurally
  // separates real profiles from the `dev-` prefix namespace discord.js's deserializeUser()
  // reserves for synthetic dev-mode identities.
  it('rejects a non-numeric id (not a Discord snowflake)', () => {
    const result = DiscordProfileSchema.safeParse({
      id: 'discord-1',
      username: 'Alice',
      avatar: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an id in the dev- prefix namespace', () => {
    const result = DiscordProfileSchema.safeParse({
      id: 'dev-1234',
      username: 'Alice',
      avatar: null,
    });
    expect(result.success).toBe(false);
  });

  // #700 review, second pass — avatar must always be present (null or a string), never absent;
  // discord.js's sole call site always passes `profile.avatar ?? null` explicitly.
  it('rejects a profile with avatar omitted entirely', () => {
    const result = DiscordProfileSchema.safeParse({ id: SNOWFLAKE, username: 'Alice' });
    expect(result.success).toBe(false);
  });

  // #700 review, second pass — username is bounded against an unbounded value reaching the DB.
  it('rejects a username longer than 64 characters', () => {
    const result = DiscordProfileSchema.safeParse({
      id: SNOWFLAKE,
      username: 'a'.repeat(65),
      avatar: null,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a username at the 64-character boundary', () => {
    const result = DiscordProfileSchema.safeParse({
      id: SNOWFLAKE,
      username: 'a'.repeat(64),
      avatar: null,
    });
    expect(result.success).toBe(true);
  });
});
