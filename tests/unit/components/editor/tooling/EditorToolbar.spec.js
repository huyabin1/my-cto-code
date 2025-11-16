import { shallowMount, createLocalVue } from '@vue/test-utils';
import ElementUI from 'element-ui';
import Vuex from 'vuex';
import EditorToolbar from '@/components/editor/tooling/EditorToolbar.vue';

const localVue = createLocalVue();
localVue.use(ElementUI);
localVue.use(Vuex);

describe('EditorToolbar', () => {
  let store;
  let actions;
  let state;
  let wrapper;

  const createWrapper = () => {
    store = new Vuex.Store({
      modules: {
        editor: {
          namespaced: true,
          state,
          actions,
        },
      },
    });

    wrapper = shallowMount(EditorToolbar, {
      localVue,
      store,
    });

    return wrapper;
  };

  beforeEach(() => {
    actions = {
      setViewMode: jest.fn(),
    };

    state = {
      projectInfo: {
        name: 'Test Project',
      },
      viewport: {
        viewMode: '2d',
      },
      commandStackInfo: {
        canUndo: false,
        canRedo: false,
      },
    };
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the toolbar correctly', () => {
      createWrapper();

      expect(wrapper.find('.editor-toolbar').exists()).toBe(true);
      expect(wrapper.find('.toolbar-brand').exists()).toBe(true);
    });

    it('displays project title from state', () => {
      createWrapper();

      expect(wrapper.text()).toContain('Test Project');
    });

    it('shows untitled project when no name is set', () => {
      state.projectInfo.name = '';
      createWrapper();

      expect(wrapper.text()).toContain('未命名项目');
    });
  });

  describe('Button States', () => {
    it('disables undo button when canUndo is false', () => {
      createWrapper();

      const undoButton = wrapper.find('[data-testid="toolbar-undo"]');
      expect(undoButton.attributes('disabled')).toBe('true');
    });

    it('enables undo button when canUndo is true', () => {
      state.commandStackInfo.canUndo = true;
      createWrapper();

      const undoButton = wrapper.find('[data-testid="toolbar-undo"]');
      expect(undoButton.attributes('disabled')).toBeUndefined();
    });

    it('disables redo button when canRedo is false', () => {
      createWrapper();

      const redoButton = wrapper.find('[data-testid="toolbar-redo"]');
      expect(redoButton.attributes('disabled')).toBe('true');
    });

    it('enables redo button when canRedo is true', () => {
      state.commandStackInfo.canRedo = true;
      createWrapper();

      const redoButton = wrapper.find('[data-testid="toolbar-redo"]');
      expect(redoButton.attributes('disabled')).toBeUndefined();
    });

    it('highlights active view mode button', () => {
      state.viewport.viewMode = '3d';
      createWrapper();

      const view3dButton = wrapper.find('[data-testid="view-3d"]');
      expect(view3dButton.attributes('type')).toBe('primary');
    });
  });

  describe('Event Emissions', () => {
    it('emits new-project when new button is clicked', async () => {
      createWrapper();
      const newButton = wrapper.find('.toolbar-button').filter((w) => w.text().includes('新建'));

      await newButton.at(0).trigger('click');

      expect(wrapper.emitted()['new-project']).toBeTruthy();
    });

    it('emits save-project when save button is clicked', async () => {
      createWrapper();
      const saveButton = wrapper.find('.toolbar-button').filter((w) => w.text().includes('保存'));

      await saveButton.at(0).trigger('click');

      expect(wrapper.emitted()['save-project']).toBeTruthy();
    });

    it('emits undo when undo button is clicked', async () => {
      state.commandStackInfo.canUndo = true;
      createWrapper();

      const undoButton = wrapper.find('[data-testid="toolbar-undo"]');
      await undoButton.trigger('click');

      expect(wrapper.emitted().undo).toBeTruthy();
    });

    it('emits redo when redo button is clicked', async () => {
      state.commandStackInfo.canRedo = true;
      createWrapper();

      const redoButton = wrapper.find('[data-testid="toolbar-redo"]');
      await redoButton.trigger('click');

      expect(wrapper.emitted().redo).toBeTruthy();
    });
  });

  describe('View Mode Actions', () => {
    it('dispatches setViewMode action when 2D view is clicked', async () => {
      state.viewport.viewMode = '3d';
      createWrapper();

      const view2dButton = wrapper.find('[data-testid="view-2d"]');
      await view2dButton.trigger('click');

      expect(actions.setViewMode).toHaveBeenCalledWith(expect.anything(), '2d');
    });

    it('dispatches setViewMode action when 3D view is clicked', async () => {
      state.viewport.viewMode = '2d';
      createWrapper();

      const view3dButton = wrapper.find('[data-testid="view-3d"]');
      await view3dButton.trigger('click');

      expect(actions.setViewMode).toHaveBeenCalledWith(expect.anything(), '3d');
    });

    it('dispatches setViewMode action when sync view is clicked', async () => {
      state.viewport.viewMode = '2d';
      createWrapper();

      const viewSyncButton = wrapper.find('[data-testid="view-sync"]');
      await viewSyncButton.trigger('click');

      expect(actions.setViewMode).toHaveBeenCalledWith(expect.anything(), 'sync');
    });

    it('does not dispatch action when clicking already active view mode', async () => {
      state.viewport.viewMode = '2d';
      createWrapper();

      const view2dButton = wrapper.find('[data-testid="view-2d"]');
      await view2dButton.trigger('click');

      expect(actions.setViewMode).not.toHaveBeenCalled();
    });
  });
});
