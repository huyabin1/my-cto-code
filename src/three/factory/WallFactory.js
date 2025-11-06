import * as THREE from 'three';

/**
 * WallFactory - 创建参数化墙体
 */
class WallFactory {
  /**
   * 材质预设配置
   */
  static MATERIAL_PRESETS = {
    concrete: { color: 0x888888, roughness: 0.8, metalness: 0.2 },
    wood: { color: 0x8b4513, roughness: 0.9, metalness: 0.1 },
    glass: { color: 0x87ceeb, roughness: 0.1, metalness: 0.0 },
  };

  /**
   * 创建墙体
   * @param {Object} config - 墙体配置
   * @param {THREE.Vector2} config.start - 起始点
   * @param {THREE.Vector2} config.end - 结束点
   * @param {number} config.height - 高度 (默认 2.8)
   * @param {number} config.thickness - 厚度 (默认 0.2)
   * @param {string} config.material - 材质类型 ('concrete'|'wood'|'glass')
   * @param {number} [config.color] - 自定义颜色 (可选)
   * @returns {THREE.Group} 墙体组
   */
  static create(config) {
    const { start, end, height = 2.8, thickness = 0.2, material = 'concrete', color } = config;

    // 验证输入参数
    if (!(start instanceof THREE.Vector2) || !(end instanceof THREE.Vector2)) {
      throw new Error('start and end must be Vector2 instances');
    }

    if (!WallFactory.MATERIAL_PRESETS[material]) {
      throw new Error(`Invalid material type: ${material}`);
    }

    // 计算墙体长度和方向
    const length = start.distanceTo(end);
    if (length === 0) {
      throw new Error('Start and end points cannot be the same');
    }

    const direction = new THREE.Vector2().subVectors(end, start).normalize();
    const center = new THREE.Vector2().addVectors(start, end).multiplyScalar(0.5);

    // 计算旋转角度
    const angle = Math.atan2(direction.y, direction.x);

    // 创建几何体
    const geometry = new THREE.BoxGeometry(length, height, thickness);

    // 设置UV (1m重复比)
    this.setGeometryUVs(geometry, length, height, thickness);

    // 创建材质
    const materialConfig = WallFactory.MATERIAL_PRESETS[material];
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: color !== undefined ? color : materialConfig.color,
      roughness: materialConfig.roughness,
      metalness: materialConfig.metalness,
    });

    // 创建网格
    const mesh = new THREE.Mesh(geometry, wallMaterial);

    // 设置位置和旋转
    mesh.position.set(center.x, height / 2, center.y);
    mesh.rotation.y = -angle;

    // 创建组并添加userData
    const group = new THREE.Group();
    group.add(mesh);
    group.userData = {
      type: 'wall',
      id: THREE.MathUtils.generateUUID(),
      config: {
        start: start.clone(),
        end: end.clone(),
        height,
        thickness,
        material,
        color,
      },
    };

    return group;
  }

  /**
   * 更新墙体配置
   * @param {THREE.Group} wall - 墙体组
   * @param {Object} newConfig - 新配置
   */
  static update(wall, newConfig) {
    if (!wall || !wall.userData || wall.userData.type !== 'wall') {
      throw new Error('Invalid wall object');
    }

    // 合并配置
    const config = { ...wall.userData.config, ...newConfig };

    // 移除旧的墙体
    const oldMesh = wall.children[0];
    wall.remove(oldMesh);
    oldMesh.geometry.dispose();
    oldMesh.material.dispose();

    // 创建新的墙体
    const newWall = WallFactory.create(config);
    const newMesh = newWall.children[0];

    // 更新userData
    // eslint-disable-next-line no-param-reassign
    wall.userData = newWall.userData;

    // 添加新的网格
    wall.add(newMesh);
  }

  /**
   * 获取墙体包围盒
   * @param {THREE.Group} wall - 墙体组
   * @returns {THREE.Box3} 包围盒
   */
  static getBoundingBox(wall) {
    if (!wall || !wall.userData || wall.userData.type !== 'wall') {
      throw new Error('Invalid wall object');
    }

    const box = new THREE.Box3().setFromObject(wall);
    return box;
  }

  /**
   * 设置几何体UV
   * @private
   */
  static setGeometryUVs(geometry, length, height, thickness) {
    const uvAttribute = geometry.attributes.uv;
    const uvArray = uvAttribute.array;

    // 为每个面设置UV，实现1m重复
    // BoxGeometry 有 24 个顶点，分为 6 个面，每个面 4 个顶点
    for (let i = 0; i < 24; i += 1) {
      const faceIndex = Math.floor(i / 4);
      const vertexIndex = i % 4;

      // 根据不同的面设置不同的UV映射
      switch (faceIndex) {
        case 0: // 右面 (X+)
        case 1: // 左面 (X-)
          uvArray[i * 2] = vertexIndex === 0 || vertexIndex === 3 ? 0 : thickness;
          uvArray[i * 2 + 1] = vertexIndex === 0 || vertexIndex === 1 ? 0 : height;
          break;
        case 2: // 上面 (Y+)
        case 3: // 下面 (Y-)
          uvArray[i * 2] = vertexIndex === 0 || vertexIndex === 3 ? 0 : length;
          uvArray[i * 2 + 1] = vertexIndex === 0 || vertexIndex === 1 ? 0 : thickness;
          break;
        case 4: // 前面 (Z+)
        case 5: // 后面 (Z-)
          uvArray[i * 2] = vertexIndex === 0 || vertexIndex === 3 ? 0 : length;
          uvArray[i * 2 + 1] = vertexIndex === 0 || vertexIndex === 1 ? 0 : height;
          break;
        default:
          // No UV mapping for unexpected face index
          break;
      }
    }

    uvAttribute.needsUpdate = true;
  }
}

export default WallFactory;
