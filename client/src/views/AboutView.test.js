import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import AboutView from './AboutView.vue';

const stubRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div/>' } },
    { path: '/about', component: AboutView },
  ],
});

function makeWrapper() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(AboutView, { global: { plugins: [pinia, stubRouter] } });
}

describe('AboutView — credits and content', () => {
  it('renders MMP credit', () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toMatch(/multi-man publishing/i);
  });

  it('renders The Gamers credit', () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toMatch(/the gamers/i);
  });

  it('renders designer credits — Dean Essig', () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toMatch(/dean essig/i);
  });

  it('renders designer credits — David A. Powell', () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toMatch(/david a\. powell/i);
  });

  it('renders web-app credit with Andrew Hammer and tool names', () => {
    const wrapper = makeWrapper();
    const credit = wrapper.find('[data-testid="app-credit"]');
    expect(credit.exists()).toBe(true);
    expect(credit.text()).toMatch(/andrew hammer/i);
    expect(credit.text()).toMatch(/claude/i);
    expect(credit.text()).toMatch(/codex/i);
  });

  it('renders unofficial disclaimer', () => {
    const wrapper = makeWrapper();
    const disclaimer = wrapper.find('[data-testid="disclaimer"]');
    expect(disclaimer.exists()).toBe(true);
    expect(disclaimer.text()).toMatch(/unofficial/i);
  });
});

describe('AboutView — links', () => {
  it('renders a link to The Gamers Archive', () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-testid="gamers-archive-link"]').exists()).toBe(true);
  });

  it('renders a link for LoB Series Support', () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-testid="lob-series-link"]').exists()).toBe(true);
  });

  it('renders a link to the MMP LoB page', () => {
    const wrapper = makeWrapper();
    expect(wrapper.find('[data-testid="mmp-lob-link"]').exists()).toBe(true);
  });

  it('renders a back-to-home link', () => {
    const wrapper = makeWrapper();
    const link = wrapper.find('[data-testid="back-home-link"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('/');
  });
});
