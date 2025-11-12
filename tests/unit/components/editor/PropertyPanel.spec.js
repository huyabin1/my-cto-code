/**
 * PropertyPanel Component Tests
 */

import { shallowMount, createLocalVue } from '@vue/test-utils';
import ElementUI from 'element-ui';
import Vuex from 'vuex';
import PropertyPanel from '@/components/editor/PropertyPanel.vue';

const localVue = createLocalVue();
localVue.use(ElementUI);
localVue.use(Vuex);

// Mock the PropertyRenderer component
jest.mock('@/components/editor/properties/PropertyRenderer.vue', () => ({
  name: 'PropertyRenderer',
  props: ['entity', 'selectedEntities'],
  template: '<div class="mock-property-renderer"></div>',
}));

describe('PropertyPanel', () => {
  let wrapper;
  let store;

  const mockState = {
    editor: {
      activeSelection: {
        id: 'wall-1',
        type: 'wall',
        name: '墙体 A1',
        material: 'concrete',
        color: '#ffffff',
      },
      entities: [
        {
          id: 'wall-1',
          type: 'wall',
          name: '墙体 A1',
          material: 'concrete',
          color: '#ffffff',
        },
      ],
      selection: {
        ids: ['wall-1'],
        primaryId: 'wall-1',
        mode: 'single',
        hoveredId: null,
        marquee: { active: false, start: null, end: null },
        lastUpdated: 0,
      },
    },
  };

  beforeEach(() => {
    store = new Vuex.Store({
      modules: {
        editor: {
          namespaced: true,
          state: JSON.parse(JSON.stringify(mockState.editor)),
          actions: {
            setActiveMaterial: jest.fn(),
            setActiveColor: jest.fn(),
          },
          getters: {
            selectedEntities: (state) =>
              state.selection.ids
                .map((id) => state.entities.find((entity) => entity.id === id))
                .filter(Boolean),
            primarySelectedEntity: (state, getters) => getters.selectedEntities[0] || null,
            selectionMode: (state) => state.selection.mode,
          },
        },
      },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render correctly', () => {
      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.find('.property-panel').exists()).toBe(true);
      expect(wrapper.find('.property-header').exists()).toBe(true);
      expect(wrapper.find('h2').text()).toBe('属性面板');
    });

    it('should show selection info when entity is selected', () => {
      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.find('.property-subtitle').exists()).toBe(true);
      expect(wrapper.find('.property-subtitle').text()).toContain('墙体 A1');
      expect(wrapper.find('.property-subtitle').text()).toContain('(墙体)');
    });

    it('should show no selection message when no entity is selected', () => {
      store.state.editor.selection.ids = [];
      store.state.editor.selection.primaryId = null;
      store.state.editor.selection.mode = 'none';
      store.state.editor.entities = [];

      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.find('.property-subtitle').text()).toBe('未选中任何元素');
      expect(wrapper.find('.no-selection').exists()).toBe(true);
      expect(wrapper.find('.no-selection-icon').exists()).toBe(true);
      expect(wrapper.find('.no-selection-text').exists()).toBe(true);
    });

    it('should show no selection message for default selection', () => {
      store.state.editor.activeSelection = {
        id: 'wall-default',
        name: '墙体 A1',
        material: 'concrete',
        color: '#ffffff',
      };
      store.state.editor.selection.ids = [];
      store.state.editor.selection.primaryId = null;
      store.state.editor.selection.mode = 'none';

      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.find('.no-selection').exists()).toBe(true);
    });

    it('should render PropertyRenderer when entity is selected', () => {
      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.find('.mock-property-renderer').exists()).toBe(true);
    });
  });

  describe('Computed Properties', () => {
    beforeEach(() => {
      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });
    });

    it('should compute hasSelection correctly', async () => {
      expect(wrapper.vm.hasSelection).toBe(true);

      store.state.editor.selection.ids = [];
      store.state.editor.selection.primaryId = null;
      store.state.editor.selection.mode = 'none';
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.hasSelection).toBe(false);

      store.state.editor.selection.ids = ['wall-1'];
      store.state.editor.selection.primaryId = 'wall-1';
      store.state.editor.selection.mode = 'single';
      store.state.editor.entities = [
        {
          id: 'wall-1',
          type: 'wall',
          name: '墙体 A1',
          material: 'concrete',
          color: '#ffffff',
        },
      ];
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.hasSelection).toBe(true);
    });

    it('should compute selectedEntities correctly', async () => {
      expect(wrapper.vm.selectedEntitiesList).toEqual([store.state.editor.entities[0]]);

      store.state.editor.selection.ids = [];
      store.state.editor.selection.primaryId = null;
      store.state.editor.selection.mode = 'none';
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.selectedEntitiesList).toEqual([]);
    });

    it('should compute selectionInfo correctly', async () => {
      expect(wrapper.vm.selectionInfo).toBe('墙体 A1 (墙体)');

      store.state.editor.entities[0].name = '';
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.selectionInfo).toBe('未命名元素 (墙体)');

      store.state.editor.entities[0].type = 'door';
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.selectionInfo).toBe('未命名元素 (门)');

      store.state.editor.selection.ids = [];
      store.state.editor.selection.primaryId = null;
      store.state.editor.selection.mode = 'none';
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.selectionInfo).toBe('');
    });
  });

  describe('Methods', () => {
    beforeEach(() => {
      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });
    });

    it('should get entity type labels correctly', () => {
      expect(wrapper.vm.getEntityTypeLabel('wall')).toBe('墙体');
      expect(wrapper.vm.getEntityTypeLabel('door')).toBe('门');
      expect(wrapper.vm.getEntityTypeLabel('window')).toBe('窗户');
      expect(wrapper.vm.getEntityTypeLabel('measurement')).toBe('测量');
      expect(wrapper.vm.getEntityTypeLabel('unknown')).toBe('unknown');
      expect(wrapper.vm.getEntityTypeLabel('')).toBe('');
      expect(wrapper.vm.getEntityTypeLabel(null)).toBe('null');
      expect(wrapper.vm.getEntityTypeLabel(undefined)).toBe('undefined');
    });

    it('should handle field change events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = {
        field: 'material',
        value: 'brick',
        entity: store.state.editor.activeSelection,
        entities: [store.state.editor.activeSelection],
      };

      wrapper.vm.handleFieldChange(event);

      expect(consoleSpy).toHaveBeenCalledWith('Property field changed:', event);

      consoleSpy.mockRestore();
    });

    it('should handle field blur events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const event = {
        field: 'material',
        value: 'brick',
        entity: store.state.editor.activeSelection,
        entities: [store.state.editor.activeSelection],
      };

      wrapper.vm.handleFieldBlur(event);

      expect(consoleSpy).toHaveBeenCalledWith('Property field blurred:', event);

      consoleSpy.mockRestore();
    });
  });

  describe('Props Passing', () => {
    it('should pass correct props to PropertyRenderer', () => {
      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      const propertyRenderer = wrapper.findComponent({ name: 'PropertyRenderer' });

      expect(propertyRenderer.props('entity')).toEqual(store.state.editor.entities[0]);
      expect(propertyRenderer.props('selectedEntities')).toEqual([store.state.editor.entities[0]]);
    });

    it('should handle event emissions from PropertyRenderer', () => {
      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      const propertyRenderer = wrapper.findComponent({ name: 'PropertyRenderer' });

      const selectedEntity = store.state.editor.entities[0];

      const changeEvent = {
        field: 'material',
        value: 'brick',
        entity: selectedEntity,
        entities: [selectedEntity],
      };

      propertyRenderer.vm.$emit('field-change', changeEvent);
      expect(wrapper.emitted('field-change')).toBeFalsy(); // PropertyPanel handles it internally

      const blurEvent = {
        field: 'material',
        value: 'brick',
        entity: selectedEntity,
        entities: [selectedEntity],
      };

      propertyRenderer.vm.$emit('field-blur', blurEvent);
      expect(wrapper.emitted('field-blur')).toBeFalsy(); // PropertyPanel handles it internally
    });
  });

  describe('Edge Cases', () => {
    it('should handle entity without name', () => {
      store.state.editor.entities = [
        {
          id: 'wall-1',
          type: 'wall',
          material: 'concrete',
          color: '#ffffff',
        },
      ];
      store.state.editor.selection.ids = ['wall-1'];
      store.state.editor.selection.primaryId = 'wall-1';
      store.state.editor.selection.mode = 'single';

      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.vm.selectionInfo).toBe('未命名元素 (墙体)');
    });

    it('should handle entity without type', () => {
      store.state.editor.entities = [
        {
          id: 'entity-1',
          name: '测试元素',
          material: 'concrete',
          color: '#ffffff',
        },
      ];
      store.state.editor.selection.ids = ['entity-1'];
      store.state.editor.selection.primaryId = 'entity-1';
      store.state.editor.selection.mode = 'single';

      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.vm.selectionInfo).toBe('测试元素 (undefined)');
    });

    it('should handle empty entities array', () => {
      store.state.editor.entities = [];
      store.state.editor.selection.ids = [];
      store.state.editor.selection.primaryId = null;
      store.state.editor.selection.mode = 'none';

      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.vm.hasSelection).toBe(false);
      expect(wrapper.vm.selectedEntitiesList).toEqual([]);
      expect(wrapper.find('.no-selection').exists()).toBe(true);
    });
  });
});
