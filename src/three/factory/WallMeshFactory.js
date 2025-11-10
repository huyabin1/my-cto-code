import * as THREE from 'three';
import materialLibrary from '../materials';

/**
 * WallMeshFactory - 基于实体几何生成墙体BufferGeometry
 */
class WallMeshFactory {
  /**
   * 创建墙体网格
   * @param {Object} config - 墙体配置
   * @param {THREE.Vector2} config.start - 起始点
   * @param {THREE.Vector2} config.end - 结束点
   * @param {number} config.height - 高度 (默认 2.8)
   * @param {number} config.thickness - 厚度 (默认 0.2)
   * @param {string} config.material - 材质类型
   * @param {number} [config.color] - 自定义颜色
   * @param {number} [config.segments] - 分段数 (默认 1)
   * @returns {THREE.Mesh} 墙体网格
   */
  static create(config) {
    const {
      start,
      end,
      height = 2.8,
      thickness = 0.2,
      material = 'concrete',
      color,
      segments = 1,
    } = config;

    // 验证输入参数
    if (!(start instanceof THREE.Vector2) || !(end instanceof THREE.Vector2)) {
      throw new Error('start and end must be Vector2 instances');
    }

    const length = start.distanceTo(end);
    if (length === 0) {
      throw new Error('Start and end points cannot be the same');
    }

    // 计算墙体方向和中心点
    const direction = new THREE.Vector2().subVectors(end, start).normalize();
    const center = new THREE.Vector2().addVectors(start, end).multiplyScalar(0.5);
    const angle = Math.atan2(direction.y, direction.x);

    // 创建拉伸几何体
    const geometry = WallMeshFactory.createWallGeometry(length, height, thickness, segments);

    // 获取材质
    const materialOptions = color !== undefined ? { color } : {};
    const wallMaterial = materialLibrary.getMaterial(material, materialOptions);

    // 创建网格
    const mesh = new THREE.Mesh(geometry, wallMaterial);

    // 设置位置和旋转
    mesh.position.set(center.x, height / 2, center.y);
    mesh.rotation.y = -angle;

    // 设置用户数据
    mesh.userData = {
      type: 'wall',
      id: THREE.MathUtils.generateUUID(),
      config: {
        start: start.clone(),
        end: end.clone(),
        height,
        thickness,
        material,
        color,
        segments,
      },
    };

    return mesh;
  }

  /**
   * 创建墙体几何体
   * @param {number} length - 长度
   * @param {number} height - 高度
   * @param {number} thickness - 厚度
   * @param {number} segments - 分段数
   * @returns {THREE.BufferGeometry} 几何体
   */
  static createWallGeometry(length, height, thickness, segments = 1) {
    const shape = new THREE.Shape();

    // 创建墙体横截面形状
    shape.moveTo(-length / 2, -thickness / 2);
    shape.lineTo(length / 2, -thickness / 2);
    shape.lineTo(length / 2, thickness / 2);
    shape.lineTo(-length / 2, thickness / 2);
    shape.closePath();

    // 拉伸配置
    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
      steps: 1,
      curveSegments: segments,
    };

    // 创建拉伸几何体
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 旋转几何体使其垂直
    geometry.rotateX(-Math.PI / 2);

    // 计算法线和UV
    geometry.computeVertexNormals();
    WallMeshFactory.setGeometryUVs(geometry, length, height, thickness);

