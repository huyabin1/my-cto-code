import * as THREE from 'three';
import WallFactory from '../factory/WallFactory';

/**
 * DrawWallTool - 墙体绘制工具
 * 封装墙体绘制的状态机（空闲/绘制/确认）和指示线渲染
 */
class DrawWallTool {
  // 工具状态
  static STATE = {
    IDLE: 'idle',
    DRAWING: 'drawing',
    CONFIRMING: 'confirming',
  };

  /**
   * @param {THREE.Scene} scene - Three.js场景
   * @param {THREE.Camera} camera - Three.js相机
   * @param {THREE.Raycaster} raycaster - 光线投射器
   * @param {THREE.Plane} groundPlane - 地面平面
   * @param {Object} store - Vuex store实例
   */
  constructor(scene, camera, raycaster, groundPlane, store) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = raycaster;
    this.groundPlane = groundPlane;
    this.store = store;

    // 状态管理
    this.state = DrawWallTool.STATE.IDLE;
    this.startPoint = null;
    this.endPoint = null;
    this.currentMousePosition = new THREE.Vector2();

    // 临时几何和辅助对象
    this.tempWall = null;
    this.guideLineGroup = new THREE.Group();
    this.guideLineGroup.name = 'DrawWallTool_GuideLines';
    this.scene.add(this.guideLineGroup);

    // 配置缓存
    this.wallConfig = {
      height: 2.8,
      thickness: 0.2,
    };

