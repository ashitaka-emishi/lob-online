import { describe, it, expect } from 'vitest';

import { MINUTES_PER_CONDITION, MINUTES_PER_CONDITION_DEFAULT } from './turnTime.js';
import {
  MINUTES_PER_CONDITION as CLIENT_MINUTES_PER_CONDITION,
  MINUTES_PER_CONDITION_DEFAULT as CLIENT_MINUTES_PER_CONDITION_DEFAULT,
} from '../../../client/src/config/turnTime.js';

// Enforces that server/src/engine/turnTime.js and client/src/config/turnTime.js stay in sync.
// If these fail, update BOTH files together — they are sister definitions across the client/server boundary.
describe('turnTime sister-module sync', () => {
  it('MINUTES_PER_CONDITION is identical in server and client modules', () => {
    expect(MINUTES_PER_CONDITION).toEqual(CLIENT_MINUTES_PER_CONDITION);
  });

  it('MINUTES_PER_CONDITION_DEFAULT is identical in server and client modules', () => {
    expect(MINUTES_PER_CONDITION_DEFAULT).toBe(CLIENT_MINUTES_PER_CONDITION_DEFAULT);
  });
});
