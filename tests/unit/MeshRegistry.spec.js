import * as THREE from 'three';
import { resetThreeMocks, mockMesh } from './__mocks__/threeMock';
import MeshRegistry from '@/three/factory/MeshRegistry';

// Mock factories
const mockWallMeshFactory = {
  create: jest.fn((config) => {
    const mesh = mockMesh();
    mesh.userData = {
      type: 'wall',
      id: 'mock-uuid-0',
      config,
    };
    return mesh;
  }),
  update: jest.fn((mesh, config) => {
    mesh.userData.config = { ...mesh.userData.config, ...config };
  }),
};

const mockFloorMeshFactory = {
  create: jest.fn((config) => {
    const mesh = mockMesh();
    mesh.userData = {
      type: 'floor',
      id: 'mock-uuid-0',
      config,
    };
    return mesh;
  }),
  update: jest.fn((mesh, config) => {
    mesh.userData.config = { ...mesh.userData.config, ...config };
  }),
};

jest.mock('@/three/factory/WallMeshFactory', () => mockWallMeshFactory);
jest.mock('@/three/factory/FloorMeshFactory', () => mockFloorMeshFactory);

// Mock material library
jest.mock('@/three/materials', () => ({
  getMaterial: jest.fn(() => ({
    dispose: jest.fn(),
  })),
  disposeMaterial: jest.fn(),
  dispose: jest.fn(),
}));

