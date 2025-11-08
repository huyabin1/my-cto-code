import * as THREE from 'three';
import Command from './Command';
import WallFactory from '../factory/WallFactory';

/**
 * CreateWallCommand - 创建墙体命令
 */
class CreateWallCommand extends Command {
  /**
   * @param {THREE.Scene} scene - Three.js场景
   * @param {Object} wallConfig - 墙体配置
   * @param {THREE.Vector2} wallConfig.start - 起始点
   * @param {THREE.Vector2} wallConfig.end - 结束点
   * @param {number} wallConfig.height - 高度
   * @param {number} wallConfig.thickness - 厚度
   * @param {string} wallConfig.material - 材质
   * @param {number} [wallConfig.color] - 颜色
   */
  constructor(scene, wallConfig) {
    super();
    this.scene = scene;
    this.wallConfig = { ...wallConfig };
    this.wall = null;
    this.description = `创建墙体 (${wallConfig.start.x.toFixed(2)}, ${wallConfig.start.y.toFixed(
      2
    )}) -> (${wallConfig.end.x.toFixed(2)}, ${wallConfig.end.y.toFixed(2)})`;
  }

  async execute() {
    this.wall = WallFactory.create(this.wallConfig);
    this.scene.add(this.wall);
    return this.wall;
  }

  async undo() {
    if (this.wall && this.scene) {
      this.scene.remove(this.wall);

      // 清理资源
      this.wall.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });

      return true;
    }
    return false;
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
  /**
   * @param {THREE.Group} wall - 墙体对象
   * @param {Object} newConfig - 新的配置
   * @param {Object} [oldConfig] - 旧的配置（如果不提供，会从wall.userData中获取）
   */
  constructor(wall, newConfig, oldConfig = null) {
    super();
    this.wall = wall;
    this.newConfig = { ...newConfig };
    this.oldConfig = oldConfig ? { ...oldConfig } : { ...wall.userData.config };
    this.description = `更新墙体属性`;
  }

  async execute() {
    WallFactory.update(this.wall, this.newConfig);
    return this.wall;
  }

  async undo() {
    WallFactory.update(this.wall, this.oldConfig);
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
    return new UpdateWallCommand(this.wall, mergedConfig, this.oldConfig);
  }
}

/**
 * DeleteWallCommand - 删除墙体命令
 */
class DeleteWallCommand extends Command {
  /**
   * @param {THREE.Scene} scene - Three.js场景
   * @param {THREE.Group} wall - 要删除的墙体
   */
  constructor(scene, wall) {
    super();
    this.scene = scene;
    this.wall = wall;
    this.description = `删除墙体 ${wall.userData.id}`;
  }

  async execute() {
    if (this.wall && this.scene) {
      this.scene.remove(this.wall);
      return true;
    }
    return false;
  }

  async undo() {
    if (this.wall && this.scene) {
      this.scene.add(this.wall);
      return true;
    }
    return false;
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
  /**
   * @param {Array<Command>} commands - 要批量执行的命令数组
   * @param {string} description - 命令描述
   */
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
        // 如果批量执行中的某个命令失败，需要回滚已执行的命令
        console.error('Batch command execution failed:', error);
        for (let i = this.commands.indexOf(command) - 1; i >= 0; i--) {
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
    // 逆序撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
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
