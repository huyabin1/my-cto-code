import fs from 'fs';
import DxfLoaderModule from '@/three/loader/DxfLoader';

// Load test fixture
const mockDxfContent = fs.readFileSync(`${__dirname}/fixtures/basic.dxf`, 'utf8');

// Mock Worker for testing
require('./__mocks__/workerMock');

describe('DxfLoader', () => {
  let loader;

  beforeEach(() => {
    loader = DxfLoaderModule;
  });

  describe('singleton instance', () => {
    it('should provide a DxfLoader instance with parser', () => {
      expect(loader).toBeDefined();
      expect(loader.parser).toBeDefined();
      expect(loader.unitConversions).toBeDefined();
    });
  });

  describe('unit conversions', () => {
    it('should have correct unit conversion factors', () => {
      expect(loader.unitConversions.Millimeters).toBe(0.001);
      expect(loader.unitConversions.Centimeters).toBe(0.01);
      expect(loader.unitConversions.Meters).toBe(1);
      expect(loader.unitConversions.Feet).toBe(0.3048);
      expect(loader.unitConversions.Inches).toBe(0.0254);
    });
  });

  describe('parseAsync', () => {
    it('should parse a simple DXF file successfully', async () => {
      const result = await loader.parseAsync(mockDxfContent, {
        targetUnit: 'auto',
      });

      expect(result).toBeDefined();
      expect(result.layers).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.threeObjects).toBeDefined();
      expect(result.conversionFactor).toBeDefined();
      expect(result.units).toBe('Millimeters'); // Should return unit name, not code
    });

    it('should debug DXF structure', async () => {
      // First, let's see what the parser actually returns
      const dxf = loader.parser.parseSync(mockDxfContent);
      console.log('Parsed DXF:', JSON.stringify(dxf, null, 2));

      if (dxf.entities) {
        dxf.entities.forEach((entity, index) => {
          console.log(`Entity ${index}:`, entity.type, entity.layer, Object.keys(entity));
        });
      }
    });

    it('should handle unit conversion correctly', async () => {
      const result = await loader.parseAsync(mockDxfContent, {
        targetUnit: 'm',
      });

      expect(result.conversionFactor).toBe(0.001); // Millimeters to meters conversion factor
    });

    it('should filter layers when visibleLayers is provided', async () => {
      const result = await loader.parseAsync(mockDxfContent, {
        targetUnit: 'auto',
        visibleLayers: ['WALLS'],
      });

      // Should only have entities from WALLS layer
      const wallEntities = result.entities.filter((e) => e.layer === 'WALLS');
      const doorEntities = result.entities.filter((e) => e.layer === 'DOORS');

      expect(wallEntities.length).toBeGreaterThan(0);
      expect(doorEntities.length).toBe(0);
    });

    it('should call progress callback', async () => {
      const progressCallback = jest.fn();

      await loader.parseAsync(mockDxfContent, {
        targetUnit: 'auto',
        onProgress: progressCallback,
      });

      expect(progressCallback).toHaveBeenCalled();

      // Check that progress values are between 0 and 1
      const progressCalls = progressCallback.mock.calls;
      progressCalls.forEach((call) => {
        expect(call[0]).toBeGreaterThanOrEqual(0);
        expect(call[0]).toBeLessThanOrEqual(1);
        expect(typeof call[1]).toBe('string');
      });
    });

    it('should handle invalid DXF content', async () => {
      await expect(loader.parseAsync('invalid dxf content')).rejects.toThrow();
    });
  });

  describe('extractLayers', () => {
    it('should extract layers from parsed DXF', async () => {
      const result = await loader.parseAsync(mockDxfContent);

      expect(result.layers).toHaveLength(2);
      expect(result.layers[0].name).toBe('WALLS');
      expect(result.layers[1].name).toBe('DOORS');

      expect(result.layers[0].id).toBe('walls');
      expect(result.layers[1].id).toBe('doors');

      expect(result.layers[0].visible).toBe(true);
      expect(result.layers[1].visible).toBe(true);
    });
  });

  describe('extractEntities', () => {
    it('should extract entities from parsed DXF', async () => {
      const result = await loader.parseAsync(mockDxfContent);

      expect(result.entities.length).toBeGreaterThan(0);

      // Check for different entity types
      const lineEntities = result.entities.filter((e) => e.type === 'LINE');
      const circleEntities = result.entities.filter((e) => e.type === 'CIRCLE');

      expect(lineEntities.length).toBe(4);
      expect(circleEntities.length).toBe(1);
    });
  });

  describe('getConversionFactor', () => {
    it('should return correct conversion factor for auto mode', () => {
      const mockDxf = {
        header: { $INSUNITS: 4 }, // Millimeters code
      };

      const factor = loader.getConversionFactor(mockDxf, 'auto');
      expect(factor).toBe(0.001); // Millimeters to meters
    });

    it('should return correct conversion factor for specific target unit', () => {
      const mockDxf = {
        header: { $INSUNITS: 4 }, // Millimeters code
      };

      const factor = loader.getConversionFactor(mockDxf, 'cm');
      expect(factor).toBe(0.001 / 0.01); // mm to cm conversion factor
    });

    it('should handle unitless DXF', () => {
      const mockDxf = {
        header: {},
      };

      const factor = loader.getConversionFactor(mockDxf, 'auto');
      expect(factor).toBe(1);
    });
  });

  describe('createThreeObjects', () => {
    it('should create Three.js objects from entities', async () => {
      const result = await loader.parseAsync(mockDxfContent);

      expect(result.threeObjects.length).toBeGreaterThan(0);

      result.threeObjects.forEach((obj) => {
        expect(obj.isLine).toBe(true);
        expect(obj.geometry).toBeDefined();
        expect(obj.material).toBeDefined();
        expect(obj.userData).toBeDefined();
        expect(obj.userData.entityType).toBeDefined();
        expect(obj.userData.layer).toBeDefined();
      });
    });

    it('should set correct colors for different layers', async () => {
      const result = await loader.parseAsync(mockDxfContent);

      const wallObjects = result.threeObjects.filter((obj) => obj.userData.layer === 'WALLS');
      const doorObjects = result.threeObjects.filter((obj) => obj.userData.layer === 'DOORS');

      expect(wallObjects.length).toBeGreaterThan(0);
      expect(doorObjects.length).toBeGreaterThan(0);
    });
  });

  describe('mapToInternalEntities', () => {
    it('should map LINE entities to wall entities', async () => {
      const result = await loader.parseAsync(mockDxfContent);
      const internalEntities = loader.mapToInternalEntities(
        result.entities,
        result.conversionFactor
      );

      const wallEntities = internalEntities.filter((e) => e.type === 'wall');
      expect(wallEntities.length).toBeGreaterThan(0);

      wallEntities.forEach((wall) => {
        expect(wall.id).toMatch(/^wall-\d+$/);
        expect(wall.name).toMatch(/^墙体 \d+$/);
        expect(wall.startPoint).toBeDefined();
        expect(wall.endPoint).toBeDefined();
        expect(wall.material).toBe('concrete');
        expect(wall.color).toBe('#ffffff');
      });
    });

    it('should map CIRCLE entities to reference entities', async () => {
      // Create a custom DXF with a large circle
      const largeCircleDxf = `0
SECTION
2
HEADER
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
1
0
LAYER
2
WALLS
70
0
62
7
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
0
CIRCLE
8
WALLS
10
0.0
20
0.0
30
0.0
40
3000.0
0
ENDSEC
0
EOF`;

      const result = await loader.parseAsync(largeCircleDxf);
      const internalEntities = loader.mapToInternalEntities(
        result.entities,
        result.conversionFactor
      );

      // Large circles (3m radius) should be mapped to reference entities
      const referenceEntities = internalEntities.filter((e) => e.type === 'reference');
      expect(referenceEntities.length).toBe(1);

      referenceEntities.forEach((ref) => {
        expect(ref.id).toMatch(/^reference-\d+$/);
        expect(ref.name).toMatch(/^圆形参考 \d+$/);
        expect(ref.center).toBeDefined();
        expect(ref.radius).toBe(3); // 3000mm converted to meters
        expect(ref.material).toBe('concrete');
        expect(ref.color).toBe('#cccccc');
      });
    });

    it('should map small CIRCLE entities to door entities', async () => {
      const result = await loader.parseAsync(mockDxfContent);
      const internalEntities = loader.mapToInternalEntities(
        result.entities,
        result.conversionFactor
      );

      // Circle with 900mm radius (0.9m) should be mapped to door
      const doorEntities = internalEntities.filter((e) => e.type === 'door');
      expect(doorEntities.length).toBe(1);

      doorEntities.forEach((door) => {
        expect(door.id).toMatch(/^door-\d+$/);
        expect(door.name).toMatch(/^门洞 \d+$/);
        expect(door.center).toBeDefined();
        expect(door.radius).toBe(0.9); // 900mm converted to meters
        expect(door.material).toBe('wood');
        expect(door.color).toBe('#8B4513');
      });
    });

    it('should apply unit conversion to coordinates', async () => {
      const result = await loader.parseAsync(mockDxfContent, { targetUnit: 'm' });
      const internalEntities = loader.mapToInternalEntities(
        result.entities,
        result.conversionFactor
      );

      const wallEntities = internalEntities.filter((e) => e.type === 'wall');
      expect(wallEntities.length).toBeGreaterThan(0);

      // Original coordinates are in millimeters, should be converted to meters
      const firstWall = wallEntities[0];
      expect(firstWall.startPoint.x).toBe(0); // 0mm * 0.001 = 0m
      expect(firstWall.endPoint.x).toBe(5); // 5000mm * 0.001 = 5m
    });
  });

  describe('error handling', () => {
    it('should handle malformed DXF gracefully', async () => {
      const malformedDxf = 'this is not a valid dxf file';

      await expect(loader.parseAsync(malformedDxf)).rejects.toThrow('DXF 解析失败');
    });

    it('should handle empty DXF content', async () => {
      const emptyDxf = '';

      await expect(loader.parseAsync(emptyDxf)).rejects.toThrow();
    });

    it('should handle DXF with no entities', async () => {
      const dxfWithoutEntities = `0
SECTION
2
HEADER
9
$INSUNITS
70
4
0
ENDSEC
0
SECTION
2
ENTITIES
0
ENDSEC
0
EOF`;

      const result = await loader.parseAsync(dxfWithoutEntities);
      expect(result.entities).toHaveLength(0);
      expect(result.threeObjects).toHaveLength(0);
    });
  });

  describe('parseInWorker', () => {
    it('should parse DXF in worker', async () => {
      const result = await loader.parseInWorker(mockDxfContent, {
        targetUnit: 'auto',
      });

      expect(result).toBeDefined();
      expect(result.layers).toBeDefined();
      expect(result.entities).toBeDefined();
      expect(result.threeObjects).toBeDefined();
    });

    it('should handle worker errors', async () => {
      await expect(loader.parseInWorker('invalid content')).rejects.toThrow();
    });
  });
});
