import * as THREE from 'three';
import InputManager from '@/utils/InputManager';

describe('InputManager', () => {
  let inputManager;
  let mockCamera;
  let mockRenderer;
  let mockStore;
  let mockCanvas;

  beforeEach(() => {
    // 创建模拟相机
    mockCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    mockCamera.position.set(0, 80, 0);
    mockCamera.zoom = 1;

    // 创建模拟renderer和canvas
    mockCanvas = document.createElement('div');
    mockCanvas.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    }));

    mockRenderer = {
      domElement: mockCanvas,
    };

    // 创建模拟store
    mockStore = {
      dispatch: jest.fn(),
      commit: jest.fn(),
      state: {
        editor: {
          drawWallToolEnabled: false,
        },
      },
    };

    inputManager = new InputManager(mockCamera, mockRenderer, mockStore);
  });

  afterEach(() => {
    inputManager.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(inputManager.camera).toBe(mockCamera);
      expect(inputManager.renderer).toBe(mockRenderer);
      expect(inputManager.store).toBe(mockStore);
      expect(inputManager.state).toBeDefined();
    });

    it('should have default options', () => {
      expect(inputManager.options.minZoom).toBe(0.1);
      expect(inputManager.options.maxZoom).toBe(10);
      expect(inputManager.options.zoomSpeed).toBe(0.1);
    });

    it('should accept custom options', () => {
      const customInputManager = new InputManager(mockCamera, mockRenderer, mockStore, {
        minZoom: 0.5,
        maxZoom: 20,
        zoomSpeed: 0.15,
      });

      expect(customInputManager.options.minZoom).toBe(0.5);
      expect(customInputManager.options.maxZoom).toBe(20);
      expect(customInputManager.options.zoomSpeed).toBe(0.15);

      customInputManager.destroy();
    });
  });

  describe('Wheel/Zoom Events', () => {
    it('should handle wheel event for zooming', () => {
      const wheelEvent = new WheelEvent('wheel', { deltaY: 100 });
      wheelEvent.preventDefault = jest.fn();

      const callback = jest.fn();
      inputManager.on('zoom', callback);

      mockCanvas.dispatchEvent(wheelEvent);

      expect(wheelEvent.preventDefault).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    it('should zoom in on negative deltaY', () => {
      const initialZoom = mockCamera.zoom;
      const wheelEvent = new WheelEvent('wheel', { deltaY: -100 });
      wheelEvent.preventDefault = jest.fn();

      mockCanvas.dispatchEvent(wheelEvent);

      expect(mockCamera.zoom).toBeGreaterThan(initialZoom);
    });

    it('should zoom out on positive deltaY', () => {
      mockCamera.zoom = 1.5; // 开始时已缩放
      const initialZoom = mockCamera.zoom;
      const wheelEvent = new WheelEvent('wheel', { deltaY: 100 });
      wheelEvent.preventDefault = jest.fn();

      mockCanvas.dispatchEvent(wheelEvent);

      expect(mockCamera.zoom).toBeLessThan(initialZoom);
    });

    it('should respect minZoom limit', () => {
      const wheelEvent = new WheelEvent('wheel', { deltaY: 100 });
      wheelEvent.preventDefault = jest.fn();

      // 重复缩放出来
      for (let i = 0; i < 20; i++) {
        mockCanvas.dispatchEvent(wheelEvent);
      }

      expect(mockCamera.zoom).toBeGreaterThanOrEqual(inputManager.options.minZoom);
    });

    it('should respect maxZoom limit', () => {
      const wheelEvent = new WheelEvent('wheel', { deltaY: -100 });
      wheelEvent.preventDefault = jest.fn();

      // 重复缩放进来
      for (let i = 0; i < 20; i++) {
        mockCanvas.dispatchEvent(wheelEvent);
      }

      expect(mockCamera.zoom).toBeLessThanOrEqual(inputManager.options.maxZoom);
    });
  });

  describe('Pan/Middle Mouse Events', () => {
    it('should start panning on right mouse button down', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: 100,
        clientY: 100,
      });

      mockCanvas.dispatchEvent(mouseDownEvent);

      expect(inputManager.state.isPanning).toBe(true);
    });

    it('should track mouse movement during pan', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: 100,
        clientY: 100,
      });

      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 150,
      });

      const callback = jest.fn();
      inputManager.on('pan', callback);

      mockCanvas.dispatchEvent(mouseDownEvent);
      mockCanvas.dispatchEvent(mouseMoveEvent);

      expect(callback).toHaveBeenCalled();
      const callData = callback.mock.calls[0][0];
      expect(callData.deltaX).toBe(50);
      expect(callData.deltaY).toBe(50);
    });

    it('should end panning on mouse up', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: 100,
        clientY: 100,
      });

      const mouseUpEvent = new MouseEvent('mouseup', {
        button: 2,
      });

      mockCanvas.dispatchEvent(mouseDownEvent);
      expect(inputManager.state.isPanning).toBe(true);

      mockCanvas.dispatchEvent(mouseUpEvent);
      expect(inputManager.state.isPanning).toBe(false);
    });

    it('should update camera position on pan', () => {
      const initialX = mockCamera.position.x;
      const initialZ = mockCamera.position.z;

      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: 100,
        clientY: 100,
      });

      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 150,
      });

      mockCanvas.dispatchEvent(mouseDownEvent);
      mockCanvas.dispatchEvent(mouseMoveEvent);

      expect(mockCamera.position.x).not.toBe(initialX);
      expect(mockCamera.position.z).not.toBe(initialZ);
    });
  });

  describe('Keyboard Shortcuts - Tools', () => {
    it('should handle Q key for select tool', () => {
      const callback = jest.fn();
      inputManager.on('tooltrigger', callback);

      const keyEvent = new KeyboardEvent('keydown', { key: 'q' });
      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].tool).toBe('select');
    });

    it('should handle W key for wall tool', () => {
      const callback = jest.fn();
      inputManager.on('tooltrigger', callback);

      const keyEvent = new KeyboardEvent('keydown', { key: 'w' });
      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].tool).toBe('wall');
      expect(mockStore.dispatch).toHaveBeenCalledWith('editor/setDrawWallTool', true);
    });

    it('should handle D key for delete tool', () => {
      const callback = jest.fn();
      inputManager.on('tooltrigger', callback);

      const keyEvent = new KeyboardEvent('keydown', { key: 'd' });
      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].tool).toBe('delete');
    });

    it('should handle R key for rectangle tool', () => {
      const callback = jest.fn();
      inputManager.on('tooltrigger', callback);

      const keyEvent = new KeyboardEvent('keydown', { key: 'r' });
      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].tool).toBe('rectangle');
    });

    it('should handle M key for measure tool', () => {
      const callback = jest.fn();
      inputManager.on('tooltrigger', callback);

      const keyEvent = new KeyboardEvent('keydown', { key: 'm' });
      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].tool).toBe('measure');
    });

    it('should handle Space key for pan tool', () => {
      const callback = jest.fn();
      inputManager.on('spacedown', callback);

      const keyEvent = {
        key: ' ',
        code: 'Space',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        preventDefault: jest.fn(),
      };
      inputManager.handleKeyDown(keyEvent);

      expect(callback).toHaveBeenCalled();
      expect(inputManager.state.spacePressed).toBe(true);
    });

    it('should trigger spaceup event on Space key release', () => {
      const callback = jest.fn();
      inputManager.on('spaceup', callback);

      const keyDownEvent = {
        key: ' ',
        code: 'Space',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        preventDefault: jest.fn(),
      };
      const keyUpEvent = {
        key: ' ',
        code: 'Space',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      };

      inputManager.handleKeyDown(keyDownEvent);
      expect(inputManager.state.spacePressed).toBe(true);

      inputManager.handleKeyUp(keyUpEvent);
      expect(callback).toHaveBeenCalled();
      expect(inputManager.state.spacePressed).toBe(false);
    });
  });

  describe('Keyboard Shortcuts - Edit Commands', () => {
    it('should handle Ctrl+Z for undo', () => {
      const callback = jest.fn();
      inputManager.on('undo', callback);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });

      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should handle Ctrl+Y for redo', () => {
      const callback = jest.fn();
      inputManager.on('redo', callback);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true,
      });

      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should handle Ctrl+Shift+Z for redo', () => {
      const callback = jest.fn();
      inputManager.on('redo', callback);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
      });

      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should handle Delete key', () => {
      const callback = jest.fn();
      inputManager.on('delete', callback);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'Delete',
      });

      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should handle Escape key for cancel', () => {
      const callback = jest.fn();
      inputManager.on('cancel', callback);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
      });

      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should handle Ctrl+S for save', () => {
      const callback = jest.fn();
      inputManager.on('save', callback);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
      });

      window.dispatchEvent(keyEvent);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Event System', () => {
    it('should register and trigger custom callbacks', () => {
      const callback = jest.fn();
      inputManager.on('customEvent', callback);

      inputManager.emit('customEvent', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support multiple callbacks for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      inputManager.on('zoom', callback1);
      inputManager.on('zoom', callback2);

      inputManager.emit('zoom', { zoomFactor: 1.1 });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should unregister callbacks', () => {
      const callback = jest.fn();
      inputManager.on('test', callback);
      inputManager.off('test', callback);

      inputManager.emit('test', {});

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();

      inputManager.on('test', errorCallback);
      inputManager.on('test', normalCallback);

      // 不应该抛出错误
      expect(() => {
        inputManager.emit('test', {});
      }).not.toThrow();

      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should track modifier keys', () => {
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
      });

      window.dispatchEvent(keyEvent);

      expect(inputManager.state.ctrl).toBe(true);
      expect(inputManager.state.shift).toBe(true);
      expect(inputManager.state.alt).toBe(true);
    });

    it('should update modifier keys on keyup', () => {
      let keyEvent = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
      });
      window.dispatchEvent(keyEvent);
      expect(inputManager.state.ctrl).toBe(true);

      keyEvent = new KeyboardEvent('keyup', {
        key: 'a',
        ctrlKey: false,
      });
      window.dispatchEvent(keyEvent);
      expect(inputManager.state.ctrl).toBe(false);
    });

    it('should track pan state correctly', () => {
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: 100,
        clientY: 100,
      });

      mockCanvas.dispatchEvent(mouseDownEvent);
      expect(inputManager.state.isPanning).toBe(true);

      const mouseUpEvent = new MouseEvent('mouseup', {
        button: 2,
      });
      mockCanvas.dispatchEvent(mouseUpEvent);
      expect(inputManager.state.isPanning).toBe(false);
    });
  });

  describe('Static Methods', () => {
    it('should provide tool shortcuts configuration', () => {
      const shortcuts = InputManager.getToolShortcuts();
      expect(shortcuts.q).toBeDefined();
      expect(shortcuts.q.tool).toBe('select');
      expect(shortcuts.w).toBeDefined();
      expect(shortcuts.w.tool).toBe('wall');
    });

    it('should provide keyboard shortcuts configuration', () => {
      const shortcuts = InputManager.getKeyboardShortcuts();
      expect(shortcuts['ctrl+z']).toBe('undo');
      expect(shortcuts['ctrl+y']).toBe('redo');
      expect(shortcuts.delete).toBe('delete');
    });
  });

  describe('Cleanup', () => {
    it('should remove all event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(mockCanvas, 'removeEventListener');

      inputManager.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();
      removeEventListenerSpy.mockRestore();
    });

    it('should clear callbacks on destroy', () => {
      const callback = jest.fn();
      inputManager.on('test', callback);

      inputManager.destroy();
      inputManager.emit('test', {});

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Camera Integration', () => {
    it('should work with orthographic camera', () => {
      const orthoCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
      const manager = new InputManager(orthoCamera, mockRenderer, mockStore);

      expect(manager.camera.isOrthographicCamera).toBe(true);

      manager.destroy();
    });

    it('should work with perspective camera', () => {
      const perspCamera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
      const manager = new InputManager(perspCamera, mockRenderer, mockStore);

      expect(manager.camera.isPerspectiveCamera).toBe(true);

      manager.destroy();
    });
  });

  describe('Modifier Key Shortcuts', () => {
    it('should not trigger tool shortcuts when Ctrl is pressed', () => {
      const callback = jest.fn();
      inputManager.on('tooltrigger', callback);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'w',
        ctrlKey: true,
      });

      window.dispatchEvent(keyEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not trigger tool shortcuts when Alt is pressed', () => {
      const callback = jest.fn();
      inputManager.on('tooltrigger', callback);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'w',
        altKey: true,
      });

      window.dispatchEvent(keyEvent);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
