import * as THREE from 'three';
import { SpatialIndex } from '../utils/QuadTree';
import InstancedMeshBuilder from '../utils/InstancedMeshBuilder';

/**
 * SceneOptimizer - 场景性能优化器
 * 提供增量渲染、对象池、空间索引等优化
 */
class SceneOptimizer {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = {
      useSpatialIndex: options.useSpatialIndex !== false,
      useInstancedMesh: options.useInstancedMesh !== false,
      maxObjects: options.maxObjects || 1000,
      cullDistance: options.cullDistance || 100,
      ...options,
    };

    this.spatialIndex = null;
    this.instancedMeshBuilder = new InstancedMeshBuilder();
    this.objectPool = new Map();
    this.visibleObjects = new Set();
    this.frustumCuller = null;
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();

    if (this.options.useSpatialIndex) {
      this.spatialIndex = new SpatialIndex({ x: -100, y: -100, width: 200, height: 200 }, 10);
    }
  }

  /**
   * 获取视锥内的对象
   */
  getFrustumCulledObjects(camera, margin = 1.2) {
    if (!camera) {
      return Array.from(this.scene.children);
    }

    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    const visible = [];

    this.scene.traverse((obj) => {
      if (obj.isMesh || obj.isGroup) {
        const box = new THREE.Box3().setFromObject(obj);
        if (this.frustum.intersectsBox(box)) {
          visible.push(obj);
        }
      }
    });

    return visible;
  }

  /**
   * 启用物体池优化
   */
  createObjectPool(key, factory, initialSize = 50) {
    const pool = [];

    for (let i = 0; i < initialSize; i += 1) {
      const obj = factory();
      obj.visible = false;
      this.scene.add(obj);
      pool.push(obj);
    }

    this.objectPool.set(key, {
      available: pool,
      inUse: [],
      factory,
    });
  }

  /**
   * 从对象池获取对象
   */
  acquirePooledObject(key) {
    const pool = this.objectPool.get(key);
    if (!pool) {
      throw new Error(`Object pool "${key}" not found`);
    }

    let obj;
    if (pool.available.length > 0) {
      obj = pool.available.pop();
    } else {
      obj = pool.factory();
      this.scene.add(obj);
    }

    obj.visible = true;
    pool.inUse.push(obj);

    return obj;
  }

  /**
   * 返回对象到对象池
   */
  releasePooledObject(key, obj) {
    const pool = this.objectPool.get(key);
    if (!pool) {
      throw new Error(`Object pool "${key}" not found`);
    }

    const index = pool.inUse.indexOf(obj);
    if (index > -1) {
      pool.inUse.splice(index, 1);
    }

    obj.visible = false;
    pool.available.push(obj);
  }

  /**
   * 清空对象池
   */
  clearObjectPool(key) {
    const pool = this.objectPool.get(key);
    if (!pool) return;

    [...pool.inUse, ...pool.available].forEach((obj) => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });

    this.objectPool.delete(key);
  }

  /**
   * 使用空间索引查询附近的对象
   */
  queryNearby(point, radius) {
    if (!this.spatialIndex) {
      return this.scene.children.filter((obj) => obj.position.distanceTo(point) <= radius);
    }

    return this.spatialIndex.getNearby(point, radius);
  }

  /**
   * 添加对象到空间索引
   */
  addToSpatialIndex(id, obj) {
    if (this.spatialIndex) {
      this.spatialIndex.add(id, obj);
    }
  }

  /**
   * 从空间索引移除对象
   */
  removeFromSpatialIndex(id) {
    if (this.spatialIndex) {
      this.spatialIndex.remove(id);
    }
  }

  /**
   * 优化渲染：只渲染视锥内的对象
   */
  optimizeRender(camera) {
    if (!camera) return;

    const culledObjects = this.getFrustumCulledObjects(camera);

    this.scene.traverse((obj) => {
      if (obj.isMesh && obj !== camera) {
        obj.visible = culledObjects.includes(obj);
      }
    });

    this.visibleObjects = new Set(culledObjects);
  }

  /**
   * 获取性能统计信息
   */
  getStats() {
    let meshCount = 0;
    let triangleCount = 0;

    this.scene.traverse((obj) => {
      if (obj.isMesh) {
        meshCount += 1;
        if (obj.geometry && obj.geometry.index) {
          triangleCount += obj.geometry.index.count / 3;
        }
      }
    });

    return {
      meshCount,
      triangleCount,
      visibleCount: this.visibleObjects.size,
      poolSize: this.objectPool.size,
    };
  }

  /**
   * 批量更新对象到空间索引
   */
  updateSpatialIndex(objects) {
    if (!this.spatialIndex) return;

    objects.forEach((obj) => {
      if (obj.userData && obj.userData.id) {
        this.spatialIndex.update(obj.userData.id, obj.position);
      }
    });
  }

  /**
   * 启用增量渲染（渲染一帧后再更新下一帧）
   */
  enableIncrementalUpdate() {
    // 用于实现分帧更新，减少每帧的工作量
    this.incrementalUpdateQueue = [];
    this.updateFrameIndex = 0;
  }

  /**
   * 添加任务到增量更新队列
   */
  addIncrementalTask(task) {
    if (!this.incrementalUpdateQueue) {
      this.enableIncrementalUpdate();
    }
    this.incrementalUpdateQueue.push(task);
  }

  /**
   * 处理单帧的增量更新任务
   */
  processIncrementalUpdates(tasksPerFrame = 10) {
    if (!this.incrementalUpdateQueue || this.incrementalUpdateQueue.length === 0) {
      return;
    }

    const tasksToProcess = Math.min(tasksPerFrame, this.incrementalUpdateQueue.length);

    for (let i = 0; i < tasksToProcess; i += 1) {
      const task = this.incrementalUpdateQueue.shift();
      if (task) {
        task();
      }
    }
  }

  /**
   * 清空所有优化数据
   */
  clear() {
    if (this.spatialIndex) {
      this.spatialIndex.clear();
    }
    this.visibleObjects.clear();
    this.objectPool.forEach((pool) => {
      pool.available = [];
      pool.inUse = [];
    });
  }

  /**
   * 销毁优化器
   */
  dispose() {
    this.clear();
    this.objectPool.clear();
    if (this.incrementalUpdateQueue) {
      this.incrementalUpdateQueue = [];
    }
  }
}

export default SceneOptimizer;
