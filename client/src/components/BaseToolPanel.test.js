import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import BaseToolPanel from './BaseToolPanel.vue';

const OVERLAY_CONFIG_WITH_TOGGLES = {
  hexFill: { alwaysOn: false, toggleLabel: 'Show fill' },
  hexLabel: { alwaysOn: false, toggleLabel: 'Show labels' },
  edgeLine: { alwaysOn: true },
};

const OVERLAY_CONFIG_NO_TOGGLES = {
  grid: { alwaysOn: true },
  edgeLine: { alwaysOn: true },
};

describe('BaseToolPanel', () => {
  it('renders the default slot', () => {
    const wrapper = mount(BaseToolPanel, {
      props: { overlayConfig: {} },
      slots: { default: '<div class="tool-content">tool here</div>' },
    });
    expect(wrapper.find('.tool-content').exists()).toBe(true);
  });

  describe('overlay toggles', () => {
    it('renders a checkbox for each non-alwaysOn layer', () => {
      const wrapper = mount(BaseToolPanel, {
        props: { overlayConfig: OVERLAY_CONFIG_WITH_TOGGLES },
      });
      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(2);
    });

    it('renders no checkboxes when all layers are alwaysOn', () => {
      const wrapper = mount(BaseToolPanel, {
        props: { overlayConfig: OVERLAY_CONFIG_NO_TOGGLES },
      });
      expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0);
    });

    it('renders the toggleLabel as the checkbox label text', () => {
      const wrapper = mount(BaseToolPanel, {
        props: { overlayConfig: OVERLAY_CONFIG_WITH_TOGGLES },
      });
      expect(wrapper.text()).toContain('Show fill');
      expect(wrapper.text()).toContain('Show labels');
    });

    it('checkboxes are checked by default', () => {
      const wrapper = mount(BaseToolPanel, {
        props: { overlayConfig: OVERLAY_CONFIG_WITH_TOGGLES },
      });
      for (const cb of wrapper.findAll('input[type="checkbox"]')) {
        expect(cb.element.checked).toBe(true);
      }
    });

    it('toggling a checkbox emits overlay-toggle with the layer key and new value', async () => {
      const wrapper = mount(BaseToolPanel, {
        props: { overlayConfig: OVERLAY_CONFIG_WITH_TOGGLES },
      });
      const firstCheckbox = wrapper.find('input[type="checkbox"]');
      await firstCheckbox.trigger('change');
      const emitted = wrapper.emitted('overlay-toggle');
      expect(emitted).toBeTruthy();
      expect(emitted[0]).toHaveLength(2); // [key, value]
    });
  });

  describe('clear-all button', () => {
    it('renders a Clear all button', () => {
      const wrapper = mount(BaseToolPanel, { props: { overlayConfig: {} } });
      expect(wrapper.find('button.clear-all-btn').exists()).toBe(true);
    });

    it('clicking Clear all shows the confirmation dialog', async () => {
      const wrapper = mount(BaseToolPanel, { props: { overlayConfig: {} } });
      await wrapper.find('button.clear-all-btn').trigger('click');
      expect(wrapper.find('.confirm-dialog').exists()).toBe(true);
    });

    it('confirming the dialog emits clear-all', async () => {
      const wrapper = mount(BaseToolPanel, { props: { overlayConfig: {} } });
      await wrapper.find('button.clear-all-btn').trigger('click');
      const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Clear');
      await confirmBtn.trigger('click');
      expect(wrapper.emitted('clear-all')).toBeTruthy();
    });

    it('cancelling the dialog does not emit clear-all', async () => {
      const wrapper = mount(BaseToolPanel, { props: { overlayConfig: {} } });
      await wrapper.find('button.clear-all-btn').trigger('click');
      const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel');
      await cancelBtn.trigger('click');
      expect(wrapper.emitted('clear-all')).toBeFalsy();
    });
  });

  describe('help popup', () => {
    it('does not render help button when helpText is not provided', () => {
      const wrapper = mount(BaseToolPanel, { props: { overlayConfig: {} } });
      expect(wrapper.find('button.help-btn').exists()).toBe(false);
    });

    it('renders a help button when helpText is provided', () => {
      const wrapper = mount(BaseToolPanel, {
        props: { overlayConfig: {}, helpText: 'Click to paint hexes.' },
      });
      expect(wrapper.find('button.help-btn').exists()).toBe(true);
    });

    it('clicking help button shows the help modal', async () => {
      const wrapper = mount(BaseToolPanel, {
        props: { overlayConfig: {}, helpText: 'Click to paint hexes.' },
      });
      await wrapper.find('button.help-btn').trigger('click');
      expect(wrapper.find('.help-modal').exists()).toBe(true);
      expect(wrapper.text()).toContain('Click to paint hexes.');
    });

    it('clicking close in help modal hides it', async () => {
      const wrapper = mount(BaseToolPanel, {
        props: { overlayConfig: {}, helpText: 'Some help.' },
      });
      await wrapper.find('button.help-btn').trigger('click');
      const closeBtn = wrapper.find('.help-modal button');
      await closeBtn.trigger('click');
      expect(wrapper.find('.help-modal').exists()).toBe(false);
    });
  });
});
