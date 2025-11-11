import * as THREE from 'three';
import Command from './Command';
import WallFactory from '../factory/WallFactory';
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

const DEFAULT_COLOR_HEX = '#ffffff';
const DEFAULT_NAME_PREFIX = '墙体';

function toHexColor(value) {
  if (typeof value === 'number') {
    return `#${value.toString(16).padStart(6, '0')}`;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof THREE.Color) {
    return `#${value.getHexString()}`;
  }
  return DEFAULT_COLOR_HEX;
}

function vector2ToArray(vec) {
  if (!vec) {
    return null;
  }
  if (vec instanceof THREE.Vector2) {
    return [vec.x, vec.y];
  }
  if (Array.isArray(vec) && vec.length === 2) {
    return [...vec];
  }
  if (typeof vec.x === 'number' && typeof vec.y === 'number') {
    return [vec.x, vec.y];
  }
  return null;
}

function buildWallEntityData(wall) {
  const config = wall.userData?.config || {};
  const wallId = wall.userData?.id || THREE.MathUtils.generateUUID();
  const fallbackName = `${DEFAULT_NAME_PREFIX} ${wallId.slice(-4)}`;

  return {
    id: wallId,
    type: wall.userData?.type || 'wall',
    name: wall.userData?.name || fallbackName,
    material: config.material,
    color: toHexColor(config.color),
    height: config.height,
    thickness: config.thickness,
    start: vector2ToArray(config.start),
    end: vector2ToArray(config.end),
    position: wall.position.toArray(),
    rotation: [wall.rotation.x, wall.rotation.y, wall.rotation.z],
    scale: wall.scale.toArray(),
  };
}

function updateEntityInStore(store, entityData) {
  if (!store) {
    return;
  }
  const entities = store.state.editor.entities;
  const index = entities.findIndex((item) => item.id === entityData.id);
  if (index > -1) {
    Object.assign(entities[index], entityData);
  } else {
    store.commit('editor/ADD_ENTITY', entityData);
  }
}

function removeEntityFromStore(store, entityId) {
  if (!store) {
    return;
  }
  store.commit('editor/REMOVE_ENTITY', entityId);
}

/**
 * CreateWallCommand - 创建墙体命令
 */
class CreateWallCommand extends Command {
  constructor(scene, wallConfig, options = {}) {
    super();
    this.scene = scene;
    this.wallConfig = { ...wallConfig };
    this.wall = null;
    this.store = options.store || null;
    this.sceneGraph = options.sceneGraph || getSharedSceneGraph();
    this.entityData = null;
    this.description = `创建墙体 (${wallConfig.start.x.toFixed(2)}, ${wallConfig.start.y.toFixed(
      2
    )}) -> (${wallConfig.end.x.toFixed(2)}, ${wallConfig.end.y.toFixed(2)})`;
  }

  async execute() {
    if (!this.wall) {
      this.wall = WallFactory.create(this.wallConfig);
    }

    if (!this.wall.parent && this.scene) {
      this.scene.add(this.wall);
    }

    this.entityData = buildWallEntityData(this.wall);

    updateEntityInStore(this.store, this.entityData);
    if (this.sceneGraph) {
      this.sceneGraph.addEntity(this.entityData.id, { ...this.entityData }, this.wall);
    }

    return this.wall;
  }

  async undo() {
    if (!this.wall || !this.scene) {
      return false;
    }

    this.scene.remove(this.wall);
    if (this.sceneGraph) {
      this.sceneGraph.removeEntity(this.wall.userData.id);
    }
    removeEntityFromStore(this.store, this.wall.userData.id);
    return true;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `create_wall_${this.wallConfig.start.x}_${this.wallConfig.start.y}_${this.wallConfig.end.x}_${this.wallConfig.end.y}`;
  }
}

/**
 * UpdateWallCommand - 更新墙体命令
 */
