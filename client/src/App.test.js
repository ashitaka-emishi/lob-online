import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import App from './App.vue';

const stubRouter = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
});

describe('App', () => {
  it('renders a <main id="main-content"> landmark', async () => {
    const wrapper = mount(App, { global: { plugins: [stubRouter] } });
    await stubRouter.isReady();
    expect(wrapper.find('main#main-content').exists()).toBe(true);
  });

  it('renders a skip-navigation link targeting #main-content', () => {
    const wrapper = mount(App, { global: { plugins: [stubRouter] } });
    const skip = wrapper.find('a.skip-nav');
    expect(skip.exists()).toBe(true);
    expect(skip.attributes('href')).toBe('#main-content');
  });
});
