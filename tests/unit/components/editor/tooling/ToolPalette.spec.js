import { shallowMount, createLocalVue } from '@vue/test-utils';
import ElementUI from 'element-ui';
import Vuex from 'vuex';
import ToolPalette from '@/components/editor/tooling/ToolPalette.vue';

const localVue = createLocalVue();
localVue.use(ElementUI);
localVue.use(Vuex);

describe('ToolPalette', () => {
  let store;
  let actions;
  let state;
  let wrapper;

  const createWrapper = (propsData = {}) => {
    store = new Vuex.Store({
      modules: {
        editor: {
          namespaced: true,
          state,
          actions,
        },
      },
    });

    wrapper = shallowMount(ToolPalette, {
      localVue,
      store,
      propsData,
      attachToDocument: true,
    });

    return wrapper;
  };

  beforeEach(() => {
    actions = {
      setDrawWallTool: jest.fn(),
      setActiveTool: jest.fn(),
    };

    state = {
      drawWallToolEnabled: false,
      activeTool: null,
    };
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
    jest.clearAllMocks();
  });

  it('renders all tool buttons', () => {
    createWrapper();

    expect(wrapper.find('.tool-palette').exists()).toBe(true);
    expect(wrapper.findAll('.tool-button').length).toBeGreaterThan(0);
  });

  it('dispatches selection actions when select tool is clicked', async () => {
    createWrapper();
    const selectButton = wrapper.find('[data-testid="tool-select"]');

    await selectButton.trigger('click');

    expect(actions.setDrawWallTool).toHaveBeenCalledWith(expect.anything(), false);
    expect(actions.setActiveTool).toHaveBeenCalledWith(expect.anything(), null);
  });

  it('enables wall tool via Vuex when clicked', async () => {
    createWrapper();
    const wallButton = wrapper.find('[data-testid="tool-wall"]');

    await wallButton.trigger('click');

    expect(actions.setDrawWallTool).toHaveBeenCalledWith(expect.anything(), true);
    expect(actions.setActiveTool).toHaveBeenCalledWith(expect.anything(), null);
  });

  it('activates measurement tool and disables wall tool', async () => {
    createWrapper();
    const distanceButton = wrapper.find('[data-testid="tool-distance"]');

    await distanceButton.trigger('click');

    expect(actions.setDrawWallTool).toHaveBeenCalledWith(expect.anything(), false);
    expect(actions.setActiveTool).toHaveBeenCalledWith(expect.anything(), 'distance');
  });

  it('emits toggle-layer-panel event when layer button is pressed', async () => {
    createWrapper();
    const layerButton = wrapper.find('[data-testid="tool-layers"]');

    await layerButton.trigger('click');
    expect(wrapper.emitted()['toggle-layer-panel']).toBeTruthy();
    expect(wrapper.emitted()['toggle-layer-panel'][0]).toEqual([true]);
  });

  it('reflects Vuex state for active wall tool', () => {
    state.drawWallToolEnabled = true;
    createWrapper();

    expect(wrapper.vm.activeTool).toBe('wall');
    const wallButton = wrapper.find('[data-testid="tool-wall"]');
    expect(wallButton.classes()).toContain('active');
  });
});
