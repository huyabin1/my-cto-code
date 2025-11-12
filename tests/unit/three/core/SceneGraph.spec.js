import * as THREE from 'three';
import SceneGraph, { getSharedSceneGraph, resetSharedSceneGraph } from '@/three/core/SceneGraph';

describe('SceneGraph', () => {
  let sceneGraph;

  beforeEach(() => {
    sceneGraph = new SceneGraph();
  });

  afterEach(() => {
    if (sceneGraph) {
      sceneGraph.dispose();
    }
    resetSharedSceneGraph();
  });

  describe('Entity Management', () => {
    it('should add an entity', () => {
      const entity = { type: 'wall', height: 2.8 };
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());

      const result = sceneGraph.addEntity('wall-1', entity, mesh);

      expect(result).toBeDefined();
      expect(result.id).toBe('wall-1');
      expect(result.entity).toBe(entity);
      expect(result.threeObject).toBe(mesh);
      expect(mesh.userData.entityId).toBe('wall-1');
    });

    it('should get an entity by id', () => {
      const entity = { type: 'wall' };
      sceneGraph.addEntity('wall-1', entity, null);

      const retrieved = sceneGraph.getEntity('wall-1');

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe('wall-1');
      expect(retrieved.entity).toBe(entity);
    });

    it('should remove an entity', () => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      sceneGraph.addEntity('wall-1', {}, mesh);

      const removed = sceneGraph.removeEntity('wall-1');

      expect(removed).toBe(true);
      expect(sceneGraph.getEntity('wall-1')).toBeUndefined();
    });

    it('should update an entity', () => {
      const entity = { type: 'wall', height: 2.8 };
      sceneGraph.addEntity('wall-1', entity, null);

      const updated = sceneGraph.updateEntity('wall-1', { height: 3.0 });

      expect(updated).toBe(true);
      const retrieved = sceneGraph.getEntity('wall-1');
      expect(retrieved.entity.height).toBe(3.0);
    });

    it('should get all entities', () => {
      sceneGraph.addEntity('wall-1', { type: 'wall' }, null);
      sceneGraph.addEntity('wall-2', { type: 'wall' }, null);

      const entities = sceneGraph.getAllEntities();

      expect(entities).toHaveLength(2);
    });

    it('should clear all entities', () => {
      sceneGraph.addEntity('wall-1', { type: 'wall' }, null);
      sceneGraph.addEntity('wall-2', { type: 'wall' }, null);

      sceneGraph.clearEntities();

      expect(sceneGraph.getAllEntities()).toHaveLength(0);
    });

    it('should replace entity if id already exists', () => {
      const entity1 = { type: 'wall', height: 2.8 };
      const entity2 = { type: 'wall', height: 3.0 };

      sceneGraph.addEntity('wall-1', entity1, null);
      sceneGraph.addEntity('wall-1', entity2, null);

      const retrieved = sceneGraph.getEntity('wall-1');
      expect(retrieved.entity).toBe(entity2);
      expect(sceneGraph.getAllEntities()).toHaveLength(1);
    });
  });

  describe('Material Management', () => {
    it('should register a material', () => {
      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });

      sceneGraph.registerMaterial('red-material', material);

      const retrieved = sceneGraph.getMaterial('red-material');
      expect(retrieved).toBe(material);
    });

    it('should get all materials', () => {
      const mat1 = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const mat2 = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

      sceneGraph.registerMaterial('red', mat1);
      sceneGraph.registerMaterial('green', mat2);

      const materials = sceneGraph.getAllMaterials();
      expect(materials).toHaveLength(2);
    });
  });

  describe('Root Group', () => {
    it('should provide a root group', () => {
      const rootGroup = sceneGraph.getRootGroup();

      expect(rootGroup).toBeInstanceOf(THREE.Group);
      expect(rootGroup.name).toBe('scene-graph-root');
    });

    it('should add entities to root group', () => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());

      sceneGraph.addEntity('wall-1', {}, mesh);

      const rootGroup = sceneGraph.getRootGroup();
      expect(rootGroup.children).toContain(mesh);
    });
  });

  describe('Observer Pattern', () => {
    it('should notify observers when entity is added', (done) => {
      const callback = (event) => {
        expect(event.type).toBe('entity-added');
        expect(event.id).toBe('wall-1');
        done();
      };

      sceneGraph.subscribe(callback);
      sceneGraph.addEntity('wall-1', {}, null);
    });

    it('should notify observers when entity is removed', (done) => {
      sceneGraph.addEntity('wall-1', {}, null);

      const callback = (event) => {
        if (event.type === 'entity-removed') {
          expect(event.id).toBe('wall-1');
          done();
        }
      };

      sceneGraph.subscribe(callback);
      sceneGraph.removeEntity('wall-1');
    });

    it('should notify observers when entity is updated', (done) => {
      sceneGraph.addEntity('wall-1', { height: 2.8 }, null);

      const callback = (event) => {
        if (event.type === 'entity-updated') {
          expect(event.id).toBe('wall-1');
          expect(event.updates).toEqual({ height: 3.0 });
          done();
        }
      };

      sceneGraph.subscribe(callback);
      sceneGraph.updateEntity('wall-1', { height: 3.0 });
    });

    it('should unsubscribe observer', () => {
      const callback = jest.fn();

      sceneGraph.subscribe(callback);
      sceneGraph.unsubscribe(callback);
      sceneGraph.addEntity('wall-1', {}, null);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should allow unsubscribe via returned function', () => {
      const callback = jest.fn();

      const unsubscribe = sceneGraph.subscribe(callback);
      unsubscribe();
      sceneGraph.addEntity('wall-1', {}, null);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Serialization', () => {
    it('should serialize scene graph', () => {
      sceneGraph.addEntity('wall-1', { type: 'wall', height: 2.8 }, null);
      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      sceneGraph.registerMaterial('red', material);

      const serialized = sceneGraph.serialize();

      expect(serialized.entities).toHaveLength(1);
      expect(serialized.entities[0].id).toBe('wall-1');
      expect(serialized.materials).toHaveLength(1);
      expect(serialized.materials[0].name).toBe('red');
    });

    it('should deserialize scene graph', () => {
      const data = {
        entities: [{ id: 'wall-1', entity: { type: 'wall' }, timestamp: Date.now() }],
        materials: [{ name: 'red', type: 'MeshStandardMaterial', color: 0xff0000 }],
      };

      sceneGraph.deserialize(data);

      expect(sceneGraph.getMaterial('red')).toBeDefined();
    });
  });

  describe('Shared Singleton', () => {
    it('should return same instance', () => {
      const sg1 = getSharedSceneGraph();
      const sg2 = getSharedSceneGraph();

      expect(sg1).toBe(sg2);
    });

    it('should reset shared instance', () => {
      const sg1 = getSharedSceneGraph();
      resetSharedSceneGraph();
      const sg2 = getSharedSceneGraph();

      expect(sg1).not.toBe(sg2);
    });
  });

  describe('Disposal', () => {
    it('should dispose all resources', () => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      sceneGraph.addEntity('wall-1', {}, mesh);

      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      sceneGraph.registerMaterial('red', material);

      sceneGraph.dispose();

      expect(sceneGraph.getAllEntities()).toHaveLength(0);
      expect(sceneGraph.getAllMaterials()).toHaveLength(0);
    });
  });
});
