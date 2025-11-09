import * as THREE from 'three';
import materialLibrary from '../materials';

/**
 * FloorMeshFactory - 基于实体几何生成地面BufferGeometry
 */
class FloorMeshFactory {
  /**
   * 创建地面网格
   * @param {Object} config - 地面配置
   * @param {Array<THREE.Vector2>} config.points - 地面边界点
   * @param {number} config.thickness - 厚度 (默认 0.1)
   * @param {string} config.material - 材质类型
   * @param {number} [config.color] - 自定义颜色
   * @param {number} [config.height] - 地面高度 (默认 0)
   * @param {number} [config.segments] - 分段数 (默认 1)
   * @returns {THREE.Mesh} 地面网格
   */
  static create(config) {
    const {
      points,
      thickness = 0.1,
      material = 'concrete',
      color,
      height = 0,
      segments = 1,
    } = config;

    // 验证输入参数
    if (!Array.isArray(points) || points.length < 3) {
      throw new Error('Points must be an array with at least 3 Vector2 instances');
    }

    points.forEach((point, index) => {
      if (!(point instanceof THREE.Vector2)) {
        throw new Error(`Point at index ${index} is not a Vector2 instance`);
      }
    });

    // 创建拉伸几何体
    const geometry = FloorMeshFactory.createFloorGeometry(points, thickness, segments);

    // 获取材质
    const materialOptions = color !== undefined ? { color } : {};
    const floorMaterial = materialLibrary.getMaterial(material, materialOptions);

    // 创建网格
    const mesh = new THREE.Mesh(geometry, floorMaterial);

    // 计算地面中心点
    const center = FloorMeshFactory.calculateCenter(points);
    mesh.position.set(center.x, height + thickness / 2, center.y);

    // 设置用户数据
    mesh.userData = {
      type: 'floor',
      id: THREE.MathUtils.generateUUID(),
      config: {
        points: points.map((p) => p.clone()),
        thickness,
        material,
        color,
        height,
        segments,
      },
    };

    return mesh;
  }

  /**
   * 创建地面几何体
   * @param {Array<THREE.Vector2>} points - 边界点
   * @param {number} thickness - 厚度
   * @param {number} segments - 分段数
   * @returns {THREE.BufferGeometry} 几何体
   */
  static createFloorGeometry(points, thickness, segments = 1) {
    // 创建形状
    const shape = new THREE.Shape();

    // 移动到第一个点
    shape.moveTo(points[0].x, points[0].y);

    // 连接其他点
    for (let i = 1; i < points.length; i += 1) {
      shape.lineTo(points[i].x, points[i].y);
    }

    // 闭合形状
    shape.closePath();

    // 拉伸配置
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: false,
      steps: 1,
      curveSegments: segments,
    };

    // 创建拉伸几何体
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 计算法线和UV
    geometry.computeVertexNormals();
    FloorMeshFactory.setGeometryUVs(geometry, points, thickness);

