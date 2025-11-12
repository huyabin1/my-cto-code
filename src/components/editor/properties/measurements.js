/**
 * Measurement Property Schema
 * Defines the structure and validation rules for measurement entity properties
 */

export const measurementSchema = {
  type: 'measurement',
  title: '测量属性',
  fields: [
    {
      key: 'name',
      label: '名称',
      type: 'text',
      placeholder: '输入测量名称',
      validation: {
        required: true,
        minLength: 1,
        maxLength: 50,
      },
    },
    {
      key: 'measurementType',
      label: '测量类型',
      type: 'select',
      options: [
        { label: '距离', value: 'distance' },
        { label: '面积', value: 'area' },
        { label: '角度', value: 'angle' },
        { label: '体积', value: 'volume' },
      ],
      validation: {
        required: true,
      },
    },
    {
      key: 'unit',
      label: '单位',
      type: 'select',
      options: [
        { label: '毫米', value: 'mm' },
        { label: '厘米', value: 'cm' },
        { label: '米', value: 'm' },
        { label: '英寸', value: 'inch' },
        { label: '英尺', value: 'foot' },
      ],
      validation: {
        required: true,
      },
    },
    {
      key: 'precision',
      label: '精度',
      type: 'number',
      min: 0,
      max: 6,
      step: 1,
      validation: {
        required: true,
        min: 0,
        max: 6,
      },
    },
    {
      key: 'showResult',
      label: '显示结果',
      type: 'checkbox',
      default: true,
    },
    {
      key: 'color',
      label: '标注颜色',
      type: 'color',
      validation: {
        required: true,
        pattern: /^#[0-9A-Fa-f]{6}$/,
      },
    },
  ],
};
