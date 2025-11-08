import * as THREE from 'three';

/**
 * MeasurementTool - 测量工具基类，提供距离、面积、角度测量
 */
class MeasurementTool {
  constructor() {
    this.points = [];
    this.isActive = false;
    this.measurements = [];
    this.visualHelpers = [];
  }

  /**
   * 激活测量工具
   */
  activate() {
    this.isActive = true;
    this.points = [];
    this.measurements = [];
  }

  /**
   * 停用测量工具
   */
  deactivate() {
    this.isActive = false;
    this.clearVisualHelpers();
  }

  /**
   * 添加测量点
   * @param {THREE.Vector3} point - 三维空间中的点
   */
  addPoint(point) {
    if (!this.isActive) return;

    this.points.push(point.clone());
    this.onPointAdded(point);
  }

  /**
   * 移除最后一个点
   */
  removeLastPoint() {
    if (this.points.length > 0) {
      this.points.pop();
      this.onPointRemoved();
    }
  }

  /**
   * 获取测量结果
   * @returns {Object} 测量结果对象
   */
  getMeasurements() {
    return [...this.measurements];
  }

  /**
   * 清空所有可视化帮助
   */
  clearVisualHelpers() {
    this.visualHelpers.forEach((helper) => {
      if (helper.geometry) helper.geometry.dispose();
      if (helper.material) helper.material.dispose();
    });
    this.visualHelpers = [];
  }

  /**
   * 清空测量数据
   */
  clear() {
    this.points = [];
    this.measurements = [];
    this.clearVisualHelpers();
  }

  /**
   * 点被添加时的回调（子类重写）
   */
  onPointAdded(point) {
    // 子类实现
  }

  /**
   * 点被移除时的回调（子类重写）
   */
  onPointRemoved() {
    // 子类实现
  }

  /**
   * 获取可视化对象（子类重写）
   */
  getVisualHelpers() {
    return this.visualHelpers;
  }
}

/**
 * DistanceMeasurement - 距离测量工具
 */
class DistanceMeasurement extends MeasurementTool {
  constructor() {
    super();
    this.mode = 'distance'; // 'distance' 或 'continuous'
  }

  onPointAdded(point) {
    if (this.points.length === 2) {
      const distance = this.points[0].distanceTo(this.points[1]);
      this.measurements.push({
        type: 'distance',
        distance,
        from: this.points[0].clone(),
        to: this.points[1].clone(),
      });

      // 创建可视化
      this.createDistanceHelper();

      // 如果是连续模式，保留最后一点作为下一次的起点
      if (this.mode === 'continuous') {
        this.points = [this.points[1]];
      } else {
        this.points = [];
      }
    }
  }

  createDistanceHelper() {
    if (this.measurements.length === 0) return;

    const lastMeasurement = this.measurements[this.measurements.length - 1];
    const { from, to } = lastMeasurement;

    // 创建线
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([from.x, from.y, from.z, to.x, to.y, to.z]), 3)
    );

    const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    this.visualHelpers.push(line);

    // 创建端点球体
    const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    const sphere1 = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere1.position.copy(from);
    this.visualHelpers.push(sphere1);

    const sphere2 = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere2.position.copy(to);
    this.visualHelpers.push(sphere2);
  }
}

/**
 * AreaMeasurement - 面积测量工具
 */
class AreaMeasurement extends MeasurementTool {
  constructor() {
    super();
  }

  /**
   * 完成面积测量
   */
  completeMeasurement() {
    if (this.points.length >= 3) {
      const area = this.calculatePolygonArea(this.points);
      this.measurements.push({
        type: 'area',
        area,
        points: this.points.map((p) => p.clone()),
        perimeter: this.calculatePerimeter(this.points),
      });

      this.createAreaHelper();
      this.points = [];
    }
  }

  calculatePolygonArea(points) {
    if (points.length < 3) return 0;

    // 使用 Shoelace 公式计算面积（在XZ平面上）
    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      area += p1.x * p2.z - p2.x * p1.z;
    }
    return Math.abs(area) / 2;
  }

  calculatePerimeter(points) {
    let perimeter = 0;
    for (let i = 0; i < points.length; i += 1) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      perimeter += p1.distanceTo(p2);
    }
    return perimeter;
  }

  createAreaHelper() {
    if (this.measurements.length === 0) return;

    const lastMeasurement = this.measurements[this.measurements.length - 1];
    const { points } = lastMeasurement;

    // 创建多边形边框
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    points.forEach((p) => {
      positions.push(p.x, p.y, p.z);
    });
    positions.push(points[0].x, points[0].y, points[0].z); // 闭合

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));

    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    this.visualHelpers.push(line);

    // 创建半透明面
    const faceGeometry = new THREE.BufferGeometry();
    const facePositions = [];
    points.forEach((p) => {
      facePositions.push(p.x, p.y, p.z);
    });
    faceGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(facePositions), 3)
    );

    // 计算面的索引
    if (points.length === 3) {
      faceGeometry.setIndex([0, 1, 2]);
    } else {
      // 对于凸多边形使用简单三角剖分
      const indices = [];
      for (let i = 1; i < points.length - 1; i += 1) {
        indices.push(0, i, i + 1);
      }
      faceGeometry.setIndex(indices);
    }

    const faceMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
    });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    this.visualHelpers.push(face);
  }
}

/**
 * AngleMeasurement - 角度测量工具
 */
class AngleMeasurement extends MeasurementTool {
  constructor() {
    super();
  }

  onPointAdded(point) {
    if (this.points.length === 3) {
      const angle = this.calculateAngle(this.points[0], this.points[1], this.points[2]);
      this.measurements.push({
        type: 'angle',
        angle,
        vertex: this.points[1].clone(),
        point1: this.points[0].clone(),
        point2: this.points[2].clone(),
      });

      this.createAngleHelper();
      this.points = [];
    }
  }

  calculateAngle(p1, vertex, p2) {
    const v1 = new THREE.Vector3().subVectors(p1, vertex);
    const v2 = new THREE.Vector3().subVectors(p2, vertex);

    const cosAngle = v1.dot(v2) / (v1.length() * v2.length());
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    return THREE.MathUtils.radToDeg(angle);
  }

  createAngleHelper() {
    if (this.measurements.length === 0) return;

    const lastMeasurement = this.measurements[this.measurements.length - 1];
    const { vertex, point1, point2 } = lastMeasurement;

    // 创建从顶点到两个点的线
    const geometry1 = new THREE.BufferGeometry();
    geometry1.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([vertex.x, vertex.y, vertex.z, point1.x, point1.y, point1.z]),
        3
      )
    );
    const material = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
    const line1 = new THREE.Line(geometry1, material);
    this.visualHelpers.push(line1);

    const geometry2 = new THREE.BufferGeometry();
    geometry2.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([vertex.x, vertex.y, vertex.z, point2.x, point2.y, point2.z]),
        3
      )
    );
    const line2 = new THREE.Line(geometry2, material);
    this.visualHelpers.push(line2);

    // 创建顶点球体
    const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(vertex);
    this.visualHelpers.push(sphere);
  }
}

export { MeasurementTool, DistanceMeasurement, AreaMeasurement, AngleMeasurement };
