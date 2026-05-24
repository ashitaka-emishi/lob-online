import { describe, it, expect, vi } from 'vitest';
import { ref, watchEffect } from 'vue';
import { useEdgePanelWiring } from './useEdgePanelWiring.js';

describe('useEdgePanelWiring', () => {
  function makeDeps() {
    return {
      handleEdgePaint: vi.fn(),
      handleEdgeClear: vi.fn(),
      handleEdgeClearAll: vi.fn(),
      activePanelOverlayConfig: ref(null),
    };
  }

  it('initialises selectedType from defaultType', () => {
    const deps = makeDeps();
    const result = useEdgePanelWiring('trail', deps);
    expect(result.selectedType).toBe('trail');
  });

  it('onTypeChange updates selectedType', () => {
    const deps = makeDeps();
    const result = useEdgePanelWiring('trail', deps);
    result.onTypeChange('road');
    expect(result.selectedType).toBe('road');
  });

  it('onEdgePaint delegates to handleEdgePaint with unpacked args', () => {
    const deps = makeDeps();
    const { onEdgePaint } = useEdgePanelWiring('trail', deps);
    onEdgePaint({ hexId: '01.03', faceIndex: 1, type: 'trail' });
    expect(deps.handleEdgePaint).toHaveBeenCalledWith('01.03', 1, 'trail');
  });

  it('onEdgeClear delegates to handleEdgeClear with unpacked args', () => {
    const deps = makeDeps();
    const { onEdgeClear } = useEdgePanelWiring('trail', deps);
    onEdgeClear({ hexId: '01.03', faceIndex: 2, type: 'trail' });
    expect(deps.handleEdgeClear).toHaveBeenCalledWith('01.03', 2, 'trail');
  });

  it('onEdgeClearAll delegates to handleEdgeClearAll', () => {
    const deps = makeDeps();
    const { onEdgeClearAll } = useEdgePanelWiring('trail', deps);
    const types = ['trail', 'road'];
    onEdgeClearAll(types);
    expect(deps.handleEdgeClearAll).toHaveBeenCalledWith(types);
  });

  it('onOverlayConfig sets activePanelOverlayConfig', () => {
    const deps = makeDeps();
    const { onOverlayConfig } = useEdgePanelWiring('trail', deps);
    const cfg = { hexFill: { alwaysOn: true } };
    onOverlayConfig(cfg);
    expect(deps.activePanelOverlayConfig.value).toEqual(cfg);
  });

  it('multiple instances maintain independent selectedType', () => {
    const deps = makeDeps();
    const road = useEdgePanelWiring('trail', deps);
    const stream = useEdgePanelWiring('stream', deps);
    road.onTypeChange('road');
    expect(road.selectedType).toBe('road');
    expect(stream.selectedType).toBe('stream');
  });

  it('selectedType is accessible directly without .value on the returned object', () => {
    const deps = makeDeps();
    const result = useEdgePanelWiring('trail', deps);
    expect(result.selectedType).toBe('trail');
    result.onTypeChange('road');
    expect(result.selectedType).toBe('road');
  });

  it('selectedType is reactive — watchEffect re-fires after onTypeChange', () => {
    // L7: reactive() wrapping ensures watchers track selectedType changes.
    // flush:'sync' runs the effect immediately on each reactive mutation.
    const deps = makeDeps();
    const result = useEdgePanelWiring('trail', deps);
    const seen = [];
    const stop = watchEffect(
      () => {
        seen.push(result.selectedType);
      },
      { flush: 'sync' }
    );
    result.onTypeChange('road');
    result.onTypeChange('pike');
    stop();
    expect(seen).toEqual(['trail', 'road', 'pike']);
  });
});