    return geometry;
  }

  /**
   * 更新地面网格
   * @param {THREE.Mesh} mesh - 地面网格
   * @param {Object} newConfig - 新配置
   */
  static update(mesh, newConfig) {
    if (!mesh || !mesh.userData || mesh.userData.type !== 'floor') {
      throw new Error('Invalid floor mesh object');
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
    const geometry = FloorMeshFactory.createFloorGeometry(
      config.points,
      config.thickness,
      config.segments
    );

    // 获取新材质
    const materialOptions = config.color !== undefined ? { color: config.color } : {};
    const material = materialLibrary.getMaterial(config.material, materialOptions);

    // 更新网格
    mesh.geometry = geometry;
    mesh.material = material;

    // 更新位置
    const center = FloorMeshFactory.calculateCenter(config.points);
    mesh.position.set(center.x, config.height + config.thickness / 2, center.y);

    // 更新用户数据
    mesh.userData.config = config;
  }

  /**
   * 获取地面包围盒
   * @param {THREE.Mesh} mesh - 地面网格
   * @returns {THREE.Box3} 包围盒
   */
  static getBoundingBox(mesh) {
    if (!mesh || !mesh.userData || mesh.userData.type !== 'floor') {
      throw new Error('Invalid floor mesh object');
    }

    const box = new THREE.Box3().setFromObject(mesh);
    return box;
  }

  /**
   * 计算多边形中心点
   * @param {Array<THREE.Vector2>} points - 边界点
   * @returns {THREE.Vector2} 中心点
   */
  static calculateCenter(points) {
    const center = new THREE.Vector2();

    points.forEach((point) => {
      center.add(point);
    });

    center.divideScalar(points.length);
    return center;
  }

  /**
   * 计算多边形面积
   * @param {Array<THREE.Vector2>} points - 边界点
   * @returns {number} 面积
   */
  static calculateArea(points) {
    let area = 0;

    for (let i = 0; i < points.length; i += 1) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    return Math.abs(area / 2);
  }

  /**
   * 设置几何体UV
   * @param {THREE.BufferGeometry} geometry - 几何体
   * @param {Array<THREE.Vector2>} points - 边界点
   * @param {number} thickness - 厚度
   */
  static setGeometryUVs(geometry, points, thickness) {
    const uvAttribute = geometry.attributes.uv;
    if (!uvAttribute) return;

    const uvArray = uvAttribute.array;
    const positionAttribute = geometry.attributes.position;
    const posArray = positionAttribute.array;

    // 计算包围盒用于UV映射
    const box = new THREE.Box2().setFromPoints(points);
    const size = box.getSize(new THREE.Vector2());

    // 为每个顶点计算UV坐标
    for (let i = 0; i < posArray.length; i += 3) {
      const x = posArray[i];
      const y = posArray[i + 1];
      const z = posArray[i + 2];

      // 根据位置计算UV
      let u = 0;
      let v = 0;

      // 顶面和底面 - 使用XY平面坐标
      if (Math.abs(z - thickness) < 0.001 || Math.abs(z) < 0.001) {
        u = (x - box.min.x) / size.x;
        v = (y - box.min.y) / size.y;
      }
      // 侧面 - 使用高度和边长
      else {
        // 找到最近的边
        const point2D = new THREE.Vector2(x, y);
        let minDistance = Infinity;
        let closestEdgeLength = 0;

        for (let j = 0; j < points.length; j += 1) {
          const p1 = points[j];
          const p2 = points[(j + 1) % points.length];

          const edge = new THREE.Vector2().subVectors(p2, p1);
          const edgeLength = edge.length();
          edge.normalize();

          const toPoint = new THREE.Vector2().subVectors(point2D, p1);
          const projection = toPoint.dot(edge);
          const clampedProjection = Math.max(0, Math.min(edgeLength, projection));
          const closestPoint = new THREE.Vector2().addVectors(
            p1,
            edge.multiplyScalar(clampedProjection)
          );

          const distance = point2D.distanceTo(closestPoint);

          if (distance < minDistance) {
            minDistance = distance;
            closestEdgeLength = edgeLength;
          }
        }

        u = z / thickness;
        v = y / thickness; // 简化的V坐标
      }

      const uvIndex = (i / 3) * 2;
      uvArray[uvIndex] = u;
      uvArray[uvIndex + 1] = v;
    }

    uvAttribute.needsUpdate = true;
  }

  /**
   * 计算地面体积
   * @param {Object} config - 地面配置
   * @returns {number} 体积
   */
  static calculateVolume(config) {
    const { points, thickness = 0.1 } = config;
    const area = FloorMeshFactory.calculateArea(points);
    return area * thickness;
  }

  /**
   * 计算地面表面积
   * @param {Object} config - 地面配置
   * @returns {number} 表面积
   */
  static calculateSurfaceArea(config) {
    const { points, thickness = 0.1 } = config;
    const area = FloorMeshFactory.calculateArea(points);

    // 计算周长
    let perimeter = 0;
    for (let i = 0; i < points.length; i += 1) {
      const j = (i + 1) % points.length;
      perimeter += points[i].distanceTo(points[j]);
    }

    // 顶面 + 底面 + 侧面
    const topBottom = 2 * area;
    const sides = perimeter * thickness;

    return topBottom + sides;
  }

  /**
   * 创建矩形地面
   * @param {number} width - 宽度
   * @param {number} depth - 深度
   * @param {Object} options - 其他选项
   * @returns {Object} 地面配置
   */
  static createRectFloor(width, depth, options = {}) {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;

    const points = [
      new THREE.Vector2(-halfWidth, -halfDepth),
      new THREE.Vector2(halfWidth, -halfDepth),
      new THREE.Vector2(halfWidth, halfDepth),
      new THREE.Vector2(-halfWidth, halfDepth),
    ];

    return {
      points,
      ...options,
    };
  }

  /**
   * 创建圆形地面
   * @param {number} radius - 半径
   * @param {number} segments - 分段数
   * @param {Object} options - 其他选项
   * @returns {Object} 地面配置
   */
  static createCircularFloor(radius, segments = 32, options = {}) {
    const points = [];

    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      points.push(new THREE.Vector2(x, y));
    }

    return {
      points,
      ...options,
    };
  }
}

export default FloorMeshFactory;