describe('MeshRegistry', () => {
  let registry;

  beforeEach(() => {
    resetThreeMocks();
    registry = new MeshRegistry();
  });

  afterEach(() => {
    registry.dispose();
  });

  describe('createWall', () => {
    it('creates a wall mesh', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(5, 0),
        height: 3,
        material: 'concrete',
      };
      const id = 'wall-1';

      const mesh = registry.createWall(id, config);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.userData.registryId).toBe(id);
      expect(registry.hasMesh(id)).toBe(true);
      expect(registry.getMesh(id)).toBe(mesh);
    });

    it('throws error when creating wall with existing id', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(1, 0),
      };
      const id = 'wall-1';

      registry.createWall(id, config);

      expect(() => {
        registry.createWall(id, config);
      }).toThrow(`Mesh with id '${id}' already exists`);
    });
  });

  describe('createFloor', () => {
    it('creates a floor mesh', () => {
      const config = {
        points: [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(3, 0),
          new THREE.Vector2(3, 3),
          new THREE.Vector2(0, 3),
        ],
        thickness: 0.2,
        material: 'wood',
      };
      const id = 'floor-1';

      const mesh = registry.createFloor(id, config);

      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.userData.registryId).toBe(id);
      expect(registry.hasMesh(id)).toBe(true);
      expect(registry.getMesh(id)).toBe(mesh);
    });

    it('throws error when creating floor with existing id', () => {
      const config = {
        points: [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(2, 0),
          new THREE.Vector2(2, 2),
          new THREE.Vector2(0, 2),
        ],
      };
      const id = 'floor-1';

      registry.createFloor(id, config);

      expect(() => {
        registry.createFloor(id, config);
      }).toThrow(`Mesh with id '${id}' already exists`);
    });
  });

  describe('updateMesh', () => {
    it('updates a wall mesh', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(3, 0),
        height: 2.5,
      };
      const id = 'wall-1';
      const mesh = registry.createWall(id, config);

      const newConfig = { height: 4.0, material: 'glass' };
      const updatedMesh = registry.updateMesh(id, newConfig);

      expect(updatedMesh).toBe(mesh);
      expect(mesh.userData.config.height).toBe(4.0);
      expect(mesh.userData.config.material).toBe('glass');
    });

    it('updates a floor mesh', () => {
      const config = {
        points: [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(2, 0),
          new THREE.Vector2(2, 2),
          new THREE.Vector2(0, 2),
        ],
        thickness: 0.1,
      };
      const id = 'floor-1';
      const mesh = registry.createFloor(id, config);

      const newConfig = { thickness: 0.3, material: 'brick' };
      const updatedMesh = registry.updateMesh(id, newConfig);

      expect(updatedMesh).toBe(mesh);
      expect(mesh.userData.config.thickness).toBe(0.3);
      expect(mesh.userData.config.material).toBe('brick');
    });

    it('throws error when updating non-existent mesh', () => {
      expect(() => {
        registry.updateMesh('non-existent', {});
      }).toThrow("Mesh with id 'non-existent' not found");
    });

    it('throws error when updating unsupported mesh type', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(1, 0),
      };
      const id = 'wall-1';
      const mesh = registry.createWall(id, config);
      mesh.userData.type = 'unsupported';

      expect(() => {
        registry.updateMesh(id, {});
      }).toThrow('Unsupported mesh type: unsupported');
    });
  });

  describe('removeMesh', () => {
    it('removes a mesh and disposes resources', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(2, 0),
      };
      const id = 'wall-1';
      const mesh = registry.createWall(id, config);

      const removed = registry.removeMesh(id);

      expect(removed).toBe(true);
      expect(registry.hasMesh(id)).toBe(false);
      expect(registry.getMesh(id)).toBeNull();
      expect(mesh.geometry.dispose).toHaveBeenCalled();
    });

    it('removes a mesh without disposing resources', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(2, 0),
      };
      const id = 'wall-1';
      const mesh = registry.createWall(id, config);

      const removed = registry.removeMesh(id, false);

      expect(removed).toBe(true);
      expect(registry.hasMesh(id)).toBe(false);
      expect(mesh.geometry.dispose).not.toHaveBeenCalled();
    });

    it('returns false when removing non-existent mesh', () => {
      const removed = registry.removeMesh('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('getMeshesByType', () => {
    it('returns meshes of specified type', () => {
      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(2, 0),
      };
      const floorConfig = {
        points: [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(2, 0),
          new THREE.Vector2(2, 2),
          new THREE.Vector2(0, 2),
        ],
      };

      registry.createWall('wall-1', wallConfig);
      registry.createWall('wall-2', wallConfig);
      registry.createFloor('floor-1', floorConfig);

      const walls = registry.getMeshesByType('wall');
      const floors = registry.getMeshesByType('floor');

      expect(walls).toHaveLength(2);
      expect(floors).toHaveLength(1);
      expect(walls[0].userData.type).toBe('wall');
      expect(floors[0].userData.type).toBe('floor');
    });
  });

  describe('batch operations', () => {
    it('creates multiple walls', () => {
      const configs = [
        {
          id: 'wall-1',
          start: new THREE.Vector2(0, 0),
          end: new THREE.Vector2(2, 0),
        },
        {
          id: 'wall-2',
          start: new THREE.Vector2(0, 0),
          end: new THREE.Vector2(0, 2),
        },
        {
          start: new THREE.Vector2(2, 0),
          end: new THREE.Vector2(2, 2),
        },
      ];

      const walls = registry.createWalls(configs);

      expect(walls).toHaveLength(3);
      expect(registry.getMeshCount()).toBe(3);
      expect(registry.hasMesh('wall-1')).toBe(true);
      expect(registry.hasMesh('wall-2')).toBe(true);
    });

    it('creates multiple floors', () => {
      const floorConfig = {
        points: [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(2, 0),
          new THREE.Vector2(2, 2),
          new THREE.Vector2(0, 2),
        ],
      };
      const configs = [
        { id: 'floor-1', ...floorConfig },
        { id: 'floor-2', ...floorConfig },
        floorConfig, // no id, should get auto-generated
      ];

      const floors = registry.createFloors(configs);

      expect(floors).toHaveLength(3);
      expect(registry.getMeshCount()).toBe(3);
      expect(registry.hasMesh('floor-1')).toBe(true);
      expect(registry.hasMesh('floor-2')).toBe(true);
    });
  });

  describe('object pooling', () => {
    it('recycles meshes from pool', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(2, 0),
      };
      const id = 'wall-1';

      // Create and remove mesh to add to pool
      const mesh = registry.createWall(id, config);
      registry.removeMesh(id, false); // don't dispose, add to pool

      // Create new mesh, should reuse from pool
      const newMesh = registry.createWall('wall-2', config);

      expect(newMesh).toBe(mesh);
      expect(registry.getStats().recycled).toBe(1);
    });

    it('limits pool size', () => {
      const config = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(1, 0),
      };

      // Create many meshes and return them to pool
      const meshes = [];
      for (let i = 0; i < 60; i += 1) {
        const mesh = registry.createWall(`wall-${i}`, config);
        meshes.push(mesh);
      }

      // Return all to pool
      meshes.forEach((mesh, i) => {
        registry.removeMesh(`wall-${i}`, false);
      });

      // Pool should be limited to 50
      const poolStats = registry.getPoolStats();
      expect(poolStats.wall).toBeLessThanOrEqual(50);
    });
  });

  describe('statistics', () => {
    it('tracks statistics correctly', () => {
      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(2, 0),
      };
      const floorConfig = {
        points: [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(2, 0),
          new THREE.Vector2(2, 2),
          new THREE.Vector2(0, 2),
        ],
      };

      // Create meshes
      registry.createWall('wall-1', wallConfig);
      registry.createFloor('floor-1', floorConfig);

      let stats = registry.getStats();
      expect(stats.created).toBe(2);
      expect(stats.activeMeshes).toBe(2);

      // Update mesh
      registry.updateMesh('wall-1', { height: 4 });

      stats = registry.getStats();
      expect(stats.updated).toBe(1);

      // Remove mesh
      registry.removeMesh('wall-1');

      stats = registry.getStats();
      expect(stats.disposed).toBe(1);
      expect(stats.activeMeshes).toBe(1);

      // Reset stats
      registry.resetStats();
      stats = registry.getStats();
      expect(stats.created).toBe(0);
      expect(stats.updated).toBe(0);
      expect(stats.disposed).toBe(0);
    });
  });

  describe('export/import', () => {
    it('exports mesh data correctly', () => {
      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(3, 0),
        height: 2.5,
        material: 'concrete',
      };
      const floorConfig = {
        points: [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(2, 0),
          new THREE.Vector2(2, 2),
          new THREE.Vector2(0, 2),
        ],
        thickness: 0.15,
        material: 'wood',
      };

      registry.createWall('wall-1', wallConfig);
      registry.createFloor('floor-1', floorConfig);

      const exportedData = registry.exportMeshData();

      expect(exportedData).toHaveLength(2);
      expect(exportedData[0].id).toBe('wall-1');
      expect(exportedData[0].type).toBe('wall');
      expect(exportedData[0].config).toEqual(wallConfig);
      expect(exportedData[1].id).toBe('floor-1');
      expect(exportedData[1].type).toBe('floor');
      expect(exportedData[1].config).toEqual(floorConfig);
    });

    it('imports mesh data correctly', () => {
      const meshData = [
        {
          id: 'wall-1',
          type: 'wall',
          config: {
            start: new THREE.Vector2(0, 0),
            end: new THREE.Vector2(4, 0),
            height: 3,
            material: 'brick',
          },
          visible: true,
          position: [0, 1.5, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        {
          id: 'floor-1',
          type: 'floor',
          config: {
            points: [
              new THREE.Vector2(0, 0),
              new THREE.Vector2(3, 0),
              new THREE.Vector2(3, 3),
              new THREE.Vector2(0, 3),
            ],
            thickness: 0.2,
            material: 'concrete',
          },
          visible: false,
          position: [1.5, 0.1, 1.5],
          rotation: [0, Math.PI / 4, 0],
          scale: [1, 1, 1],
        },
      ];

      const importedMeshes = registry.importMeshData(meshData);

      expect(importedMeshes).toHaveLength(2);
      expect(registry.getMeshCount()).toBe(2);
      expect(registry.hasMesh('wall-1')).toBe(true);
      expect(registry.hasMesh('floor-1')).toBe(true);

      const wallMesh = registry.getMesh('wall-1');
      expect(wallMesh.position.x).toBe(0);
      expect(wallMesh.position.y).toBe(1.5);
      expect(wallMesh.position.z).toBe(0);
      expect(wallMesh.visible).toBe(true);

      const floorMesh = registry.getMesh('floor-1');
      expect(floorMesh.position.x).toBe(1.5);
      expect(floorMesh.position.y).toBe(0.1);
      expect(floorMesh.position.z).toBe(1.5);
      expect(floorMesh.visible).toBe(false);
    });
  });

  describe('clear operations', () => {
    it('clears all meshes with disposal', () => {
      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(2, 0),
      };
      const floorConfig = {
        points: [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(2, 0),
          new THREE.Vector2(2, 2),
          new THREE.Vector2(0, 2),
        ],
      };

      registry.createWall('wall-1', wallConfig);
      registry.createFloor('floor-1', floorConfig);

      registry.clear(true);

      expect(registry.getMeshCount()).toBe(0);
    });

    it('clears all meshes without disposal', () => {
      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(2, 0),
      };
      const mesh = registry.createWall('wall-1', wallConfig);

      registry.clear(false);

      expect(registry.getMeshCount()).toBe(0);
      expect(mesh.geometry.dispose).not.toHaveBeenCalled();
    });

    it('clears object pool', () => {
      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(1, 0),
      };

      // Add meshes to pool
      const mesh = registry.createWall('wall-1', wallConfig);
      registry.removeMesh('wall-1', false);

      expect(registry.getPoolStats().wall).toBe(1);

      registry.clearPool();

      expect(registry.getPoolStats().wall).toBeUndefined();
      expect(mesh.geometry.dispose).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('disposes all resources', () => {
      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(2, 0),
      };

      registry.createWall('wall-1', wallConfig);
      registry.removeMesh('wall-1', false); // add to pool

      registry.dispose();

      expect(registry.getMeshCount()).toBe(0);
      expect(Object.keys(registry.getPoolStats())).toHaveLength(0);
    });
  });
});
