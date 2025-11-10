import Command from './Command';
import WallFactory from '@/three/factory/WallFactory';
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

/**
 * UpdateEntityPropertyCommand - 更新实体属性命令
 * 支持撤销/重做，并触发几何重算
 */
class UpdateEntityPropertyCommand extends Command {
  /**
   * @param {Object} store - Vuex store实例
   * @param {string} entityId - 实体ID
   * @param {string} property - 属性名称（如 'height', 'thickness', 'material', 'color'）
   * @param {*} newValue - 新值
   * @param {*} [oldValue] - 旧值（如果不提供，会从store中获取）
   */
  constructor(store, entityId, property, newValue, oldValue = null) {
    super();
    this.store = store;
    this.entityId = entityId;
    this.property = property;
    this.newValue = newValue;
    this.sceneGraph = getSharedSceneGraph();
    
    // Get old value from entity data if not provided
    const entity = this.store.state.editor.entities.find((e) => e.id === entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }
    
    this.oldValue = oldValue !== null ? oldValue : entity[property];
    this.entity = entity;
    this.description = `更新实体${entityId}.${property}: ${this.oldValue} -> ${newValue}`;
  }

  async execute() {
    return this.applyPropertyUpdate(this.newValue);
  }

  async undo() {
    return this.applyPropertyUpdate(this.oldValue);
  }

  /**
   * Apply property update to entity and trigger geometry recalculation
   * @private
   */
  applyPropertyUpdate(value) {
    const entity = this.store.state.editor.entities.find((e) => e.id === this.entityId);
    if (!entity) {
      throw new Error(`Entity ${this.entityId} not found`);
    }

    // Update entity in store
    entity[this.property] = value;

    // Get Three.js object from scene graph
    const entityData = this.sceneGraph.getEntity(this.entityId);
    if (entityData && entityData.threeObject && entity.type === 'wall') {
      // Prepare update config for WallFactory
      const updateConfig = {};
      
      // Map store properties to factory config properties
      const propertyMap = {
        height: 'height',
        thickness: 'thickness',
        material: 'material',
        color: 'color',
      };

      if (propertyMap[this.property]) {
        updateConfig[propertyMap[this.property]] = value;
      }

      // Apply update through factory
      if (Object.keys(updateConfig).length > 0) {
        try {
          WallFactory.update(entityData.threeObject, updateConfig);
          
          // Trigger Three.js render update
          entityData.threeObject.updateMatrixWorld(true);
        } catch (error) {
          console.error('Failed to update wall geometry:', error);
        }
      }
    }

    // Update entity in scene graph
    this.sceneGraph.updateEntity(this.entityId, {
      [this.property]: value,
    });

    return value;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `update_entity_property_${this.entityId}_${this.property}_${Date.now()}`;
  }

  canMerge(other) {
    return (
      other instanceof UpdateEntityPropertyCommand &&
      this.entityId === other.entityId &&
      this.property === other.property
    );
  }

  merge(other) {
    return new UpdateEntityPropertyCommand(
      this.store,
      this.entityId,
      this.property,
      other.newValue,
      this.oldValue
    );
  }
}

export { UpdateEntityPropertyCommand };
