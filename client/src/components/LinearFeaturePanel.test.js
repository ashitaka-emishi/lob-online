import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LinearFeaturePanel from './LinearFeaturePanel.vue';

const FEATURE_TYPES = ['road', 'stream', 'stoneWall'];

describe('LinearFeaturePanel', () => {
  it('renders a button for each edge feature type', () => {
    const wrapper = mount(LinearFeaturePanel, { props: { edgeFeatureTypes: FEATURE_TYPES } });
    const btns = wrapper.findAll('.feature-btn');
    expect(btns.length).toBe(3);
  });

  it('active feature button has active class', () => {
    const wrapper = mount(LinearFeaturePanel, {
      props: { edgeFeatureTypes: FEATURE_TYPES, paintEdgeFeature: 'road' },
    });
    const roadBtn = wrapper.findAll('.feature-btn').find((b) => b.text() === 'road');
    expect(roadBtn.classes()).toContain('active');
  });

  it('clicking feature button emits feature-change', async () => {
    const wrapper = mount(LinearFeaturePanel, {
      props: { edgeFeatureTypes: FEATURE_TYPES, paintEdgeFeature: null },
    });
    const streamBtn = wrapper.findAll('.feature-btn').find((b) => b.text() === 'stream');
    await streamBtn.trigger('click');
    expect(wrapper.emitted('feature-change')?.[0][0]).toBe('stream');
  });

  it('shows trace status when traceEdgeCount > 0', () => {
    const wrapper = mount(LinearFeaturePanel, {
      props: { edgeFeatureTypes: FEATURE_TYPES, traceEdgeCount: 5 },
    });
    expect(wrapper.find('.trace-status').exists()).toBe(true);
    expect(wrapper.text()).toContain('5');
  });

  it('hides trace status when traceEdgeCount is 0', () => {
    const wrapper = mount(LinearFeaturePanel, {
      props: { edgeFeatureTypes: FEATURE_TYPES, traceEdgeCount: 0 },
    });
    expect(wrapper.find('.trace-status').exists()).toBe(false);
  });
});
