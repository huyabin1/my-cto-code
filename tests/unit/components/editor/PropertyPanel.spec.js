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
      entities: [],
    },
  };

  beforeEach(() => {
    store = new Vuex.Store({
      modules: {
        editor: {
          namespaced: true,
          state: mockState.editor,
          actions: {
            setActiveMaterial: jest.fn(),
            setActiveColor: jest.fn(),
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
      store.state.editor.activeSelection = null;
      
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

    it('should compute hasSelection correctly', () => {
      expect(wrapper.vm.hasSelection).toBe(true);

      store.state.editor.activeSelection = null;
      expect(wrapper.vm.hasSelection).toBe(false);

      store.state.editor.activeSelection = { id: 'wall-default' };
      expect(wrapper.vm.hasSelection).toBe(false);
    });

    it('should compute selectedEntities correctly', () => {
      expect(wrapper.vm.selectedEntities).toEqual([store.state.editor.activeSelection]);

      store.state.editor.activeSelection = null;
      expect(wrapper.vm.selectedEntities).toEqual([]);
    });

    it('should compute selectionInfo correctly', () => {
      expect(wrapper.vm.selectionInfo).toBe('墙体 A1 (墙体)');

      store.state.editor.activeSelection.name = '';
      expect(wrapper.vm.selectionInfo).toBe('未命名元素 (墙体)');

      store.state.editor.activeSelection.type = 'door';
      expect(wrapper.vm.selectionInfo).toBe('未命名元素 (门)');

      store.state.editor.activeSelection = null;
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
      
      expect(propertyRenderer.props('entity')).toEqual(store.state.editor.activeSelection);
      expect(propertyRenderer.props('selectedEntities')).toEqual([store.state.editor.activeSelection]);
    });

    it('should handle event emissions from PropertyRenderer', () => {
      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      const propertyRenderer = wrapper.findComponent({ name: 'PropertyRenderer' });
      
      const changeEvent = {
        field: 'material',
        value: 'brick',
        entity: store.state.editor.activeSelection,
        entities: [store.state.editor.activeSelection],
      };

      propertyRenderer.vm.$emit('field-change', changeEvent);
      expect(wrapper.emitted('field-change')).toBeFalsy(); // PropertyPanel handles it internally

      const blurEvent = {
        field: 'material',
        value: 'brick',
        entity: store.state.editor.activeSelection,
        entities: [store.state.editor.activeSelection],
      };

      propertyRenderer.vm.$emit('field-blur', blurEvent);
      expect(wrapper.emitted('field-blur')).toBeFalsy(); // PropertyPanel handles it internally
    });
  });

  describe('Edge Cases', () => {
    it('should handle entity without name', () => {
      store.state.editor.activeSelection = {
        id: 'wall-1',
        type: 'wall',
        material: 'concrete',
        color: '#ffffff',
      };

      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.vm.selectionInfo).toBe('未命名元素 (墙体)');
    });

    it('should handle entity without type', () => {
      store.state.editor.activeSelection = {
        id: 'entity-1',
        name: '测试元素',
        material: 'concrete',
        color: '#ffffff',
      };

      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.vm.selectionInfo).toBe('测试元素 (undefined)');
    });

    it('should handle empty entities array', () => {
      store.state.editor.entities = [];
      store.state.editor.activeSelection = null;

      wrapper = shallowMount(PropertyPanel, {
        localVue,
        store,
      });

      expect(wrapper.vm.hasSelection).toBe(false);
      expect(wrapper.vm.selectedEntities).toEqual([]);
      expect(wrapper.find('.no-selection').exists()).toBe(true);
    });
  });
});