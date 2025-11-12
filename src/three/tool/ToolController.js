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
import DrawWallTool from './DrawWallTool';
import WallFactory from '../factory/WallFactory';
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

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
    if (this.store && typeof this.store.commit === 'function') {
      this.store.commit('editor/SET_COMMAND_STACK', this.commandStack);
    }

    this.sceneGraph = getSharedSceneGraph();

    // 工具状态
    this.activeTool = null;
    this.drawWallTool = null;

    // 交互状态
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // 事件监听器
    this.eventListeners = new Map();

    this.initDrawWallTool();
    this.initEventListeners();
    this.initCommandStackListeners();
  }

  /**
   * 初始化墙体绘制工具
   */
  initDrawWallTool() {
    this.drawWallTool = new DrawWallTool(
      this.scene,
      this.camera,
      this.raycaster,
      this.groundPlane,
      this.store
    );

    // 设置墙体创建回调
    this.drawWallTool.onWallCreatedCallback((wallConfig) => {
      this.createWallFromDrawing(wallConfig);
    });
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
    if (this.store.state.editor.drawWallToolEnabled && this.drawWallTool) {
      const groundPoint = this.getGroundPoint();
      if (groundPoint) {
        // Convert ground point (x, y, z) to 2D point (x, y) for tool
        this.drawWallTool.startDrawing(
          new THREE.Vector2(groundPoint.x, groundPoint.z)
        );
      }
    }
  }

  /**
   * 处理鼠标移动事件
   */
  handleMouseMove(event) {
    this.updateMousePosition(event);

    if (this.drawWallTool && this.drawWallTool.isActive()) {
      const groundPoint = this.getGroundPoint();
      if (groundPoint) {
        // Convert ground point (x, y, z) to 2D point (x, y) for tool
        this.drawWallTool.updateDrawing(
          new THREE.Vector2(groundPoint.x, groundPoint.z)
        );
      }
    }
  }

  /**
   * 处理鼠标释放事件
   */
  handleMouseUp(event) {
    if (event.button !== 0) return; // 只处理左键

    if (this.drawWallTool && this.drawWallTool.isActive()) {
      const groundPoint = this.getGroundPoint();
      if (groundPoint) {
        // Convert ground point (x, y, z) to 2D point (x, y) for tool
        this.drawWallTool.finishDrawing(
          new THREE.Vector2(groundPoint.x, groundPoint.z)
        );
      }
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
      event.preventDefault();
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
   * 从绘制工具创建墙体
   */
  createWallFromDrawing(wallConfig) {
    const command = new CreateWallCommand(this.scene, wallConfig, {
      store: this.store,
      sceneGraph: this.sceneGraph,
    });
    this.commandStack.execute(command);
  }

  /**
   * 取消当前操作
   */
  cancelCurrentOperation() {
    if (this.drawWallTool && this.drawWallTool.isActive()) {
      this.drawWallTool.cancel();
    }
  }

  /**
   * 更新墙体属性
   */
  async updateWallProperty(wall, property, value) {
    const newConfig = { [property]: value };
    const command = new UpdateWallCommand(wall, newConfig, null, {
      store: this.store,
      sceneGraph: this.sceneGraph,
    });
    return this.commandStack.execute(command);
  }

  /**
   * 删除墙体
   */
  async deleteWall(wall) {
    const command = new DeleteWallCommand(this.scene, wall, {
      store: this.store,
      sceneGraph: this.sceneGraph,
    });
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

    // 销毁绘制工具
    if (this.drawWallTool) {
      this.drawWallTool.destroy();
      this.drawWallTool = null;
    }

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
