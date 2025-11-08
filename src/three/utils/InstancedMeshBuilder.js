import * as THREE from 'three';

/**
 * InstancedMeshBuilder - 为大量相似对象提供性能优化
 * 使用 InstancedMesh 来合并渲染多个对象
 */
class InstancedMeshBuilder {
  constructor() {
    this.instances = new Map(); // 按类型存储的实例
  }

  /**
   * 创建一个实例化网格
   */
  createInstancedMesh(geometry, material, count = 100) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.count = 0; // 当前使用的实例数
    mesh.instanceData = new Map(); // 存储每个实例的数据
    return mesh;
  }

  /**
   * 为实例网格添加对象
   */
  addInstance(instancedMesh, position, rotation, scale, userData = null) {
    if (instancedMesh.count >= instancedMesh.instanceCount) {
      // 需要扩展网格
      this.expandInstancedMesh(instancedMesh);
    }

    const index = instancedMesh.count;

    // 设置变换矩阵
    const matrix = new THREE.Matrix4();
    matrix.compose(position, rotation, scale);
    instancedMesh.setMatrixAt(index, matrix);

    // 存储实例数据
    if (userData) {
      instancedMesh.instanceData.set(index, userData);
    }

    instancedMesh.count += 1;
    instancedMesh.instanceMatrix.needsUpdate = true;

    return index;
  }

  /**
   * 更新实例变换
   */
  updateInstance(instancedMesh, index, position, rotation, scale) {
    const matrix = new THREE.Matrix4();
    matrix.compose(position, rotation, scale);
    instancedMesh.setMatrixAt(index, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 移除实例（通过将其移至网格末尾并降低计数）
   */
  removeInstance(instancedMesh, index) {
    if (index >= instancedMesh.count) {
      return;
    }

    // 如果不是最后一个实例，将最后一个实例移至此位置
    if (index < instancedMesh.count - 1) {
      const lastIndex = instancedMesh.count - 1;
      const lastMatrix = new THREE.Matrix4();
      instancedMesh.getMatrixAt(lastIndex, lastMatrix);
      instancedMesh.setMatrixAt(index, lastMatrix);

      // 交换实例数据
      const lastData = instancedMesh.instanceData.get(lastIndex);
      if (lastData) {
        instancedMesh.instanceData.set(index, lastData);
      } else {
        instancedMesh.instanceData.delete(index);
      }
    }

    instancedMesh.count -= 1;
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceData.delete(instancedMesh.count);
  }

  /**
   * 获取实例的用户数据
   */
  getInstanceData(instancedMesh, index) {
    return instancedMesh.instanceData.get(index);
  }

  /**
   * 更新实例的用户数据
   */
  setInstanceData(instancedMesh, index, userData) {
    instancedMesh.instanceData.set(index, userData);
  }

  /**
   * 扩展实例网格容量
   */
  expandInstancedMesh(instancedMesh) {
    const oldCount = instancedMesh.instanceCount;
    const newCount = Math.max(oldCount * 2, 100);

    // 创建新的网格
    const newGeometry = instancedMesh.geometry.clone();
    const newMaterial = instancedMesh.material.clone();
    const newMesh = new THREE.InstancedMesh(newGeometry, newMaterial, newCount);

    // 复制现有的实例
    for (let i = 0; i < instancedMesh.count; i += 1) {
      const matrix = new THREE.Matrix4();
      instancedMesh.getMatrixAt(i, matrix);
      newMesh.setMatrixAt(i, matrix);

      const data = instancedMesh.instanceData.get(i);
      if (data) {
        newMesh.instanceData.set(i, data);
      }
    }

    newMesh.count = instancedMesh.count;
    newMesh.instanceMatrix.needsUpdate = true;

    // 传输属性
    if (instancedMesh.userData) {
      newMesh.userData = instancedMesh.userData;
    }

    return newMesh;
  }

  /**
   * 清空所有实例数据并重置计数
   */
  clear(instancedMesh) {
    instancedMesh.count = 0;
    instancedMesh.instanceData.clear();
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 获取实例的世界坐标矩阵
   */
  getWorldMatrix(instancedMesh, index, parentMatrix = null) {
    const matrix = new THREE.Matrix4();
    instancedMesh.getMatrixAt(index, matrix);

    if (parentMatrix) {
      matrix.multiplyMatrices(parentMatrix, matrix);
    }

    return matrix;
  }

  /**
   * 为所有实例应用颜色变换
   */
  setInstanceColor(mesh, index, color) {
    // eslint-disable-next-line no-param-reassign
    if (!mesh.instanceColor) {
      const colorArray = new Uint8Array(mesh.instanceCount * 3);
      // eslint-disable-next-line no-param-reassign
      mesh.instanceColor = new THREE.BufferAttribute(colorArray, 3, true);
      mesh.geometry.setAttribute('instanceColor', mesh.instanceColor);
    }

    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);

    mesh.instanceColor.setXYZ(index, r, g, b);
    // eslint-disable-next-line no-param-reassign
    mesh.instanceColor.needsUpdate = true;
  }
}

export default InstancedMeshBuilder;
