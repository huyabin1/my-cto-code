import { WallFactory } from '@/three/factory/WallFactory';

describe('WallFactory', () => {
  let wallFactory;
  let mockGeometry, mockMaterial, mockMesh;

  beforeEach(() => {
    // Mock THREE.js objects
    mockGeometry = {
      dispose: jest.fn(),
    };
    mockMaterial = {
      dispose: jest.fn(),
    };
    mockMesh = {
      geometry: mockGeometry,
      material: mockMaterial,
      position: { set: jest.fn() },
      rotation: { y: 0 },
    };

    global.THREE = {
      BoxGeometry: jest.fn().mockReturnValue(mockGeometry),
      MeshLambertMaterial: jest.fn().mockReturnValue(mockMaterial),
      Mesh: jest.fn().mockReturnValue(mockMesh),
      Color: jest.fn().mockImplementation((color) => ({ color })),
    };

    wallFactory = new WallFactory();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a wall with default values', () => {
      const wall = wallFactory.create({});

      expect(wall).toEqual({
        id: 'wall-1',
        name: '墙体 1',
        startX: 0,
        startZ: 0,
        endX: 10,
        endZ: 0,
        height: 3,
        thickness: 0.2,
        material: 'concrete',
        color: '#ffffff',
        mesh: mockMesh,
      });
    });

    it('creates a wall with custom values', () => {
      const wallData = {
        name: 'Custom Wall',
        startX: 5,
        startZ: 3,
        endX: 15,
        endZ: 8,
        height: 4,
        thickness: 0.3,
        material: 'brick',
        color: '#ff0000',
      };

      const wall = wallFactory.create(wallData);

      expect(wall).toEqual({
        id: 'wall-1',
        name: 'Custom Wall',
        startX: 5,
        startZ: 3,
        endX: 15,
        endZ: 8,
        height: 4,
        thickness: 0.3,
        material: 'brick',
        color: '#ff0000',
        mesh: mockMesh,
      });
    });

    it('increments wall ID for multiple walls', () => {
      const wall1 = wallFactory.create({});
      const wall2 = wallFactory.create({});

      expect(wall1.id).toBe('wall-1');
      expect(wall2.id).toBe('wall-2');
    });

    it('creates a mesh for the wall', () => {
      wallFactory.create({});

      expect(global.THREE.BoxGeometry).toHaveBeenCalledWith(
        expect.any(Number), // width
        3, // height
        0.2 // thickness
      );
      expect(global.THREE.MeshLambertMaterial).toHaveBeenCalledWith({
        color: expect.any(Object),
      });
      expect(global.THREE.Mesh).toHaveBeenCalledWith(
        mockGeometry,
        mockMaterial
      );
    });
  });

  describe('update', () => {
    let wall;

    beforeEach(() => {
      wall = wallFactory.create({
        startX: 0,
        startZ: 0,
        endX: 10,
        endZ: 0,
        height: 3,
      });
    });

    it('updates wall properties', () => {
      const updates = {
        startX: 5,
        height: 4,
        material: 'brick',
      };

      const updatedWall = wallFactory.update(wall.id, updates);

      expect(updatedWall.startX).toBe(5);
      expect(updatedWall.startZ).toBe(0); // unchanged
      expect(updatedWall.endX).toBe(10); // unchanged
      expect(updatedWall.height).toBe(4);
      expect(updatedWall.material).toBe('brick');
    });

    it('returns null for non-existent wall', () => {
      const result = wallFactory.update('non-existent', { startX: 5 });

      expect(result).toBeNull();
    });

    it('updates mesh when properties change', () => {
      wallFactory.update(wall.id, { endX: 15 });

      // Original mesh should be disposed
      expect(mockGeometry.dispose).toHaveBeenCalled();
      expect(mockMaterial.dispose).toHaveBeenCalled();
      
      // New mesh should be created
      expect(global.THREE.Mesh).toHaveBeenCalledTimes(2); // once for create, once for update
    });
  });

  describe('delete', () => {
    let wall;

    beforeEach(() => {
      wall = wallFactory.create({});
    });

    it('deletes existing wall', () => {
      const result = wallFactory.delete(wall.id);

      expect(result).toBe(true);
      expect(wallFactory.get(wall.id)).toBeNull();
      expect(mockGeometry.dispose).toHaveBeenCalled();
      expect(mockMaterial.dispose).toHaveBeenCalled();
    });

    it('returns false for non-existent wall', () => {
      const result = wallFactory.delete('non-existent');

      expect(result).toBe(false);
    });

    it('disposes mesh resources', () => {
      wallFactory.delete(wall.id);

      expect(mockGeometry.dispose).toHaveBeenCalled();
      expect(mockMaterial.dispose).toHaveBeenCalled();
    });
  });

  describe('copy', () => {
    let originalWall;

    beforeEach(() => {
      originalWall = wallFactory.create({
        name: 'Original Wall',
        startX: 0,
        startZ: 0,
        endX: 10,
        endZ: 0,
        height: 3,
        thickness: 0.2,
        material: 'concrete',
        color: '#ffffff',
      });
    });

    it('copies wall with default offset', () => {
      const copiedWall = wallFactory.copy(originalWall.id);

      expect(copiedWall.id).toBe('wall-2');
      expect(copiedWall.name).toBe('Original Wall');
      expect(copiedWall.startX).toBe(2); // original 0 + offset 2
      expect(copiedWall.startZ).toBe(2); // original 0 + offset 2
      expect(copiedWall.endX).toBe(12); // original 10 + offset 2
      expect(copiedWall.endZ).toBe(2); // original 0 + offset 2
      expect(copiedWall.height).toBe(3);
      expect(copiedWall.thickness).toBe(0.2);
      expect(copiedWall.material).toBe('concrete');
      expect(copiedWall.color).toBe('#ffffff');
    });

    it('copies wall with custom offset', () => {
      const offset = { x: 5, z: -3 };
      const copiedWall = wallFactory.copy(originalWall.id, offset);

      expect(copiedWall.startX).toBe(5); // original 0 + offset 5
      expect(copiedWall.startZ).toBe(-3); // original 0 + offset -3
      expect(copiedWall.endX).toBe(15); // original 10 + offset 5
      expect(copiedWall.endZ).toBe(-3); // original 0 + offset -3
    });

    it('returns null for non-existent wall', () => {
      const result = wallFactory.copy('non-existent');

      expect(result).toBeNull();
    });

    it('creates new mesh for copied wall', () => {
      wallFactory.copy(originalWall.id);

      expect(global.THREE.Mesh).toHaveBeenCalledTimes(2); // once for original, once for copy
    });
  });

  describe('get', () => {
    it('returns existing wall', () => {
      const wall = wallFactory.create({ name: 'Test Wall' });

      const retrieved = wallFactory.get(wall.id);

      expect(retrieved).toBe(wall);
    });

    it('returns null for non-existent wall', () => {
      const result = wallFactory.get('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('returns all walls', () => {
      const wall1 = wallFactory.create({ name: 'Wall 1' });
      const wall2 = wallFactory.create({ name: 'Wall 2' });
      const wall3 = wallFactory.create({ name: 'Wall 3' });

      const allWalls = wallFactory.getAll();

      expect(allWalls).toHaveLength(3);
      expect(allWalls).toContain(wall1);
      expect(allWalls).toContain(wall2);
      expect(allWalls).toContain(wall3);
    });

    it('returns empty array when no walls exist', () => {
      const allWalls = wallFactory.getAll();

      expect(allWalls).toEqual([]);
    });
  });

  describe('updateMesh', () => {
    let wall;

    beforeEach(() => {
      wall = wallFactory.create({
        startX: 0,
        startZ: 0,
        endX: 10,
        endZ: 0,
        height: 3,
        thickness: 0.2,
      });
    });

    it('positions mesh at wall center', () => {
      expect(mockMesh.position.set).toHaveBeenCalledWith(5, 1.5, 0); // center (5,0), height/2 (1.5)
    });

    it('rotates mesh to align with wall direction', () => {
      // Create wall with diagonal direction
      wallFactory.create({
        startX: 0,
        startZ: 0,
        endX: 10,
        endZ: 10,
        height: 3,
        thickness: 0.2,
      });

      expect(mockMesh.rotation.y).toBeCloseTo(-Math.PI / 4); // -45 degrees
    });

    it('calculates correct width for wall geometry', () => {
      const expectedWidth = Math.sqrt(10 * 10 + 0 * 0); // sqrt(100) = 10
      
      expect(global.THREE.BoxGeometry).toHaveBeenCalledWith(
        expectedWidth,
        3,
        0.2
      );
    });

    it('disposes old mesh before creating new one', () => {
      wallFactory.update(wall.id, { endX: 15 });

      expect(mockGeometry.dispose).toHaveBeenCalled();
      expect(mockMaterial.dispose).toHaveBeenCalled();
    });
  });
});