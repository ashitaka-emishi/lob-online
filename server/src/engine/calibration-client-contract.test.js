/**
 * Cross-layer contract test (#693 / #697)
 *
 * client/src/utils/calibration.js's DEFAULT_CALIBRATION.cols/rows is a hand-maintained
 * copy of the real South Mountain map's gridSpec.cols/rows — the exact fact that drifted
 * (64 vs the corrected 63) and was the live write-path risk described in #693. This test
 * pins the client default against the real map data so a future gridSpec change fails here
 * instead of silently reintroducing the same drift.
 *
 * Only cols/rows are pinned — the remaining DEFAULT_CALIBRATION fields (dx, dy, hexWidth,
 * hexHeight, strokeWidth, northOffset) are a generic starting point for uncalibrated maps,
 * not meant to mirror South Mountain's specific calibration values.
 */
import { describe, it, expect } from 'vitest';
// Client module is pure JS (no Vue) — importable from server test environment.
// @client alias is defined in vitest.config.js → server project → resolve.alias.
import { DEFAULT_CALIBRATION } from '@client/utils/calibration.js';

import { loadMap } from './map.js';

describe('DEFAULT_CALIBRATION / South Mountain gridSpec contract (#693)', () => {
  it('DEFAULT_CALIBRATION.cols matches the real map gridSpec.cols', () => {
    const { gridSpec } = loadMap();
    expect(DEFAULT_CALIBRATION.cols).toBe(gridSpec.cols);
  });

  it('DEFAULT_CALIBRATION.rows matches the real map gridSpec.rows', () => {
    const { gridSpec } = loadMap();
    expect(DEFAULT_CALIBRATION.rows).toBe(gridSpec.rows);
  });
});
