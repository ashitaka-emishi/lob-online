import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import EdgeToolPanelShell from './EdgeToolPanelShell.vue';

// Stub BaseToolPanel to avoid complex DOM setup in this unit test
vi.mock('./BaseToolPanel.vue', () => ({
  default: {
    name: 'BaseToolPanel',
    template: '<div class="base-tool-panel-stub"><slot /></div>',
    props: ['overlayConfig', 'helpText'],
    emits: ['clear-all', 'overlay-toggle'],
  },
}));

const ROAD_MODES = [
  { value: 'road', label: 'Paint' },
  { value: 'bridge', label: 'Bridge' },
];

describe('EdgeToolPanelShell', () => {
  describe('mode toggle', () => {
    it('renders one button per mode', () => {
      const wrapper = mount(EdgeToolPanelShell, {
        props: { modes: ROAD_MODES, activeMode: 'road' },
      });
      const btns = wrapper.findAll('.mode-btn');
      expect(btns).toHaveLength(2);
      expect(btns[0].text()).toBe('Paint');
      expect(btns[1].text()).toBe('Bridge');
    });

    it('active mode button has the active class', () => {
      const wrapper = mount(EdgeToolPanelShell, {
        props: { modes: ROAD_MODES, activeMode: 'bridge' },
      });
      const btns = wrapper.findAll('.mode-btn');
      expect(btns[1].classes()).toContain('active');
      expect(btns[0].classes()).not.toContain('active');
    });

    it('clicking a mode button emits mode-change with the mode value', async () => {
      const wrapper = mount(EdgeToolPanelShell, {
        props: { modes: ROAD_MODES, activeMode: 'road' },
      });
      await wrapper.findAll('.mode-btn')[1].trigger('click');
      expect(wrapper.emitted('mode-change')?.[0]).toEqual(['bridge']);
    });

    it('renders no mode toggle when modes prop is empty', () => {
      const wrapper = mount(EdgeToolPanelShell, {
        props: { modes: [], activeMode: null },
      });
      expect(wrapper.find('.mode-toggle').exists()).toBe(false);
    });
  });

  describe('slot routing', () => {
    it('renders default slot content when activeMode matches first mode value', () => {
      const wrapper = mount(EdgeToolPanelShell, {
        props: { modes: ROAD_MODES, activeMode: 'road' },
        slots: { default: '<div class="paint-content">paint</div>' },
      });
      expect(wrapper.find('.paint-content').exists()).toBe(true);
    });

    it('renders sub-control slot content when activeMode is not the first mode value', () => {
      const wrapper = mount(EdgeToolPanelShell, {
        props: { modes: ROAD_MODES, activeMode: 'bridge' },
        slots: {
          default: '<div class="paint-content">paint</div>',
          'sub-control': '<div class="bridge-content">bridge</div>',
        },
      });
      expect(wrapper.find('.bridge-content').exists()).toBe(true);
      expect(wrapper.find('.paint-content').exists()).toBe(false);
    });

    it('renders default slot when no modes provided', () => {
      const wrapper = mount(EdgeToolPanelShell, {
        props: { modes: [], activeMode: null },
        slots: { default: '<div class="paint-content">type chooser</div>' },
      });
      expect(wrapper.find('.paint-content').exists()).toBe(true);
    });
  });

  describe('BaseToolPanel passthrough', () => {
    it('forwards clear-all emit from BaseToolPanel', async () => {
      const wrapper = mount(EdgeToolPanelShell, {
        props: { modes: ROAD_MODES, activeMode: 'road' },
      });
      await wrapper.findComponent({ name: 'BaseToolPanel' }).vm.$emit('clear-all');
      expect(wrapper.emitted('clear-all')).toBeTruthy();
    });
  });
});
