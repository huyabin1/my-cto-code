# InputManager 文档

## 概述

`InputManager` 是统一处理用户输入的管理类，包括鼠标和键盘事件。它提供以下功能：

- **鼠标滚轮缩放** - 以鼠标位置为中心的平滑缩放
- **鼠标平移** - 右键拖拽或中键进行场景平移
- **键盘快捷键** - 工具快捷键和编辑命令快捷键
- **事件系统** - 基于回调的事件发出和监听

## 快速开始

### 创建 InputManager

```javascript
import InputManager from '@/utils/InputManager';
import * as THREE from 'three';

// 假设已有 camera, renderer, store
const inputManager = new InputManager(camera, renderer, store, {
  minZoom: 0.2,
  maxZoom: 5,
  zoomSpeed: 0.1,
  panBoundary: true,
});
```

### 监听输入事件

```javascript
// 缩放事件
inputManager.on('zoom', (data) => {
  console.log('Zoom factor:', data.zoomFactor);
});

// 平移事件
inputManager.on('pan', (data) => {
  console.log('Pan delta:', data.deltaX, data.deltaY);
});

// 工具快捷键
inputManager.on('tooltrigger', (data) => {
  console.log('Tool selected:', data.tool);
});

// 编辑命令
inputManager.on('undo', () => {
  console.log('Undo triggered');
});
```

### 销毁 InputManager

```javascript
inputManager.destroy();
```

## 功能详解

### 1. 鼠标滚轮缩放 (Wheel Zoom)

#### 行为
- 向上滚动（`deltaY < 0`）：放大（缩放因子增加）
- 向下滚动（`deltaY > 0`）：缩小（缩放因子减少）
- 缩放以鼠标位置为中心

#### 支持的相机类型
- **正交相机** (`OrthographicCamera`)：修改相机缩放和位置
- **透视相机** (`PerspectiveCamera`)：修改相机与目标的距离

#### 配置选项
```javascript
const inputManager = new InputManager(camera, renderer, store, {
  minZoom: 0.1,    // 最小缩放（默认 0.1）
  maxZoom: 10,     // 最大缩放（默认 10）
  zoomSpeed: 0.1,  // 缩放速度（默认 0.1）
});
```

#### 事件
```javascript
inputManager.on('zoom', (data) => {
  // data.zoomFactor: 缩放因子
});
```

### 2. 鼠标平移 (Mouse Pan)

#### 行为
- 右键（按钮 2）拖拽激活平移
- 平移速度和方向根据鼠标移动距离计算

#### 支持的相机类型
- **正交相机**：直接修改相机位置
- **透视相机**：根据相机方向移动

#### 配置选项
```javascript
const inputManager = new InputManager(camera, renderer, store, {
  panBoundary: true, // 是否启用边界限制（默认 true）
});
```

#### 事件
```javascript
inputManager.on('pan', (data) => {
  // data.deltaX: X轴移动量
  // data.deltaY: Y轴移动量
});
```

### 3. 键盘快捷键

#### 工具快捷键

| 快捷键 | 工具 | 说明 |
|--------|------|------|
| Q | 选择 | 激活选择工具 |
| W | 墙体 | 激活墙体绘制工具 |
| D | 删除 | 激活删除工具 |
| R | 矩形 | 激活矩形工具 |
| C | 圆形 | 激活圆形工具 |
| M | 测量 | 激活测量工具 |
| Space | 平移 | 激活平移模式（按住时生效） |

#### 编辑命令快捷键

| 快捷键 | 命令 | 说明 |
|--------|------|------|
| Ctrl+Z | 撤销 | 撤销上一步操作 |
| Ctrl+Y | 重做 | 重做下一步操作 |
| Ctrl+Shift+Z | 重做 | 重做下一步操作（备选快捷键） |
| Delete | 删除 | 删除选中对象 |
| Escape | 取消 | 取消当前操作 |
| Ctrl+S | 保存 | 保存项目 |

#### 工具快捷键事件

```javascript
inputManager.on('tooltrigger', (data) => {
  // data.tool: 工具名称 ('select', 'wall', 'delete', 等)
  // data.key: 触发的按键
});
```

#### 空格键特殊处理

```javascript
// 空格键按下
inputManager.on('spacedown', (data) => {
  // data.tool: 'pan'
});

// 空格键释放
inputManager.on('spaceup', (data) => {
  // 空格已释放
});
```

#### 编辑命令事件

```javascript
inputManager.on('undo', ({ event }) => {
  // 撤销事件
});

inputManager.on('redo', ({ event }) => {
  // 重做事件
});

inputManager.on('delete', ({ event }) => {
  // 删除事件
});

inputManager.on('cancel', ({ event }) => {
  // 取消事件
});

inputManager.on('save', ({ event }) => {
  // 保存事件
});
```

### 4. 修饰键状态

InputManager 跟踪修饰键的状态：

