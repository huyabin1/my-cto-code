import * as THREE from 'three';
import WallMeshFactory from '@/three/factory/WallMeshFactory';
import FloorMeshFactory from '@/three/factory/FloorMeshFactory';
import MeshRegistry from '@/three/factory/MeshRegistry';
import MaterialLibrary from '@/three/materials/MaterialLibrary';

describe('Extrusion Mesh Pipeline Integration', () => {
  let registry;
  let materialLibrary;

  beforeEach(() => {
    registry = new MeshRegistry();
    materialLibrary = new MaterialLibrary();
  });

  afterEach(() => {
    registry.dispose();
    materialLibrary.dispose();
  });

  describe('WallMeshFactory', () => {
    it('creates wall with correct geometry', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(5, 0),
        height: 3,
        thickness: 0.2,
        material: 'concrete',
      };

      const mesh = WallMeshFactory.create(config);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.userData.type).toBe('wall');
      expect(mesh.userData.config).toEqual(config);
      expect(mesh.geometry).toBeInstanceOf(THREE.ExtrudeGeometry);
    });

    it('updates wall correctly', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(3, 0),
        height: 2.5,
      };
      const mesh = WallMeshFactory.create(config);

      const newConfig = { height: 4.0 };
      WallMeshFactory.update(mesh, newConfig);

      expect(mesh.userData.config.height).toBe(4.0);
    });
  });

  describe('FloorMeshFactory', () => {
    it('creates floor with correct geometry', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 3),
        new THREE.Vector2(0, 3),
      ];
      const config = {
        points,
        thickness: 0.15,
        material: 'wood',
      };

      const mesh = FloorMeshFactory.create(config);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.userData.type).toBe('floor');
      expect(mesh.userData.config).toEqual(config);
      expect(mesh.geometry).toBeInstanceOf(THREE.ExtrudeGeometry);
    });

    it('updates floor correctly', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0),
        new THREE.Vector2(2, 2),
        new THREE.Vector2(0, 2),
      ];
      const config = { points, thickness: 0.1 };
      const mesh = FloorMeshFactory.create(config);

      const newConfig = { thickness: 0.3 };
      FloorMeshFactory.update(mesh, newConfig);

      expect(mesh.userData.config.thickness).toBe(0.3);
    });
  });

  describe('MeshRegistry', () => {
    it('creates and manages walls', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(4, 0),
        height: 2.8,
        material: 'brick',
      };
      const id = 'test-wall-1';

      const mesh = registry.createWall(id, config);

      expect(registry.hasMesh(id)).toBe(true);
      expect(registry.getMesh(id)).toBe(mesh);
      expect(registry.getMeshCount()).toBe(1);
    });

    it('creates and manages floors', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 3),
        new THREE.Vector2(0, 3),
      ];
      const config = { points, thickness: 0.2, material: 'concrete' };
      const id = 'test-floor-1';

      const mesh = registry.createFloor(id, config);

      expect(registry.hasMesh(id)).toBe(true);
      expect(registry.getMesh(id)).toBe(mesh);
      expect(registry.getMeshCount()).toBe(1);
    });

    it('updates meshes', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(2, 0),
        height: 2.0,
      };
      const id = 'test-wall-1';
      const mesh = registry.createWall(id, config);

      const newConfig = { height: 3.5, material: 'glass' };
      const updatedMesh = registry.updateMesh(id, newConfig);

      expect(updatedMesh).toBe(mesh);
      expect(mesh.userData.config.height).toBe(3.5);
      expect(mesh.userData.config.material).toBe('glass');
    });

    it('removes meshes', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(2, 0),
        height: 2.0,
      };
      const id = 'test-wall-1';
      const mesh = registry.createWall(id, config);

      const removed = registry.removeMesh(id);

      expect(removed).toBe(true);
      expect(registry.hasMesh(id)).toBe(false);
      expect(registry.getMesh(id)).toBeNull();
    });
  });

  describe('MaterialLibrary', () => {
    it('creates materials with presets', () => {
      const concreteMaterial = materialLibrary.getMaterial('concrete');
      const woodMaterial = materialLibrary.getMaterial('wood');
      const glassMaterial = materialLibrary.getMaterial('glass');

      expect(concreteMaterial.color.getHex()).toBe(0x888888);
      expect(concreteMaterial.roughness).toBe(0.8);
      expect(concreteMaterial.metalness).toBe(0.2);

      expect(woodMaterial.color.getHex()).toBe(0x8b4513);
      expect(woodMaterial.roughness).toBe(0.9);
      expect(woodMaterial.metalness).toBe(0.1);

      expect(glassMaterial.transparent).toBe(true);
      expect(glassMaterial.opacity).toBe(0.8);
      expect(glassMaterial.transmission).toBe(0.9);
    });

    it('creates materials with custom options', () => {
      const customMaterial = materialLibrary.getMaterial('concrete', {
        color: 0xff0000,
        roughness: 0.3,
        metalness: 0.7,
      });

      expect(customMaterial.color.getHex()).toBe(0xff0000);
      expect(customMaterial.roughness).toBe(0.3);
      expect(customMaterial.metalness).toBe(0.7);
    });

    it('caches materials', () => {
      const material1 = materialLibrary.getMaterial('concrete');
      const material2 = materialLibrary.getMaterial('concrete');

      expect(material1).toBe(material2);
    });
  });

  describe('Bounding Box Calculations', () => {
    it('calculates correct bounding box for walls', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(5, 0),
        height: 3,
        thickness: 0.2,
      };
      const mesh = WallMeshFactory.create(config);

      const box = WallMeshFactory.getBoundingBox(mesh);

      expect(box).toBeInstanceOf(THREE.Box3);

      const size = new THREE.Vector3();
      box.getSize(size);

      expect(size.x).toBeCloseTo(5, 1);
      expect(size.y).toBeCloseTo(3, 1);
      expect(size.z).toBeCloseTo(0.2, 1);
    });

    it('calculates correct bounding box for floors', () => {
      const points = [
        new THREE.Vector2(-1.5, -1.5),
        new THREE.Vector2(1.5, -1.5),
        new THREE.Vector2(1.5, 1.5),
        new THREE.Vector2(-1.5, 1.5),
      ];
      const config = { points, thickness: 0.15 };
      const mesh = FloorMeshFactory.create(config);

      const box = FloorMeshFactory.getBoundingBox(mesh);

      expect(box).toBeInstanceOf(THREE.Box3);

      const size = new THREE.Vector3();
      box.getSize(size);

      expect(size.x).toBeCloseTo(3, 1);
      expect(size.y).toBeCloseTo(0.15, 1);
      expect(size.z).toBeCloseTo(3, 1);
    });
  });

  describe('Volume and Surface Area Calculations', () => {
    it('calculates wall volume correctly', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(4, 0),
        height: 2.5,
        thickness: 0.3,
      };

      const volume = WallMeshFactory.calculateVolume(config);

      expect(volume).toBeCloseTo(4 * 2.5 * 0.3, 1);
    });

    it('calculates wall surface area correctly', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(4, 0),
        height: 2.5,
        thickness: 0.3,
      };

      const area = WallMeshFactory.calculateSurfaceArea(config);

      const expected = 2 * 4 * 2.5 + 2 * 0.3 * 2.5 + 2 * 4 * 0.3;
      expect(area).toBeCloseTo(expected, 1);
    });

    it('calculates floor volume correctly', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 2),
        new THREE.Vector2(0, 2),
      ];
      const config = { points, thickness: 0.2 };

      const volume = FloorMeshFactory.calculateVolume(config);

      // Area of rectangle: 3 * 2 = 6
      expect(volume).toBeCloseTo(6 * 0.2, 1);
    });

    it('calculates floor surface area correctly', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(3, 0),
        new THREE.Vector2(3, 2),
        new THREE.Vector2(0, 2),
      ];
      const config = { points, thickness: 0.2 };

      const area = FloorMeshFactory.calculateSurfaceArea(config);

      // Area: 6, perimeter: 10, thickness: 0.2
      const expected = 2 * 6 + 10 * 0.2;
      expect(area).toBeCloseTo(expected, 1);
    });
  });

  describe('Geometry Creation', () => {
    it('creates wall extrude geometry with correct parameters', () => {
      const geometry = WallMeshFactory.createWallGeometry(5, 3, 0.2);

      expect(geometry).toBeInstanceOf(THREE.ExtrudeGeometry);
    });

    it('creates floor extrude geometry with correct parameters', () => {
      const points = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(2, 0),
        new THREE.Vector2(2, 2),
        new THREE.Vector2(0, 2),
      ];
      const geometry = FloorMeshFactory.createFloorGeometry(points, 0.15);

      expect(geometry).toBeInstanceOf(THREE.ExtrudeGeometry);
    });
  });
});
