/**
 * InputManager - 统一处理用户输入（鼠标、键盘等）
 * 功能：
 * - 鼠标滚轮缩放（以鼠标位置为中心）
 * - 中键平移（拖拽）
 * - 键盘快捷键（空格、Ctrl+Z、Delete等）
 * - 工具快捷键切换（Q=选择、W=墙体等）
 */

const TOOL_SHORTCUTS = {
  q: { tool: 'select', label: '选择' },
  w: { tool: 'wall', label: '墙体' },
  d: { tool: 'delete', label: '删除' },
  r: { tool: 'rectangle', label: '矩形' },
  c: { tool: 'circle', label: '圆形' },
  m: { tool: 'measure', label: '测量' },
  space: { tool: 'pan', label: '平移' },
};

const KEYBOARD_SHORTCUTS = {
  escape: 'cancel',
  delete: 'delete',
  backspace: 'undo',
  'ctrl+z': 'undo',
  'ctrl+y': 'redo',
  'ctrl+shift+z': 'redo',
  's': 'save',
  'ctrl+s': 'save',
};

class InputManager {
  /**
   * @param {THREE.Camera} camera - Three.js相机
   * @param {THREE.WebGLRenderer} renderer - Three.js渲染器
   * @param {Object} store - Vuex store
   * @param {Object} options - 配置选项
   */
  constructor(camera, renderer, store, options = {}) {
    this.camera = camera;
    this.renderer = renderer;
    this.store = store;
    this.options = {
      minZoom: 0.1,
      maxZoom: 10,
      zoomSpeed: 0.1,
      panBoundary: true,
      ...options,
    };

    // 输入状态
    this.state = {
      isMiddleMouseDown: false,
      lastMouseX: 0,
      lastMouseY: 0,
      isPanning: false,
      spacePressed: false,
      shift: false,
      ctrl: false,
      alt: false,
    };

    // 快捷键回调
    this.callbacks = new Map();

    this.eventListeners = new Map();

    this.init();
  }

  /**
   * 初始化
   */
  init() {
    this.bindMouseEvents();
    this.bindKeyboardEvents();
  }

  /**
   * 绑定鼠标事件
   */
  bindMouseEvents() {
    const canvas = this.renderer.domElement;

    const onWheel = (event) => this.handleWheel(event);
    const onMouseDown = (event) => this.handleMouseDown(event);
    const onMouseMove = (event) => this.handleMouseMove(event);
    const onMouseUp = (event) => this.handleMouseUp(event);

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);

