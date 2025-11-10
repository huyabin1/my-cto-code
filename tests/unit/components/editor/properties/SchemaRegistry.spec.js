/**
 * Schema Registry Tests
 */

import { getSchema, getSchemaTypes, registerSchema, hasSchema } from '@/components/editor/properties';

describe('Schema Registry', () => {
  describe('getSchema', () => {
    it('should return wall schema for wall type', () => {
      const schema = getSchema('wall');
      expect(schema).toBeDefined();
      expect(schema.type).toBe('wall');
      expect(schema.title).toBe('墙体属性');
      expect(schema.fields).toBeInstanceOf(Array);
      expect(schema.fields.length).toBeGreaterThan(0);
    });

    it('should return door schema for door type', () => {
      const schema = getSchema('door');
      expect(schema).toBeDefined();
      expect(schema.type).toBe('door');
      expect(schema.title).toBe('门属性');
      expect(schema.fields).toBeInstanceOf(Array);
    });

    it('should return window schema for window type', () => {
      const schema = getSchema('window');
      expect(schema).toBeDefined();
      expect(schema.type).toBe('window');
      expect(schema.title).toBe('窗户属性');
      expect(schema.fields).toBeInstanceOf(Array);
    });

    it('should return measurement schema for measurement type', () => {
      const schema = getSchema('measurement');
      expect(schema).toBeDefined();
      expect(schema.type).toBe('measurement');
      expect(schema.title).toBe('测量属性');
      expect(schema.fields).toBeInstanceOf(Array);
    });

    it('should return null for unknown type', () => {
      const schema = getSchema('unknown');
      expect(schema).toBeNull();
    });
  });

  describe('getSchemaTypes', () => {
    it('should return all registered schema types', () => {
      const types = getSchemaTypes();
      expect(types).toContain('wall');
      expect(types).toContain('door');
      expect(types).toContain('window');
      expect(types).toContain('measurement');
      expect(types.length).toBe(4);
    });
  });

  describe('hasSchema', () => {
    it('should return true for known types', () => {
      expect(hasSchema('wall')).toBe(true);
      expect(hasSchema('door')).toBe(true);
      expect(hasSchema('window')).toBe(true);
      expect(hasSchema('measurement')).toBe(true);
    });

    it('should return false for unknown types', () => {
      expect(hasSchema('unknown')).toBe(false);
      expect(hasSchema('')).toBe(false);
      expect(hasSchema(null)).toBe(false);
      expect(hasSchema(undefined)).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should register a new schema', () => {
      const customSchema = {
        type: 'custom',
        title: '自定义属性',
        fields: [
          {
            key: 'name',
            label: '名称',
            type: 'text',
            validation: { required: true },
          },
        ],
      };

      registerSchema('custom', customSchema);
      
      expect(hasSchema('custom')).toBe(true);
      const schema = getSchema('custom');
      expect(schema).toBe(customSchema);
    });

    it('should throw error when registering without type', () => {
      expect(() => {
        registerSchema(null, { type: 'test' });
      }).toThrow('Type and schema are required');
    });

    it('should throw error when registering without schema', () => {
      expect(() => {
        registerSchema('test', null);
      }).toThrow('Type and schema are required');
    });

    it('should override existing schema', () => {
      const originalSchema = getSchema('wall');
      const newSchema = {
        type: 'wall',
        title: '新的墙体属性',
        fields: [],
      };

      registerSchema('wall', newSchema);
      
      const currentSchema = getSchema('wall');
      expect(currentSchema).toBe(newSchema);
      expect(currentSchema.title).toBe('新的墙体属性');

      // Restore original schema for other tests
      registerSchema('wall', originalSchema);
    });
  });
});