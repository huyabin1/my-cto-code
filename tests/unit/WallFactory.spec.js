import * as THREE from 'three';
// eslint-disable-next-line import/extensions
import { WallFactory } from '@/three/factory/WallFactory.js';

describe('WallFactory', () => {
  let wall;

  afterEach(() => {
    // Clean up
    if (wall) {
      wall.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      wall = null;
    }
  });

  describe('Initialization', () => {
    it('creates a THREE.Group instance', () => {
      wall = WallFactory();
      expect(wall).toBeInstanceOf(THREE.Group);
    });

    it('stores correct metadata in userData', () => {
      wall = WallFactory({
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(5, 0, 0),
        height: 3.0,
        thickness: 0.3,
        material: 'wood',
      });

      expect(wall.userData.type).toBe('wall');
      expect(wall.userData.id).toBeDefined();
      expect(typeof wall.userData.id).toBe('string');
      expect(wall.userData.config).toBeDefined();
      expect(wall.userData.config.height).toBe(3.0);
      expect(wall.userData.config.thickness).toBe(0.3);
      expect(wall.userData.config.material).toBe('wood');
    });

    it('generates unique IDs for different walls', () => {
      const wall1 = WallFactory();
      const wall2 = WallFactory();
      const wall3 = WallFactory();

      expect(wall1.userData.id).not.toBe(wall2.userData.id);
      expect(wall2.userData.id).not.toBe(wall3.userData.id);
      expect(wall1.userData.id).not.toBe(wall3.userData.id);

      // Clean up additional walls
      [wall1, wall2, wall3].forEach((w) => {
        w.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      });
    });

    it('contains a wall mesh as child', () => {
      wall = WallFactory();
      expect(wall.children.length).toBe(1);
      expect(wall.children[0]).toBeInstanceOf(THREE.Mesh);
    });
  });

  describe('Geometry dimensions for 5m wall', () => {
    beforeEach(() => {
      wall = WallFactory({
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(5, 0, 0),
        height: 2.8,
        thickness: 0.2,
      });
    });

    it('creates geometry with correct length', () => {
      const mesh = wall.children[0];
      const { geometry } = mesh;

      // BoxGeometry dimensions are stored in parameters
      // or we can compute from bounding box
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;

      const length = bbox.max.x - bbox.min.x;
      expect(length).toBeCloseTo(5, 5);
    });

    it('creates geometry with correct height', () => {
      const mesh = wall.children[0];
      const { geometry } = mesh;

      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;

      const height = bbox.max.y - bbox.min.y;
      expect(height).toBeCloseTo(2.8, 5);
    });

    it('creates geometry with correct thickness', () => {
      const mesh = wall.children[0];
      const { geometry } = mesh;

      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;

      const thickness = bbox.max.z - bbox.min.z;
      expect(thickness).toBeCloseTo(0.2, 5);
    });
  });

  describe('UV repeat every meter', () => {
    it('scales UVs based on wall dimensions', () => {
      wall = WallFactory({
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(5, 0, 0),
        height: 2.8,
        thickness: 0.2,
      });

      const mesh = wall.children[0];
      const { geometry } = mesh;
      const uvAttribute = geometry.attributes.uv;

      // Check that UV coordinates exist and are scaled
      expect(uvAttribute).toBeDefined();
      expect(uvAttribute.count).toBeGreaterThan(0);

      // Find UV coordinates and verify they're scaled appropriately
      let maxU = 0;
      let maxV = 0;

      for (let i = 0; i < uvAttribute.count; i += 1) {
        const u = Math.abs(uvAttribute.getX(i));
        const v = Math.abs(uvAttribute.getY(i));
        maxU = Math.max(maxU, u);
        maxV = Math.max(maxV, v);
      }

      // Max U should be around 5 (length) for some faces
      // Max V should be around 2.8 (height) for some faces
      expect(maxU).toBeGreaterThan(2); // At least scaled by length
      expect(maxV).toBeGreaterThan(2); // At least scaled by height
    });
  });

  describe('Material presets', () => {
    it('applies concrete preset correctly', () => {
      wall = WallFactory({ material: 'concrete' });
      const mesh = wall.children[0];
      const { material } = mesh;

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color.getHex()).toBe(0xcccccc);
      expect(material.roughness).toBe(0.9);
      expect(material.metalness).toBe(0.0);
    });

    it('applies wood preset correctly', () => {
      wall = WallFactory({ material: 'wood' });
      const mesh = wall.children[0];
      const { material } = mesh;

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color.getHex()).toBe(0x8b6f47);
      expect(material.roughness).toBe(0.8);
      expect(material.metalness).toBe(0.0);
    });

    it('applies glass preset correctly', () => {
      wall = WallFactory({ material: 'glass' });
      const mesh = wall.children[0];
      const { material } = mesh;

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color.getHex()).toBe(0xaaddff);
      expect(material.roughness).toBe(0.1);
      expect(material.metalness).toBe(0.5);
    });

    it('allows color override', () => {
      wall = WallFactory({
        material: 'concrete',
        color: 0xff0000,
      });

      const mesh = wall.children[0];
      const { material } = mesh;

      expect(material.color.getHex()).toBe(0xff0000);
    });

    it('allows roughness and metalness override', () => {
      wall = WallFactory({
        material: 'wood',
        roughness: 0.5,
        metalness: 0.3,
      });

      const mesh = wall.children[0];
      const { material } = mesh;

      expect(material.roughness).toBe(0.5);
      expect(material.metalness).toBe(0.3);
    });

    it('falls back to concrete for unknown preset', () => {
      wall = WallFactory({ material: 'unknown' });
      const mesh = wall.children[0];
      const { material } = mesh;

      // Should fallback to concrete defaults
      expect(material.color.getHex()).toBe(0xcccccc);
      expect(material.roughness).toBe(0.9);
      expect(material.metalness).toBe(0.0);
    });
  });

  describe('update() method', () => {
    beforeEach(() => {
      wall = WallFactory({
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(5, 0, 0),
        height: 2.8,
        thickness: 0.2,
        material: 'concrete',
      });
    });

    it('updates wall height', () => {
      wall.update({ height: 4.0 });

      const mesh = wall.children[0];
      const { geometry } = mesh;
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;

      const height = bbox.max.y - bbox.min.y;
      expect(height).toBeCloseTo(4.0, 5);
      expect(wall.userData.config.height).toBe(4.0);
    });

    it('updates wall thickness', () => {
      wall.update({ thickness: 0.5 });

      const mesh = wall.children[0];
      const { geometry } = mesh;
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;

      const thickness = bbox.max.z - bbox.min.z;
      expect(thickness).toBeCloseTo(0.5, 5);
      expect(wall.userData.config.thickness).toBe(0.5);
    });

    it('updates wall material preset', () => {
      const originalMaterial = wall.children[0].material;
      expect(originalMaterial.color.getHex()).toBe(0xcccccc);

      wall.update({ material: 'wood' });

      const mesh = wall.children[0];
      const { material } = mesh;

      expect(material.color.getHex()).toBe(0x8b6f47);
      expect(material.roughness).toBe(0.8);
      expect(wall.userData.config.material).toBe('wood');
    });

    it('updates start and end points', () => {
      wall.update({
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(10, 0, 0),
      });

      const mesh = wall.children[0];
      const { geometry } = mesh;
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;

      const length = bbox.max.x - bbox.min.x;
      expect(length).toBeCloseTo(10, 5);
    });

    it('preserves the same Group reference', () => {
      const originalWall = wall;
      const originalId = wall.userData.id;

      wall.update({ height: 5.0 });

      expect(wall).toBe(originalWall);
      expect(wall.userData.id).toBe(originalId);
    });

    it('updates multiple properties simultaneously', () => {
      wall.update({
        height: 3.5,
        thickness: 0.3,
        material: 'glass',
        color: 0x00ff00,
      });

      const mesh = wall.children[0];
      const { geometry } = mesh;
      const { material } = mesh;

      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;

      const height = bbox.max.y - bbox.min.y;
      const thickness = bbox.max.z - bbox.min.z;

      expect(height).toBeCloseTo(3.5, 5);
      expect(thickness).toBeCloseTo(0.3, 5);
      expect(material.color.getHex()).toBe(0x00ff00);
      expect(wall.userData.config.material).toBe('glass');
    });
  });

  describe('getBoundingBox() method', () => {
    it('returns a THREE.Box3 instance', () => {
      wall = WallFactory();
      const bbox = wall.getBoundingBox();

      expect(bbox).toBeInstanceOf(THREE.Box3);
    });

    it('returns bounding box with correct dimensions', () => {
      wall = WallFactory({
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(5, 0, 0),
        height: 2.8,
        thickness: 0.2,
      });

      const bbox = wall.getBoundingBox();

      // Check that bounding box is not empty
      expect(bbox.min).toBeDefined();
      expect(bbox.max).toBeDefined();

      // Calculate dimensions
      const size = new THREE.Vector3();
      bbox.getSize(size);

      // The wall should have approximate dimensions
      expect(size.x).toBeGreaterThan(4); // Length around 5m
      expect(size.y).toBeGreaterThan(2); // Height around 2.8m
      expect(size.z).toBeGreaterThan(0.1); // Thickness around 0.2m
    });

    it('updates bounding box after update() call', () => {
      wall = WallFactory({
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(5, 0, 0),
        height: 2.8,
      });

      const bbox1 = wall.getBoundingBox();
      const size1 = new THREE.Vector3();
      bbox1.getSize(size1);

      wall.update({ height: 5.0 });

      const bbox2 = wall.getBoundingBox();
      const size2 = new THREE.Vector3();
      bbox2.getSize(size2);

      // Height should have increased
      expect(size2.y).toBeGreaterThan(size1.y);
    });
  });

  describe('Wall orientation and positioning', () => {
    it('orients wall along X-axis', () => {
      wall = WallFactory({
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(5, 0, 0),
      });

      const mesh = wall.children[0];

      // Wall should be oriented along X-axis (rotation.y should be close to 0)
      expect(Math.abs(mesh.rotation.y)).toBeLessThan(0.1);
    });

    it('orients wall along Z-axis', () => {
      wall = WallFactory({
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(0, 0, 5),
      });

      const mesh = wall.children[0];

      // Wall should be rotated 90 degrees around Y-axis
      const expectedRotation = Math.PI / 2;
      expect(Math.abs(mesh.rotation.y - expectedRotation)).toBeLessThan(0.1);
    });

    it('positions wall at midpoint between start and end', () => {
      wall = WallFactory({
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(10, 0, 0),
        height: 2.8,
      });

      const mesh = wall.children[0];

      // Wall should be centered at x=5
      expect(mesh.position.x).toBeCloseTo(5, 5);
      expect(mesh.position.z).toBeCloseTo(0, 5);

      // Wall should be raised by half height
      expect(mesh.position.y).toBeCloseTo(1.4, 5);
    });
  });
});