    this.eventListeners.set('wheel', { target: canvas, handler: onWheel });
    this.eventListeners.set('mousedown', { target: canvas, handler: onMouseDown });
    this.eventListeners.set('mousemove', { target: canvas, handler: onMouseMove });
    this.eventListeners.set('mouseup', { target: canvas, handler: onMouseUp });
  }

  /**
   * 绑定键盘事件
   */
  bindKeyboardEvents() {
    const onKeyDown = (event) => this.handleKeyDown(event);
    const onKeyUp = (event) => this.handleKeyUp(event);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.eventListeners.set('keydown', { target: window, handler: onKeyDown });
    this.eventListeners.set('keyup', { target: window, handler: onKeyUp });
  }

  /**
   * 处理滚轮事件 - 平滑缩放
   */
  handleWheel(event) {
    event.preventDefault();

    if (!this.camera) return;

    // 获取鼠标位置（归一化）
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 计算缩放因子
    const zoomFactor = event.deltaY > 0 ? 1 + this.options.zoomSpeed : 1 - this.options.zoomSpeed;

    if (this.camera.isOrthographicCamera) {
      this.zoomOrthographic(zoomFactor, mouseX, mouseY);
    } else if (this.camera.isPerspectiveCamera) {
      this.zoomPerspective(zoomFactor, mouseX, mouseY);
    }

    // 触发自定义事件
    this.emit('zoom', { zoomFactor });
  }

  /**
   * 正交相机缩放
   */
  zoomOrthographic(zoomFactor, mouseX, mouseY) {
    const oldZoom = this.camera.zoom;
    const newZoom = Math.max(
      this.options.minZoom,
      Math.min(this.options.maxZoom, oldZoom / zoomFactor)
    );

    // 以鼠标位置为中心缩放
    const zoomRatio = oldZoom / newZoom;

    // 计算世界坐标中的鼠标位置
    const frustumSize = this.getFrustumSize();
    const mouseWorldX = mouseX * (frustumSize.width / 2);
    const mouseWorldY = mouseY * (frustumSize.height / 2);

    // 更新相机位置
    this.camera.position.x += mouseWorldX * (1 - zoomRatio);
    this.camera.position.z += mouseWorldY * (1 - zoomRatio);

    // 更新缩放
    this.camera.zoom = newZoom;
    this.camera.updateProjectionMatrix();
  }

  /**
   * 透视相机缩放
   */
  zoomPerspective(zoomFactor, mouseX, mouseY) {
    const direction = this.camera.getWorldDirection(new THREE.Vector3());
    const distance = this.camera.position.length();

    const newDistance = Math.max(
      distance / this.options.maxZoom,
      Math.min(distance / this.options.minZoom, distance / zoomFactor)
    );

    const diff = newDistance - distance;
    const moveVector = direction.multiplyScalar(diff);

    this.camera.position.add(moveVector);
  }

  /**
   * 获取视锥体大小
   */
  getFrustumSize() {
    if (this.camera.isOrthographicCamera) {
      const vFOV = this.camera.top - this.camera.bottom;
      const height = 2 * Math.tan((Math.PI * this.camera.fov) / 360) * this.camera.position.z;
      const width = height * this.camera.aspect;
      return { width, height };
    }
    return { width: 0, height: 0 };
  }

  /**
   * 处理鼠标按下事件
   */
  handleMouseDown(event) {
    if (event.button === 2) {
      // 右键或中键拖拽平移
      this.state.isMiddleMouseDown = true;
      this.state.lastMouseX = event.clientX;
      this.state.lastMouseY = event.clientY;
      this.state.isPanning = true;
    }
  }

  /**
   * 处理鼠标移动事件
   */
  handleMouseMove(event) {
    if (!this.state.isPanning || !this.camera) return;

    const deltaX = event.clientX - this.state.lastMouseX;
    const deltaY = event.clientY - this.state.lastMouseY;

    this.state.lastMouseX = event.clientX;
    this.state.lastMouseY = event.clientY;

    this.pan(deltaX, deltaY);

    this.emit('pan', { deltaX, deltaY });
  }

  /**
   * 执行平移操作
   */
  pan(deltaX, deltaY) {
    if (this.camera.isOrthographicCamera) {
      this.panOrthographic(deltaX, deltaY);
    } else if (this.camera.isPerspectiveCamera) {
      this.panPerspective(deltaX, deltaY);
    }
  }

  /**
   * 正交相机平移
   */
  panOrthographic(deltaX, deltaY) {
    const frustumSize = this.getFrustumSize();
    const rect = this.renderer.domElement.getBoundingClientRect();

    const panSpeedX = (frustumSize.width / rect.width) * 0.5;
    const panSpeedY = (frustumSize.height / rect.height) * 0.5;

    this.camera.position.x -= deltaX * panSpeedX;
    this.camera.position.z += deltaY * panSpeedY;

    // 应用边界限制
    if (this.options.panBoundary) {
      this.applyPanBoundary();
    }

    this.camera.updateProjectionMatrix();
  }

  /**
   * 透视相机平移
   */
  panPerspective(deltaX, deltaY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const panSpeed = 0.01;

    const leftVector = new THREE.Vector3()
      .crossVectors(this.camera.up, this.camera.getWorldDirection(new THREE.Vector3()))
      .normalize();
    const upVector = this.camera.up.clone().normalize();

    leftVector.multiplyScalar(deltaX * panSpeed);
    upVector.multiplyScalar(deltaY * panSpeed);

    this.camera.position.add(leftVector);
    this.camera.position.add(upVector);
  }

  /**
   * 应用平移边界限制
   */
  applyPanBoundary() {
    // 可以根据场景大小设置边界
    const boundary = 100;
    this.camera.position.x = Math.max(-boundary, Math.min(boundary, this.camera.position.x));
    this.camera.position.z = Math.max(-boundary, Math.min(boundary, this.camera.position.z));
  }

  /**
   * 处理鼠标释放事件
   */
  handleMouseUp(event) {
    if (event.button === 2) {
      this.state.isMiddleMouseDown = false;
      this.state.isPanning = false;
    }
  }

  /**
   * 处理键盘按下事件
   */
  handleKeyDown(event) {
    // 更新修饰键状态
    this.state.shift = event.shiftKey;
    this.state.ctrl = event.ctrlKey || event.metaKey;
    this.state.alt = event.altKey;

    let key = event.key.toLowerCase();

    // 标准化 Space 键
    if (key === ' ' || event.code === 'Space') {
      key = 'space';
    }

    // 检查工具快捷键
    if (TOOL_SHORTCUTS[key] && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      this.handleToolShortcut(key);
      return;
    }

    // 构建快捷键组合字符串
    let shortcutKey = '';
    if (event.ctrlKey || event.metaKey) shortcutKey += 'ctrl+';
    if (event.shiftKey) shortcutKey += 'shift+';
    if (event.altKey) shortcutKey += 'alt+';
    
    // 对于正常按键，也需要标准化（例如'backspace'等）
    let normalizedKey = key;
    if (key === 'delete' || key === 'backspace' || key === 'escape') {
      normalizedKey = key.toLowerCase();
    }
    shortcutKey += normalizedKey;

    // 检查键盘快捷键
    const action = KEYBOARD_SHORTCUTS[shortcutKey];
    if (action) {
      event.preventDefault();
      this.handleKeyboardShortcut(action, event);
      return;
    }

    // 触发自定义事件
    this.emit('keydown', { key, event });
  }

  /**
   * 处理键盘释放事件
   */
  handleKeyUp(event) {
    let key = event.key.toLowerCase();

    // 标准化 Space 键
    if (key === ' ' || event.code === 'Space') {
      key = 'space';
    }

    // 空格键释放
    if (key === 'space') {
      this.state.spacePressed = false;
      this.emit('spaceup', { event });
    }

    // 更新修饰键状态
    this.state.shift = event.shiftKey;
    this.state.ctrl = event.ctrlKey || event.metaKey;
    this.state.alt = event.altKey;
  }

  /**
   * 处理工具快捷键
   */
  handleToolShortcut(key) {
    const shortcut = TOOL_SHORTCUTS[key];
    if (!shortcut) return;

    if (key === 'space') {
      this.state.spacePressed = true;
      this.emit('spacedown', { tool: shortcut.tool });
    } else {
      this.emit('tooltrigger', { tool: shortcut.tool, key });

      // 如果是墙体工具
      if (shortcut.tool === 'wall' && this.store) {
        this.store.dispatch('editor/setDrawWallTool', true);
      }
    }
  }

  /**
   * 处理键盘快捷键
   */
  handleKeyboardShortcut(action, event) {
    switch (action) {
      case 'undo':
        this.emit('undo', { event });
        break;
      case 'redo':
        this.emit('redo', { event });
        break;
      case 'delete':
        this.emit('delete', { event });
        break;
      case 'cancel':
        this.emit('cancel', { event });
        break;
      case 'save':
        this.emit('save', { event });
        break;
      default:
        break;
    }
  }

  /**
   * 注册事件回调
   */
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  /**
   * 注销事件回调
   */
  off(event, callback) {
    if (!this.callbacks.has(event)) return;
    const callbacks = this.callbacks.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (!this.callbacks.has(event)) return;
    const callbacks = this.callbacks.get(event);
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    });
  }

  /**
   * 获取工具快捷键配置
   */
  static getToolShortcuts() {
    return TOOL_SHORTCUTS;
  }

  /**
   * 获取键盘快捷键配置
   */
  static getKeyboardShortcuts() {
    return KEYBOARD_SHORTCUTS;
  }

  /**
   * 销毁InputManager
   */
  destroy() {
    this.eventListeners.forEach(({ target, handler }) => {
      if (target === window) {
        target.removeEventListener('keydown', handler);
        target.removeEventListener('keyup', handler);
      } else {
        // canvas元素
        target.removeEventListener('wheel', handler);
        target.removeEventListener('mousedown', handler);
        target.removeEventListener('mousemove', handler);
        target.removeEventListener('mouseup', handler);
      }
    });

    this.eventListeners.clear();
    this.callbacks.clear();
  }
}

// 导入THREE，避免在模块加载时出错
if (typeof window !== 'undefined' && window.THREE) {
  // eslint-disable-next-line no-undef
} else {
  // Node环境下导入
  try {
    // eslint-disable-next-line global-require
    const THREE = require('three');
    if (THREE) {
      // THREE已导入
    }
  } catch (e) {
    // 忽略导入错误
  }
}

export default InputManager;
