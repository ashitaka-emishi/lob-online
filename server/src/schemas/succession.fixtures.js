/**
 * Shared test fixtures for SuccessionSchema tests.
 * Import from this module to avoid redefining MINIMAL_VARIANT and MINIMAL_SUCCESSION
 * across multiple server-side test files.
 */

export const MINIMAL_VARIANT = {
  id: 'walker-promoted',
  name: 'Col Joseph Walker (Promoted)',
  baseLeaderId: 'walker',
  commandLevel: 'brigade',
  commandsId: null,
  commandValue: 0,
  moraleValue: 1,
};

export const MINIMAL_SUCCESSION = {
  _status: 'draft',
  _source: 'test',
  union: [],
  confederate: [MINIMAL_VARIANT],
};
