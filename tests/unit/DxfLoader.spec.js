import fs from 'fs';
import path from 'path';
import DxfLoader from '@/three/loader/DxfLoader';

describe('DxfLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new DxfLoader();
  });

  afterEach(() => {
    if (loader) {
      loader.dispose();
    }
  });

  describe('parseSync', () => {
    it('should parse a simple DXF file', () => {
      const dxfPath = path.join(__dirname, 'fixtures', 'simple.dxf');
      const content = fs.readFileSync(dxfPath, 'utf-8');

      const result = DxfLoader.parseSync(content);

      expect(result).toBeDefined();
      expect(result.entities).toBeInstanceOf(Array);
      expect(result.layers).toBeInstanceOf(Array);
      expect(result.extent).toBeDefined();
    });

    it('should normalize LINE entities', () => {
      const dxfPath = path.join(__dirname, 'fixtures', 'simple.dxf');
      const content = fs.readFileSync(dxfPath, 'utf-8');

      const result = DxfLoader.parseSync(content);
      const lineEntities = result.entities.filter((e) => e.type === 'LINE');

      expect(lineEntities.length).toBeGreaterThan(0);
      lineEntities.forEach((entity) => {
        expect(entity.points).toBeInstanceOf(Array);
        expect(entity.points.length).toBeGreaterThanOrEqual(2);
        expect(entity.layer).toBeDefined();
        expect(entity.color).toBeDefined();
      });
    });

    it('should normalize LWPOLYLINE entities', () => {
      const dxfPath = path.join(__dirname, 'fixtures', 'simple.dxf');
      const content = fs.readFileSync(dxfPath, 'utf-8');

      const result = DxfLoader.parseSync(content);
      const polylineEntities = result.entities.filter((e) => e.type === 'LWPOLYLINE');

      expect(polylineEntities.length).toBeGreaterThan(0);
      polylineEntities.forEach((entity) => {
        expect(entity.points).toBeInstanceOf(Array);
        expect(entity.points.length).toBeGreaterThan(0);
        expect(entity.layer).toBeDefined();
        expect(entity.color).toBeDefined();
      });
    });

    it('should approximate ARC entities into polylines', () => {
      const dxfPath = path.join(__dirname, 'fixtures', 'simple.dxf');
      const content = fs.readFileSync(dxfPath, 'utf-8');

      const result = DxfLoader.parseSync(content);
      const arcEntities = result.entities.filter((e) => e.type === 'ARC');

      expect(arcEntities.length).toBeGreaterThan(0);
      arcEntities.forEach((entity) => {
        expect(entity.points).toBeInstanceOf(Array);
        expect(entity.points.length).toBeGreaterThan(8);
      });
    });

    it('should extract layer information', () => {
      const dxfPath = path.join(__dirname, 'fixtures', 'simple.dxf');
      const content = fs.readFileSync(dxfPath, 'utf-8');

      const result = DxfLoader.parseSync(content);

      expect(result.layers.length).toBeGreaterThan(0);
      result.layers.forEach((layer) => {
        expect(layer.name).toBeDefined();
        expect(layer.visible).toBe(true);
        expect(layer.entities).toBeInstanceOf(Array);
      });
    });

    it('should extract color indices', () => {
      const dxfPath = path.join(__dirname, 'fixtures', 'simple.dxf');
      const content = fs.readFileSync(dxfPath, 'utf-8');

      const result = DxfLoader.parseSync(content);

      result.entities.forEach((entity) => {
        expect(typeof entity.color).toBe('number');
        expect(entity.color).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate extent correctly', () => {
      const dxfPath = path.join(__dirname, 'fixtures', 'simple.dxf');
      const content = fs.readFileSync(dxfPath, 'utf-8');

      const result = DxfLoader.parseSync(content);

      expect(result.extent).toBeDefined();
      expect(result.extent.minX).toBeDefined();
      expect(result.extent.maxX).toBeDefined();
      expect(result.extent.minY).toBeDefined();
      expect(result.extent.maxY).toBeDefined();
      expect(result.extent.maxX).toBeGreaterThanOrEqual(result.extent.minX);
      expect(result.extent.maxY).toBeGreaterThanOrEqual(result.extent.minY);
    });

    it('should throw error for invalid DXF content', () => {
      const invalidContent = 'not a valid dxf file';

      expect(() => {
        DxfLoader.parseSync(invalidContent);
      }).toThrow();
    });

    it('should count total entities correctly', () => {
      const dxfPath = path.join(__dirname, 'fixtures', 'simple.dxf');
      const content = fs.readFileSync(dxfPath, 'utf-8');

      const result = DxfLoader.parseSync(content);

      expect(result.totalEntities).toBe(result.entities.length);
      expect(result.totalEntities).toBeGreaterThan(0);
    });
  });

  describe('parseAsync', () => {
    it('should parse DXF file asynchronously', async () => {
      const dxfPath = path.join(__dirname, 'fixtures', 'simple.dxf');
      const content = fs.readFileSync(dxfPath, 'utf-8');

      const result = await loader.parseAsync(content);

      expect(result).toBeDefined();
      expect(result.entities).toBeInstanceOf(Array);
      expect(result.layers).toBeInstanceOf(Array);
      expect(result.extent).toBeDefined();
    });

    it('should handle errors in async parsing', async () => {
      const invalidContent = 'not a valid dxf file';

      await expect(loader.parseAsync(invalidContent)).rejects.toThrow();
    });
  });

  describe('load', () => {
    it('should load DXF from File object', async () => {
      const dxfPath = path.join(__dirname, 'fixtures', 'simple.dxf');
      const content = fs.readFileSync(dxfPath, 'utf-8');
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], 'test.dxf', { type: 'text/plain' });

      const result = await loader.load(file);

      expect(result).toBeDefined();
      expect(result.entities).toBeInstanceOf(Array);
      expect(result.layers).toBeInstanceOf(Array);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      loader.dispose();
      expect(loader.worker).toBeNull();
    });
  });
});
