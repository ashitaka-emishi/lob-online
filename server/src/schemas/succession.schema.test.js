import { describe, it, expect } from 'vitest';

import { SuccessionSchema } from './succession.schema.js';

const MINIMAL_VARIANT = {
  id: 'walker-promoted',
  name: 'Col Joseph Walker (Promoted)',
  baseLeaderId: 'walker',
  commandLevel: 'brigade',
  commandsId: null,
  commandValue: 0,
  moraleValue: 1,
};

const MINIMAL_SUCCESSION = {
  _status: 'draft',
  _source: 'test',
  union: [],
  confederate: [MINIMAL_VARIANT],
};

describe('SuccessionSchema — top-level structure', () => {
  it('accepts minimal valid payload', () => {
    const result = SuccessionSchema.safeParse(MINIMAL_SUCCESSION);
    expect(result.success).toBe(true);
  });

  it('rejects missing union array', () => {
    const { union: _u, ...rest } = MINIMAL_SUCCESSION;
    const result = SuccessionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing confederate array', () => {
    const { confederate: _c, ...rest } = MINIMAL_SUCCESSION;
    const result = SuccessionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects extra unknown top-level keys (strict)', () => {
    const result = SuccessionSchema.safeParse({ ...MINIMAL_SUCCESSION, _extra: true });
    expect(result.success).toBe(false);
  });

  it('accepts optional _savedAt timestamp', () => {
    const result = SuccessionSchema.safeParse({ ...MINIMAL_SUCCESSION, _savedAt: Date.now() });
    expect(result.success).toBe(true);
  });

  it('accepts optional _notes record', () => {
    const result = SuccessionSchema.safeParse({
      ...MINIMAL_SUCCESSION,
      _notes: { general: 'Some note' },
    });
    expect(result.success).toBe(true);
  });
});

describe('SuccessionSchema — SuccessionVariant', () => {
  it('accepts variant with commandsId null (corps-level variant)', () => {
    const variant = {
      id: 'burnside-9corps',
      name: 'Ambrose E. Burnside (9 Corps)',
      baseLeaderId: 'burnside',
      commandLevel: 'corps',
      commandsId: null,
      commandValue: null,
      moraleValue: null,
    };
    const result = SuccessionSchema.safeParse({ ...MINIMAL_SUCCESSION, union: [variant] });
    expect(result.success).toBe(true);
  });

  it('accepts variant with optional rank field', () => {
    const variant = { ...MINIMAL_VARIANT, rank: 'Col' };
    const result = SuccessionSchema.safeParse({
      ...MINIMAL_SUCCESSION,
      confederate: [variant],
    });
    expect(result.success).toBe(true);
  });

  it('rejects variant with invalid commandLevel', () => {
    const variant = { ...MINIMAL_VARIANT, commandLevel: 'regiment' };
    const result = SuccessionSchema.safeParse({
      ...MINIMAL_SUCCESSION,
      confederate: [variant],
    });
    expect(result.success).toBe(false);
  });

  it('rejects variant missing required id', () => {
    const { id: _id, ...rest } = MINIMAL_VARIANT;
    const result = SuccessionSchema.safeParse({ ...MINIMAL_SUCCESSION, confederate: [rest] });
    expect(result.success).toBe(false);
  });
});

describe('SuccessionSchema — SuccessionCounterRef', () => {
  it('accepts variant with null counterRef', () => {
    const variant = { ...MINIMAL_VARIANT, counterRef: null };
    const result = SuccessionSchema.safeParse({ ...MINIMAL_SUCCESSION, confederate: [variant] });
    expect(result.success).toBe(true);
  });

  it('accepts variant with full counterRef object', () => {
    const variant = {
      ...MINIMAL_VARIANT,
      counterRef: {
        front: 'CS1-Front_042.jpg',
        frontConfidence: 0.95,
        back: 'CS1-Back_042.jpg',
        backConfidence: 0.9,
        promotedFront: 'CS1-Front_043.jpg',
        promotedFrontConfidence: 0.8,
        promotedBack: 'CS1-Back_043.jpg',
        promotedBackConfidence: 0.75,
      },
    };
    const result = SuccessionSchema.safeParse({ ...MINIMAL_SUCCESSION, confederate: [variant] });
    expect(result.success).toBe(true);
  });

  it('rejects counterRef with confidence out of range', () => {
    const variant = {
      ...MINIMAL_VARIANT,
      counterRef: {
        front: 'CS1-Front_042.jpg',
        frontConfidence: 1.5,
        back: null,
        backConfidence: null,
      },
    };
    const result = SuccessionSchema.safeParse({ ...MINIMAL_SUCCESSION, confederate: [variant] });
    expect(result.success).toBe(false);
  });
});
