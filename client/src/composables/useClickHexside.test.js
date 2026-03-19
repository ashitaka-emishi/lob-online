import { describe, it, expect, vi } from 'vitest';
import { useClickHexside } from './useClickHexside.js';

describe('useClickHexside', () => {
  it('returns onEdgeClick, onEdgeRightClick, validationError', () => {
    const result = useClickHexside({
      validateFn: () => ({ valid: true, reason: null }),
      onPlace: vi.fn(),
      onRemove: vi.fn(),
    });
    expect(typeof result.onEdgeClick).toBe('function');
    expect(typeof result.onEdgeRightClick).toBe('function');
    expect(typeof result.validationError.value).toBe('string');
  });

  it('validationError is empty string initially', () => {
    const { validationError } = useClickHexside({
      validateFn: () => ({ valid: true, reason: null }),
      onPlace: vi.fn(),
      onRemove: vi.fn(),
    });
    expect(validationError.value).toBe('');
  });

  describe('onEdgeClick', () => {
    it('calls onPlace when validateFn returns valid', () => {
      const onPlace = vi.fn();
      const { onEdgeClick } = useClickHexside({
        validateFn: () => ({ valid: true, reason: null }),
        onPlace,
        onRemove: vi.fn(),
      });
      onEdgeClick('05.05', 2);
      expect(onPlace).toHaveBeenCalledWith('05.05', 2);
    });

    it('does not call onPlace when validateFn returns invalid', () => {
      const onPlace = vi.fn();
      const { onEdgeClick } = useClickHexside({
        validateFn: () => ({ valid: false, reason: 'needs stream' }),
        onPlace,
        onRemove: vi.fn(),
      });
      onEdgeClick('05.05', 2);
      expect(onPlace).not.toHaveBeenCalled();
    });

    it('sets validationError when validateFn returns invalid', () => {
      const { onEdgeClick, validationError } = useClickHexside({
        validateFn: () => ({ valid: false, reason: 'needs stream' }),
        onPlace: vi.fn(),
        onRemove: vi.fn(),
      });
      onEdgeClick('05.05', 2);
      expect(validationError.value).toBe('needs stream');
    });

    it('clears validationError on a valid placement', () => {
      const { onEdgeClick, validationError } = useClickHexside({
        validateFn: (_hexId, faceIndex) =>
          faceIndex === 0 ? { valid: false, reason: 'bad' } : { valid: true, reason: null },
        onPlace: vi.fn(),
        onRemove: vi.fn(),
      });
      onEdgeClick('05.05', 0); // invalid — sets error
      expect(validationError.value).toBe('bad');
      onEdgeClick('05.05', 1); // valid — clears error
      expect(validationError.value).toBe('');
    });

    it('passes hexId and faceIndex to validateFn', () => {
      const validateFn = vi.fn(() => ({ valid: true, reason: null }));
      const { onEdgeClick } = useClickHexside({
        validateFn,
        onPlace: vi.fn(),
        onRemove: vi.fn(),
      });
      onEdgeClick('03.07', 4);
      expect(validateFn).toHaveBeenCalledWith('03.07', 4);
    });
  });

  describe('onEdgeRightClick', () => {
    it('calls onRemove with hexId and faceIndex', () => {
      const onRemove = vi.fn();
      const { onEdgeRightClick } = useClickHexside({
        validateFn: () => ({ valid: true, reason: null }),
        onPlace: vi.fn(),
        onRemove,
      });
      onEdgeRightClick('02.08', 5);
      expect(onRemove).toHaveBeenCalledWith('02.08', 5);
    });

    it('clears validationError on right-click', () => {
      const { onEdgeClick, onEdgeRightClick, validationError } = useClickHexside({
        validateFn: () => ({ valid: false, reason: 'err' }),
        onPlace: vi.fn(),
        onRemove: vi.fn(),
      });
      onEdgeClick('05.05', 0);
      expect(validationError.value).toBe('err');
      onEdgeRightClick('05.05', 0);
      expect(validationError.value).toBe('');
    });
  });
});