class UpdateWallCommand extends Command {
  constructor(wall, newConfig, oldConfig = null, options = {}) {
    super();
    this.wall = wall;
    this.newConfig = { ...newConfig };
    this.oldConfig = oldConfig ? { ...oldConfig } : { ...wall.userData.config };
    this.store = options.store || null;
    this.sceneGraph = options.sceneGraph || getSharedSceneGraph();
    this.description = `更新墙体属性`;
  }

  async execute() {
    WallFactory.update(this.wall, this.newConfig);
    const entityData = buildWallEntityData(this.wall);
    updateEntityInStore(this.store, entityData);
    if (this.sceneGraph) {
      this.sceneGraph.updateEntity(entityData.id, entityData);
    }
    return this.wall;
  }

  async undo() {
    WallFactory.update(this.wall, this.oldConfig);
    const entityData = buildWallEntityData(this.wall);
    updateEntityInStore(this.store, entityData);
    if (this.sceneGraph) {
      this.sceneGraph.updateEntity(entityData.id, entityData);
    }
    return this.wall;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `update_wall_${this.wall.userData.id}`;
  }

  canMerge(other) {
    return (
      other instanceof UpdateWallCommand &&
      this.wall === other.wall &&
      Object.keys(this.newConfig).length === 1 &&
      Object.keys(other.newConfig).length === 1 &&
      Object.keys(this.newConfig)[0] === Object.keys(other.newConfig)[0]
    );
  }

  merge(other) {
    const mergedConfig = { ...this.oldConfig, ...other.newConfig };
    return new UpdateWallCommand(this.wall, mergedConfig, this.oldConfig, {
      store: this.store,
      sceneGraph: this.sceneGraph,
    });
  }
}

/**
 * DeleteWallCommand - 删除墙体命令
 */
class DeleteWallCommand extends Command {
  constructor(scene, wall, options = {}) {
    super();
    this.scene = scene;
    this.wall = wall;
    this.store = options.store || null;
    this.sceneGraph = options.sceneGraph || getSharedSceneGraph();
    this.entityData = buildWallEntityData(wall);
    this.description = `删除墙体 ${wall.userData.id}`;
  }

  async execute() {
    if (!this.wall || !this.scene) {
      return false;
    }

    if (this.wall.parent) {
      this.scene.remove(this.wall);
    }

    if (this.sceneGraph) {
      this.sceneGraph.removeEntity(this.wall.userData.id);
    }

    removeEntityFromStore(this.store, this.wall.userData.id);
    return true;
  }

  async undo() {
    if (!this.wall || !this.scene) {
      return false;
    }

    if (!this.wall.parent) {
      this.scene.add(this.wall);
    }

    this.entityData = buildWallEntityData(this.wall);
    updateEntityInStore(this.store, this.entityData);

    if (this.sceneGraph) {
      this.sceneGraph.addEntity(this.entityData.id, { ...this.entityData }, this.wall);
    }

    return true;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `delete_wall_${this.wall.userData.id}`;
  }
}

/**
 * BatchWallCommand - 批量墙体操作命令
 */
class BatchWallCommand extends Command {
  constructor(commands, description = '批量墙体操作') {
    super();
    this.commands = [...commands];
    this.description = description;
  }

  async execute() {
    const results = [];
    for (const command of this.commands) {
      try {
        const result = await command.execute();
        results.push(result);
      } catch (error) {
        console.error('Batch command execution failed:', error);
        for (let i = this.commands.indexOf(command) - 1; i >= 0; i -= 1) {
          try {
            await this.commands[i].undo();
          } catch (undoError) {
            console.error('Failed to undo during batch rollback:', undoError);
          }
        }
        throw error;
      }
    }
    return results;
  }

  async undo() {
    const results = [];
    for (let i = this.commands.length - 1; i >= 0; i -= 1) {
      try {
        const result = await this.commands[i].undo();
        results.push(result);
      } catch (error) {
        console.error('Failed to undo command in batch:', error);
      }
    }
    return results;
  }

  getDescription() {
    return this.description;
  }

  getId() {
    return `batch_wall_${this.commands.length}_${Date.now()}`;
  }
}

export { CreateWallCommand, UpdateWallCommand, DeleteWallCommand, BatchWallCommand };
