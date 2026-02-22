import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import LosTestPanel from './LosTestPanel.vue';

const GRID = {
  cols: 10,
  rows: 10,
  dx: 0,
  dy: 0,
  hexWidth: 35,
  hexHeight: 35,
  imageScale: 1,
  orientation: 'flat',
  strokeWidth: 0.5,
  evenColUp: false,
};

const MAP_DATA = {
  hexes: [
    { hex: '02.05', terrain: 'clear', elevation: 100 },
    { hex: '08.05', terrain: 'clear', elevation: 100 },
  ],
  gridSpec: GRID,
};

function mountPanel(props = {}) {
  return mount(LosTestPanel, {
    props: {
      mapData: MAP_DATA,
      gridSpec: GRID,
      ...props,
    },
  });
}

describe('LosTestPanel', () => {
  it('renders From and To input fields', () => {
    const wrapper = mountPanel();
    const inputs = wrapper.findAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders "Test LOS" button', () => {
    const wrapper = mountPanel();
    const btn = wrapper.find('button.los-run-btn');
    expect(btn.exists()).toBe(true);
  });

  it('Test LOS button is disabled when hexA is null', () => {
    const wrapper = mountPanel({ hexA: null, hexB: '08.05' });
    const btn = wrapper.find('button.los-run-btn');
    expect(btn.attributes('disabled')).toBeDefined();
  });

  it('Test LOS button is disabled when hexB is null', () => {
    const wrapper = mountPanel({ hexA: '02.05', hexB: null });
    const btn = wrapper.find('button.los-run-btn');
    expect(btn.attributes('disabled')).toBeDefined();
  });

  it('Test LOS button is enabled when both hexes are set', () => {
    const wrapper = mountPanel({ hexA: '02.05', hexB: '08.05' });
    const btn = wrapper.find('button.los-run-btn');
    expect(btn.attributes('disabled')).toBeUndefined();
  });

  it('emits pick-start("A") when Pick A is clicked', async () => {
    const wrapper = mountPanel();
    const pickBtns = wrapper.findAll('button.los-pick-btn');
    await pickBtns[0].trigger('click');
    expect(wrapper.emitted('pick-start')).toBeTruthy();
    expect(wrapper.emitted('pick-start')[0]).toEqual(['A']);
  });

  it('emits pick-start("B") when Pick B is clicked', async () => {
    const wrapper = mountPanel();
    const pickBtns = wrapper.findAll('button.los-pick-btn');
    await pickBtns[1].trigger('click');
    expect(wrapper.emitted('pick-start')).toBeTruthy();
    expect(wrapper.emitted('pick-start')[0]).toEqual(['B']);
  });

  it('emits pick-cancel when Pick A is clicked while selectingHex==="A"', async () => {
    const wrapper = mountPanel({ selectingHex: 'A' });
    const pickBtns = wrapper.findAll('button.los-pick-btn');
    await pickBtns[0].trigger('click');
    expect(wrapper.emitted('pick-cancel')).toBeTruthy();
  });

  it('shows "Cancel" label on Pick A button while selecting A', () => {
    const wrapper = mountPanel({ selectingHex: 'A' });
    const pickBtns = wrapper.findAll('button.los-pick-btn');
    expect(pickBtns[0].text()).toBe('Cancel');
  });

  it('emits set-hex-a when From input changes', async () => {
    const wrapper = mountPanel();
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('03.05');
    await inputs[0].trigger('change');
    expect(wrapper.emitted('set-hex-a')).toBeTruthy();
  });

  it('emits set-hex-b when To input changes', async () => {
    const wrapper = mountPanel();
    const inputs = wrapper.findAll('input');
    await inputs[1].setValue('07.05');
    await inputs[1].trigger('change');
    expect(wrapper.emitted('set-hex-b')).toBeTruthy();
  });

  it('shows CLEAR badge and steps after running LOS on clear line', async () => {
    const wrapper = mountPanel({ hexA: '02.05', hexB: '08.05' });
    const btn = wrapper.find('button.los-run-btn');
    await btn.trigger('click');
    await flushPromises();

    expect(wrapper.find('.los-badge').exists()).toBe(true);
    expect(wrapper.find('.los-badge').text()).toContain('CLEAR');
    expect(wrapper.findAll('.los-step').length).toBeGreaterThan(0);
  });

  it('shows BLOCKED badge when intermediate hex blocks LOS', async () => {
    // Both hexes at 100, but we need a blocking intermediate.
    // Use hexes where the intermediate has very high elevation.
    // Find the intermediate hex IDs using the line manually.
    // We'll use a map where the middle hex has high elevation + woods terrain.
    const { hexLine } = await import('../utils/los.js');
    const line = hexLine('02.05', '08.05', GRID);
    const midId = line[Math.floor(line.length / 2)];

    const blockingMap = {
      hexes: [
        { hex: '02.05', terrain: 'clear', elevation: 100 },
        { hex: midId, terrain: 'woods', elevation: 200 }, // very high → blocks
        { hex: '08.05', terrain: 'clear', elevation: 100 },
      ],
      gridSpec: GRID,
    };

    const wrapper = mount(LosTestPanel, {
      props: { hexA: '02.05', hexB: '08.05', mapData: blockingMap, gridSpec: GRID },
    });

    const btn = wrapper.find('button.los-run-btn');
    await btn.trigger('click');
    await flushPromises();

    expect(wrapper.find('.los-badge').text()).toContain('BLOCKED');
  });

  it('emits los-result event after running LOS', async () => {
    const wrapper = mountPanel({ hexA: '02.05', hexB: '08.05' });
    const btn = wrapper.find('button.los-run-btn');
    await btn.trigger('click');
    await flushPromises();

    expect(wrapper.emitted('los-result')).toBeTruthy();
    const [result] = wrapper.emitted('los-result')[0];
    expect(result).toHaveProperty('clear');
    expect(result).toHaveProperty('steps');
  });

  it('input placeholders update when selectingHex is active', () => {
    const wrapper = mountPanel({ selectingHex: 'A' });
    const inputs = wrapper.findAll('input');
    expect(inputs[0].attributes('placeholder')).toContain('click a hex');
  });

  it('does not show result before Test LOS is clicked', () => {
    const wrapper = mountPanel({ hexA: '02.05', hexB: '08.05' });
    expect(wrapper.find('.los-result').exists()).toBe(false);
  });
});
