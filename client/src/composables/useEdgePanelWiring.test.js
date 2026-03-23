import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
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
    const { selectedType } = useEdgePanelWiring('trail', deps);
    expect(selectedType.value).toBe('trail');
  });

  it('onTypeChange updates selectedType', () => {
    const deps = makeDeps();
    const { selectedType, onTypeChange } = useEdgePanelWiring('trail', deps);
    onTypeChange('road');
    expect(selectedType.value).toBe('road');
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
    expect(road.selectedType.value).toBe('road');
    expect(stream.selectedType.value).toBe('stream');
  });
});
