import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

// Mock socket.io-client before importing the component
vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    disconnect: vi.fn(),
  };
  return { io: vi.fn(() => mockSocket) };
});

import StatusView from './StatusView.vue';

describe('StatusView', () => {
  it('renders the game title', () => {
    const wrapper = mount(StatusView);
    expect(wrapper.text()).toContain('Line of Battle Online');
  });

  it('renders South Mountain subtitle', () => {
    const wrapper = mount(StatusView);
    expect(wrapper.text()).toContain('South Mountain');
  });

  it('shows initial connecting status', () => {
    const wrapper = mount(StatusView);
    expect(wrapper.text()).toContain('connecting');
  });

  it('has a status paragraph with class', () => {
    const wrapper = mount(StatusView);
    expect(wrapper.find('.status').exists()).toBe(true);
  });
});