```javascript
// 访问修饰键状态
console.log(inputManager.state.ctrl);   // Ctrl/Cmd 键
console.log(inputManager.state.shift);  // Shift 键
console.log(inputManager.state.alt);    // Alt 键
console.log(inputManager.state.spacePressed); // Space 键
```

## API 参考

### 构造函数

```javascript
constructor(camera, renderer, store, options = {})
```

**参数：**
- `camera` (THREE.Camera): Three.js 相机
- `renderer` (THREE.WebGLRenderer): Three.js 渲染器
- `store` (Object): Vuex 存储实例
- `options` (Object): 配置选项
  - `minZoom` (Number): 最小缩放值
  - `maxZoom` (Number): 最大缩放值
  - `zoomSpeed` (Number): 缩放速度系数
  - `panBoundary` (Boolean): 是否启用平移边界

### 事件方法

#### on(event, callback)

监听事件。

```javascript
inputManager.on('zoom', callback);
```

#### off(event, callback)

取消监听事件。

```javascript
inputManager.off('zoom', callback);
```

#### emit(event, data)

手动触发事件。

```javascript
inputManager.emit('zoom', { zoomFactor: 1.1 });
```

### 状态访问

#### getToolShortcuts()

获取工具快捷键配置。

```javascript
const shortcuts = InputManager.getToolShortcuts();
// 返回:
// {
//   q: { tool: 'select', label: '选择' },
//   w: { tool: 'wall', label: '墙体' },
//   ...
// }
```

#### getKeyboardShortcuts()

获取键盘快捷键配置。

```javascript
const shortcuts = InputManager.getKeyboardShortcuts();
// 返回:
// {
//   'ctrl+z': 'undo',
//   'ctrl+y': 'redo',
//   'delete': 'delete',
//   ...
// }
```

### 清理方法

#### destroy()

销毁 InputManager 并清理所有事件监听器。

```javascript
inputManager.destroy();
```

## 与 FloorplanViewport 集成

InputManager 已集成到 `FloorplanViewport` 组件中。在组件初始化时自动创建，并处理以下事件：

```javascript
// 撤销/重做
inputManager.on('undo', () => {
  this.toolController.undo();
});

inputManager.on('redo', () => {
  this.toolController.redo();
});

// 删除选中对象
inputManager.on('delete', () => {
  // 删除所有选中对象
});

// 取消操作
inputManager.on('cancel', () => {
  // 关闭墙体绘制工具
  // 清除选择
});

// 工具切换
inputManager.on('tooltrigger', ({ tool }) => {
  if (tool === 'select') {
    // 关闭墙体工具
  }
});
```

## 工具栏快捷键提示

`Toolbar` 组件显示所有可用的快捷键：

```vue
<Toolbar />
```

工具栏包含：
- 工具按钮及其快捷键提示
- 编辑命令按钮及其快捷键提示
- 视图快捷键信息（滚轮缩放、右键平移等）

## 高级用法

### 自定义事件处理

```javascript
// 订阅多个事件
const handleZoom = (data) => console.log('Zoomed:', data.zoomFactor);
const handlePan = (data) => console.log('Panned:', data.deltaX, data.deltaY);

inputManager.on('zoom', handleZoom);
inputManager.on('pan', handlePan);

// 稍后取消订阅
inputManager.off('zoom', handleZoom);
inputManager.off('pan', handlePan);
```

### 条件化快捷键处理

```javascript
inputManager.on('delete', ({ event }) => {
  // 只在有选中对象时执行删除
  if (this.store.state.editor.selection.ids.length > 0) {
    deleteSelectedObjects();
  }
});
```

### 组合键检测

```javascript
// 使用 state 中的修饰键信息
inputManager.on('keydown', ({ key, event }) => {
  if (inputManager.state.ctrl && key === 's') {
    // Ctrl+S 处理
    saveProject();
  }
});
```

## 常见问题

### Q: 如何禁用缩放？
A: 不在 InputManager 上监听 'zoom' 事件，或在回调中返回而不处理。

### Q: 如何改变平移速度？
A: 在 InputManager 的 pan 事件中拦截并调整 deltaX/deltaY 值。

### Q: 快捷键冲突怎么办？
A: 检查修饰键状态（`inputManager.state.ctrl` 等），在处理前进行条件检查。

### Q: 如何为特定工具添加快捷键？
A: 在 InputManager.js 中的 `TOOL_SHORTCUTS` 对象中添加新的快捷键定义。

## 性能考虑

- InputManager 使用事件委托，性能开销最小
- 回调函数应该保持轻量级，避免阻塞渲染循环
- 销毁时自动清理所有事件监听器，避免内存泄漏

## 测试

InputManager 包含全面的单元测试 (`tests/unit/InputManager.spec.js`)，覆盖：

- 鼠标滚轮缩放功能
- 鼠标平移功能
- 所有键盘快捷键
- 事件系统
- 状态管理
- 清理和销毁

运行测试：

```bash
npm run test -- InputManager.spec.js
```
