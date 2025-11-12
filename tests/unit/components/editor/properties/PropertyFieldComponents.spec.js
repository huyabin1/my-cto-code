/**
 * Property Field Components Tests
 */

import { shallowMount, createLocalVue } from '@vue/test-utils';
import ElementUI from 'element-ui';
import {
  PropertyFieldText,
  PropertyFieldSelect,
  PropertyFieldNumber,
  PropertyFieldColor,
  PropertyFieldCheckbox,
} from '@/components/editor/properties/fields';

const localVue = createLocalVue();
localVue.use(ElementUI);

describe('PropertyFieldText', () => {
  const field = {
    key: 'name',
    label: '名称',
    type: 'text',
    placeholder: '输入名称',
    validation: {
      required: true,
      minLength: 1,
      maxLength: 50,
    },
  };

  it('should render correctly', () => {
    const wrapper = shallowMount(PropertyFieldText, {
      localVue,
      propsData: { field, value: '测试名称' },
    });

    expect(wrapper.find('.field-label').text()).toBe('名称');
    expect(wrapper.find('el-input-stub').exists()).toBe(true);
  });

  it('should emit input event on value change', () => {
    const wrapper = shallowMount(PropertyFieldText, {
      localVue,
      propsData: { field, value: '' },
    });

    wrapper.find('el-input-stub').vm.$emit('input', '新值');
    expect(wrapper.emitted().input).toBeTruthy();
    expect(wrapper.emitted().input[0]).toEqual(['新值']);
  });

  it('should validate required field', () => {
    const wrapper = shallowMount(PropertyFieldText, {
      localVue,
      propsData: { field, value: '' },
    });

    wrapper.vm.handleInput('');
    expect(wrapper.vm.errorMessage).toBe('名称是必填项');
    expect(wrapper.vm.validate()).toBe(false);
  });

  it('should validate minimum length', () => {
    const wrapper = shallowMount(PropertyFieldText, {
      localVue,
      propsData: { field, value: 'a' },
    });

    wrapper.vm.handleInput('');
    expect(wrapper.vm.errorMessage).toBe('名称最少需要1个字符');
  });

  it('should validate maximum length', () => {
    const wrapper = shallowMount(PropertyFieldText, {
      localVue,
      propsData: { field, value: 'a'.repeat(51) },
    });

    wrapper.vm.handleInput('a'.repeat(51));
    expect(wrapper.vm.errorMessage).toBe('名称不能超过50个字符');
  });
});

describe('PropertyFieldSelect', () => {
  const field = {
    key: 'material',
    label: '材料',
    type: 'select',
    options: [
      { label: '混凝土', value: 'concrete' },
      { label: '砖', value: 'brick' },
    ],
    validation: { required: true },
  };

  it('should render correctly', () => {
    const wrapper = shallowMount(PropertyFieldSelect, {
      localVue,
      propsData: { field, value: 'concrete' },
    });

    expect(wrapper.find('.field-label').text()).toBe('材料');
    expect(wrapper.find('el-select-stub').exists()).toBe(true);
    expect(wrapper.findAll('el-option-stub').length).toBe(2);
  });

  it('should emit change event on value change', () => {
    const wrapper = shallowMount(PropertyFieldSelect, {
      localVue,
      propsData: { field, value: 'concrete' },
    });

    wrapper.find('el-select-stub').vm.$emit('change', 'brick');
    expect(wrapper.emitted().change).toBeTruthy();
    expect(wrapper.emitted().change[0]).toEqual(['brick']);
  });

  it('should validate required field', () => {
    const wrapper = shallowMount(PropertyFieldSelect, {
      localVue,
      propsData: { field, value: '' },
    });

    wrapper.vm.handleChange('');
    expect(wrapper.vm.errorMessage).toBe('材料是必填项');
  });
});

describe('PropertyFieldNumber', () => {
  const field = {
    key: 'height',
    label: '高度',
    type: 'number',
    unit: 'm',
    min: 0.1,
    max: 10,
    step: 0.1,
    validation: { required: true, min: 0.1, max: 10 },
  };

  it('should render correctly', () => {
    const wrapper = shallowMount(PropertyFieldNumber, {
      localVue,
      propsData: { field, value: 2.8 },
    });

    expect(wrapper.find('.field-label').text()).toBe('高度');
    expect(wrapper.find('el-input-number-stub').exists()).toBe(true);
    expect(wrapper.find('.field-unit').text()).toBe('m');
  });

  it('should emit change event on value change', () => {
    const wrapper = shallowMount(PropertyFieldNumber, {
      localVue,
      propsData: { field, value: 2.8 },
    });

    wrapper.find('el-input-number-stub').vm.$emit('change', 3.0);
    expect(wrapper.emitted().change).toBeTruthy();
    expect(wrapper.emitted().change[0]).toEqual([3.0]);
  });

  it('should validate minimum value', () => {
    const wrapper = shallowMount(PropertyFieldNumber, {
      localVue,
      propsData: { field, value: 0.05 },
    });

    wrapper.vm.handleChange(0.05);
    expect(wrapper.vm.errorMessage).toBe('高度不能小于0.1');
  });

  it('should validate maximum value', () => {
    const wrapper = shallowMount(PropertyFieldNumber, {
      localVue,
      propsData: { field, value: 11 },
    });

    wrapper.vm.handleChange(11);
    expect(wrapper.vm.errorMessage).toBe('高度不能大于10');
  });
});

describe('PropertyFieldColor', () => {
  const field = {
    key: 'color',
    label: '颜色',
    type: 'color',
    validation: {
      required: true,
      pattern: /^#[0-9A-Fa-f]{6}$/,
    },
  };

  it('should render correctly', () => {
    const wrapper = shallowMount(PropertyFieldColor, {
      localVue,
      propsData: { field, value: '#ffffff' },
    });

    expect(wrapper.find('.field-label').text()).toBe('颜色');
    expect(wrapper.find('el-color-picker-stub').exists()).toBe(true);
  });

  it('should emit change event on value change', () => {
    const wrapper = shallowMount(PropertyFieldColor, {
      localVue,
      propsData: { field, value: '#ffffff' },
    });

    wrapper.find('el-color-picker-stub').vm.$emit('change', '#ff0000');
    expect(wrapper.emitted().change).toBeTruthy();
    expect(wrapper.emitted().change[0]).toEqual(['#ff0000']);
  });

  it('should validate hex color pattern', () => {
    const wrapper = shallowMount(PropertyFieldColor, {
      localVue,
      propsData: { field, value: 'invalid' },
    });

    wrapper.vm.handleChange('invalid');
    expect(wrapper.vm.errorMessage).toBe('颜色必须是有效的颜色格式');
  });
});

describe('PropertyFieldCheckbox', () => {
  const field = {
    key: 'visible',
    label: '可见',
    type: 'checkbox',
    checkboxLabel: '显示元素',
  };

  it('should render correctly', () => {
    const wrapper = shallowMount(PropertyFieldCheckbox, {
      localVue,
      propsData: { field, value: true },
    });

    expect(wrapper.find('.field-label').text()).toBe('可见');
    expect(wrapper.find('el-checkbox-stub').exists()).toBe(true);
  });

  it('should emit change event on value change', () => {
    const wrapper = shallowMount(PropertyFieldCheckbox, {
      localVue,
      propsData: { field, value: false },
    });

    wrapper.find('el-checkbox-stub').vm.$emit('change', true);
    expect(wrapper.emitted().change).toBeTruthy();
    expect(wrapper.emitted().change[0]).toEqual([true]);
  });
});
