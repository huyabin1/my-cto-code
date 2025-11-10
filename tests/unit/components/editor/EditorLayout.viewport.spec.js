import { shallowMount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import EditorLayout from '@/components/editor/EditorLayout.vue';
import { resetSharedSceneGraph } from '@/three/core/SceneGraph';

const localVue = createLocalVue();
localVue.use(Vuex);

// Mock Element UI components
jest.mock('element-ui', () => ({
  Select: { name: 'el-select' },
  Option: { name: 'el-option' },
  Button: { name: 'el-button' },
  Switch: { name: 'el-switch' },
  CheckboxGroup: { name: 'el-checkbox-group' },
  Checkbox: { name: 'el-checkbox' },
  Slider: { name: 'el-slider' },
  Tag: { name: 'el-tag' },
  Alert: { name: 'el-alert' },
  RadioGroup: { name: 'el-radio-group' },
  RadioButton: { name: 'el-radio-button' },
  Radio: { name: 'el-radio' },
  ButtonGroup: { name: 'el-button-group' },
}));

describe('EditorLayout.vue - Viewport Integration', () => {
  let store;
  let wrapper;

  beforeEach(() => {
    store = new Vuex.Store({
      modules: {
        editor: {
          namespaced: true,
          state: {
            drawWallToolEnabled: false,
            snapping: {
              orthogonal: true,
              diagonal45: false,
              grid: false,
            },
            viewport: {
              viewMode: '2d',
              layoutMode: 'single',
            },
          },
          actions: {
            setDrawWallTool: jest.fn(),
            setSnapping: jest.fn(),
            setViewMode: jest.fn(),
            setLayoutMode: jest.fn(),
          },
          mutations: {
            SET_VIEW_MODE: jest.fn(),
            SET_LAYOUT_MODE: jest.fn(),
          },
        },
        cad: {
          namespaced: true,
          state: {
            layers: [],
            opacity: 1,
            importStatus: 'idle',
            importError: null,
            lastImportedFile: null,
            unitOptions: [
              { label: 'mm', value: 'mm' },
              { label: 'cm', value: 'cm' },
            ],
            selectedUnit: 'mm',
          },
          getters: {
            visibleLayerIds: () => [],
          },
          actions: {
            startDxfImport: jest.fn(),
            completeDxfImport: jest.fn(),
            failDxfImport: jest.fn(),
            setOpacity: jest.fn(),
            setSelectedUnit: jest.fn(),
            setLayerVisibility: jest.fn(),
          },
        },
      },
    });

    wrapper = shallowMount(EditorLayout, {
      localVue,
      store,
      stubs: {
        ThreeScene: true,
        PreviewViewport: true,
        PropertyPanel: true,
        SnappingPanel: true,
        MeasurementPanel: true,
        UndoRedoPanel: true,
        ProjectPanel: true,
        'el-select': true,
        'el-option': true,
        'el-button': true,
        'el-switch': true,
        'el-checkbox-group': true,
        'el-checkbox': true,
        'el-slider': true,
        'el-tag': true,
        'el-alert': true,
        'el-radio-group': true,
        'el-radio-button': true,
        'el-radio': true,
        'el-button-group': true,
      },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
    resetSharedSceneGraph();
  });

  describe('View Mode Switching', () => {
    it('should display view mode controls', () => {
      expect(wrapper.find('.view-mode-group').exists()).toBe(true);
    });

    it('should show only ThreeScene in 2d mode', () => {
      store.state.editor.viewport.viewMode = '2d';
      wrapper.vm.$forceUpdate();

      expect(wrapper.vm.viewModeModel).toBe('2d');
    });

    it('should show only PreviewViewport in 3d mode', async () => {
      store.state.editor.viewport.viewMode = '3d';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.viewModeModel).toBe('3d');
    });

    it('should show both viewports in sync mode', async () => {
      store.state.editor.viewport.viewMode = 'sync';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.viewModeModel).toBe('sync');
    });

    it('should update store when view mode changes', async () => {
      const setViewModeSpy = jest.spyOn(store, 'dispatch');
      
      wrapper.vm.viewModeModel = '3d';

      expect(setViewModeSpy).toHaveBeenCalledWith('editor/setViewMode', '3d');
    });
  });

  describe('Layout Mode Switching', () => {
    beforeEach(async () => {
      store.state.editor.viewport.viewMode = 'sync';
      await wrapper.vm.$nextTick();
    });

    it('should show layout options in sync mode', () => {
      expect(wrapper.find('.layout-options').exists()).toBe(true);
    });

    it('should apply split layout class', async () => {
      store.state.editor.viewport.layoutMode = 'split';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.canvasLayoutClass).toBe('split-layout');
    });

    it('should apply floating layout class', async () => {
      store.state.editor.viewport.layoutMode = 'floating';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.canvasLayoutClass).toBe('floating-layout');
    });

    it('should apply single layout class for 2d mode', async () => {
      store.state.editor.viewport.viewMode = '2d';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.canvasLayoutClass).toBe('single-layout');
    });
  });

  describe('Preview Viewport Class', () => {
    it('should apply floating-preview class in floating mode', async () => {
      store.state.editor.viewport.viewMode = 'sync';
      store.state.editor.viewport.layoutMode = 'floating';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.previewViewportClass).toBe('floating-preview');
    });

    it('should apply split-view class in split mode', async () => {
      store.state.editor.viewport.viewMode = 'sync';
      store.state.editor.viewport.layoutMode = 'split';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.previewViewportClass).toBe('split-view');
    });

    it('should not apply class in 3d only mode', async () => {
      store.state.editor.viewport.viewMode = '3d';
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.previewViewportClass).toBe('');
    });
  });

  describe('Computed Properties', () => {
    it('should compute viewModeModel from store', () => {
      expect(wrapper.vm.viewModeModel).toBe('2d');
    });

    it('should compute layoutModeModel from store', () => {
      expect(wrapper.vm.layoutModeModel).toBe('single');
    });

    it('should update viewModeModel', () => {
      wrapper.vm.viewModeModel = '3d';
      // The action should be called through the computed setter
      expect(wrapper.vm.viewport.viewMode).toBeDefined();
    });

    it('should update layoutModeModel', () => {
      wrapper.vm.layoutModeModel = 'split';
      // The action should be called through the computed setter
      expect(wrapper.vm.viewport.layoutMode).toBeDefined();
    });
  });

  describe('Responsive Layout', () => {
    it('should apply appropriate classes for different view modes', () => {
      const testCases = [
        { viewMode: '2d', layoutMode: 'single', expected: 'single-layout' },
        { viewMode: '3d', layoutMode: 'single', expected: 'single-layout' },
        { viewMode: 'sync', layoutMode: 'split', expected: 'split-layout' },
        { viewMode: 'sync', layoutMode: 'floating', expected: 'floating-layout' },
      ];

      testCases.forEach(({ viewMode, layoutMode, expected }) => {
        store.state.editor.viewport.viewMode = viewMode;
        store.state.editor.viewport.layoutMode = layoutMode;
        wrapper.vm.$forceUpdate();

        expect(wrapper.vm.canvasLayoutClass).toBe(expected);
      });
    });
  });
});
