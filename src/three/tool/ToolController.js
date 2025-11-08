import * as THREE from 'three';
import {
  CommandStack,
  CreateWallCommand,
  UpdateWallCommand,
  DeleteWallCommand,
  UpdateActiveSelectionCommand,
  AddMeasurementCommand,
  ToggleToolCommand,
} from '../command';
import WallFactory from '../factory/WallFactory';

/**
 * ToolController - 工具控制器
 * 负责管理用户交互工具和命令执行
 */
class ToolController {
  /**
   * @param {THREE.Scene} scene - Three.js场景
   * @param {THREE.Camera} camera - Three.js相机
   * @param {THREE.Renderer} renderer - Three.js渲染器
   * @param {Object} store - Vuex store实例
   */
  constructor(scene, camera, renderer, store) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.store = store;

    // 命令栈
    this.commandStack = new CommandStack(50);

    // 工具状态
    this.activeTool = null;
    this.isDrawing = false;
    this.tempWall = null;
    this.drawStartPoint = null;

    // 交互状态
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // 事件监听器
    this.eventListeners = new Map();

    this.initEventListeners();
    this.initCommandStackListeners();
  }

  /**
   * 初始化事件监听器
   */
  initEventListeners() {
    const canvas = this.renderer.domElement;

    // 鼠标事件
    const onMouseDown = (event) => this.handleMouseDown(event);
    const onMouseMove = (event) => this.handleMouseMove(event);
    const onMouseUp = (event) => this.handleMouseUp(event);

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);

    // 键盘事件
    const onKeyDown = (event) => this.handleKeyDown(event);
    const onKeyUp = (event) => this.handleKeyUp(event);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // 保存监听器引用以便清理
    this.eventListeners.set('canvas', canvas);
    this.eventListeners.set('onMouseDown', onMouseDown);
    this.eventListeners.set('onMouseMove', onMouseMove);
    this.eventListeners.set('onMouseUp', onMouseUp);
    this.eventListeners.set('onKeyDown', onKeyDown);
    this.eventListeners.set('onKeyUp', onKeyUp);
  }

  /**
   * 初始化命令栈监听器
   */
  initCommandStackListeners() {
    // 监听命令栈变化，更新store状态
    this.commandStack.on('stackChanged', (data) => {
      this.store.commit('editor/SET_COMMAND_STACK_INFO', data);
    });
  }

  /**
   * 处理鼠标按下事件
   */
  handleMouseDown(event) {
    if (event.button !== 0) return; // 只处理左键

    this.updateMousePosition(event);

    // 检查是否激活了墙体绘制工具
    if (this.store.state.editor.drawWallToolEnabled) {
      this.startWallDrawing();
    }
  }

  /**
   * 处理鼠标移动事件
   */
  handleMouseMove(event) {
    this.updateMousePosition(event);

    if (this.isDrawing && this.tempWall) {
      this.updateTempWall();
    }
  }

  /**
   * 处理鼠标释放事件
   */
  handleMouseUp(event) {
    if (event.button !== 0) return; // 只处理左键

    if (this.isDrawing) {
      this.finishWallDrawing();
    }
  }

  /**
   * 处理键盘按下事件
   */
  handleKeyDown(event) {
    // Ctrl+Z: 撤销
    if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    }

    // Ctrl+Y 或 Ctrl+Shift+Z: 重做
    if (
      (event.ctrlKey && event.key === 'y') ||
      (event.ctrlKey && event.shiftKey && event.key === 'z')
    ) {
      event.preventDefault();
      this.redo();
    }

    // ESC: 取消当前操作
    if (event.key === 'Escape') {
      this.cancelCurrentOperation();
    }
  }

  /**
   * 处理键盘释放事件
   */
  handleKeyUp(event) {
    // 可以在这里处理键盘释放事件
  }

  /**
   * 更新鼠标位置
   */
  updateMousePosition(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * 获取地面上的点
   */
  getGroundPoint() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);
    return intersectPoint;
  }

  /**
   * 开始墙体绘制
   */
  startWallDrawing() {
    const groundPoint = this.getGroundPoint();
    if (!groundPoint) return;

    this.isDrawing = true;
    this.drawStartPoint = new THREE.Vector2(groundPoint.x, groundPoint.z);

    // 创建临时墙体预览
    const wallConfig = {
      start: this.drawStartPoint,
      end: this.drawStartPoint,
      height: 2.8,
      thickness: 0.2,
      material: this.store.state.editor.activeSelection.material,
      color: this.store.state.editor.activeSelection.color,
    };

    this.tempWall = WallFactory.create(wallConfig);
    this.tempWall.traverse((child) => {
      if (child.material) {
        child.material.transparent = true;
        child.material.opacity = 0.6;
      }
    });

    this.scene.add(this.tempWall);
  }

  /**
   * 更新临时墙体
   */
  updateTempWall() {
    if (!this.tempWall || !this.drawStartPoint) return;

    const groundPoint = this.getGroundPoint();
    if (!groundPoint) return;

    const endPoint = new THREE.Vector2(groundPoint.x, groundPoint.z);

    // 更新临时墙体配置
    const wallConfig = {
      start: this.drawStartPoint,
      end: endPoint,
      height: 2.8,
      thickness: 0.2,
      material: this.store.state.editor.activeSelection.material,
      color: this.store.state.editor.activeSelection.color,
    };

    WallFactory.update(this.tempWall, wallConfig);
  }

  /**
   * 完成墙体绘制
   */
  finishWallDrawing() {
    if (!this.isDrawing || !this.drawStartPoint) return;

    const groundPoint = this.getGroundPoint();
    if (!groundPoint) return;

    const endPoint = new THREE.Vector2(groundPoint.x, groundPoint.z);

    // 检查墙体长度
    if (this.drawStartPoint.distanceTo(endPoint) < 0.1) {
      this.cancelWallDrawing();
      return;
    }

    // 移除临时墙体
    this.removeTempWall();

    // 创建墙体命令并执行
    const wallConfig = {
      start: this.drawStartPoint,
      end: endPoint,
      height: 2.8,
      thickness: 0.2,
      material: this.store.state.editor.activeSelection.material,
      color: this.store.state.editor.activeSelection.color,
    };

    const command = new CreateWallCommand(this.scene, wallConfig);
    this.commandStack.execute(command);

    this.isDrawing = false;
    this.drawStartPoint = null;
  }

  /**
   * 取消墙体绘制
   */
  cancelWallDrawing() {
    this.removeTempWall();
    this.isDrawing = false;
    this.drawStartPoint = null;
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
   * 取消当前操作
   */
  cancelCurrentOperation() {
    if (this.isDrawing) {
      this.cancelWallDrawing();
    }
  }

  /**
   * 更新墙体属性
   */
  async updateWallProperty(wall, property, value) {
    const newConfig = { [property]: value };
    const command = new UpdateWallCommand(wall, newConfig);
    return this.commandStack.execute(command);
  }

  /**
   * 删除墙体
   */
  async deleteWall(wall) {
    const command = new DeleteWallCommand(this.scene, wall);
    return this.commandStack.execute(command);
  }

  /**
   * 更新活动选择属性
   */
  async updateActiveSelection(property, value) {
    const command = new UpdateActiveSelectionCommand(this.store, property, value);
    return this.commandStack.execute(command);
  }

  /**
   * 添加测量
   */
  async addMeasurement(measurement) {
    const command = new AddMeasurementCommand(this.store, measurement);
    return this.commandStack.execute(command);
  }

  /**
   * 切换工具
   */
  async toggleTool(toolName) {
    const command = new ToggleToolCommand(this.store, toolName);
    return this.commandStack.execute(command);
  }

  /**
   * 撤销
   */
  async undo() {
    if (this.commandStack.canUndo()) {
      try {
        return this.commandStack.undo();
      } catch (error) {
        console.error('Undo failed:', error);
      }
    }
  }

  /**
   * 重做
   */
  async redo() {
    if (this.commandStack.canRedo()) {
      try {
        return this.commandStack.redo();
      } catch (error) {
        console.error('Redo failed:', error);
      }
    }
  }

  /**
   * 获取命令栈信息
   */
  getCommandStackInfo() {
    return this.commandStack.getStackInfo();
  }

  /**
   * 清空命令栈
   */
  clearCommandStack() {
    this.commandStack.clear();
  }

  /**
   * 销毁工具控制器
   */
  destroy() {
    // 取消当前操作
    this.cancelCurrentOperation();

    // 移除事件监听器
    const canvas = this.eventListeners.get('canvas');
    if (canvas) {
      canvas.removeEventListener('mousedown', this.eventListeners.get('onMouseDown'));
      canvas.removeEventListener('mousemove', this.eventListeners.get('onMouseMove'));
      canvas.removeEventListener('mouseup', this.eventListeners.get('onMouseUp'));
    }

    window.removeEventListener('keydown', this.eventListeners.get('onKeyDown'));
    window.removeEventListener('keyup', this.eventListeners.get('onKeyUp'));

    // 清理命令栈
    this.commandStack.destroy();

    // 清理事件监听器
    this.eventListeners.clear();
  }
}

export default ToolController;