    return geometry;
  }

  /**
   * 更新墙体网格
   * @param {THREE.Mesh} mesh - 墙体网格
   * @param {Object} newConfig - 新配置
   */
  static update(mesh, newConfig) {
    if (!mesh || !mesh.userData || mesh.userData.type !== 'wall') {
      throw new Error('Invalid wall mesh object');
    }

    // 合并配置
    const config = { ...mesh.userData.config, ...newConfig };

    // 释放旧几何体和材质
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      materialLibrary.disposeMaterial(mesh.material);
    }

    // 创建新几何体
    const length = config.start.distanceTo(config.end);
    const geometry = WallMeshFactory.createWallGeometry(
      length,
      config.height,
      config.thickness,
      config.segments
    );

    // 获取新材质
    const materialOptions = config.color !== undefined ? { color: config.color } : {};
    const material = materialLibrary.getMaterial(config.material, materialOptions);

    // 更新网格
    mesh.geometry = geometry;
    mesh.material = material;

    // 更新位置和旋转
    const direction = new THREE.Vector2().subVectors(config.end, config.start).normalize();
    const center = new THREE.Vector2().addVectors(config.start, config.end).multiplyScalar(0.5);
    const angle = Math.atan2(direction.y, direction.x);

    mesh.position.set(center.x, config.height / 2, center.y);
    mesh.rotation.y = -angle;

    // 更新用户数据
    mesh.userData.config = config;
  }

  /**
   * 获取墙体包围盒
   * @param {THREE.Mesh} mesh - 墙体网格
   * @returns {THREE.Box3} 包围盒
   */
  static getBoundingBox(mesh) {
    if (!mesh || !mesh.userData || mesh.userData.type !== 'wall') {
      throw new Error('Invalid wall mesh object');
    }

    const box = new THREE.Box3().setFromObject(mesh);
    return box;
  }

  /**
   * 设置几何体UV
   * @param {THREE.BufferGeometry} geometry - 几何体
   * @param {number} length - 长度
   * @param {number} height - 高度
   * @param {number} thickness - 厚度
   */
  static setGeometryUVs(geometry, length, height, thickness) {
    const uvAttribute = geometry.attributes.uv;
    if (!uvAttribute) return;

    const uvArray = uvAttribute.array;
    const positionAttribute = geometry.attributes.position;
    const posArray = positionAttribute.array;

    // 为每个顶点计算UV坐标
    for (let i = 0; i < posArray.length; i += 3) {
      const x = posArray[i];
      const y = posArray[i + 1];
      const z = posArray[i + 2];

      // 根据位置计算UV
      let u = 0;
      let v = 0;

      // 顶面和底面
      if (Math.abs(y - height / 2) < 0.001 || Math.abs(y + height / 2) < 0.001) {
        u = (x + length / 2) / length;
        v = (z + thickness / 2) / thickness;
      }
      // 前面和后面
      else if (Math.abs(z - thickness / 2) < 0.001 || Math.abs(z + thickness / 2) < 0.001) {
        u = (x + length / 2) / length;
        v = (y + height / 2) / height;
      }
      // 左面和右面
      else if (Math.abs(x - length / 2) < 0.001 || Math.abs(x + length / 2) < 0.001) {
        u = (z + thickness / 2) / thickness;
        v = (y + height / 2) / height;
      }

      const uvIndex = (i / 3) * 2;
      uvArray[uvIndex] = u;
      uvArray[uvIndex + 1] = v;
    }

    uvAttribute.needsUpdate = true;
  }

  /**
   * 计算墙体体积
   * @param {Object} config - 墙体配置
   * @returns {number} 体积
   */
  static calculateVolume(config) {
    const { start, end, height = 2.8, thickness = 0.2 } = config;
    const length = start.distanceTo(end);
    return length * height * thickness;
  }

  /**
   * 计算墙体表面积
   * @param {Object} config - 墙体配置
   * @returns {number} 表面积
   */
  static calculateSurfaceArea(config) {
    const { start, end, height = 2.8, thickness = 0.2 } = config;
    const length = start.distanceTo(end);

    // 两个大面 + 两个小面 + 顶面 + 底面
    const largeFaces = 2 * length * height;
    const smallFaces = 2 * thickness * height;
    const topBottom = 2 * length * thickness;

    return largeFaces + smallFaces + topBottom;
  }
}

export default WallMeshFactory;
