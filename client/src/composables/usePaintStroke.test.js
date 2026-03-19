import { describe, it, expect, vi } from 'vitest';
import { usePaintStroke } from './usePaintStroke.js';

describe('usePaintStroke', () => {
  it('returns strokeStart, strokeEnd, and paintStrokeActive', () => {
    const { strokeStart, strokeEnd, paintStrokeActive } = usePaintStroke(vi.fn());
    expect(typeof strokeStart).toBe('function');
    expect(typeof strokeEnd).toBe('function');
    expect(typeof paintStrokeActive.value).toBe('boolean');
  });

  it('paintStrokeActive is false initially', () => {
    const { paintStrokeActive } = usePaintStroke(vi.fn());
    expect(paintStrokeActive.value).toBe(false);
  });

  it('strokeStart sets paintStrokeActive to true', () => {
    const { strokeStart, paintStrokeActive } = usePaintStroke(vi.fn());
    strokeStart();
    expect(paintStrokeActive.value).toBe(true);
  });

  it('strokeEnd sets paintStrokeActive to false', () => {
    const onMutated = vi.fn();
    const { strokeStart, strokeEnd, paintStrokeActive } = usePaintStroke(onMutated);
    strokeStart();
    strokeEnd();
    expect(paintStrokeActive.value).toBe(false);
  });

  it('strokeEnd calls onMutated once', () => {
    const onMutated = vi.fn();
    const { strokeStart, strokeEnd } = usePaintStroke(onMutated);
    strokeStart();
    strokeEnd();
    expect(onMutated).toHaveBeenCalledTimes(1);
  });

  it('strokeEnd does not call onMutated when no stroke was started', () => {
    const onMutated = vi.fn();
    const { strokeEnd } = usePaintStroke(onMutated);
    strokeEnd();
    expect(onMutated).not.toHaveBeenCalled();
  });

  it('onMutated is not called on strokeStart', () => {
    const onMutated = vi.fn();
    const { strokeStart } = usePaintStroke(onMutated);
    strokeStart();
    expect(onMutated).not.toHaveBeenCalled();
  });

  it('multiple strokeStart calls without end still flush once on strokeEnd', () => {
    const onMutated = vi.fn();
    const { strokeStart, strokeEnd } = usePaintStroke(onMutated);
    strokeStart();
    strokeStart();
    strokeEnd();
    expect(onMutated).toHaveBeenCalledTimes(1);
  });
});
