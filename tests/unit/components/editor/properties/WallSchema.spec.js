/**
 * Wall Schema Tests
 */

import { wallSchema } from '@/components/editor/properties/walls';

describe('Wall Schema', () => {
  describe('Schema Structure', () => {
    it('should have correct type and title', () => {
      expect(wallSchema.type).toBe('wall');
      expect(wallSchema.title).toBe('墙体属性');
    });

    it('should have fields array', () => {
      expect(wallSchema.fields).toBeInstanceOf(Array);
      expect(wallSchema.fields.length).toBeGreaterThan(0);
    });
  });

  describe('Field Definitions', () => {
    it('should have name field with correct properties', () => {
      const nameField = wallSchema.fields.find((f) => f.key === 'name');
      expect(nameField).toBeDefined();
      expect(nameField.label).toBe('名称');
      expect(nameField.type).toBe('text');
      expect(nameField.placeholder).toBe('输入墙体名称');
      expect(nameField.validation.required).toBe(true);
      expect(nameField.validation.minLength).toBe(1);
      expect(nameField.validation.maxLength).toBe(50);
    });

    it('should have material field with correct options', () => {
      const materialField = wallSchema.fields.find((f) => f.key === 'material');
      expect(materialField).toBeDefined();
      expect(materialField.label).toBe('材料');
      expect(materialField.type).toBe('select');
      expect(materialField.options).toBeInstanceOf(Array);
      expect(materialField.options.length).toBe(4);
      expect(materialField.options[0]).toEqual({ label: '混凝土', value: 'concrete' });
      expect(materialField.validation.required).toBe(true);
    });

    it('should have color field with correct validation', () => {
      const colorField = wallSchema.fields.find((f) => f.key === 'color');
      expect(colorField).toBeDefined();
      expect(colorField.label).toBe('颜色');
      expect(colorField.type).toBe('color');
      expect(colorField.validation.required).toBe(true);
      expect(colorField.validation.pattern.toString()).toBe('/^#[0-9A-Fa-f]{6}$/');
    });

    it('should have height field with number properties', () => {
      const heightField = wallSchema.fields.find((f) => f.key === 'height');
      expect(heightField).toBeDefined();
      expect(heightField.label).toBe('高度');
      expect(heightField.type).toBe('number');
      expect(heightField.unit).toBe('m');
      expect(heightField.min).toBe(0.1);
      expect(heightField.max).toBe(10);
      expect(heightField.step).toBe(0.1);
      expect(heightField.validation.required).toBe(true);
      expect(heightField.validation.min).toBe(0.1);
      expect(heightField.validation.max).toBe(10);
    });

    it('should have thickness field with correct constraints', () => {
      const thicknessField = wallSchema.fields.find((f) => f.key === 'thickness');
      expect(thicknessField).toBeDefined();
      expect(thicknessField.label).toBe('厚度');
      expect(thicknessField.type).toBe('number');
      expect(thicknessField.unit).toBe('m');
      expect(thicknessField.min).toBe(0.05);
      expect(thicknessField.max).toBe(1);
      expect(thicknessField.step).toBe(0.01);
      expect(thicknessField.validation.required).toBe(true);
      expect(thicknessField.validation.min).toBe(0.05);
      expect(thicknessField.validation.max).toBe(1);
    });
  });

  describe('Field Validation Rules', () => {
    describe('Name Field', () => {
      const field = wallSchema.fields.find((f) => f.key === 'name');

      it('should validate required field', () => {
        expect(field.validation.required).toBe(true);
      });

      it('should validate minimum length', () => {
        expect(field.validation.minLength).toBe(1);
      });

      it('should validate maximum length', () => {
        expect(field.validation.maxLength).toBe(50);
      });
    });

    describe('Material Field', () => {
      const field = wallSchema.fields.find((f) => f.key === 'material');

      it('should validate required field', () => {
        expect(field.validation.required).toBe(true);
      });

      it('should have valid options', () => {
        const validValues = ['concrete', 'brick', 'drywall', 'wood'];
        field.options.forEach((option) => {
          expect(validValues).toContain(option.value);
        });
      });
    });

    describe('Color Field', () => {
      const field = wallSchema.fields.find((f) => f.key === 'color');

      it('should validate required field', () => {
        expect(field.validation.required).toBe(true);
      });

      it('should validate hex color pattern', () => {
        const pattern = field.validation.pattern;
        expect(pattern.test('#ffffff')).toBe(true);
        expect(pattern.test('#000000')).toBe(true);
        expect(pattern.test('#ff0000')).toBe(true);
        expect(pattern.test('#00ff00')).toBe(true);
        expect(pattern.test('#0000ff')).toBe(true);
        expect(pattern.test('#FFFFFF')).toBe(true);
        expect(pattern.test('ffffff')).toBe(false);
        expect(pattern.test('#fff')).toBe(false);
        expect(pattern.test('#gggggg')).toBe(false);
        expect(pattern.test('')).toBe(false);
      });
    });

    describe('Height Field', () => {
      const field = wallSchema.fields.find((f) => f.key === 'height');

      it('should validate numeric constraints', () => {
        expect(field.validation.min).toBe(0.1);
        expect(field.validation.max).toBe(10);
      });
    });

    describe('Thickness Field', () => {
      const field = wallSchema.fields.find((f) => f.key === 'thickness');

      it('should validate numeric constraints', () => {
        expect(field.validation.min).toBe(0.05);
        expect(field.validation.max).toBe(1);
      });
    });
  });
});
