import * as THREE from 'three';
import {
  CreateWallCommand,
  UpdateWallCommand,
  DeleteWallCommand,
  BatchWallCommand,
} from '@/three/command/WallCommands';

// Mock WallFactory
jest.mock('@/three/factory/WallFactory.js', () => ({
  create: jest.fn(),
  update: jest.fn(),
}));

describe('WallCommands', () => {
  let scene;
  let mockWall;

  beforeEach(() => {
    scene = new THREE.Scene();
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

    // Clear mock calls
    jest.clearAllMocks();
  });

  describe('CreateWallCommand', () => {
    it('should create wall and add to scene', async () => {
      const { create } = require('@/three/factory/WallFactory');
      create.mockReturnValue(mockWall);

      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(5, 0),
        height: 2.8,
        thickness: 0.2,
        material: 'concrete',
      };

      const command = new CreateWallCommand(scene, wallConfig);
      const result = await command.execute();

      expect(create).toHaveBeenCalledWith(wallConfig);
      expect(scene.children).toContain(mockWall);
      expect(result).toBe(mockWall);
    });

    it('should remove wall from scene on undo', async () => {
      const { create } = require('@/three/factory/WallFactory');
      create.mockReturnValue(mockWall);

      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(5, 0),
        height: 2.8,
        thickness: 0.2,
        material: 'concrete',
      };

      const command = new CreateWallCommand(scene, wallConfig);
      await command.execute();

      const result = await command.undo();

      expect(scene.children).not.toContain(mockWall);
      expect(result).toBe(true);
    });

    it('should handle undo when wall is not in scene', async () => {
      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(5, 0),
        height: 2.8,
        thickness: 0.2,
        material: 'concrete',
      };
      const command = new CreateWallCommand(scene, wallConfig);
      const result = await command.undo();

      expect(result).toBe(false);
    });

    it('should generate proper description', () => {
      const wallConfig = {
        start: new THREE.Vector2(1.23, 4.56),
        end: new THREE.Vector2(7.89, 0.12),
        height: 2.8,
        thickness: 0.2,
        material: 'concrete',
      };

      const command = new CreateWallCommand(scene, wallConfig);
      const description = command.getDescription();

      expect(description).toContain('创建墙体');
      expect(description).toContain('(1.23, 4.56)');
      expect(description).toContain('(7.89, 0.12)');
    });

    it('should generate unique ID', () => {
      const wallConfig = {
        start: new THREE.Vector2(0, 0),
        end: new THREE.Vector2(5, 0),
      };

      const command1 = new CreateWallCommand(scene, wallConfig);
      const command2 = new CreateWallCommand(scene, wallConfig);

      expect(command1.getId()).not.toBe(command2.getId());
      expect(command1.getId()).toContain('create_wall_0_0_5_0');
      expect(command2.getId()).toContain('create_wall_0_0_5_0');
    });
  });

  describe('UpdateWallCommand', () => {
    beforeEach(() => {
      const { update } = require('@/three/factory/WallFactory');
      update.mockImplementation(() => {});
    });

    it('should update wall with new config', async () => {
      const newConfig = { material: 'wood', color: 0x8b4513 };
      const command = new UpdateWallCommand(mockWall, newConfig);

      const result = await command.execute();

      const { update } = require('@/three/factory/WallFactory');
      expect(update).toHaveBeenCalledWith(mockWall, newConfig);
      expect(result).toBe(mockWall);
    });

    it('should revert to old config on undo', async () => {
      const oldConfig = { material: 'concrete', color: 0x888888 };
      const newConfig = { material: 'wood', color: 0x8b4513 };
      const command = new UpdateWallCommand(mockWall, newConfig, oldConfig);

      await command.execute();
      const result = await command.undo();

      const { update } = require('@/three/factory/WallFactory');
      expect(update).toHaveBeenLastCalledWith(mockWall, oldConfig);
      expect(result).toBe(mockWall);
    });

    it('should use wall config as old config if not provided', async () => {
      const newConfig = { material: 'wood' };
      const command = new UpdateWallCommand(mockWall, newConfig);

      await command.execute();
      await command.undo();

      const { update } = require('@/three/factory/WallFactory');
      expect(update).toHaveBeenLastCalledWith(mockWall, mockWall.userData.config);
    });

    it('should merge compatible commands', () => {
      const command1 = new UpdateWallCommand(mockWall, { material: 'wood' });
      const command2 = new UpdateWallCommand(mockWall, { material: 'brick' });

      expect(command1.canMerge(command2)).toBe(true);

      const merged = command1.merge(command2);
      expect(merged.newConfig.material).toBe('brick');
      expect(merged.oldConfig.material).toBe('concrete');
    });

    it('should not merge incompatible commands', () => {
      const command1 = new UpdateWallCommand(mockWall, { material: 'wood' });
      const command2 = new UpdateWallCommand(mockWall, { height: 3.0 });

      expect(command1.canMerge(command2)).toBe(false);
    });

    it('should not merge commands for different walls', () => {
      const otherWall = new THREE.Group();
      const command1 = new UpdateWallCommand(mockWall, { material: 'wood' });
      const command2 = new UpdateWallCommand(otherWall, { material: 'brick' });

      expect(command1.canMerge(command2)).toBe(false);
    });
  });

  describe('DeleteWallCommand', () => {
    beforeEach(() => {
      scene.add(mockWall);
    });

    it('should remove wall from scene', async () => {
      const command = new DeleteWallCommand(scene, mockWall);
      const result = await command.execute();

      expect(scene.children).not.toContain(mockWall);
      expect(result).toBe(true);
    });

    it('should add wall back to scene on undo', async () => {
      const command = new DeleteWallCommand(scene, mockWall);
      await command.execute();

      const result = await command.undo();

      expect(scene.children).toContain(mockWall);
      expect(result).toBe(true);
    });

    it('should handle deletion when wall is not in scene', async () => {
      // Start with wall not in scene
      const command = new DeleteWallCommand(scene, mockWall);
      const result = await command.execute();

      expect(result).toBe(false);
    });

    it('should generate proper description', () => {
      const command = new DeleteWallCommand(scene, mockWall);
      const description = command.getDescription();

      expect(description).toBe('删除墙体 test-wall-id');
    });

    it('should generate unique ID', () => {
      const command = new DeleteWallCommand(scene, mockWall);
      const id = command.getId();

      expect(id).toBe('delete_wall_test-wall-id');
    });
  });

  describe('BatchWallCommand', () => {
    let mockCommands;

    beforeEach(() => {
      mockCommands = [
        {
          execute: jest.fn().mockResolvedValue('result1'),
          undo: jest.fn().mockResolvedValue('undo1'),
          getDescription: () => 'Command 1',
        },
        {
          execute: jest.fn().mockResolvedValue('result2'),
          undo: jest.fn().mockResolvedValue('undo2'),
          getDescription: () => 'Command 2',
        },
        {
          execute: jest.fn().mockResolvedValue('result3'),
          undo: jest.fn().mockResolvedValue('undo3'),
          getDescription: () => 'Command 3',
        },
      ];
    });

    it('should execute all commands in order', async () => {
      const batchCommand = new BatchWallCommand(mockCommands, 'Test Batch');
      const results = await batchCommand.execute();

      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(mockCommands[0].execute).toHaveBeenCalled();
      expect(mockCommands[1].execute).toHaveBeenCalled();
      expect(mockCommands[2].execute).toHaveBeenCalled();
    });

    it('should undo all commands in reverse order', async () => {
      const batchCommand = new BatchWallCommand(mockCommands, 'Test Batch');
      await batchCommand.execute();
      const results = await batchCommand.undo();

      expect(results).toEqual(['undo3', 'undo2', 'undo1']);
      // Check that undo was called in reverse order by checking call order
      expect(mockCommands[2].undo).toHaveBeenCalled();
      expect(mockCommands[1].undo).toHaveBeenCalled();
      expect(mockCommands[0].undo).toHaveBeenCalled();
    });

    it('should rollback on execution failure', async () => {
      mockCommands[1].execute.mockRejectedValue(new Error('Command 2 failed'));

      const batchCommand = new BatchWallCommand(mockCommands, 'Test Batch');

      await expect(batchCommand.execute()).rejects.toThrow('Command 2 failed');

      // Should rollback executed commands
      expect(mockCommands[0].undo).toHaveBeenCalled();
      expect(mockCommands[2].execute).not.toHaveBeenCalled();
    });

    it('should handle undo failures gracefully', async () => {
      mockCommands[1].undo.mockRejectedValue(new Error('Undo failed'));

      const batchCommand = new BatchWallCommand(mockCommands, 'Test Batch');
      await batchCommand.execute();

      // Should continue undoing even if one fails
      const results = await batchCommand.undo();

      // The order should be reverse, with undefined for failed undos
      expect(results[0]).toBe('undo3'); // Last command succeeds
      expect(results[1]).toBeUndefined(); // Middle command fails
      expect(results[2]).toBe('undo1'); // First command succeeds
      expect(mockCommands[2].undo).toHaveBeenCalled();
      expect(mockCommands[0].undo).toHaveBeenCalled();
    });

    it('should generate proper description', () => {
      const batchCommand = new BatchWallCommand(mockCommands, 'Custom Description');
      expect(batchCommand.getDescription()).toBe('Custom Description');
    });

    it('should generate unique ID', () => {
      const batchCommand = new BatchWallCommand(mockCommands);
      const id = batchCommand.getId();

      expect(id).toMatch(/^batch_wall_3_\d+$/);
    });

    it('should use default description', () => {
      const batchCommand = new BatchWallCommand(mockCommands);
      expect(batchCommand.getDescription()).toBe('批量墙体操作');
    });
  });
});
