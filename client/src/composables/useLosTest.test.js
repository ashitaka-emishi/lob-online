import { describe, it, expect, vi } from 'vitest';
import { useLosTest } from './useLosTest.js';

describe('useLosTest', () => {
  describe('initial state', () => {
    it('all refs start null', () => {
      const { losHexA, losHexB, losSelectingHex, losResult } = useLosTest();
      expect(losHexA.value).toBeNull();
      expect(losHexB.value).toBeNull();
      expect(losSelectingHex.value).toBeNull();
      expect(losResult.value).toBeNull();
    });

    it('losPathHexes is empty when no result', () => {
      const { losPathHexes } = useLosTest();
      expect(losPathHexes.value).toEqual([]);
    });

    it('losBlockedHex is null when no result', () => {
      const { losBlockedHex } = useLosTest();
      expect(losBlockedHex.value).toBeNull();
    });
  });

  describe('tryPickLosHex', () => {
    it('returns false when not in pick mode', () => {
      const { tryPickLosHex } = useLosTest();
      expect(tryPickLosHex('01.01')).toBe(false);
    });

    it('picks hex A, clears losSelectingHex, returns true', () => {
      const { losHexA, losSelectingHex, tryPickLosHex } = useLosTest();
      losSelectingHex.value = 'A';
      const consumed = tryPickLosHex('01.01');
      expect(consumed).toBe(true);
      expect(losHexA.value).toBe('01.01');
      expect(losSelectingHex.value).toBeNull();
    });

    it('picks hex B, clears losSelectingHex, returns true', () => {
      const { losHexB, losSelectingHex, tryPickLosHex } = useLosTest();
      losSelectingHex.value = 'B';
      const consumed = tryPickLosHex('01.02');
      expect(consumed).toBe(true);
      expect(losHexB.value).toBe('01.02');
      expect(losSelectingHex.value).toBeNull();
    });

    it('calls onLosPanelOpen when a hex is picked', () => {
      const onLosPanelOpen = vi.fn();
      const { losSelectingHex, tryPickLosHex } = useLosTest({ onLosPanelOpen });
      losSelectingHex.value = 'A';
      tryPickLosHex('01.01');
      expect(onLosPanelOpen).toHaveBeenCalledOnce();
    });

    it('does not call onLosPanelOpen when not in pick mode', () => {
      const onLosPanelOpen = vi.fn();
      const { tryPickLosHex } = useLosTest({ onLosPanelOpen });
      tryPickLosHex('01.01');
      expect(onLosPanelOpen).not.toHaveBeenCalled();
    });
  });

  describe('onLosPickStart / onLosPickCancel', () => {
    it('onLosPickStart sets losSelectingHex', () => {
      const { losSelectingHex, onLosPickStart } = useLosTest();
      onLosPickStart('A');
      expect(losSelectingHex.value).toBe('A');
    });

    it('onLosPickCancel clears losSelectingHex', () => {
      const { losSelectingHex, onLosPickCancel } = useLosTest();
      losSelectingHex.value = 'B';
      onLosPickCancel();
      expect(losSelectingHex.value).toBeNull();
    });
  });

  describe('onLosSetHexA / onLosSetHexB / onLosResult', () => {
    it('onLosSetHexA sets losHexA', () => {
      const { losHexA, onLosSetHexA } = useLosTest();
      onLosSetHexA('02.03');
      expect(losHexA.value).toBe('02.03');
    });

    it('onLosSetHexB sets losHexB', () => {
      const { losHexB, onLosSetHexB } = useLosTest();
      onLosSetHexB('04.05');
      expect(losHexB.value).toBe('04.05');
    });

    it('onLosResult sets losResult', () => {
      const { losResult, onLosResult } = useLosTest();
      const r = { steps: [] };
      onLosResult(r);
      expect(losResult.value).toStrictEqual(r);
    });
  });

  describe('losPathHexes', () => {
    it('extracts intermediate step hexIds', () => {
      const { losResult, losPathHexes } = useLosTest();
      losResult.value = {
        steps: [
          { hexId: '01.01', role: 'start' },
          { hexId: '01.02', role: 'intermediate' },
          { hexId: '01.03', role: 'end' },
        ],
      };
      expect(losPathHexes.value).toEqual(['01.02']);
    });

    it('returns empty when result has no intermediate steps', () => {
      const { losResult, losPathHexes } = useLosTest();
      losResult.value = { steps: [{ hexId: '01.01', role: 'start' }] };
      expect(losPathHexes.value).toEqual([]);
    });
  });

  describe('losBlockedHex', () => {
    it('returns hexId of first blocked step', () => {
      const { losResult, losBlockedHex } = useLosTest();
      losResult.value = {
        steps: [{ hexId: '01.02', blocked: true, role: 'intermediate' }],
      };
      expect(losBlockedHex.value).toBe('01.02');
    });

    it('returns null when no steps are blocked', () => {
      const { losResult, losBlockedHex } = useLosTest();
      losResult.value = {
        steps: [{ hexId: '01.02', role: 'intermediate' }],
      };
      expect(losBlockedHex.value).toBeNull();
    });
  });
});
