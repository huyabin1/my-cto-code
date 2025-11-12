import * as THREE from 'three';
import DrawWallTool from '@/three/tool/DrawWallTool';

jest.mock('@/three/factory/WallFactory');

const mockWallFactory = require('@/three/factory/WallFactory').default;

describe('DrawWallTool', () => {
  let scene;
  let camera;
  let raycaster;
  let groundPlane;
  let store;
  let drawWallTool;

  beforeEach(() => {
    // Setup mock WallFactory
    mockWallFactory.create = jest.fn().mockImplementation((config) => {
      const group = new THREE.Group();
      group.userData = {
        type: 'wall',
        id: 'test-wall-id',
        config,
      };
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      group.add(mesh);
      return group;
    });

    mockWallFactory.update = jest.fn();

    // Setup Three.js objects
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    raycaster = new THREE.Raycaster();
    groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Setup mock store
    store = {
      state: {
        editor: {
          activeSelection: {
            material: 'concrete',
            color: '#ffffff',
          },
        },
      },
    };

    drawWallTool = new DrawWallTool(scene, camera, raycaster, groundPlane, store);
  });

  afterEach(() => {
    if (drawWallTool) {
      drawWallTool.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct state', () => {
      expect(drawWallTool.scene).toBe(scene);
      expect(drawWallTool.camera).toBe(camera);
      expect(drawWallTool.raycaster).toBe(raycaster);
      expect(drawWallTool.groundPlane).toBe(groundPlane);
      expect(drawWallTool.state).toBe(DrawWallTool.STATE.IDLE);
    });

    it('should initialize with default wall config', () => {
      expect(drawWallTool.wallConfig.height).toBe(2.8);
      expect(drawWallTool.wallConfig.thickness).toBe(0.2);
    });

    it('should add guide line group to scene', () => {
      expect(scene.children).toContain(drawWallTool.guideLineGroup);
    });

    it('should not be active initially', () => {
      expect(drawWallTool.isActive()).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should return correct state', () => {
      expect(drawWallTool.getState()).toBe(DrawWallTool.STATE.IDLE);
    });

    it('should transition to DRAWING state when starting', () => {
      const point = new THREE.Vector3(5, 0, 5);
      drawWallTool.startDrawing(new THREE.Vector2(point.x, point.z));
      expect(drawWallTool.state).toBe(DrawWallTool.STATE.DRAWING);
    });

    it('should not start drawing if already drawing', () => {
      const point1 = new THREE.Vector2(5, 5);
      const point2 = new THREE.Vector2(6, 6);

      drawWallTool.startDrawing(point1);
      const firstStartPoint = drawWallTool.startPoint.clone();

      drawWallTool.startDrawing(point2);
      expect(drawWallTool.startPoint).toEqual(firstStartPoint);
    });
  });

  describe('Drawing Operations', () => {
    it('should set start and end points when starting drawing', () => {
      const point = new THREE.Vector2(5, 5);
      drawWallTool.startDrawing(point);

      expect(drawWallTool.startPoint).toEqual(point);
      expect(drawWallTool.endPoint).toEqual(point);
    });

    it('should update end point when drawing', () => {
      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(5, 5);

      drawWallTool.startDrawing(startPoint);
      drawWallTool.updateDrawing(endPoint);

      expect(drawWallTool.startPoint).toEqual(startPoint);
      expect(drawWallTool.endPoint).toEqual(endPoint);
    });

    it('should not update drawing if not active', () => {
      const point = new THREE.Vector2(5, 5);
      drawWallTool.updateDrawing(point);

      expect(drawWallTool.endPoint).toBeNull();
    });

    it('should finish drawing and create wall config', () => {
      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(10, 10);
      let createdWallConfig = null;

      drawWallTool.onWallCreatedCallback((config) => {
        createdWallConfig = config;
      });

      drawWallTool.startDrawing(startPoint);
      drawWallTool.updateDrawing(endPoint);
      drawWallTool.finishDrawing(endPoint);

      expect(createdWallConfig).not.toBeNull();
      expect(createdWallConfig.start).toEqual(startPoint);
      expect(createdWallConfig.end).toEqual(endPoint);
      expect(createdWallConfig.material).toBe('concrete');
    });

    it('should return to IDLE state after finishing', () => {
      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(10, 10);

      drawWallTool.startDrawing(startPoint);
      drawWallTool.finishDrawing(endPoint);

      expect(drawWallTool.state).toBe(DrawWallTool.STATE.IDLE);
    });

    it('should cancel drawing if wall is too short', () => {
      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(0.05, 0.05); // Very short

      let callCount = 0;
      drawWallTool.onWallCreatedCallback(() => {
        callCount += 1;
      });

      drawWallTool.startDrawing(startPoint);
      drawWallTool.finishDrawing(endPoint);

      expect(callCount).toBe(0);
      expect(drawWallTool.state).toBe(DrawWallTool.STATE.IDLE);
    });
  });

  describe('Temporary Wall Management', () => {
    it('should create temp wall when starting drawing', () => {
      const point = new THREE.Vector2(5, 5);
      drawWallTool.startDrawing(point);

      expect(drawWallTool.tempWall).not.toBeNull();
      expect(scene.children).toContain(drawWallTool.tempWall);
    });

    it('should make temp wall semi-transparent', () => {
      const point = new THREE.Vector2(5, 5);
      drawWallTool.startDrawing(point);

      drawWallTool.tempWall.traverse((child) => {
        if (child.material) {
          expect(child.material.transparent).toBe(true);
          expect(child.material.opacity).toBe(0.5);
        }
      });
    });

    it('should update temp wall when drawing', () => {
      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(5, 5);

      drawWallTool.startDrawing(startPoint);
      const wallBefore = drawWallTool.tempWall;

      drawWallTool.updateDrawing(endPoint);

      // Wall object should still be the same reference
      expect(drawWallTool.tempWall).toBe(wallBefore);
    });

    it('should remove temp wall when finishing', () => {
      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(10, 10);

      drawWallTool.startDrawing(startPoint);
      const tempWallBefore = drawWallTool.tempWall;

      drawWallTool.finishDrawing(endPoint);

      expect(drawWallTool.tempWall).toBeNull();
      expect(scene.children).not.toContain(tempWallBefore);
    });
  });

  describe('Guide Lines', () => {
    it('should create guide lines when drawing', () => {
      const point = new THREE.Vector2(5, 5);
      drawWallTool.startDrawing(point);

      expect(drawWallTool.guideLineGroup.children.length).toBeGreaterThan(0);
    });

    it('should update guide lines during drawing', () => {
      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(5, 5);

      drawWallTool.startDrawing(startPoint);
      const childCountBefore = drawWallTool.guideLineGroup.children.length;

      drawWallTool.updateDrawing(endPoint);
      const childCountAfter = drawWallTool.guideLineGroup.children.length;

      // Should have updated but still have guide lines
      expect(childCountAfter).toBeGreaterThan(0);
    });

    it('should clear guide lines when finishing', () => {
      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(10, 10);

      drawWallTool.startDrawing(startPoint);
      drawWallTool.finishDrawing(endPoint);

      expect(drawWallTool.guideLineGroup.children.length).toBe(0);
    });

    it('should clear guide lines when cancelling', () => {
      const point = new THREE.Vector2(5, 5);
      drawWallTool.startDrawing(point);

      expect(drawWallTool.guideLineGroup.children.length).toBeGreaterThan(0);

      drawWallTool.cancel();

      expect(drawWallTool.guideLineGroup.children.length).toBe(0);
    });
  });

  describe('Cancel Operation', () => {
    it('should reset state when cancelling', () => {
      const point = new THREE.Vector2(5, 5);
      drawWallTool.startDrawing(point);

      expect(drawWallTool.state).toBe(DrawWallTool.STATE.DRAWING);

      drawWallTool.cancel();

      expect(drawWallTool.state).toBe(DrawWallTool.STATE.IDLE);
      expect(drawWallTool.startPoint).toBeNull();
      expect(drawWallTool.endPoint).toBeNull();
    });

    it('should remove temporary objects when cancelling', () => {
      const point = new THREE.Vector2(5, 5);
      drawWallTool.startDrawing(point);

      const tempWall = drawWallTool.tempWall;
      expect(scene.children).toContain(tempWall);

      drawWallTool.cancel();

      expect(drawWallTool.tempWall).toBeNull();
      expect(scene.children).not.toContain(tempWall);
    });

    it('should not trigger wall creation when cancelling', () => {
      const point = new THREE.Vector2(5, 5);
      let wallCreated = false;

      drawWallTool.onWallCreatedCallback(() => {
        wallCreated = true;
      });

      drawWallTool.startDrawing(point);
      drawWallTool.cancel();

      expect(wallCreated).toBe(false);
    });
  });

  describe('Callbacks', () => {
    it('should call onStateChange when state changes', () => {
      const stateChanges = [];
      drawWallTool.onStateChangeCallback((state) => {
        stateChanges.push(state);
      });

      const point = new THREE.Vector2(5, 5);
      drawWallTool.startDrawing(point);

      expect(stateChanges).toContain(DrawWallTool.STATE.DRAWING);
    });

    it('should call onWallCreated when wall is created', () => {
      let wallCreated = false;
      let wallConfig = null;

      drawWallTool.onWallCreatedCallback((config) => {
        wallCreated = true;
        wallConfig = config;
      });

      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(10, 10);

      drawWallTool.startDrawing(startPoint);
      drawWallTool.finishDrawing(endPoint);

      expect(wallCreated).toBe(true);
      expect(wallConfig).not.toBeNull();
    });

    it('should allow chaining callback setters', () => {
      const tool = drawWallTool
        .onStateChangeCallback(() => {})
        .onWallCreatedCallback(() => {});

      expect(tool).toBe(drawWallTool);
    });
  });

  describe('Wall Configuration', () => {
    it('should set wall height', () => {
      drawWallTool.setWallConfig({ height: 3.5 });
      expect(drawWallTool.wallConfig.height).toBe(3.5);
    });

    it('should set wall thickness', () => {
      drawWallTool.setWallConfig({ thickness: 0.3 });
      expect(drawWallTool.wallConfig.thickness).toBe(0.3);
    });

    it('should preserve height when setting thickness', () => {
      const originalHeight = drawWallTool.wallConfig.height;
      drawWallTool.setWallConfig({ thickness: 0.3 });
      expect(drawWallTool.wallConfig.height).toBe(originalHeight);
    });

    it('should use store values for material and color in wall config', () => {
      let createdWallConfig = null;

      drawWallTool.onWallCreatedCallback((config) => {
        createdWallConfig = config;
      });

      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(10, 10);

      drawWallTool.startDrawing(startPoint);
      drawWallTool.finishDrawing(endPoint);

      expect(createdWallConfig.material).toBe('concrete');
      expect(createdWallConfig.color).toBe('#ffffff');
    });

    it('should use defaults when store is not available', () => {
      const toolWithoutStore = new DrawWallTool(scene, camera, raycaster, groundPlane, null);
      let createdWallConfig = null;

      toolWithoutStore.onWallCreatedCallback((config) => {
        createdWallConfig = config;
      });

      const startPoint = new THREE.Vector2(0, 0);
      const endPoint = new THREE.Vector2(10, 10);

      toolWithoutStore.startDrawing(startPoint);
      toolWithoutStore.finishDrawing(endPoint);

      expect(createdWallConfig.material).toBe('concrete');
      expect(createdWallConfig.color).toBe('#ffffff');

      toolWithoutStore.destroy();
    });
  });

  describe('Multiple Drawing Sessions', () => {
    it('should handle consecutive drawing sessions', () => {
      const sessions = [];

      drawWallTool.onWallCreatedCallback((config) => {
        sessions.push(config);
      });

      // First wall
      drawWallTool.startDrawing(new THREE.Vector2(0, 0));
      drawWallTool.finishDrawing(new THREE.Vector2(5, 5));

      // Second wall
      drawWallTool.startDrawing(new THREE.Vector2(10, 10));
      drawWallTool.finishDrawing(new THREE.Vector2(15, 15));

      expect(sessions.length).toBe(2);
      expect(sessions[0].start).toEqual(new THREE.Vector2(0, 0));
      expect(sessions[1].start).toEqual(new THREE.Vector2(10, 10));
    });

    it('should reset properly between sessions', () => {
      drawWallTool.startDrawing(new THREE.Vector2(0, 0));
      drawWallTool.finishDrawing(new THREE.Vector2(5, 5));

      expect(drawWallTool.startPoint).toBeNull();
      expect(drawWallTool.endPoint).toBeNull();
      expect(drawWallTool.tempWall).toBeNull();

      const point2 = new THREE.Vector2(10, 10);
      drawWallTool.startDrawing(point2);

      expect(drawWallTool.startPoint).toEqual(point2);
      expect(drawWallTool.state).toBe(DrawWallTool.STATE.DRAWING);
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should clean up when destroyed', () => {
      const point = new THREE.Vector2(5, 5);
      drawWallTool.startDrawing(point);

      const guideLineGroup = drawWallTool.guideLineGroup;
      expect(scene.children).toContain(guideLineGroup);

      drawWallTool.destroy();

      expect(scene.children).not.toContain(guideLineGroup);
    });

    it('should clear callbacks when destroyed', () => {
      const callback = jest.fn();
      drawWallTool.onStateChangeCallback(callback);
      drawWallTool.destroy();

      expect(drawWallTool.onStateChange).toBeNull();
    });

    it('should cancel active drawing when destroyed', () => {
      const point = new THREE.Vector2(5, 5);
      drawWallTool.startDrawing(point);

      expect(drawWallTool.isActive()).toBe(true);

      drawWallTool.destroy();

      expect(drawWallTool.isActive()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-length walls', () => {
      const point = new THREE.Vector2(5, 5);
      let wallCreated = false;

      drawWallTool.onWallCreatedCallback(() => {
        wallCreated = true;
      });

      drawWallTool.startDrawing(point);
      drawWallTool.finishDrawing(point);

      expect(wallCreated).toBe(false);
    });

    it('should handle rapid drawing updates', () => {
      const startPoint = new THREE.Vector2(0, 0);
      drawWallTool.startDrawing(startPoint);

      for (let i = 1; i <= 10; i += 1) {
        drawWallTool.updateDrawing(new THREE.Vector2(i, i));
      }

      expect(drawWallTool.state).toBe(DrawWallTool.STATE.DRAWING);
    });

    it('should handle valid wall after cancelled attempt', () => {
      const shortPoint = new THREE.Vector2(0.05, 0.05);
      let wallCreated = false;

      drawWallTool.onWallCreatedCallback(() => {
        wallCreated = true;
      });

      // Try to create short wall (will be cancelled)
      drawWallTool.startDrawing(new THREE.Vector2(0, 0));
      drawWallTool.finishDrawing(shortPoint);

      expect(wallCreated).toBe(false);

      // Create valid wall
      drawWallTool.startDrawing(new THREE.Vector2(0, 0));
      drawWallTool.finishDrawing(new THREE.Vector2(10, 10));

      expect(wallCreated).toBe(true);
    });
  });
});
