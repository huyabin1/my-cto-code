import * as THREE from 'three';
import { resetThreeMocks, mockExtrudeGeometry, mockShape } from './__mocks__/threeMock';
import WallMeshFactory from '@/three/factory/WallMeshFactory';

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

describe('WallMeshFactory', () => {
  beforeEach(() => {
    resetThreeMocks();
  });

  describe('create', () => {
    it('creates a wall mesh with default parameters', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(5, 0);

      const mesh = WallMeshFactory.create({ start, end });

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.userData.type).toBe('wall');
      expect(mesh.userData.id).toBe('mock-uuid-0');
      expect(mesh.userData.config.start).toEqual(start);
      expect(mesh.userData.config.end).toEqual(end);
      expect(mesh.userData.config.height).toBe(2.8);
      expect(mesh.userData.config.thickness).toBe(0.2);
      expect(mesh.userData.config.material).toBe('concrete');
    });

    it('creates a wall mesh with custom parameters', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(3, 4);
      const config = {
        start,
        end,
        height: 3.5,
        thickness: 0.3,
        material: 'wood',
        color: 0xff0000,
        segments: 2,
      };

      const mesh = WallMeshFactory.create(config);

      expect(mesh.userData.config.height).toBe(3.5);
      expect(mesh.userData.config.thickness).toBe(0.3);
      expect(mesh.userData.config.material).toBe('wood');
      expect(mesh.userData.config.color).toBe(0xff0000);
      expect(mesh.userData.config.segments).toBe(2);
    });

    it('positions wall correctly at center point', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(6, 8); // 10m length, diagonal
      const height = 3;

      const mesh = WallMeshFactory.create({ start, end, height });

      // Center should be at (3, 4, height/2)
      expect(mesh.position.x).toBeCloseTo(3, 1);
      expect(mesh.position.z).toBeCloseTo(4, 1);
      expect(mesh.position.y).toBeCloseTo(1.5, 1);
    });

    it('rotates wall correctly to align with direction', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(0, 5); // 90 degrees

      const mesh = WallMeshFactory.create({ start, end });

      // Should be rotated -90 degrees (negative because of coordinate system)
      expect(mesh.rotation.y).toBeCloseTo(-Math.PI / 2, 2);
    });

    it('creates extrude geometry with correct parameters', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(4, 0);
      const height = 3;
      const thickness = 0.25;

      WallMeshFactory.create({ start, end, height, thickness });

      expect(mockExtrudeGeometry).toHaveBeenCalledWith(expect.any(Object), {
        depth: height,
        bevelEnabled: false,
        steps: 1,
        curveSegments: 1,
      });
    });

    it('throws error for invalid start/end points', () => {
      expect(() => {
        WallMeshFactory.create({ start: new THREE.Vector2(0, 0), end: 'invalid' });
      }).toThrow('start and end must be Vector2 instances');

      expect(() => {
        WallMeshFactory.create({ start: 'invalid', end: new THREE.Vector2(1, 0) });
      }).toThrow('start and end must be Vector2 instances');
    });

    it('throws error for same start and end points', () => {
      const point = new THREE.Vector2(0, 0);

      expect(() => {
        WallMeshFactory.create({ start: point, end: point });
      }).toThrow('Start and end points cannot be the same');
    });
  });

  describe('createWallGeometry', () => {
    it('creates wall geometry with correct parameters', () => {
      const length = 5;
      const height = 3;
      const thickness = 0.2;
      const segments = 2;

      const geometry = WallMeshFactory.createWallGeometry(length, height, thickness, segments);

      expect(mockShape).toHaveBeenCalled();
      expect(mockExtrudeGeometry).toHaveBeenCalledWith(expect.any(Object), {
        depth: height,
        bevelEnabled: false,
        steps: 1,
        curveSegments: segments,
      });
    });

    it('rotates geometry correctly', () => {
      const geometry = WallMeshFactory.createWallGeometry(5, 3, 0.2);

      expect(mockExtrudeGeometry.mock.results[0].value.rotateX).toHaveBeenCalledWith(-Math.PI / 2);
      expect(mockExtrudeGeometry.mock.results[0].value.computeVertexNormals).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates wall height correctly', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(5, 0);
      const mesh = WallMeshFactory.create({ start, end, height: 2.8 });

      // Update height
      WallMeshFactory.update(mesh, { height: 4.0 });

      expect(mesh.userData.config.height).toBe(4.0);
      expect(mockExtrudeGeometry.mock.results[1].value.dispose).toHaveBeenCalled();
    });

    it('updates wall thickness correctly', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(5, 0);
      const mesh = WallMeshFactory.create({ start, end });

      // Update thickness
      WallMeshFactory.update(mesh, { thickness: 0.5 });

      expect(mesh.userData.config.thickness).toBe(0.5);
    });

    it('updates wall material correctly', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(1, 0);
      const mesh = WallMeshFactory.create({ start, end, material: 'concrete' });

      // Update material
      WallMeshFactory.update(mesh, { material: 'glass' });

      expect(mesh.userData.config.material).toBe('glass');
    });

    it('updates wall position correctly', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(2, 0);
      const mesh = WallMeshFactory.create({ start, end });

      // Update end position
      const newEnd = new THREE.Vector2(6, 0);
      WallMeshFactory.update(mesh, { end: newEnd });

      expect(mesh.userData.config.end).toEqual(newEnd);
      expect(mesh.position.x).toBeCloseTo(3, 1); // (0 + 6) / 2
    });

    it('throws error for invalid wall object', () => {
      expect(() => {
        WallMeshFactory.update(null, {});
      }).toThrow('Invalid wall mesh object');

      expect(() => {
        WallMeshFactory.update({}, {});
      }).toThrow('Invalid wall mesh object');

      expect(() => {
        WallMeshFactory.update({ userData: {} }, {});
      }).toThrow('Invalid wall mesh object');
    });
  });

  describe('getBoundingBox', () => {
    it('returns correct bounding box for wall', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(3, 0);
      const mesh = WallMeshFactory.create({ start, end, height: 2.5, thickness: 0.15 });

      const box = WallMeshFactory.getBoundingBox(mesh);

      expect(box).toBeInstanceOf(THREE.Box3);
      // The mock Box3 constructor creates an instance, we check that it works
      expect(box.min).toBeDefined();
      expect(box.max).toBeDefined();
    });

    it('throws error for invalid wall object', () => {
      expect(() => {
        WallMeshFactory.getBoundingBox(null);
      }).toThrow('Invalid wall mesh object');

      expect(() => {
        WallMeshFactory.getBoundingBox({});
      }).toThrow('Invalid wall mesh object');
    });
  });

  describe('calculateVolume', () => {
    it('calculates volume correctly', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(5, 0),
        height: 3,
        thickness: 0.2,
      };

      const volume = WallMeshFactory.calculateVolume(config);
      expect(volume).toBeCloseTo(5 * 3 * 0.2, 1); // length * height * thickness
    });
  });

  describe('calculateSurfaceArea', () => {
    it('calculates surface area correctly', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(5, 0),
        height: 3,
        thickness: 0.2,
      };

      const area = WallMeshFactory.calculateSurfaceArea(config);
      const expected = 2 * 5 * 3 + 2 * 0.2 * 3 + 2 * 5 * 0.2; // large + small + top/bottom
      expect(area).toBeCloseTo(expected, 1);
    });
  });

  describe('UV mapping', () => {
    it('sets UV attributes correctly', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(2, 0);
      const mesh = WallMeshFactory.create({ start, end, height: 3, thickness: 0.2 });

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
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(2, 0);
      const mesh = WallMeshFactory.create({ start, end });

      const oldGeometry = mesh.geometry;

      WallMeshFactory.update(mesh, { height: 4 });

      expect(mockExtrudeGeometry.mock.results[0].value.dispose).toHaveBeenCalled();
    });
  });
});
