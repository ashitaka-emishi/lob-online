/**
 * Cross-layer contract test (#257)
 *
 * Verifies structural alignment between the server Zod schemas and the client-side
 * shape validators in oobValidators.js. A schema change that alters union/confederate
 * from objects-of-arrays (OOB/leaders) or plain arrays (succession) will fail here,
 * alerting the developer to update the client validators before shipping.
 *
 * The client validators intentionally check shape, not field-level correctness.
 * This test anchors that contract: valid server-parsed objects pass client validation,
 * and structurally invalid objects fail both.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';

import { describe, it, expect } from 'vitest';
// Client validators are pure JS (no Vue) — importable from server test environment.
// @client alias is defined in vitest.config.js → server project → resolve.alias.
import {
  isValidSidedObjectShape,
  isValidSuccessionShape,
} from '@client/composables/oobValidators.js';

import { OOBSchema } from './oob.schema.js';
import { LeadersSchema } from './leaders.schema.js';
import { SuccessionSchema } from './succession.schema.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '../../../data/scenarios/south-mountain');

function loadJson(filename) {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf8'));
}

// ── OOB schema ↔ client validator ────────────────────────────────────────────

describe('OOBSchema / isValidSidedObjectShape contract (#257)', () => {
  it('real oob.json passes both server schema and client validator', () => {
    const oob = loadJson('oob.json');
    expect(OOBSchema.safeParse(oob).success).toBe(true);
    expect(isValidSidedObjectShape(oob)).toBe(true);
  });

  it('client validator accepts any server-parsed OOB object', () => {
    const parsed = OOBSchema.parse(loadJson('oob.json'));
    expect(isValidSidedObjectShape(parsed)).toBe(true);
  });

  it('client validator rejects object missing union (server schema also rejects)', () => {
    const bad = { confederate: { divisions: [] } };
    expect(OOBSchema.safeParse(bad).success).toBe(false);
    expect(isValidSidedObjectShape(bad)).toBe(false);
  });

  it('client validator rejects object missing confederate (server schema also rejects)', () => {
    const bad = { union: { corps: [] } };
    expect(OOBSchema.safeParse(bad).success).toBe(false);
    expect(isValidSidedObjectShape(bad)).toBe(false);
  });

  it('client validator rejects null', () => {
    expect(isValidSidedObjectShape(null)).toBe(false);
  });

  it('client validator rejects array (not a sided object)', () => {
    expect(isValidSidedObjectShape([])).toBe(false);
  });

  it('client validator rejects object with array sides (server schema also rejects)', () => {
    const bad = { union: [], confederate: [] };
    expect(OOBSchema.safeParse(bad).success).toBe(false);
    expect(isValidSidedObjectShape(bad)).toBe(false);
  });
});

// ── LeadersSchema ↔ client validator ─────────────────────────────────────────

describe('LeadersSchema / isValidSidedObjectShape contract (#257)', () => {
  it('real leaders.json passes both server schema and client validator', () => {
    const leaders = loadJson('leaders.json');
    expect(LeadersSchema.safeParse(leaders).success).toBe(true);
    expect(isValidSidedObjectShape(leaders)).toBe(true);
  });

  it('client validator accepts any server-parsed leaders object', () => {
    const parsed = LeadersSchema.parse(loadJson('leaders.json'));
    expect(isValidSidedObjectShape(parsed)).toBe(true);
  });
});

// ── SuccessionSchema ↔ client validator ──────────────────────────────────────

describe('SuccessionSchema / isValidSuccessionShape contract (#257)', () => {
  it('real succession.json passes both server schema and client validator', () => {
    const succession = loadJson('succession.json');
    expect(SuccessionSchema.safeParse(succession).success).toBe(true);
    expect(isValidSuccessionShape(succession)).toBe(true);
  });

  it('client validator accepts any server-parsed succession object', () => {
    const parsed = SuccessionSchema.parse(loadJson('succession.json'));
    expect(isValidSuccessionShape(parsed)).toBe(true);
  });

  it('client validator rejects object with non-array union (server schema also rejects)', () => {
    const bad = { _status: 'draft', _source: 'test', union: {}, confederate: [] };
    expect(SuccessionSchema.safeParse(bad).success).toBe(false);
    expect(isValidSuccessionShape(bad)).toBe(false);
  });

  it('client validator rejects object with non-array confederate (server schema also rejects)', () => {
    const bad = { _status: 'draft', _source: 'test', union: [], confederate: {} };
    expect(SuccessionSchema.safeParse(bad).success).toBe(false);
    expect(isValidSuccessionShape(bad)).toBe(false);
  });

  it('client validator rejects null', () => {
    expect(isValidSuccessionShape(null)).toBe(false);
  });
});
