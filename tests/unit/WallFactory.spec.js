import * as THREE from 'three';
import WallFactory from '@/three/factory/WallFactory.js';

// Mock THREE.MathUtils.generateUUID for consistent testing
const mockUUIDs = [];
THREE.MathUtils.generateUUID = jest.fn(() => {
  const uuid = `mock-uuid-${mockUUIDs.length}`;
  mockUUIDs.push(uuid);
  return uuid;
});

describe('WallFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUUIDs.length = 0;
  });

  describe('create', () => {
    it('creates a wall with default parameters', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(5, 0);

      const wall = WallFactory.create({ start, end });

      expect(wall).toBeInstanceOf(THREE.Group);
      expect(wall.userData.type).toBe('wall');
      expect(wall.userData.id).toBe('mock-uuid-0');
      expect(wall.userData.config.start).toEqual(start);
      expect(wall.userData.config.end).toEqual(end);
      expect(wall.userData.config.height).toBe(2.8);
      expect(wall.userData.config.thickness).toBe(0.2);
      expect(wall.userData.config.material).toBe('concrete');
    });

    it('creates a wall with custom parameters', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(3, 4);
      const config = {
        start,
        end,
        height: 3.5,
        thickness: 0.3,
        material: 'wood',
        color: 0xff0000,
      };

      const wall = WallFactory.create(config);

      expect(wall.userData.config.height).toBe(3.5);
      expect(wall.userData.config.thickness).toBe(0.3);
      expect(wall.userData.config.material).toBe('wood');
      expect(wall.userData.config.color).toBe(0xff0000);
    });

    it('creates wall mesh with correct dimensions for 5m wall', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(5, 0);

      const wall = WallFactory.create({ start, end, height: 2.8, thickness: 0.2 });
      const mesh = wall.children[0];

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);

      // Check bounding box dimensions
      const box = new THREE.Box3().setFromObject(wall);
      const size = new THREE.Vector3();
      box.getSize(size);

      expect(size.x).toBeCloseTo(5, 1); // length
      expect(size.y).toBeCloseTo(2.8, 1); // height
      expect(size.z).toBeCloseTo(0.2, 1); // thickness
    });

    it('positions wall correctly at center point', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(6, 8); // 10m length, diagonal
      const height = 3;

      const wall = WallFactory.create({ start, end, height });
      const mesh = wall.children[0];

      // Center should be at (3, 4, height/2)
      expect(mesh.position.x).toBeCloseTo(3, 1);
      expect(mesh.position.z).toBeCloseTo(4, 1);
      expect(mesh.position.y).toBeCloseTo(1.5, 1);
    });

    it('rotates wall correctly to align with direction', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(0, 5); // 90 degrees

      const wall = WallFactory.create({ start, end });
      const mesh = wall.children[0];

      // Should be rotated -90 degrees (negative because of coordinate system)
      expect(mesh.rotation.y).toBeCloseTo(-Math.PI / 2, 2);
    });

    it('creates correct material for each type', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(1, 0);

      // Test concrete material
      const concreteWall = WallFactory.create({ start, end, material: 'concrete' });
      const concreteMaterial = concreteWall.children[0].material;
      expect(concreteMaterial.color.getHex()).toBe(0x888888);
      expect(concreteMaterial.roughness).toBe(0.8);
      expect(concreteMaterial.metalness).toBe(0.2);

      // Test wood material
      const woodWall = WallFactory.create({ start, end, material: 'wood' });
      const woodMaterial = woodWall.children[0].material;
      expect(woodMaterial.color.getHex()).toBe(0x8b4513);
      expect(woodMaterial.roughness).toBe(0.9);
      expect(woodMaterial.metalness).toBe(0.1);

      // Test glass material
      const glassWall = WallFactory.create({ start, end, material: 'glass' });
      const glassMaterial = glassWall.children[0].material;
      expect(glassMaterial.color.getHex()).toBe(0x87ceeb);
      expect(glassMaterial.roughness).toBe(0.1);
      expect(glassMaterial.metalness).toBe(0.0);
    });

    it('uses custom color when provided', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(1, 0);
      const customColor = 0x00ff00;

      const wall = WallFactory.create({ start, end, color: customColor });
      const { material } = wall.children[0];

      expect(material.color.getHex()).toBe(customColor);
    });

    it('throws error for invalid start/end points', () => {
      expect(() => {
        WallFactory.create({ start: new THREE.Vector2(0, 0), end: 'invalid' });
      }).toThrow('start and end must be Vector2 instances');

      expect(() => {
        WallFactory.create({ start: 'invalid', end: new THREE.Vector2(1, 0) });
      }).toThrow('start and end must be Vector2 instances');
    });

    it('throws error for same start and end points', () => {
      const point = new THREE.Vector2(0, 0);

      expect(() => {
        WallFactory.create({ start: point, end: point });
      }).toThrow('Start and end points cannot be the same');
    });

    it('throws error for invalid material type', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(1, 0);

      expect(() => {
        WallFactory.create({ start, end, material: 'invalid' });
      }).toThrow('Invalid material type: invalid');
    });
  });

  describe('update', () => {
    it('updates wall height correctly', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(5, 0);
      const wall = WallFactory.create({ start, end, height: 2.8 });

      // Update height
      WallFactory.update(wall, { height: 4.0 });

      expect(wall.userData.config.height).toBe(4.0);

      // Check bounding box
      const box = new THREE.Box3().setFromObject(wall);
      const size = new THREE.Vector3();
      box.getSize(size);
      expect(size.y).toBeCloseTo(4.0, 1);
    });

    it('updates wall thickness correctly', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(5, 0);
      const wall = WallFactory.create({ start, end });

      // Update thickness
      WallFactory.update(wall, { thickness: 0.5 });

      expect(wall.userData.config.thickness).toBe(0.5);

      // Check bounding box
      const box = new THREE.Box3().setFromObject(wall);
      const size = new THREE.Vector3();
      box.getSize(size);
      expect(size.z).toBeCloseTo(0.5, 1);
    });

    it('updates wall material correctly', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(1, 0);
      const wall = WallFactory.create({ start, end, material: 'concrete' });

      // Update material
      WallFactory.update(wall, { material: 'glass' });

      expect(wall.userData.config.material).toBe('glass');
      const { material } = wall.children[0];
      expect(material.color.getHex()).toBe(0x87ceeb);
      expect(material.roughness).toBe(0.1);
    });

    it('updates wall position correctly', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(2, 0);
      const wall = WallFactory.create({ start, end });

      // Update end position
      const newEnd = new THREE.Vector2(6, 0);
      WallFactory.update(wall, { end: newEnd });

      expect(wall.userData.config.end).toEqual(newEnd);

      // Check new center position
      const box = new THREE.Box3().setFromObject(wall);
      const center = new THREE.Vector3();
      box.getCenter(center);
      expect(center.x).toBeCloseTo(3, 1); // (0 + 6) / 2
    });

    it('throws error for invalid wall object', () => {
      expect(() => {
        WallFactory.update(null, {});
      }).toThrow('Invalid wall object');

      expect(() => {
        WallFactory.update({}, {});
      }).toThrow('Invalid wall object');

      expect(() => {
        WallFactory.update({ userData: {} }, {});
      }).toThrow('Invalid wall object');
    });
  });

  describe('getBoundingBox', () => {
    it('returns correct bounding box for wall', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(3, 0);
      const wall = WallFactory.create({ start, end, height: 2.5, thickness: 0.15 });

      const box = WallFactory.getBoundingBox(wall);

      expect(box).toBeInstanceOf(THREE.Box3);

      const size = new THREE.Vector3();
      box.getSize(size);
      expect(size.x).toBeCloseTo(3, 1);
      expect(size.y).toBeCloseTo(2.5, 1);
      expect(size.z).toBeCloseTo(0.15, 1);
    });

    it('throws error for invalid wall object', () => {
      expect(() => {
        WallFactory.getBoundingBox(null);
      }).toThrow('Invalid wall object');

      expect(() => {
        WallFactory.getBoundingBox({});
      }).toThrow('Invalid wall object');
    });
  });

  describe('UUID uniqueness', () => {
    it('generates unique UUIDs for multiple walls', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(1, 0);
      const uuidSet = new Set();

      // Create 100 walls and check UUID uniqueness
      for (let i = 0; i < 100; i += 1) {
        const wall = WallFactory.create({ start, end });
        uuidSet.add(wall.userData.id);
      }

      expect(uuidSet.size).toBe(100);
      expect(mockUUIDs.length).toBe(100);
    });
  });

  describe('UV mapping', () => {
    it('sets UV attributes correctly', () => {
      const start = new THREE.Vector2(0, 0);
      const end = new THREE.Vector2(2, 0);
      const wall = WallFactory.create({ start, end, height: 3, thickness: 0.2 });

      const mesh = wall.children[0];
      const uvAttribute = mesh.geometry.attributes.uv;

      expect(uvAttribute).toBeDefined();
      expect(uvAttribute.count).toBe(24); // BoxGeometry has 24 vertices total

      // Check that UV values have been set (not all zeros)
      const uvArray = uvAttribute.array;
      let hasNonZeroValues = false;
      for (let i = 0; i < uvArray.length; i += 1) {
        if (uvArray[i] !== 0) {
          hasNonZeroValues = true;
          break;
        }
      }
      expect(hasNonZeroValues).toBe(true);
    });
  });
});
