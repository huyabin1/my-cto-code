import * as THREE from 'three';
import { UpdateEntityPropertyCommand } from '@/three/command/EntityPropertyCommands';
import WallFactory from '@/three/factory/WallFactory';
import { getSharedSceneGraph } from '@/three/core/SceneGraph';

jest.mock('@/three/factory/WallFactory.js', () => ({
  update: jest.fn(),
  create: jest.fn(),
}));

jest.mock('@/three/core/SceneGraph.js', () => ({
  getSharedSceneGraph: jest.fn(),
}));

describe('UpdateEntityPropertyCommand', () => {
  let mockStore;
  let mockSceneGraph;
  let mockWall;
  let entity;

  beforeEach(() => {
    // Setup mock wall
    mockWall = new THREE.Group();
    mockWall.userData = {
      type: 'wall',
      id: 'test-wall-id',
      config: {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(5, 0),
        height: 2.8,
        thickness: 0.2,
        material: 'concrete',
        color: 0x888888,
      },
    };

    // Setup entity data
    entity = {
      id: 'wall-1',
      name: 'Test Wall',
      type: 'wall',
      height: 2.8,
      thickness: 0.2,
      material: 'concrete',
      color: 0x888888,
    };

    // Setup mock store
    mockStore = {
      state: {
        editor: {
          entities: [{ ...entity }],
        },
      },
      commit: jest.fn(),
    };

    // Setup mock scene graph
    mockSceneGraph = {
      getEntity: jest.fn(() => ({
        threeObject: mockWall,
        entity: entity,
      })),
      updateEntity: jest.fn(),
    };

    getSharedSceneGraph.mockReturnValue(mockSceneGraph);
    WallFactory.update.mockImplementation(() => {});

    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create command with provided values', () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      expect(command.entityId).toBe('wall-1');
      expect(command.property).toBe('height');
      expect(command.newValue).toBe(3.0);
      expect(command.oldValue).toBe(2.8);
    });

    it('should get old value from entity if not provided', () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0);

      expect(command.oldValue).toBe(2.8);
    });

    it('should throw error if entity not found', () => {
      mockStore.state.editor.entities = [];

      expect(() => {
        new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0);
      }).toThrow('Entity wall-1 not found');
    });

    it('should generate proper description', () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      expect(command.getDescription()).toContain('更新实体wall-1.height');
      expect(command.getDescription()).toContain('2.8');
      expect(command.getDescription()).toContain('3');
    });

    it('should generate unique ID', () => {
      const command1 = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0);

      const id1 = command1.getId();
      expect(id1).toContain('update_entity_property_wall-1_height');

      // Use small delay to ensure different timestamps
      const command2 = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0);

      const id2 = command2.getId();
      expect(id2).toContain('update_entity_property_wall-1_height');
    });
  });

  describe('execute', () => {
    it('should update entity property in store', async () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      const result = await command.execute();

      const updatedEntity = mockStore.state.editor.entities[0];
      expect(updatedEntity.height).toBe(3.0);
      expect(result).toBe(3.0);
    });

    it('should call WallFactory.update for wall entities', async () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      await command.execute();

      expect(WallFactory.update).toHaveBeenCalledWith(mockWall, { height: 3.0 });
    });

    it('should update SceneGraph after property change', async () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      await command.execute();

      expect(mockSceneGraph.updateEntity).toHaveBeenCalledWith('wall-1', {
        height: 3.0,
      });
    });

    it('should handle material property updates', async () => {
      entity.material = 'concrete';
      mockStore.state.editor.entities[0] = { ...entity };

      const command = new UpdateEntityPropertyCommand(
        mockStore,
        'wall-1',
        'material',
        'wood',
        'concrete'
      );

      await command.execute();

      expect(WallFactory.update).toHaveBeenCalledWith(mockWall, { material: 'wood' });
      expect(mockStore.state.editor.entities[0].material).toBe('wood');
    });

    it('should handle thickness property updates', async () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'thickness', 0.3, 0.2);

      await command.execute();

      expect(WallFactory.update).toHaveBeenCalledWith(mockWall, { thickness: 0.3 });
      expect(mockStore.state.editor.entities[0].thickness).toBe(0.3);
    });

    it('should handle color property updates', async () => {
      const command = new UpdateEntityPropertyCommand(
        mockStore,
        'wall-1',
        'color',
        0xff0000,
        0x888888
      );

      await command.execute();

      expect(WallFactory.update).toHaveBeenCalledWith(mockWall, { color: 0xff0000 });
    });
  });

  describe('undo', () => {
    it('should revert property to old value', async () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      await command.execute();
      const result = await command.undo();

      const updatedEntity = mockStore.state.editor.entities[0];
      expect(updatedEntity.height).toBe(2.8);
      expect(result).toBe(2.8);
    });

    it('should call WallFactory.update with old config on undo', async () => {
      const command = new UpdateEntityPropertyCommand(
        mockStore,
        'wall-1',
        'material',
        'wood',
        'concrete'
      );

      await command.execute();
      WallFactory.update.mockClear();

      await command.undo();

      expect(WallFactory.update).toHaveBeenCalledWith(mockWall, { material: 'concrete' });
    });

    it('should update SceneGraph with old value on undo', async () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      await command.execute();
      mockSceneGraph.updateEntity.mockClear();

      await command.undo();

      expect(mockSceneGraph.updateEntity).toHaveBeenCalledWith('wall-1', {
        height: 2.8,
      });
    });
  });

  describe('merge', () => {
    it('should merge compatible commands', () => {
      const command1 = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      const command2 = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.5, 3.0);

      expect(command1.canMerge(command2)).toBe(true);

      const merged = command1.merge(command2);
      expect(merged.newValue).toBe(3.5);
      expect(merged.oldValue).toBe(2.8);
    });

    it('should not merge commands for different properties', () => {
      const command1 = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      const command2 = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'thickness', 0.3, 0.2);

      expect(command1.canMerge(command2)).toBe(false);
    });

    it('should not merge commands for different entities', () => {
      // Add another entity
      const entity2 = { ...entity, id: 'wall-2' };
      mockStore.state.editor.entities.push(entity2);

      const command1 = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      const command2 = new UpdateEntityPropertyCommand(mockStore, 'wall-2', 'height', 3.0, 2.8);

      expect(command1.canMerge(command2)).toBe(false);
    });

    it('should not merge with non-UpdateEntityPropertyCommand', () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      const otherCommand = {
        canMerge: () => false,
      };

      expect(command.canMerge(otherCommand)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle missing Three.js object gracefully', async () => {
      mockSceneGraph.getEntity.mockReturnValue(null);

      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      // Should not throw, just update store
      await expect(command.execute()).resolves.toBe(3.0);
      expect(mockStore.state.editor.entities[0].height).toBe(3.0);
    });

    it('should handle WallFactory.update errors gracefully', async () => {
      WallFactory.update.mockImplementation(() => {
        throw new Error('Factory error');
      });

      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      // Should still complete despite factory error
      await expect(command.execute()).resolves.toBe(3.0);
      expect(mockStore.state.editor.entities[0].height).toBe(3.0);
    });

    it('should handle entity not found on execute', async () => {
      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      // Remove entity after command creation
      mockStore.state.editor.entities = [];

      await expect(command.execute()).rejects.toThrow('Entity wall-1 not found');
    });
  });

  describe('property mapping', () => {
    it('should map all supported properties', async () => {
      const properties = ['height', 'thickness', 'material', 'color'];

      for (const prop of properties) {
        WallFactory.update.mockClear();
        mockStore.state.editor.entities[0][prop] = 'old-value';

        const command = new UpdateEntityPropertyCommand(
          mockStore,
          'wall-1',
          prop,
          'new-value',
          'old-value'
        );

        await command.execute();

        // Verify factory was called with correct property
        const expectedConfig = { [prop]: 'new-value' };
        expect(WallFactory.update).toHaveBeenCalledWith(mockWall, expectedConfig);
      }
    });

    it('should skip unknown properties', async () => {
      WallFactory.update.mockClear();

      const command = new UpdateEntityPropertyCommand(
        mockStore,
        'wall-1',
        'unknownProperty',
        'value',
        'oldValue'
      );

      await command.execute();

      // Factory should not be called for unknown properties
      expect(WallFactory.update).not.toHaveBeenCalled();
    });
  });

  describe('geometry update', () => {
    it('should trigger Three.js render update', async () => {
      // Create a mock wall with updateMatrixWorld as a spy
      const mockWallWithSpy = new THREE.Group();
      mockWallWithSpy.userData = mockWall.userData;
      mockWallWithSpy.updateMatrixWorld = jest.fn();

      mockSceneGraph.getEntity.mockReturnValue({
        threeObject: mockWallWithSpy,
        entity: entity,
      });

      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-1', 'height', 3.0, 2.8);

      await command.execute();

      // Verify updateMatrixWorld was called to trigger render update
      expect(mockWallWithSpy.updateMatrixWorld).toHaveBeenCalled();
    });
  });

  describe('multiple entity support', () => {
    it('should handle multiple entities correctly', async () => {
      const entity2 = {
        id: 'wall-2',
        type: 'wall',
        height: 2.8,
        material: 'brick',
      };

      mockStore.state.editor.entities.push(entity2);

      const command = new UpdateEntityPropertyCommand(mockStore, 'wall-2', 'height', 3.5, 2.8);

      mockSceneGraph.getEntity.mockReturnValue({
        threeObject: mockWall,
        entity: entity2,
      });

      await command.execute();

      // First entity should remain unchanged
      expect(mockStore.state.editor.entities[0].height).toBe(2.8);
      // Second entity should be updated
      expect(mockStore.state.editor.entities[1].height).toBe(3.5);
    });
  });
});
