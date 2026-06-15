import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MenuLayout from './MenuLayout.vue';

describe('MenuLayout', () => {
  it('renders slot content inside the menu-bg wrapper', () => {
    const wrapper = mount(MenuLayout, { slots: { default: '<p data-testid="child">hello</p>' } });
    expect(wrapper.find('[data-testid="child"]').exists()).toBe(true);
    expect(wrapper.find('.menu-bg').exists()).toBe(true);
  });

  it('renders a <main> element with id="main-content" for WCAG 1.3.1 (#584)', () => {
    const wrapper = mount(MenuLayout, { slots: { default: '<p>content</p>' } });
    expect(wrapper.find('main#main-content').exists()).toBe(true);
  });
});