    // 事件回调
    this.onStateChange = null;
    this.onWallCreated = null;
  }

  /**
   * 获取当前状态
   */
  getState() {
    return this.state;
  }

  /**
   * 检查工具是否活跃
   */
  isActive() {
    return this.state !== DrawWallTool.STATE.IDLE;
  }

  /**
   * 获取地面上的点
   */
  getGroundPoint(mouseX, mouseY) {
    this.raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);
    return intersectPoint;
  }

  /**
   * 更新鼠标位置
   */
  updateMousePosition(screenX, screenY) {
    const canvas = this.raycaster.camera ? this.raycaster.camera.domElement : null;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    this.currentMousePosition.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    this.currentMousePosition.y = -((screenY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * 开始绘制墙体
   * @param {THREE.Vector2} point2D - 2D点坐标 (x, y 对应地面的 x, z)
   */
  startDrawing(point2D) {
    if (this.state !== DrawWallTool.STATE.IDLE) return;

    this.startPoint = point2D.clone();
    this.endPoint = this.startPoint.clone();
    this.state = DrawWallTool.STATE.DRAWING;

    // 创建临时墙体预览
    this.createTempWall();
    this.updateGuideLines();

    if (this.onStateChange) {
      this.onStateChange(this.state, { startPoint: this.startPoint.clone() });
    }
  }

  /**
   * 更新绘制中的墙体
   * @param {THREE.Vector2} point2D - 2D点坐标
   */
  updateDrawing(point2D) {
    if (this.state !== DrawWallTool.STATE.DRAWING || !this.startPoint) return;

    this.endPoint = point2D.clone();
    this.updateTempWall();
    this.updateGuideLines();
  }

  /**
   * 完成绘制并创建墙体
   * @param {THREE.Vector2} point2D - 2D点坐标
   */
  finishDrawing(point2D) {
    if (this.state !== DrawWallTool.STATE.DRAWING || !this.startPoint) return;

    this.endPoint = point2D.clone();

    // 检查墙体长度
    if (this.startPoint.distanceTo(this.endPoint) < 0.1) {
      this.cancel();
      return;
    }

    // 清理临时对象
    this.removeTempWall();
    this.clearGuideLines();

    // 创建墙体配置
    const wallConfig = {
      start: this.startPoint.clone(),
      end: this.endPoint.clone(),
      height: this.wallConfig.height,
      thickness: this.wallConfig.thickness,
      material: this.store?.state?.editor?.activeSelection?.material || 'concrete',
      color: this.store?.state?.editor?.activeSelection?.color || '#ffffff',
    };

    // 更新状态并触发回调
    this.state = DrawWallTool.STATE.IDLE;
    this.startPoint = null;
    this.endPoint = null;

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    if (this.onWallCreated) {
      this.onWallCreated(wallConfig);
    }
  }

  /**
   * 创建临时墙体
   */
  createTempWall() {
    if (!this.startPoint || !this.endPoint) return;

    try {
      this.tempWall = WallFactory.create({
        start: this.startPoint,
        end: this.endPoint,
        height: this.wallConfig.height,
        thickness: this.wallConfig.thickness,
        material: 'concrete',
        color: 0x888888,
      });

      // 设置临时墙体为半透明
      this.tempWall.traverse((child) => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = 0.5;
        }
      });

      this.scene.add(this.tempWall);
    } catch (error) {
      console.error('Failed to create temp wall:', error);
    }
  }

  /**
   * 更新临时墙体
   */
  updateTempWall() {
    if (!this.tempWall || !this.startPoint || !this.endPoint) return;

    try {
      WallFactory.update(this.tempWall, {
        start: this.startPoint,
        end: this.endPoint,
        height: this.wallConfig.height,
        thickness: this.wallConfig.thickness,
      });
    } catch (error) {
      console.error('Failed to update temp wall:', error);
    }
  }

  /**
   * 移除临时墙体
   */
  removeTempWall() {
    if (this.tempWall) {
      this.scene.remove(this.tempWall);
      this.tempWall.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.tempWall = null;
    }
  }

  /**
   * 更新指示线
   */
  updateGuideLines() {
    this.clearGuideLines();

    if (!this.startPoint) return;

    // 创建起点标记
    const startMarkerGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const startMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const startMarker = new THREE.Mesh(startMarkerGeometry, startMarkerMaterial);
    startMarker.position.set(this.startPoint.x, 0.1, this.startPoint.y);
    this.guideLineGroup.add(startMarker);

    // 创建连接线
    if (this.endPoint && !this.startPoint.equals(this.endPoint)) {
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array([
        this.startPoint.x,
        0.05,
        this.startPoint.y,
        this.endPoint.x,
        0.05,
        this.endPoint.y,
      ]);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x0088ff,
        linewidth: 2,
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.guideLineGroup.add(line);

      // 创建终点标记
      const endMarkerGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const endMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xff8800 });
      const endMarker = new THREE.Mesh(endMarkerGeometry, endMarkerMaterial);
      endMarker.position.set(this.endPoint.x, 0.1, this.endPoint.y);
      this.guideLineGroup.add(endMarker);
    }
  }

  /**
   * 清除指示线
   */
  clearGuideLines() {
    this.guideLineGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.guideLineGroup.clear();
  }

  /**
   * 取消绘制
   */
  cancel() {
    this.removeTempWall();
    this.clearGuideLines();

    const previousState = this.state;
    this.state = DrawWallTool.STATE.IDLE;
    this.startPoint = null;
    this.endPoint = null;

    if (this.onStateChange && previousState !== DrawWallTool.STATE.IDLE) {
      this.onStateChange(this.state, { cancelled: true });
    }
  }

  /**
   * 设置状态变化回调
   */
  onStateChangeCallback(callback) {
    this.onStateChange = callback;
    return this;
  }

  /**
   * 设置墙体创建回调
   */
  onWallCreatedCallback(callback) {
    this.onWallCreated = callback;
    return this;
  }

  /**
   * 设置墙体配置
   */
  setWallConfig(config) {
    if (config.height !== undefined) {
      this.wallConfig.height = config.height;
    }
    if (config.thickness !== undefined) {
      this.wallConfig.thickness = config.thickness;
    }
  }

  /**
   * 销毁工具
   */
  destroy() {
    this.cancel();
    this.clearGuideLines();
    if (this.guideLineGroup && this.guideLineGroup.parent) {
      this.scene.remove(this.guideLineGroup);
    }
    this.onStateChange = null;
    this.onWallCreated = null;
  }
}

export default DrawWallTool;
