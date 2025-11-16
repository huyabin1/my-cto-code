import * as THREE from 'three';

/**
 * SceneGraph - Shared scene graph manager for 2D/3D viewport synchronization
 *
 * Manages entities (walls, objects), materials, and provides synchronization
 * between multiple viewports. Acts as a single source of truth for scene data.
 */
export class SceneGraph {
  constructor() {
    this.entities = new Map();
    this.materials = new Map();
    this.observers = new Set();
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'scene-graph-root';
  }

  /**
   * Add an entity to the scene graph
   * @param {string} id - Unique identifier for the entity
   * @param {Object} entity - Entity data (type, geometry, material, etc.)
   * @param {THREE.Object3D} threeObject - Three.js object representation
   */
  addEntity(id, entity, threeObject) {
    if (this.entities.has(id)) {
      console.warn(`Entity ${id} already exists, replacing it`);
      this.removeEntity(id);
    }

    const entityData = {
      id,
      entity,
      threeObject,
      timestamp: Date.now(),
    };

    this.entities.set(id, entityData);

    if (threeObject) {
      threeObject.userData.entityId = id;
      this.rootGroup.add(threeObject);
    }

    this.notifyObservers({
      type: 'entity-added',
      id,
      data: entityData,
    });

    return entityData;
  }

  /**
   * Remove an entity from the scene graph
   * @param {string} id - Entity identifier
   */
  removeEntity(id) {
    const entityData = this.entities.get(id);
    if (!entityData) {
      return false;
    }

    if (entityData.threeObject && entityData.threeObject.parent) {
      entityData.threeObject.parent.remove(entityData.threeObject);

      // Dispose geometry and materials
      if (entityData.threeObject.geometry) {
        entityData.threeObject.geometry.dispose();
      }
      if (entityData.threeObject.material) {
        if (Array.isArray(entityData.threeObject.material)) {
          entityData.threeObject.material.forEach((mat) => mat.dispose());
        } else {
          entityData.threeObject.material.dispose();
        }
      }
    }

    this.entities.delete(id);

    this.notifyObservers({
      type: 'entity-removed',
      id,
    });

    return true;
  }

  /**
   * Update an entity
   * @param {string} id - Entity identifier
   * @param {Object} updates - Updates to apply
   */
  updateEntity(id, updates) {
    const entityData = this.entities.get(id);
    if (!entityData) {
      return false;
    }

    Object.assign(entityData.entity, updates);
    entityData.timestamp = Date.now();

    this.notifyObservers({
      type: 'entity-updated',
      id,
      data: entityData,
      updates,
    });

    return true;
  }

  /**
   * Get entity by ID
   * @param {string} id - Entity identifier
   */
  getEntity(id) {
    return this.entities.get(id);
  }

  /**
   * Get all entities
   */
  getAllEntities() {
    return Array.from(this.entities.values());
  }

  /**
   * Clear all entities
   */
  clearEntities() {
    const ids = Array.from(this.entities.keys());
    ids.forEach((id) => this.removeEntity(id));
  }

  /**
   * Register a material
   * @param {string} name - Material name
   * @param {THREE.Material} material - Three.js material
   */
  registerMaterial(name, material) {
    this.materials.set(name, material);

    this.notifyObservers({
      type: 'material-registered',
      name,
      material,
    });
  }

  /**
   * Get a material by name
   * @param {string} name - Material name
   */
  getMaterial(name) {
    return this.materials.get(name);
  }

  /**
   * Get all materials
   */
  getAllMaterials() {
    return Array.from(this.materials.entries());
  }

  /**
   * Get the root group for adding to a scene
   */
  getRootGroup() {
    return this.rootGroup;
  }

  /**
   * Subscribe to scene graph changes
   * @param {Function} callback - Callback function (event) => void
   */
  subscribe(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Unsubscribe from scene graph changes
   * @param {Function} callback - Callback function to remove
   */
  unsubscribe(callback) {
    this.observers.delete(callback);
  }

  /**
   * Notify all observers of a change
   * @param {Object} event - Event data
   */
  notifyObservers(event) {
    this.observers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in scene graph observer:', error);
      }
    });
  }

  /**
   * Serialize scene graph to JSON
   */
  serialize() {
    const entities = Array.from(this.entities.entries()).map(([id, data]) => ({
      id,
      entity: data.entity,
      timestamp: data.timestamp,
    }));

    const materials = Array.from(this.materials.entries()).map(([name, material]) => ({
      name,
      type: material.type,
      color: material.color ? material.color.getHex() : null,
      opacity: material.opacity,
      transparent: material.transparent,
    }));

    return {
      entities,
      materials,
    };
  }

  /**
   * Deserialize scene graph from JSON
   * @param {Object} data - Serialized data
   */
  deserialize(data) {
    // Clear existing data
    this.clearEntities();
    this.materials.clear();

    // Restore materials
    if (data.materials) {
      data.materials.forEach((matData) => {
        const material = new THREE.MeshStandardMaterial({
          color: matData.color || 0xffffff,
          opacity: matData.opacity ?? 1,
          transparent: matData.transparent ?? false,
        });
        this.registerMaterial(matData.name, material);
      });
    }

    // Note: entities need to be reconstructed by the application
    // since we can't serialize Three.js objects directly
    return data.entities || [];
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.clearEntities();

    // Dispose materials
    this.materials.forEach((material) => {
      material.dispose();
    });
    this.materials.clear();

    this.observers.clear();
  }
}

// Singleton instance
let sharedSceneGraph = null;

/**
 * Get or create the shared scene graph instance
 */
export function getSharedSceneGraph() {
  if (!sharedSceneGraph) {
    sharedSceneGraph = new SceneGraph();
  }
  return sharedSceneGraph;
}

/**
 * Reset the shared scene graph (useful for testing)
 */
export function resetSharedSceneGraph() {
  if (sharedSceneGraph) {
    sharedSceneGraph.dispose();
  }
  sharedSceneGraph = null;
}

export default SceneGraph;
