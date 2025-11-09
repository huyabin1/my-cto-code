import * as THREE from 'three';
import WallMeshFactory from './WallMeshFactory';
import FloorMeshFactory from './FloorMeshFactory';
import materialLibrary from '../materials';

/**
 * MeshRegistry - 管理Three.js Mesh的创建、更新、回收
 */
class MeshRegistry {
  constructor() {
    this.meshes = new Map(); // 存储活跃的网格
    this.pool = new Map(); // 对象池，用于回收
    this.stats = {
      created: 0,
      updated: 0,
      disposed: 0,
      recycled: 0,
    };
  }

  /**
   * 创建墙体网格
   * @param {string} id - 网格ID
   * @param {Object} config - 墙体配置
   * @returns {THREE.Mesh} 墙体网格
   */
  createWall(id, config) {
    if (this.meshes.has(id)) {
      throw new Error(`Mesh with id '${id}' already exists`);
    }

    // 尝试从对象池获取
    let mesh = this.getFromPool('wall');

    if (mesh) {
      // 重用现有网格
      WallMeshFactory.update(mesh, config);
      this.stats.recycled += 1;
    } else {
      // 创建新网格
      mesh = WallMeshFactory.create(config);
      this.stats.created += 1;
    }

    // 设置ID并存储
    mesh.userData.registryId = id;
    this.meshes.set(id, mesh);

    return mesh;
  }

  /**
   * 创建地面网格
   * @param {string} id - 网格ID
   * @param {Object} config - 地面配置
   * @returns {THREE.Mesh} 地面网格
   */
  createFloor(id, config) {
    if (this.meshes.has(id)) {
      throw new Error(`Mesh with id '${id}' already exists`);
    }

    // 尝试从对象池获取
    let mesh = this.getFromPool('floor');

    if (mesh) {
      // 重用现有网格
      FloorMeshFactory.update(mesh, config);
      this.stats.recycled += 1;
    } else {
      // 创建新网格
      mesh = FloorMeshFactory.create(config);
      this.stats.created += 1;
    }

    // 设置ID并存储
    mesh.userData.registryId = id;
    this.meshes.set(id, mesh);

    return mesh;
  }

  /**
   * 更新网格
   * @param {string} id - 网格ID
   * @param {Object} newConfig - 新配置
   * @returns {THREE.Mesh} 更新后的网格
   */
  updateMesh(id, newConfig) {
    const mesh = this.meshes.get(id);
    if (!mesh) {
      throw new Error(`Mesh with id '${id}' not found`);
    }

    const meshType = mesh.userData.type;

    if (meshType === 'wall') {
      WallMeshFactory.update(mesh, newConfig);
    } else if (meshType === 'floor') {
      FloorMeshFactory.update(mesh, newConfig);
    } else {
      throw new Error(`Unsupported mesh type: ${meshType}`);
    }

    this.stats.updated += 1;
    return mesh;
  }

  /**
   * 获取网格
   * @param {string} id - 网格ID
   * @returns {THREE.Mesh|null} 网格对象
   */
  getMesh(id) {
    return this.meshes.get(id) || null;
  }

  /**
   * 检查网格是否存在
   * @param {string} id - 网格ID
   * @returns {boolean} 是否存在
   */
  hasMesh(id) {
    return this.meshes.has(id);
  }

  /**
   * 移除网格
   * @param {string} id - 网格ID
   * @param {boolean} dispose - 是否释放资源 (默认 true)
   * @returns {boolean} 是否成功移除
   */
  removeMesh(id, dispose = true) {
    const mesh = this.meshes.get(id);
    if (!mesh) {
      return false;
    }

    if (dispose) {
      this.disposeMesh(mesh);
    } else {
      // 回收到对象池
      this.returnToPool(mesh);
    }

    this.meshes.delete(id);
    return true;
  }

