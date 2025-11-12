/**
 * Wall Property Schema
 * Defines the structure and validation rules for wall entity properties
 */

export const wallSchema = {
  type: 'wall',
  title: '墙体属性',
  fields: [
    {
      key: 'name',
      label: '名称',
      type: 'text',
      placeholder: '输入墙体名称',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 50,
      },
    },
    {
      key: 'material',
      label: '材料',
      type: 'select',
      options: [
        { label: '混凝土', value: 'concrete' },
        { label: '砖', value: 'brick' },
        { label: '石膏板', value: 'drywall' },
        { label: '木饰面', value: 'wood' },
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
      key: 'height',
      label: '高度',
      type: 'number',
      unit: 'm',
      min: 0.1,
      max: 10,
      step: 0.1,
      validation: {
        required: true,
        min: 0.1,
        max: 10,
      },
    },
    {
      key: 'thickness',
      label: '厚度',
      type: 'number',
      unit: 'm',
      min: 0.05,
      max: 1,
      step: 0.01,
      validation: {
        required: true,
        min: 0.05,
        max: 1,
      },
    },
  ],
};
