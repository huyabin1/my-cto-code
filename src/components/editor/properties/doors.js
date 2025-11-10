/**
 * Door Property Schema
 * Defines the structure and validation rules for door entity properties
 */

export const doorSchema = {
  type: 'door',
  title: '门属性',
  fields: [
    {
      key: 'name',
      label: '名称',
      type: 'text',
      placeholder: '输入门的名称',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 50,
      },
    },
    {
      key: 'doorType',
      label: '门的类型',
      type: 'select',
      options: [
        { label: '单开门', value: 'single' },
        { label: '双开门', value: 'double' },
        { label: '推拉门', value: 'sliding' },
        { label: '折叠门', value: 'folding' },
      ],
      validation: {
        required: true,
      },
    },
    {
      key: 'material',
      label: '材料',
      type: 'select',
      options: [
        { label: '实木', value: 'solid_wood' },
        { label: '复合木', value: 'composite_wood' },
        { label: '金属', value: 'metal' },
        { label: '玻璃', value: 'glass' },
      ],
      validation: {
        required: true,
      },
    },
    {
      key: 'color',
      label: '颜色',
      type: 'color',
      validation: {
        required: true,
        pattern: /^#[0-9A-Fa-f]{6}$/,
      },
    },
    {
      key: 'width',
      label: '宽度',
      type: 'number',
      unit: 'm',
      min: 0.6,
      max: 3,
      step: 0.1,
      validation: {
        required: true,
        min: 0.6,
        max: 3,
      },
    },
    {
      key: 'height',
      label: '高度',
      type: 'number',
      unit: 'm',
      min: 1.8,
      max: 3,
      step: 0.1,
      validation: {
        required: true,
        min: 1.8,
        max: 3,
      },
    },
    {
      key: 'openingDirection',
      label: '开启方向',
      type: 'select',
      options: [
        { label: '左开', value: 'left' },
        { label: '右开', value: 'right' },
        { label: '双向', value: 'both' },
      ],
      validation: {
        required: true,
      },
    },
  ],
};