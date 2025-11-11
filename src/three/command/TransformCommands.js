import * as THREE from 'three';
import Command from './Command';
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

function cloneVectorArray(source, fallback) {
  if (Array.isArray(source) && source.length === 3) {
    return [...source];
  }
  if (source instanceof THREE.Vector3) {
    return source.toArray();
  }
  if (source instanceof THREE.Euler) {
    return [source.x, source.y, source.z];
  }
  return [...fallback];
}

function normalizeTransform(transform = {}) {
  const basePosition = [0, 0, 0];
  const baseRotation = [0, 0, 0];
  const baseScale = [1, 1, 1];

  return {
    position: cloneVectorArray(transform.position, basePosition),
    rotation: cloneVectorArray(transform.rotation, baseRotation),
    scale: cloneVectorArray(transform.scale, baseScale),
  };
}

function applyObjectTransform(object3d, transform) {
  if (!object3d) {
    return;
  }

  const position = new THREE.Vector3().fromArray(transform.position);
  const rotation = new THREE.Euler(...transform.rotation, 'XYZ');
  const scale = new THREE.Vector3().fromArray(transform.scale);

  object3d.position.copy(position);
  object3d.rotation.copy(rotation);
  object3d.scale.copy(scale);
  object3d.updateMatrixWorld(true);
}

/**
 * TransformEntityCommand - Applies translation/rotation/scale to an entity with undo/redo support.
 */
class TransformEntityCommand extends Command {
  /**
   * @param {Object} store - Vuex store instance
   * @param {string} entityId - Entity identifier
   * @param {Object} beforeTransform - Transform before operation
   * @param {Object} afterTransform - Transform after operation
   * @param {Object} [options]
   * @param {Object} [options.sceneGraph] - Scene graph instance
   */
  constructor(store, entityId, beforeTransform, afterTransform, options = {}) {
    super();
    this.store = store;
    this.entityId = entityId;
    this.beforeTransform = normalizeTransform(beforeTransform);
    this.afterTransform = normalizeTransform(afterTransform);
    this.sceneGraph = options.sceneGraph || getSharedSceneGraph();
    this.description = `Transform entity ${entityId}`;

    const entity = this.store.state.editor.entities.find((item) => item.id === entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    this.entity = entity;
  }

  async execute() {
    return this.applyTransform(this.afterTransform);
  }

  async undo() {
    return this.applyTransform(this.beforeTransform);
  }

  applyTransform(transform) {
    if (this.entity) {
      this.entity.position = [...transform.position];
      this.entity.rotation = [...transform.rotation];
      this.entity.scale = [...transform.scale];
    }

    const sceneEntity = this.sceneGraph.getEntity(this.entityId);
    if (sceneEntity && sceneEntity.threeObject) {
      applyObjectTransform(sceneEntity.threeObject, transform);
    }

    this.sceneGraph.updateEntity(this.entityId, {
      position: [...transform.position],
      rotation: [...transform.rotation],
      scale: [...transform.scale],
    });

    return transform;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `transform_entity_${this.entityId}`;
  }

  canMerge(other) {
    return other instanceof TransformEntityCommand && other.entityId === this.entityId;
  }

  merge(other) {
    return new TransformEntityCommand(
      this.store,
      this.entityId,
      this.beforeTransform,
      other.afterTransform,
      { sceneGraph: this.sceneGraph }
    );
  }
}

export { TransformEntityCommand };
