import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCalibration, STORAGE_KEY } from './useCalibration.js';
// #693 — import the real default rather than a hand-copied duplicate, so this test cannot
// silently drift out of sync with it (the exact bug class #691/#693 addressed for map.json).
import { DEFAULT_CALIBRATION } from '../utils/calibration.js';

describe('useCalibration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('returns DEFAULT_CALIBRATION when localStorage is empty', () => {
      const { calibration } = useCalibration();
      expect(calibration.value).toEqual(DEFAULT_CALIBRATION);
    });

    it('calibrationMode defaults to false', () => {
      const { calibrationMode } = useCalibration();
      expect(calibrationMode.value).toBe(false);
    });
  });

  describe('localStorage round-trip', () => {
    it('loads stored calibration from localStorage on init', () => {
      const stored = { ...DEFAULT_CALIBRATION, cols: 70, dx: 5 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      const { calibration } = useCalibration();
      expect(calibration.value.cols).toBe(70);
      expect(calibration.value.dx).toBe(5);
    });

    it('falls back to defaults for non-numeric fields in localStorage', () => {
      const corrupt = { ...DEFAULT_CALIBRATION, cols: 'bad', hexWidth: null };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corrupt));
      const { calibration } = useCalibration();
      expect(calibration.value.cols).toBe(DEFAULT_CALIBRATION.cols);
      expect(calibration.value.hexWidth).toBe(DEFAULT_CALIBRATION.hexWidth);
    });

    it('falls back to defaults for non-boolean evenColUp in localStorage', () => {
      const corrupt = { ...DEFAULT_CALIBRATION, evenColUp: 'yes' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corrupt));
      const { calibration } = useCalibration();
      expect(calibration.value.evenColUp).toBe(DEFAULT_CALIBRATION.evenColUp);
    });

    it('falls back to defaults for non-string orientation in localStorage', () => {
      const corrupt = { ...DEFAULT_CALIBRATION, orientation: 42 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corrupt));
      const { calibration } = useCalibration();
      expect(calibration.value.orientation).toBe(DEFAULT_CALIBRATION.orientation);
    });

    it('falls back to defaults when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not-json{{{');
      const { calibration } = useCalibration();
      expect(calibration.value).toEqual(DEFAULT_CALIBRATION);
    });
  });

  describe('onCalibrationChange', () => {
    it('updates calibration ref', () => {
      const { calibration, onCalibrationChange } = useCalibration();
      const next = { ...DEFAULT_CALIBRATION, dx: 10 };
      onCalibrationChange(next);
      expect(calibration.value.dx).toBe(10);
    });

    it('persists new calibration to localStorage under the correct key', () => {
      const { onCalibrationChange } = useCalibration();
      const next = { ...DEFAULT_CALIBRATION, dy: 7 };
      onCalibrationChange(next);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(stored.dy).toBe(7);
    });

    it('clamps NaN numeric field to default on write path (#176)', () => {
      const { calibration, onCalibrationChange } = useCalibration();
      onCalibrationChange({ ...DEFAULT_CALIBRATION, hexWidth: NaN });
      expect(calibration.value.hexWidth).toBe(DEFAULT_CALIBRATION.hexWidth);
    });

    it('clamps invalid orientation to default on write path (#176)', () => {
      const { calibration, onCalibrationChange } = useCalibration();
      onCalibrationChange({ ...DEFAULT_CALIBRATION, orientation: 'diagonal' });
      expect(calibration.value.orientation).toBe(DEFAULT_CALIBRATION.orientation);
    });

    it('clamps non-boolean evenColUp to default on write path (#176)', () => {
      const { calibration, onCalibrationChange } = useCalibration();
      onCalibrationChange({ ...DEFAULT_CALIBRATION, evenColUp: 'yes' });
      expect(calibration.value.evenColUp).toBe(DEFAULT_CALIBRATION.evenColUp);
    });
  });

  describe('onCalibrationLoaded', () => {
    it('merges incoming gridSpec into calibration, using defaults for missing fields', () => {
      const { calibration, onCalibrationLoaded } = useCalibration();
      onCalibrationLoaded({ cols: 50, rows: 30 });
      expect(calibration.value.cols).toBe(50);
      expect(calibration.value.rows).toBe(30);
      expect(calibration.value.hexWidth).toBe(DEFAULT_CALIBRATION.hexWidth);
    });

    it('persists the merged calibration to localStorage', () => {
      const { onCalibrationLoaded } = useCalibration();
      onCalibrationLoaded({ cols: 50 });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(stored.cols).toBe(50);
    });

    it('fills in all defaults for fields absent from the gridSpec', () => {
      const { calibration, onCalibrationLoaded } = useCalibration();
      onCalibrationLoaded({});
      expect(calibration.value).toEqual(DEFAULT_CALIBRATION);
    });
  });
});
