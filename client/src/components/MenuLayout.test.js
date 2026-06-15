import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MenuLayout from './MenuLayout.vue';

describe('MenuLayout', () => {
  it('renders slot content inside the menu-bg wrapper', () => {
    const wrapper = mount(MenuLayout, { slots: { default: '<p data-testid="child">hello</p>' } });
    expect(wrapper.find('[data-testid="child"]').exists()).toBe(true);
    expect(wrapper.find('.menu-bg').exists()).toBe(true);
  });

  it('does not render a <main> landmark (App.vue already provides it, nesting would violate WCAG 1.3.1)', () => {
    const wrapper = mount(MenuLayout, { slots: { default: '<p>content</p>' } });
    expect(wrapper.find('main').exists()).toBe(false);
    expect(wrapper.find('div.menu-bg').exists()).toBe(true);
  });
});