  /**
   * 释放网格资源
   * @param {THREE.Mesh} mesh - 网格对象
   */
  disposeMesh(mesh) {
    if (!mesh) return;

    // 释放几何体
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    // 释放材质
    if (mesh.material) {
      materialLibrary.disposeMaterial(mesh.material);
    }

    // 递归释放子对象
    if (mesh.children) {
      mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          this.disposeMesh(child);
        }
      });
    }

    this.stats.disposed += 1;
  }

  /**
   * 回收网格到对象池
   * @param {THREE.Mesh} mesh - 网格对象
   */
  returnToPool(mesh) {
    if (!mesh || !mesh.userData) return;

    const meshType = mesh.userData.type;
    if (!meshType) return;

    if (!this.pool.has(meshType)) {
      this.pool.set(meshType, []);
    }

    // 重置网格状态
    mesh.visible = false;
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }

    // 添加到对象池
    const typePool = this.pool.get(meshType);
    typePool.push(mesh);

    // 限制对象池大小
    const maxPoolSize = 50;
    if (typePool.length > maxPoolSize) {
      const excessMesh = typePool.shift();
      this.disposeMesh(excessMesh);
    }
  }

  /**
   * 从对象池获取网格
   * @param {string} meshType - 网格类型
   * @returns {THREE.Mesh|null} 网格对象
   */
  getFromPool(meshType) {
    const typePool = this.pool.get(meshType);
    if (!typePool || typePool.length === 0) {
      return null;
    }

    const mesh = typePool.pop();
    mesh.visible = true;
    return mesh;
  }

  /**
   * 批量创建墙体
   * @param {Array<Object>} configs - 墙体配置数组
   * @returns {Array<THREE.Mesh>} 墙体网格数组
   */
  createWalls(configs) {
    const walls = [];

    configs.forEach((config, index) => {
      const id = config.id || `wall-${Date.now()}-${index}`;
      try {
        const wall = this.createWall(id, config);
        walls.push(wall);
      } catch (error) {
        console.error(`Failed to create wall ${id}:`, error);
      }
    });

    return walls;
  }

  /**
   * 批量创建地面
   * @param {Array<Object>} configs - 地面配置数组
   * @returns {Array<THREE.Mesh>} 地面网格数组
   */
  createFloors(configs) {
    const floors = [];

    configs.forEach((config, index) => {
      const id = config.id || `floor-${Date.now()}-${index}`;
      try {
        const floor = this.createFloor(id, config);
        floors.push(floor);
      } catch (error) {
        console.error(`Failed to create floor ${id}:`, error);
      }
    });

    return floors;
  }

  /**
   * 获取所有网格
   * @returns {Array<THREE.Mesh>} 网格数组
   */
  getAllMeshes() {
    return Array.from(this.meshes.values());
  }

  /**
   * 按类型获取网格
   * @param {string} type - 网格类型
   * @returns {Array<THREE.Mesh>} 网格数组
   */
  getMeshesByType(type) {
    return this.getAllMeshes().filter((mesh) => mesh.userData.type === type);
  }

  /**
   * 清空所有网格
   * @param {boolean} dispose - 是否释放资源 (默认 true)
   */
  clear(dispose = true) {
    const meshIds = Array.from(this.meshes.keys());
    meshIds.forEach((id) => this.removeMesh(id, dispose));
  }

  /**
   * 清空对象池
   */
  clearPool() {
    this.pool.forEach((typePool) => {
      typePool.forEach((mesh) => this.disposeMesh(mesh));
    });
    this.pool.clear();
  }

  /**
   * 获取网格数量
   * @returns {number} 网格数量
   */
  getMeshCount() {
    return this.meshes.size;
  }

  /**
   * 获取对象池统计
   * @returns {Object} 对象池统计信息
   */
  getPoolStats() {
    const stats = {};
    this.pool.forEach((pool, type) => {
      stats[type] = pool.length;
    });
    return stats;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      activeMeshes: this.meshes.size,
      poolStats: this.getPoolStats(),
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      created: 0,
      updated: 0,
      disposed: 0,
      recycled: 0,
    };
  }

  /**
   * 释放所有资源
   */
  dispose() {
    this.clear(true);
    this.clearPool();
    materialLibrary.dispose();
  }

  /**
   * 导出网格数据
   * @returns {Array<Object>} 网格数据数组
   */
  exportMeshData() {
      const meshData = [];

      this.meshes.forEach((mesh, id) => {
        const data = {
          id,
          type: mesh.userData.type,
          config: mesh.userData.config,
          visible: mesh.visible,
          position: mesh.position.toArray(),
          rotation: mesh.rotation.toArray(),
          scale: mesh.scale.toArray(),
        };
        meshData.push(data);
      });

      return meshData;
    }

  /**
   * 导入网格数据
   * @param {Array<Object>} meshData - 网格数据数组
   * @returns {Array<THREE.Mesh>} 创建的网格数组
   */
  importMeshData(meshData) {
    const meshes = [];

    meshData.forEach((data) => {
      try {
        let mesh;
        if (data.type === 'wall') {
          mesh = this.createWall(data.id, data.config);
        } else if (data.type === 'floor') {
          mesh = this.createFloor(data.id, data.config);
        } else {
          console.warn(`Unknown mesh type: ${data.type}`);
          return;
        }

        // 恢复变换
        mesh.position.fromArray(data.position);
        mesh.rotation.fromArray(data.rotation);
        mesh.scale.fromArray(data.scale);
        mesh.visible = data.visible;

        meshes.push(mesh);
      } catch (error) {
        console.error(`Failed to import mesh ${data.id}:`, error);
      }
    });

    return meshes;
  }
}

// 创建全局实例
const meshRegistry = new MeshRegistry();

export default meshRegistry;
