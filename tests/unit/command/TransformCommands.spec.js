import * as THREE from 'three';
import { TransformEntityCommand } from '@/three/command/TransformCommands';
import { getSharedSceneGraph, resetSharedSceneGraph } from '@/three/core/SceneGraph';

describe('TransformEntityCommand', () => {
  let store;
  let entity;
  let sceneGraph;
  let object3D;

  beforeEach(() => {
    resetSharedSceneGraph();
    entity = {
      id: 'wall-1',
      type: 'wall',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };

    store = {
      state: {
        editor: {
          entities: [entity],
        },
      },
    };

    sceneGraph = getSharedSceneGraph();
    object3D = new THREE.Object3D();
    sceneGraph.addEntity(entity.id, { ...entity }, object3D);
  });

  afterEach(() => {
    resetSharedSceneGraph();
  });

  it('should apply transform and undo correctly', async () => {
    const before = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
    const after = {
      position: [2, 0, -3],
      rotation: [0, Math.PI / 4, 0],
      scale: [1.5, 1.5, 1.5],
    };

    const command = new TransformEntityCommand(store, entity.id, before, after, {
      sceneGraph,
    });

    await command.execute();

    expect(entity.position).toEqual(after.position);
    expect(entity.rotation).toEqual(after.rotation);
    expect(entity.scale).toEqual(after.scale);

    expect(object3D.position.toArray()).toEqual(after.position);
    expect(object3D.rotation.y).toBeCloseTo(after.rotation[1]);

    await command.undo();

    expect(entity.position).toEqual(before.position);
    expect(entity.rotation).toEqual(before.rotation);
    expect(entity.scale).toEqual(before.scale);
    expect(object3D.position.toArray()).toEqual(before.position);
  });

  it('should merge consecutive transforms for same entity', () => {
    const base = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
    const mid = {
      position: [1, 0, 0],
      rotation: [0, 0.5, 0],
      scale: [1, 1, 1],
    };
    const end = {
      position: [2, 0, 0],
      rotation: [0, 1, 0],
      scale: [1, 1, 1],
    };

    const commandA = new TransformEntityCommand(store, entity.id, base, mid, { sceneGraph });
    const commandB = new TransformEntityCommand(store, entity.id, mid, end, { sceneGraph });

    expect(commandA.canMerge(commandB)).toBe(true);

    const merged = commandA.merge(commandB);

    expect(merged.beforeTransform).toEqual(commandA.beforeTransform);
    expect(merged.afterTransform).toEqual(commandB.afterTransform);
  });

  it('should throw when entity is missing', () => {
    const missingStore = {
      state: {
        editor: {
          entities: [],
        },
      },
    };

    resetSharedSceneGraph();
    const emptySceneGraph = getSharedSceneGraph();

    expect(() =>
      new TransformEntityCommand(missingStore, 'missing-entity', {}, {}, { sceneGraph: emptySceneGraph })
    ).toThrow('Entity missing-entity not found');
  });
});
