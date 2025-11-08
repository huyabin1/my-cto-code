import { createLocalVue, mount } from '@vue/test-utils';
import ElementUI from 'element-ui';
import Vuex from 'vuex';
// eslint-disable-next-line import/extensions, import/no-unresolved
import App from '@/App';
// eslint-disable-next-line import/extensions, import/no-unresolved
import store from '@/store';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(ElementUI);

describe('App.vue', () => {
  it('renders the editor layout with key controls', async () => {
    const wrapper = mount(App, {
      localVue,
      store,
      stubs: {
        transition: false,
        'transition-group': false,
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('.editor-sidebar').exists()).toBe(true);
    expect(wrapper.text()).toContain('CAD 导入');
    expect(wrapper.text()).toContain('绘制墙体');
    expect(wrapper.text()).toContain('属性面板');
  });
});
