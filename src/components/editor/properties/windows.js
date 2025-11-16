/**
 * Window Property Schema
 * Defines the structure and validation rules for window entity properties
 */

export const windowSchema = {
  type: 'window',
  title: '窗户属性',
  fields: [
    {
      key: 'name',
      label: '名称',
      type: 'text',
      placeholder: '输入窗户名称',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 50,
      },
    },
    {
      key: 'windowType',
      label: '窗户类型',
      type: 'select',
      options: [
        { label: '固定窗', value: 'fixed' },
        { label: '平开窗', value: 'casement' },
        { label: '推拉窗', value: 'sliding' },
        { label: '悬窗', value: 'awning' },
      ],
      validation: {
        required: true,
      },
    },
    {
      key: 'frameMaterial',
      label: '窗框材料',
      type: 'select',
      options: [
        { label: '铝合金', value: 'aluminum' },
        { label: '塑钢', value: 'upvc' },
        { label: '木框', value: 'wood' },
        { label: '钢框', value: 'steel' },
      ],
      validation: {
        required: true,
      },
    },
    {
      key: 'glassType',
      label: '玻璃类型',
      type: 'select',
      options: [
        { label: '普通玻璃', value: 'regular' },
        { label: '钢化玻璃', value: 'tempered' },
        { label: '双层玻璃', value: 'double' },
        { label: 'Low-E玻璃', value: 'lowe' },
      ],
      validation: {
        required: true,
      },
    },
    {
      key: 'width',
      label: '宽度',
      type: 'number',
      unit: 'm',
      min: 0.5,
      max: 5,
      step: 0.1,
      validation: {
        required: true,
        min: 0.5,
        max: 5,
      },
    },
    {
      key: 'height',
      label: '高度',
      type: 'number',
      unit: 'm',
      min: 0.5,
      max: 3,
      step: 0.1,
      validation: {
        required: true,
        min: 0.5,
        max: 3,
      },
    },
    {
      key: 'sillHeight',
      label: '窗台高度',
      type: 'number',
      unit: 'm',
      min: 0,
      max: 2,
      step: 0.1,
      validation: {
        required: true,
        min: 0,
        max: 2,
      },
    },
  ],
};
