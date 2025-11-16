/**
 * PropertyRenderer Component Tests
 */

import { shallowMount, createLocalVue } from '@vue/test-utils';
import ElementUI from 'element-ui';
import Vuex from 'vuex';
import PropertyRenderer from '@/components/editor/properties/PropertyRenderer.vue';
import { getSchema } from '@/components/editor/properties';

const localVue = createLocalVue();
localVue.use(ElementUI);
localVue.use(Vuex);

// Mock the store
const mockStore = new Vuex.Store({
  modules: {
    editor: {
      namespaced: true,
      state: {
        commandStack: {
          execute: jest.fn().mockResolvedValue(undefined),
        },
      },
      actions: {
        updateProperties: jest.fn().mockResolvedValue(undefined),
      },
    },
  },
});

describe('PropertyRenderer', () => {
  let wrapper;

  const wallEntity = {
    id: 'wall-1',
    type: 'wall',
    name: '墙体 A1',
    material: 'concrete',
    color: '#ffffff',
    height: 2.8,
    thickness: 0.2,
  };

  const doorEntity = {
    id: 'door-1',
    type: 'door',
    name: '门 D1',
    doorType: 'single',
    material: 'wood',
    color: '#8b4513',
    width: 0.9,
    height: 2.1,
  };

  const unknownEntity = {
    id: 'unknown-1',
    type: 'unknown',
    name: '未知元素',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
  });

  describe('No Schema Display', () => {
    it('should show no schema message for unknown entity type', () => {
      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: mockStore,
        propsData: {
          entity: unknownEntity,
          selectedEntities: [unknownEntity],
        },
      });

      expect(wrapper.find('.no-schema').exists()).toBe(true);
      expect(wrapper.find('.no-schema-icon').exists()).toBe(true);
      expect(wrapper.find('.no-schema-text').exists()).toBe(true);
      expect(wrapper.find('.schema-properties').exists()).toBe(false);
    });

    it('should display entity type in no schema message', () => {
      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: mockStore,
        propsData: {
          entity: unknownEntity,
          selectedEntities: [unknownEntity],
        },
      });

      const noSchemaText = wrapper.find('.no-schema-text');
      expect(noSchemaText.text()).toContain('当前选中元素类型暂不支持属性编辑');
      expect(noSchemaText.text()).toContain('类型: unknown');
    });
  });

  describe('Schema-based Rendering', () => {
    it('should render wall properties correctly', () => {
      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: mockStore,
        propsData: {
          entity: wallEntity,
          selectedEntities: [wallEntity],
        },
      });

      expect(wrapper.find('.schema-properties').exists()).toBe(true);
      expect(wrapper.find('.schema-title').text()).toBe('墙体属性');
      expect(wrapper.find('.multi-select-info').exists()).toBe(false);
    });

    it('should render door properties correctly', () => {
      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: mockStore,
        propsData: {
          entity: doorEntity,
          selectedEntities: [doorEntity],
        },
      });

      expect(wrapper.find('.schema-properties').exists()).toBe(true);
      expect(wrapper.find('.schema-title').text()).toBe('门属性');
    });

    it('should render correct number of fields', () => {
      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: mockStore,
        propsData: {
          entity: wallEntity,
          selectedEntities: [wallEntity],
        },
      });

      const wallSchema = getSchema('wall');
      const fieldWrappers = wrapper.findAll('.property-field-wrapper');
      expect(fieldWrappers.length).toBe(wallSchema.fields.length);
    });
  });

  describe('Multi-select Mode', () => {
    it('should show multi-select info when multiple entities selected', () => {
      const wall2 = { ...wallEntity, id: 'wall-2', name: '墙体 A2' };

      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: mockStore,
        propsData: {
          entity: wallEntity,
          selectedEntities: [wallEntity, wall2],
        },
      });

      expect(wrapper.find('.multi-select-info').exists()).toBe(true);
      expect(wrapper.find('.multi-select-info').text()).toContain('已选中 2 个墙体');
    });

    it('should aggregate values for multi-select', () => {
      const wall2 = { ...wallEntity, id: 'wall-2', material: 'brick' };

      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: mockStore,
        propsData: {
          entity: wallEntity,
          selectedEntities: [wallEntity, wall2],
        },
      });

      // For material field, values are different, so should return null
      const materialField = getSchema('wall').fields.find((f) => f.key === 'material');
      const materialValue = wrapper.vm.getFieldValue(materialField);
      expect(materialValue).toBeNull();

      // For color field, values are same, so should return the value
      const colorField = getSchema('wall').fields.find((f) => f.key === 'color');
      const colorValue = wrapper.vm.getFieldValue(colorField);
      expect(colorValue).toBe('#ffffff');
    });

    it('should disable fields with different values in multi-select', () => {
      const wall2 = { ...wallEntity, id: 'wall-2', material: 'brick' };

      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: mockStore,
        propsData: {
          entity: wallEntity,
          selectedEntities: [wallEntity, wall2],
        },
      });

      // Material field should be disabled (different values)
      const materialField = getSchema('wall').fields.find((f) => f.key === 'material');
      expect(wrapper.vm.canEditField(materialField)).toBe(false);

      // Color field should be enabled (same values)
      const colorField = getSchema('wall').fields.find((f) => f.key === 'color');
      expect(wrapper.vm.canEditField(colorField)).toBe(true);
    });
  });

  describe('Field Value Handling', () => {
    beforeEach(() => {
      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: mockStore,
        propsData: {
          entity: wallEntity,
          selectedEntities: [wallEntity],
        },
      });
    });

    it('should get field value correctly', () => {
      const materialField = getSchema('wall').fields.find((f) => f.key === 'material');
      const value = wrapper.vm.getFieldValue(materialField);
      expect(value).toBe('concrete');
    });

    it('should get default value when field not present', () => {
      const fieldWithDefault = {
        key: 'newField',
        label: '新字段',
        type: 'text',
        default: '默认值',
      };

      const value = wrapper.vm.getFieldValue(fieldWithDefault);
      expect(value).toBe('默认值');
    });
  });

  describe('Property Updates', () => {
    beforeEach(() => {
      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: mockStore,
        propsData: {
          entity: wallEntity,
          selectedEntities: [wallEntity],
        },
      });
    });

    it('should handle field input for single entity', async () => {
      const materialField = getSchema('wall').fields.find((f) => f.key === 'material');

      await wrapper.vm.handleFieldInput(materialField, 'brick');

      expect(mockStore.dispatch).toHaveBeenCalledWith('editor/updateProperties', {
        entityId: 'wall-1',
        property: 'material',
        newValue: 'brick',
        oldValue: 'concrete',
      });
    });

    it('should handle field input for multiple entities', async () => {
      const wall2 = { ...wallEntity, id: 'wall-2' };
      wrapper.setProps({ selectedEntities: [wallEntity, wall2] });

      const materialField = getSchema('wall').fields.find((f) => f.key === 'material');

      await wrapper.vm.handleFieldInput(materialField, 'brick');

      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
      expect(mockStore.dispatch).toHaveBeenNthCalledWith(1, 'editor/updateProperties', {
        entityId: 'wall-1',
        property: 'material',
        newValue: 'brick',
        oldValue: 'concrete',
      });
      expect(mockStore.dispatch).toHaveBeenNthCalledWith(2, 'editor/updateProperties', {
        entityId: 'wall-2',
        property: 'material',
        newValue: 'brick',
        oldValue: 'concrete',
      });
    });

    it('should emit field-change event', () => {
      const materialField = getSchema('wall').fields.find((f) => f.key === 'material');

      wrapper.vm.handleFieldChange(materialField, 'brick');

      expect(wrapper.emitted('field-change')).toBeTruthy();
      expect(wrapper.emitted('field-change')[0]).toEqual([
        {
          field: 'material',
          value: 'brick',
          entity: wallEntity,
          entities: [wallEntity],
        },
      ]);
    });

    it('should emit field-blur event', () => {
      const materialField = getSchema('wall').fields.find((f) => f.key === 'material');

      wrapper.vm.handleFieldBlur(materialField, 'brick');

      expect(wrapper.emitted('field-blur')).toBeTruthy();
      expect(wrapper.emitted('field-blur')[0]).toEqual([
        {
          field: 'material',
          value: 'brick',
          entity: wallEntity,
          entities: [wallEntity],
        },
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle update errors gracefully', async () => {
      const errorStore = new Vuex.Store({
        modules: {
          editor: {
            namespaced: true,
            state: {
              commandStack: {
                execute: jest.fn().mockRejectedValue(new Error('Update failed')),
              },
            },
            actions: {
              updateProperties: jest.fn().mockRejectedValue(new Error('Update failed')),
            },
          },
        },
      });

      wrapper = shallowMount(PropertyRenderer, {
        localVue,
        store: errorStore,
        propsData: {
          entity: wallEntity,
          selectedEntities: [wallEntity],
        },
        mocks: {
          $message: {
            error: jest.fn(),
          },
        },
      });

      const materialField = getSchema('wall').fields.find((f) => f.key === 'material');

      try {
        await wrapper.vm.updateEntityProperty('wall-1', 'material', 'brick');
      } catch (error) {
        expect(error.message).toBe('Update failed');
      }
    });
  });
});
