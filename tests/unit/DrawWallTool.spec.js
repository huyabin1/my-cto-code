import { DrawWallTool } from '@/three/command/DrawWallTool';
import * as THREE from 'three';
import { EventBus, WALL_EVENTS } from '@/utils/eventBus';

// Mock the event bus
jest.mock('@/utils/eventBus', () => ({
  EventBus: {
    emit: jest.fn(),
  },
  WALL_EVENTS: {
    PREVIEW: 'wall:preview',
    COMMIT: 'wall:commit',
    UNDO: 'wall:undo',
    SNAP: 'wall:snap',
  },
}));

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('DrawWallTool', () => {
  let tool;
  let mockScene;
  let mockCamera;
  let mockDomElement;
  let mockStore;

  beforeEach(() => {
    // Mock Three.js objects
    mockScene = {
      add: jest.fn(),
      remove: jest.fn(),
    };

    mockCamera = {
      position: new THREE.Vector3(0, 10, 10),
    };

    mockDomElement = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      })),
      style: {},
    };

    mockStore = {
      getters: {
        'walls/allWalls': [],
      },
      dispatch: jest.fn(),
      state: {
        editor: {
          activeSelection: {
            material: 'concrete',
            color: '#ffffff',
          },
        },
      },
    };

    tool = new DrawWallTool(mockScene, mockCamera, mockDomElement, mockStore);
  });

  afterEach(() => {
    if (tool) {
      tool.deactivate();
    }
    jest.clearAllMocks();
  });

  describe('Construction', () => {
    it('should initialize with correct default state', () => {
      expect(tool.state).toBe('idle');
      expect(tool.startPoint).toBeNull();
      expect(tool.currentPoint).toBeNull();
      expect(tool.previewLine).toBeNull();
      expect(tool.undoStack).toEqual([]);
    });

    it('should have correct default configuration', () => {
      expect(tool.config.gridSnap).toBe(true);
      expect(tool.config.gridInterval).toBe(0.1);
      expect(tool.config.angularSnap).toBe(true);
      expect(tool.config.angularSnapAngles).toEqual([0, 45, 90]);
      expect(tool.config.endpointSnap).toBe(true);
      expect(tool.config.endpointSnapDistance).toBe(0.5);
    });
  });

  describe('Activation/Deactivation', () => {
    it('should activate with default configuration', () => {
      tool.activate();

      expect(tool.domElement.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(tool.domElement.addEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(tool.domElement.addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(tool.domElement.style.cursor).toBe('crosshair');
      expect(tool.state).toBe('idle');
    });

    it('should activate with custom configuration', () => {
      const customConfig = {
        gridSnap: false,
        gridInterval: 0.5,
        angularSnap: false,
      };

      tool.activate(customConfig);

      expect(tool.config.gridSnap).toBe(false);
      expect(tool.config.gridInterval).toBe(0.5);
      expect(tool.config.angularSnap).toBe(false);
    });

    it('should deactivate and clean up properly', () => {
      tool.activate();
      tool.deactivate();

      expect(tool.domElement.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(tool.domElement.removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(tool.domElement.removeEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(tool.domElement.style.cursor).toBe('default');
      expect(tool.state).toBe('idle');
      expect(tool.undoStack).toEqual([]);
    });
  });

  describe('State Machine', () => {
    beforeEach(() => {
      tool.activate();
    });

    it('should transition from idle to drawing on first click', () => {
      const mockPoint = new THREE.Vector3(1, 0, 1);
      jest.spyOn(tool, 'getIntersectionPoint').mockReturnValue(mockPoint);
      jest.spyOn(tool, 'applySnapping').mockReturnValue(mockPoint);
      jest.spyOn(tool, 'createPreview');

      const event = { button: 0 };
      tool.onPointerDown(event);

      expect(tool.state).toBe('drawing');
      expect(tool.startPoint).toEqual(mockPoint);
      expect(tool.currentPoint).toEqual(mockPoint);
      expect(tool.createPreview).toHaveBeenCalled();
    });

    it('should commit wall and continue drawing on second click', () => {
      // First click - start drawing
      const startPoint = new THREE.Vector3(0, 0, 0);
      jest.spyOn(tool, 'getIntersectionPoint').mockReturnValue(startPoint);
      jest.spyOn(tool, 'applySnapping').mockReturnValue(startPoint);
      jest.spyOn(tool, 'createPreview');

      tool.onPointerDown({ button: 0 });
      expect(tool.state).toBe('drawing');

      // Second click - commit wall
      const endPoint = new THREE.Vector3(5, 0, 0);
      tool.getIntersectionPoint.mockReturnValue(endPoint);
      tool.applySnapping.mockReturnValue(endPoint);
      
      // Update currentPoint before calling commitWall
      tool.currentPoint = endPoint;
      jest.spyOn(tool, 'commitWall');

      tool.onPointerDown({ button: 0 });

      expect(tool.commitWall).toHaveBeenCalled();
      expect(tool.state).toBe('drawing'); // Should continue drawing
      expect(tool.startPoint).toEqual(endPoint); // Start point should be set to end point
    });

    it('should ignore non-left clicks', () => {
      const event = { button: 1 }; // Right click
      jest.spyOn(tool, 'getIntersectionPoint');

      tool.onPointerDown(event);

      expect(tool.getIntersectionPoint).not.toHaveBeenCalled();
      expect(tool.state).toBe('idle');
    });
  });

  describe('Snapping', () => {
    beforeEach(() => {
      tool.activate();
    });

    it('should apply grid snapping when enabled', () => {
      const point = new THREE.Vector3(1.23, 0, 2.78);
      tool.activate({ gridSnap: true, gridInterval: 0.1 });

      const result = tool.applySnapping(point);

      expect(result.x).toBeCloseTo(1.2, 1);
      expect(result.z).toBeCloseTo(2.8, 1);
      expect(result.y).toBe(0);
    });

    it('should not apply grid snapping when disabled', () => {
      const point = new THREE.Vector3(1.23, 0, 2.78);
      tool.activate({ gridSnap: false });

      const result = tool.applySnapping(point);

      expect(result).toEqual(point);
    });

    it('should apply angular snapping to 45 degrees', () => {
      tool.startPoint = new THREE.Vector3(0, 0, 0);
      const point45 = new THREE.Vector3(3, 0, 3); // 45 degrees
      tool.activate({ angularSnap: true });

      const result = tool.applySnapping(point45);

      // The distance from origin to (3,0,3) is sqrt(18) ≈ 4.24
      // At 45 degrees, both x and z should be equal to distance * sin(45°) ≈ 3.0
      expect(result.x).toBeCloseTo(3.0, 1);
      expect(result.z).toBeCloseTo(3.0, 1);
    });

    it('should apply angular snapping to 90 degrees', () => {
      tool.startPoint = new THREE.Vector3(0, 0, 0);
      const point90 = new THREE.Vector3(0.1, 0, 3); // Close to 90 degrees
      tool.activate({ angularSnap: true });

      const result = tool.applySnapping(point90);

      expect(result.x).toBeCloseTo(0, 1);
      expect(result.z).toBeCloseTo(3, 1);
    });

    it('should snap to nearby endpoints when available', () => {
      const existingWalls = [
        {
          start: new THREE.Vector3(5, 0, 5),
          end: new THREE.Vector3(10, 0, 5),
        },
      ];
      
      mockStore.getters['walls/allWalls'] = existingWalls;
      tool.updateExistingWalls();

      const point = new THREE.Vector3(5.3, 0, 5.2); // Close to endpoint
      tool.activate({ endpointSnap: true, endpointSnapDistance: 0.5 });

      const result = tool.applySnapping(point);

      expect(result).toEqual(existingWalls[0].start);
    });

    it('should prioritize endpoint snapping over grid snapping', () => {
      const existingWalls = [
        {
          start: new THREE.Vector3(5, 0, 5),
          end: new THREE.Vector3(10, 0, 5),
        },
      ];
      
      mockStore.getters['walls/allWalls'] = existingWalls;
      tool.updateExistingWalls();

      const point = new THREE.Vector3(5.3, 0, 5.2); // Close to endpoint but not on grid
      tool.activate({ 
        endpointSnap: true, 
        endpointSnapDistance: 0.5,
        gridSnap: true,
        gridInterval: 0.1 
      });

      const result = tool.applySnapping(point);

      expect(result).toEqual(existingWalls[0].start);
    });
  });

  describe('Raycasting', () => {
    beforeEach(() => {
      tool.activate();
    });

    it('should return intersection point with y=0 plane', () => {
      const event = {
        clientX: 400,
        clientY: 300,
      };

      // Mock the raycaster to return an intersection
      const mockIntersection = {
        point: new THREE.Vector3(1, 0, 1),
      };

      jest.spyOn(THREE.Raycaster.prototype, 'setFromCamera');
      jest.spyOn(tool.raycaster, 'intersectObject').mockReturnValue([mockIntersection]);

      const result = tool.getIntersectionPoint(event);

      expect(THREE.Raycaster.prototype.setFromCamera).toHaveBeenCalled();
      expect(tool.raycaster.intersectObject).toHaveBeenCalled();
      expect(result).toEqual(mockIntersection.point);
    });

    it('should return null when no intersection', () => {
      const event = {
        clientX: 400,
        clientY: 300,
      };

      jest.spyOn(tool.raycaster, 'intersectObject').mockReturnValue([]);

      const result = tool.getIntersectionPoint(event);

      expect(result).toBeNull();
    });
  });

  describe('Preview', () => {
    beforeEach(() => {
      tool.activate();
    });

    it('should create preview line when starting drawing', () => {
      tool.startPoint = new THREE.Vector3(0, 0, 0);
      tool.currentPoint = new THREE.Vector3(1, 0, 1);

      tool.createPreview();

      expect(mockScene.add).toHaveBeenCalled();
      expect(tool.previewLine).toBeDefined();
      expect(tool.previewLine.material.color.getHex()).toBe(0xff0000);
    });

    it('should update preview line geometry', () => {
      tool.startPoint = new THREE.Vector3(0, 0, 0);
      tool.currentPoint = new THREE.Vector3(2, 0, 3);
      tool.createPreview();

      tool.updatePreview();

      const positions = tool.previewLine.geometry.attributes.position.array;
      expect(positions[0]).toBe(0); // start.x
      expect(positions[1]).toBe(0); // start.y
      expect(positions[2]).toBe(0); // start.z
      expect(positions[3]).toBe(2); // end.x
      expect(positions[4]).toBe(0); // end.y
      expect(positions[5]).toBe(3); // end.z
    });

    it('should clear preview line', () => {
      tool.createPreview();
      const previewLine = tool.previewLine;

      tool.clearPreview();

      expect(mockScene.remove).toHaveBeenCalledWith(previewLine);
      expect(tool.previewLine).toBeNull();
    });
  });

  describe('Wall Committing', () => {
    beforeEach(() => {
      tool.activate();
    });

    it('should commit wall to store and emit event', () => {
      tool.startPoint = new THREE.Vector3(0, 0, 0);
      tool.currentPoint = new THREE.Vector3(5, 0, 0);

      tool.commitWall();

      expect(mockStore.dispatch).toHaveBeenCalledWith('walls/addWall', {
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(5, 0, 0),
        material: 'concrete',
        color: '#ffffff',
      });

      expect(EventBus.emit).toHaveBeenCalledWith(WALL_EVENTS.COMMIT, {
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(5, 0, 0),
        material: 'concrete',
        color: '#ffffff',
      });

      expect(tool.undoStack).toHaveLength(1);
    });

    it('should not commit wall if points are too close', () => {
      tool.startPoint = new THREE.Vector3(0, 0, 0);
      tool.currentPoint = new THREE.Vector3(0.005, 0, 0); // Very close

      tool.commitWall();

      expect(mockStore.dispatch).not.toHaveBeenCalled();
      expect(EventBus.emit).not.toHaveBeenCalled();
      expect(tool.undoStack).toHaveLength(0);
    });

    it('should reset start point after commit for continuous drawing', () => {
      tool.startPoint = new THREE.Vector3(0, 0, 0);
      tool.currentPoint = new THREE.Vector3(5, 0, 0);
      tool.state = 'drawing';

      tool.commitWall();

      expect(tool.startPoint).toEqual(new THREE.Vector3(5, 0, 0));
      expect(tool.state).toBe('drawing');
    });
  });

  describe('Undo Functionality', () => {
    beforeEach(() => {
      tool.activate();
    });

    it('should undo last wall segment', () => {
      // Add a wall to undo stack
      const wallData = {
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(5, 0, 0),
        material: 'concrete',
        color: '#ffffff',
      };
      tool.undoStack.push(wallData);

      // Mock store to return the wall
      mockStore.getters['walls/allWalls'] = [
        { id: 'wall-1', ...wallData },
      ];

      tool.undo();

      expect(mockStore.dispatch).toHaveBeenCalledWith('walls/removeWall', 'wall-1');
      expect(EventBus.emit).toHaveBeenCalledWith(WALL_EVENTS.UNDO, { id: 'wall-1', ...wallData });
      expect(tool.undoStack).toHaveLength(0);
    });

    it('should do nothing when undo stack is empty', () => {
      tool.undo();

      expect(mockStore.dispatch).not.toHaveBeenCalledWith('walls/removeWall', expect.any(String));
      expect(EventBus.emit).not.toHaveBeenCalledWith(WALL_EVENTS.UNDO, expect.any(Object));
    });

    it('should cancel drawing when undo is called during drawing', () => {
      tool.state = 'drawing';
      tool.startPoint = new THREE.Vector3(0, 0, 0);
      // Add something to the undo stack so undo doesn't return early
      tool.undoStack.push({
        start: new THREE.Vector3(1, 0, 0),
        end: new THREE.Vector3(2, 0, 0),
      });

      tool.undo();

      expect(tool.state).toBe('idle');
      expect(tool.startPoint).toBeNull();
      expect(tool.currentPoint).toBeNull();
    });
  });

  describe('Event Emissions', () => {
    beforeEach(() => {
      tool.activate();
    });

    it('should emit preview event on pointer move during drawing', () => {
      tool.state = 'drawing';
      tool.startPoint = new THREE.Vector3(0, 0, 0);
      tool.currentPoint = new THREE.Vector3(2, 0, 2);

      const mockPoint = new THREE.Vector3(2, 0, 2);
      jest.spyOn(tool, 'getIntersectionPoint').mockReturnValue(mockPoint);
      jest.spyOn(tool, 'applySnapping').mockReturnValue(mockPoint);

      tool.onPointerMove({ clientX: 400, clientY: 300 });

      expect(EventBus.emit).toHaveBeenCalledWith(WALL_EVENTS.PREVIEW, {
        start: new THREE.Vector3(0, 0, 0),
        end: new THREE.Vector3(2, 0, 2),
      });
    });

    it('should not emit preview event when not drawing', () => {
      tool.state = 'idle';

      tool.onPointerMove({ clientX: 400, clientY: 300 });

      expect(EventBus.emit).not.toHaveBeenCalledWith(WALL_EVENTS.PREVIEW, expect.any(Object));
    });
  });

  describe('Utility Methods', () => {
    it('should return current state', () => {
      tool.state = 'drawing';
      expect(tool.getState()).toBe('drawing');
    });

    it('should return undo stack size', () => {
      tool.undoStack = [{}, {}, {}];
      expect(tool.getUndoStackSize()).toBe(3);
    });

    it('should update existing walls from store', () => {
      const walls = [
        { start: new THREE.Vector3(0, 0, 0), end: new THREE.Vector3(1, 0, 0) },
      ];
      mockStore.getters['walls/allWalls'] = walls;

      tool.updateExistingWalls();

      expect(tool.existingWalls).toEqual(walls);
    });
  });
});