import { shallowMount } from '@vue/test-utils';
import App from '@/App.vue';

describe('App.vue', () => {
  it('renders the Three.js mount point without crashing', () => {
    const wrapper = shallowMount(App);
    expect(wrapper.find('#three-scene-mount').exists()).toBe(true);
  });
});
