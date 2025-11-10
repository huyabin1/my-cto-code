import * as THREE from 'three';
import { resetThreeMocks, mockExtrudeGeometry, mockShape } from './__mocks__/threeMock';
import FloorMeshFactory from '@/three/factory/FloorMeshFactory';

// Mock the material library
jest.mock('@/three/materials', () => ({
  getMaterial: jest.fn((type, options) => ({
    type: 'MeshStandardMaterial',
    color: { getHex: jest.fn(() => options.color || 0x888888) },
    roughness: 0.8,
    metalness: 0.2,
    dispose: jest.fn(),
    userData: { type, config: options },
  })),
  disposeMaterial: jest.fn(),
}));

describe('FloorMeshFactory', () => {
  beforeEach(() => {
    resetThreeMocks();
  });

  describe('create', () => {
    it('creates a floor mesh with default parameters', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(5, 0),
        new THREE.Vector2(5, 5),
        new THREE.Vector2(0, 5),
      ];

      const mesh = FloorMeshFactory.create({ points });

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.userData.type).toBe('floor');
      expect(mesh.userData.id).toBe('mock-uuid-0');
      expect(mesh.userData.config.points).toEqual(points);
      expect(mesh.userData.config.thickness).toBe(0.1);
      expect(mesh.userData.config.material).toBe('concrete');
      expect(mesh.userData.config.height).toBe(0);
    });

    it('creates a floor mesh with custom parameters', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 4),
        new THREE.Vector2(0, 4),
      ];
      const config = {
        points,
        thickness: 0.2,
        material: 'wood',
        color: 0xff0000,
        height: 1.5,
        segments: 2,
      };

      const mesh = FloorMeshFactory.create(config);

      expect(mesh.userData.config.thickness).toBe(0.2);
      expect(mesh.userData.config.material).toBe('wood');
      expect(mesh.userData.config.color).toBe(0xff0000);
      expect(mesh.userData.config.height).toBe(1.5);
      expect(mesh.userData.config.segments).toBe(2);
    });

    it('positions floor correctly at center height', () => {
      const points = [
        new THREE.Vector2(-2, -2),
        new THREE.Vector2(2, -2),
        new THREE.Vector2(2, 2),
        new THREE.Vector2(-2, 2),
      ];
      const height = 2;
      const thickness = 0.3;

      const mesh = FloorMeshFactory.create({ points, height, thickness });

      expect(mesh.position.y).toBe(height + thickness / 2); // height + thickness/2
    });

    it('creates extrude geometry with correct parameters', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(4, 0),
        new THREE.Vector2(4, 3),
        new THREE.Vector2(0, 3),
      ];
      const thickness = 0.15;
      const segments = 2;

      FloorMeshFactory.create({ points, thickness, segments });

      expect(mockShape).toHaveBeenCalled();
      expect(mockExtrudeGeometry).toHaveBeenCalledWith(expect.any(Object), {
        depth: thickness,
        bevelEnabled: false,
        steps: 1,
        curveSegments: segments,
      });
    });

    it('throws error for invalid points', () => {
      expect(() => {
        FloorMeshFactory.create({ points: [] });
      }).toThrow('Points must be an array with at least 3 Vector2 instances');

      expect(() => {
        FloorMeshFactory.create({ points: [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0)] });
      }).toThrow('Points must be an array with at least 3 Vector2 instances');

      expect(() => {
        FloorMeshFactory.create({
          points: [new THREE.Vector2(0, 0), 'invalid', new THREE.Vector2(1, 1)],
        });
      }).toThrow('Point at index 1 is not a Vector2 instance');
    });
  });

  describe('createFloorGeometry', () => {
    it('creates floor geometry with correct parameters', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 2),
        new THREE.Vector2(0, 2),
      ];
      const thickness = 0.2;
      const segments = 2;

      const geometry = FloorMeshFactory.createFloorGeometry(points, thickness, segments);

      expect(mockShape).toHaveBeenCalled();
      expect(mockExtrudeGeometry).toHaveBeenCalledWith(expect.any(Object), {
        depth: thickness,
        bevelEnabled: false,
        steps: 1,
        curveSegments: segments,
      });
    });

    it('computes vertex normals', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0),
        new THREE.Vector2(2, 2),
        new THREE.Vector2(0, 2),
      ];

      const geometry = FloorMeshFactory.createFloorGeometry(points, 0.1);

      expect(mockExtrudeGeometry.mock.results[0].value.computeVertexNormals).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates floor thickness correctly', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 3),
        new THREE.Vector2(0, 3),
      ];
      const mesh = FloorMeshFactory.create({ points, thickness: 0.1 });

      // Update thickness
      FloorMeshFactory.update(mesh, { thickness: 0.3 });

      expect(mesh.userData.config.thickness).toBe(0.3);
      expect(mockExtrudeGeometry.mock.results[1].value.dispose).toHaveBeenCalled();
    });

    it('updates floor material correctly', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0),
        new THREE.Vector2(2, 2),
        new THREE.Vector2(0, 2),
      ];
      const mesh = FloorMeshFactory.create({ points, material: 'concrete' });

      // Update material
      FloorMeshFactory.update(mesh, { material: 'wood' });

      expect(mesh.userData.config.material).toBe('wood');
    });

    it('updates floor points correctly', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0),
        new THREE.Vector2(2, 2),
        new THREE.Vector2(0, 2),
      ];
      const mesh = FloorMeshFactory.create({ points });

      // Update points
      const newPoints = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(4, 0),
        new THREE.Vector2(4, 3),
        new THREE.Vector2(0, 3),
      ];
      FloorMeshFactory.update(mesh, { points: newPoints });

      expect(mesh.userData.config.points).toEqual(newPoints);
    });

    it('throws error for invalid floor object', () => {
      expect(() => {
        FloorMeshFactory.update(null, {});
      }).toThrow('Invalid floor mesh object');

      expect(() => {
        FloorMeshFactory.update({}, {});
      }).toThrow('Invalid floor mesh object');

      expect(() => {
        FloorMeshFactory.update({ userData: {} }, {});
      }).toThrow('Invalid floor mesh object');
    });
  });

  describe('getBoundingBox', () => {
    it('returns correct bounding box for floor', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 3),
        new THREE.Vector2(0, 3),
      ];
      const mesh = FloorMeshFactory.create({ points, thickness: 0.15 });

      const box = FloorMeshFactory.getBoundingBox(mesh);

      expect(box).toBeInstanceOf(THREE.Box3);
      // The mock Box3 constructor creates an instance, we check that it works
      expect(box.min).toBeDefined();
      expect(box.max).toBeDefined();
    });

    it('throws error for invalid floor object', () => {
      expect(() => {
        FloorMeshFactory.getBoundingBox(null);
      }).toThrow('Invalid floor mesh object');

      expect(() => {
        FloorMeshFactory.getBoundingBox({});
      }).toThrow('Invalid floor mesh object');
    });
  });

  describe('calculateCenter', () => {
    it('calculates center correctly for square', () => {
      const points = [
        new THREE.Vector2(-1, -1),
        new THREE.Vector2(1, -1),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(-1, 1),
      ];

      const center = FloorMeshFactory.calculateCenter(points);

      expect(center.x).toBeCloseTo(0, 1);
      expect(center.y).toBeCloseTo(0, 1);
    });

    it('calculates center correctly for rectangle', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(4, 0),
        new THREE.Vector2(4, 2),
        new THREE.Vector2(0, 2),
      ];

      const center = FloorMeshFactory.calculateCenter(points);

      expect(center.x).toBeCloseTo(2, 1);
      expect(center.y).toBeCloseTo(1, 1);
    });
  });

  describe('calculateArea', () => {
    it('calculates area correctly for square', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 3),
        new THREE.Vector2(0, 3),
      ];

      const area = FloorMeshFactory.calculateArea(points);
      expect(area).toBeCloseTo(9, 1); // 3 * 3
    });

    it('calculates area correctly for rectangle', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(5, 0),
        new THREE.Vector2(5, 2),
        new THREE.Vector2(0, 2),
      ];

      const area = FloorMeshFactory.calculateArea(points);
      expect(area).toBeCloseTo(10, 1); // 5 * 2
    });

    it('calculates area correctly for triangle', () => {
      const points = [new THREE.Vector2(0, 0), new THREE.Vector2(4, 0), new THREE.Vector2(2, 3)];

      const area = FloorMeshFactory.calculateArea(points);
      expect(area).toBeCloseTo(6, 1); // 4 * 3 / 2
    });
  });

  describe('calculateVolume', () => {
    it('calculates volume correctly', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(4, 0),
        new THREE.Vector2(4, 3),
        new THREE.Vector2(0, 3),
      ];
      const config = { points, thickness: 0.2 };

      const volume = FloorMeshFactory.calculateVolume(config);
      expect(volume).toBeCloseTo(4 * 3 * 0.2, 1); // area * thickness
    });
  });

  describe('calculateSurfaceArea', () => {
    it('calculates surface area correctly for square', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 3),
        new THREE.Vector2(0, 3),
      ];
      const config = { points, thickness: 0.2 };

      const area = FloorMeshFactory.calculateSurfaceArea(config);
      const area2D = 3 * 3; // 9
      const perimeter = 3 * 4; // 12
      const expected = 2 * area2D + perimeter * 0.2; // top/bottom + sides
      expect(area).toBeCloseTo(expected, 1);
    });
  });

  describe('createRectFloor', () => {
    it('creates rectangular floor config', () => {
      const width = 6;
      const depth = 4;
      const options = { material: 'wood' };

      const config = FloorMeshFactory.createRectFloor(width, depth, options);

      expect(config.points).toHaveLength(4);
      expect(config.material).toBe('wood');
      expect(config.points[0]).toEqual(new THREE.Vector2(-3, -2));
      expect(config.points[1]).toEqual(new THREE.Vector2(3, -2));
      expect(config.points[2]).toEqual(new THREE.Vector2(3, 2));
      expect(config.points[3]).toEqual(new THREE.Vector2(-3, 2));
    });
  });

  describe('createCircularFloor', () => {
    it('creates circular floor config', () => {
      const radius = 5;
      const segments = 8;
      const options = { material: 'concrete' };

      const config = FloorMeshFactory.createCircularFloor(radius, segments, options);

      expect(config.points).toHaveLength(segments);
      expect(config.material).toBe('concrete');

      // Check first point
      expect(config.points[0].x).toBeCloseTo(5, 1);
      expect(config.points[0].y).toBeCloseTo(0, 1);

      // Check last point (should be back to start)
      expect(config.points[segments - 1].x).toBeCloseTo(5, 1);
      expect(config.points[segments - 1].y).toBeCloseTo(0, 1);
    });
  });

  describe('UV mapping', () => {
    it('sets UV attributes correctly', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0),
        new THREE.Vector2(2, 2),
        new THREE.Vector2(0, 2),
      ];
      const mesh = FloorMeshFactory.create({ points, thickness: 0.2 });

      const { geometry } = mesh;
      const uvAttribute = geometry.attributes.uv;

      expect(uvAttribute).toBeDefined();
      expect(uvAttribute.count).toBe(36); // Mock extrude geometry has 36 vertices

      // Check that UV attribute exists and has been processed
      expect(uvAttribute.array).toBeDefined();
      expect(uvAttribute.array.length).toBeGreaterThan(0);
    });
  });

  describe('Geometry disposal', () => {
    it('disposes old geometry when updating', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0),
        new THREE.Vector2(2, 2),
        new THREE.Vector2(0, 2),
      ];
      const mesh = FloorMeshFactory.create({ points });

      const oldGeometry = mesh.geometry;

      FloorMeshFactory.update(mesh, { thickness: 0.4 });

      expect(mockExtrudeGeometry.mock.results[0].value.dispose).toHaveBeenCalled();
    });
  });
});
