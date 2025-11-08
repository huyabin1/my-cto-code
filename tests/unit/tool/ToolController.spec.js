import * as THREE from 'three';
import ToolController from '@/three/tool/ToolController';
import { CommandStack } from '@/three/command';

// Mock modules
jest.mock('@/three/command', () => ({
  CommandStack: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    canUndo: jest.fn().mockReturnValue(true),
    canRedo: jest.fn().mockReturnValue(true),
    clear: jest.fn(),
    destroy: jest.fn(),
    getStackInfo: jest.fn().mockReturnValue({
      canUndo: true,
      canRedo: true,
      undoCount: 5,
      redoCount: 2,
      maxStackSize: 50,
    }),
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

jest.mock('@/three/factory/WallFactory', () => ({
  create: jest.fn(),
  update: jest.fn(),
}));

describe('ToolController', () => {
  let scene;
  let camera;
  let renderer;
  let store;
  let toolController;

  beforeEach(() => {
    // Setup Three.js objects
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();
    renderer = {
      domElement: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        }),
      },
    };

    // Setup mock store
    store = {
      state: {
        editor: {
          drawWallToolEnabled: false,
          activeSelection: {
            material: 'concrete',
            color: '#ffffff',
          },
        },
      },
      commit: jest.fn(),
    };

    // Mock window methods
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();

    toolController = new ToolController(scene, camera, renderer, store);
  });

  afterEach(() => {
    if (toolController) {
      toolController.destroy();
    }
    jest.restoreAllMocks();
  });

  describe('Construction', () => {
    it('should initialize with provided parameters', () => {
      expect(toolController.scene).toBe(scene);
      expect(toolController.camera).toBe(camera);
      expect(toolController.renderer).toBe(renderer);
      expect(toolController.store).toBe(store);
      expect(toolController.commandStack).toBeDefined();
    });

    it('should initialize command stack with correct size', () => {
      expect(CommandStack).toHaveBeenCalledWith(50);
    });

    it('should setup event listeners', () => {
      expect(renderer.domElement.addEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );
      expect(renderer.domElement.addEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
      expect(renderer.domElement.addEventListener).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should initialize command stack listeners', () => {
      const mockCommandStack = toolController.commandStack;
      expect(mockCommandStack.on).toHaveBeenCalledWith('stackChanged', expect.any(Function));
    });
  });

  describe('Wall Drawing', () => {
    beforeEach(() => {
      // Mock raycaster intersection
      toolController.raycaster = {
        setFromCamera: jest.fn(),
        ray: {
          intersectPlane: jest.fn().mockReturnValue(new THREE.Vector3(5, 0, 3)),
        },
      };

      // Mock WallFactory.create
      const { create } = require('@/three/factory/WallFactory');
      create.mockReturnValue(new THREE.Group());
    });

    it('should start wall drawing when mouse is pressed and tool is enabled', () => {
      store.state.editor.drawWallToolEnabled = true;

      const mouseEvent = {
        button: 0, // Left click
        clientX: 100,
        clientY: 100,
      };

      toolController.handleMouseDown(mouseEvent);

      expect(toolController.isDrawing).toBe(true);
      expect(toolController.drawStartPoint).toBeDefined();
    });

    it('should not start wall drawing when tool is disabled', () => {
      store.state.editor.drawWallToolEnabled = false;

      const mouseEvent = {
        button: 0,
        clientX: 100,
        clientY: 100,
      };

      toolController.handleMouseDown(mouseEvent);

      expect(toolController.isDrawing).toBe(false);
    });

    it('should not start wall drawing for non-left clicks', () => {
      store.state.editor.drawWallToolEnabled = true;

      const mouseEvent = {
        button: 1, // Middle click
        clientX: 100,
        clientY: 100,
      };

      toolController.handleMouseDown(mouseEvent);

      expect(toolController.isDrawing).toBe(false);
    });

    it('should update temporary wall during mouse move', () => {
      // Start drawing first
      store.state.editor.drawWallToolEnabled = true;
      toolController.handleMouseDown({ button: 0, clientX: 100, clientY: 100 });

      const mouseEvent = {
        clientX: 200,
        clientY: 150,
      };

      toolController.handleMouseMove(mouseEvent);

      expect(toolController.raycaster.setFromCamera).toHaveBeenCalled();
    });

    it('should finish wall drawing on mouse up', async () => {
      store.state.editor.drawWallToolEnabled = true;

      // Start drawing
      toolController.handleMouseDown({ button: 0, clientX: 100, clientY: 100 });

      // Mock command execution
      toolController.commandStack.execute.mockResolvedValue('result');

      toolController.handleMouseUp({ button: 0 });

      expect(toolController.isDrawing).toBe(false);
      expect(toolController.commandStack.execute).toHaveBeenCalled();
    });

    it('should cancel wall drawing if distance is too small', () => {
      store.state.editor.drawWallToolEnabled = true;

      // Mock very close intersection point
      toolController.raycaster.ray.intersectPlane.mockReturnValue(new THREE.Vector3(0.01, 0, 0.01));

      toolController.handleMouseDown({ button: 0, clientX: 100, clientY: 100 });
      toolController.handleMouseUp({ button: 0 });

      expect(toolController.isDrawing).toBe(false);
      expect(toolController.commandStack.execute).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should undo on Ctrl+Z', () => {
      const event = {
        ctrlKey: true,
        key: 'z',
        shiftKey: false,
        preventDefault: jest.fn(),
      };

      toolController.handleKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(toolController.commandStack.undo).toHaveBeenCalled();
    });

    it('should redo on Ctrl+Y', () => {
      const event = {
        ctrlKey: true,
        key: 'y',
        preventDefault: jest.fn(),
      };

      toolController.handleKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(toolController.commandStack.redo).toHaveBeenCalled();
    });

    it('should redo on Ctrl+Shift+Z', () => {
      const event = {
        ctrlKey: true,
        key: 'z',
        shiftKey: true,
        preventDefault: jest.fn(),
      };

      toolController.handleKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(toolController.commandStack.redo).toHaveBeenCalled();
    });

    it('should cancel current operation on Escape', () => {
      toolController.isDrawing = true;
      toolController.tempWall = new THREE.Group();

      const event = {
        key: 'Escape',
      };

      toolController.handleKeyDown(event);

      expect(toolController.isDrawing).toBe(false);
      expect(toolController.tempWall).toBeNull();
    });

    it('should not trigger shortcuts without Ctrl key', () => {
      const event = {
        ctrlKey: false,
        key: 'z',
        preventDefault: jest.fn(),
      };

      toolController.handleKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(toolController.commandStack.undo).not.toHaveBeenCalled();
    });
  });

  describe('Command Methods', () => {
    it('should update wall property through command stack', async () => {
      const wall = new THREE.Group();
      const property = 'material';
      const value = 'wood';

      toolController.commandStack.execute.mockResolvedValue('result');

      const result = await toolController.updateWallProperty(wall, property, value);

      expect(toolController.commandStack.execute).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toBe('result');
    });

    it('should delete wall through command stack', async () => {
      const wall = new THREE.Group();

      toolController.commandStack.execute.mockResolvedValue('result');

      const result = await toolController.deleteWall(wall);

      expect(toolController.commandStack.execute).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toBe('result');
    });

    it('should update active selection through command stack', async () => {
      const property = 'material';
      const value = 'brick';

      toolController.commandStack.execute.mockResolvedValue('result');

      const result = await toolController.updateActiveSelection(property, value);

      expect(toolController.commandStack.execute).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toBe('result');
    });

    it('should add measurement through command stack', async () => {
      const measurement = { type: 'distance', value: 5.2 };

      toolController.commandStack.execute.mockResolvedValue('result');

      const result = await toolController.addMeasurement(measurement);

      expect(toolController.commandStack.execute).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toBe('result');
    });

    it('should toggle tool through command stack', async () => {
      const toolName = 'distance';

      toolController.commandStack.execute.mockResolvedValue('result');

      const result = await toolController.toggleTool(toolName);

      expect(toolController.commandStack.execute).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toBe('result');
    });
  });

  describe('Undo/Redo Methods', () => {
    it('should undo when possible', async () => {
      toolController.commandStack.canUndo.mockReturnValue(true);
      toolController.commandStack.undo.mockResolvedValue('undo result');

      const result = await toolController.undo();

      expect(toolController.commandStack.undo).toHaveBeenCalled();
      expect(result).toBe('undo result');
    });

    it('should not undo when not possible', async () => {
      toolController.commandStack.canUndo.mockReturnValue(false);

      const result = await toolController.undo();

      expect(toolController.commandStack.undo).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle undo errors gracefully', async () => {
      toolController.commandStack.canUndo.mockReturnValue(true);
      toolController.commandStack.undo.mockRejectedValue(new Error('Undo failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await toolController.undo();

      expect(consoleSpy).toHaveBeenCalledWith('Undo failed:', expect.any(Error));
      expect(result).toBeUndefined();

      consoleSpy.mockRestore();
    });

    it('should redo when possible', async () => {
      toolController.commandStack.canRedo.mockReturnValue(true);
      toolController.commandStack.redo.mockResolvedValue('redo result');

      const result = await toolController.redo();

      expect(toolController.commandStack.redo).toHaveBeenCalled();
      expect(result).toBe('redo result');
    });

    it('should not redo when not possible', async () => {
      toolController.commandStack.canRedo.mockReturnValue(false);

      const result = await toolController.redo();

      expect(toolController.commandStack.redo).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('Utility Methods', () => {
    it('should get command stack info', () => {
      const info = toolController.getCommandStackInfo();

      expect(toolController.commandStack.getStackInfo).toHaveBeenCalled();
      expect(info).toBeDefined();
    });

    it('should clear command stack', () => {
      toolController.clearCommandStack();

      expect(toolController.commandStack.clear).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove all event listeners and destroy resources', () => {
      toolController.destroy();

      expect(renderer.domElement.removeEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );
      expect(renderer.domElement.removeEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
      expect(renderer.domElement.removeEventListener).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function)
      );
      expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(toolController.commandStack.destroy).toHaveBeenCalled();
      expect(toolController.eventListeners.size).toBe(0);
    });

    it('should cancel current operation during destroy', () => {
      toolController.isDrawing = true;
      toolController.tempWall = new THREE.Group();

      toolController.destroy();

      expect(toolController.isDrawing).toBe(false);
      expect(toolController.tempWall).toBeNull();
    });
  });

  describe('Mouse Position Calculation', () => {
    it('should calculate mouse position correctly', () => {
      const mockRect = { left: 100, top: 50, width: 800, height: 600 };
      renderer.domElement.getBoundingClientRect.mockReturnValue(mockRect);

      const event = {
        clientX: 300,
        clientY: 250,
      };

      toolController.updateMousePosition(event);

      expect(toolController.mouse.x).toBeCloseTo(0.25); // (300-100)/800*2-1
      expect(toolController.mouse.y).toBeCloseTo(0.333); // -(250-50)/600*2+1
    });
  });

  describe('Ground Point Calculation', () => {
    it('should get ground point from raycaster', () => {
      const expectedPoint = new THREE.Vector3(5, 0, 3);
      toolController.raycaster.ray.intersectPlane.mockReturnValue(expectedPoint);

      const point = toolController.getGroundPoint();

      expect(point).toBe(expectedPoint);
      expect(toolController.raycaster.setFromCamera).toHaveBeenCalledWith(
        toolController.mouse,
        camera
      );
    });

    it('should return null when no intersection', () => {
      toolController.raycaster.ray.intersectPlane.mockReturnValue(null);

      const point = toolController.getGroundPoint();

      expect(point).toBeNull();
    });
  });
});
