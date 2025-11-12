/**
 * Project Serializer Tests
 */

import {
  serializeProject,
  deserializeProject,
  validateProject,
  migrateProject,
} from '@/utils/projectSerializer';

describe('Project Serializer', () => {
  const mockState = {
    camera: {
      position: { toArray: () => [10, 10, 10] },
      target: { toArray: () => [0, 0, 0] },
      up: { toArray: () => [0, 1, 0] },
    },
    controls: {
      target: { toArray: () => [0, 0, 0] },
      autoRotate: false,
      autoRotateSpeed: 2.0,
    },
    scene: {
      children: [
        {
          userData: {
            type: 'wall',
            id: 'wall-1',
            name: 'Test Wall',
            material: 'concrete',
            color: '#ffffff',
          },
          position: { toArray: () => [0, 0, 0] },
          rotation: { toArray: () => [0, 0, 0] },
          scale: { toArray: () => [1, 1, 1] },
          geometry: { type: 'BoxGeometry' },
        },
        {
          userData: { type: 'measurement', id: 'meas-1', measurementType: 'distance', result: 5.0 },
          position: { toArray: () => [1, 1, 1] },
          rotation: { toArray: () => [0, 0, 0] },
          scale: { toArray: () => [1, 1, 1] },
        },
      ],
    },
    editor: {
      drawWallToolEnabled: true,
      snapping: { orthogonal: true, diagonal45: false },
      materials: [{ label: '混凝土', value: 'concrete' }],
      activeSelection: { id: 'wall-default', material: 'concrete', color: '#ffffff' },
      activeTool: 'distance',
      measurements: [],
      measurementResultsVisible: true,
      commandStackInfo: { canUndo: true, canRedo: false },
      viewport: {
        viewMode: 'sync',
        layoutMode: 'split',
        grid: {
          visible: true,
          size: 2500,
          density: 2,
          divisions: 80,
        },
        axis: {
          visible: true,
          size: 800,
        },
      },
    },
    cad: {
      layers: [{ id: 'layer-structure', name: '结构', visible: true }],
      opacity: 0.75,
      importStatus: 'success',
      lastImportedFile: 'test.dxf',
      selectedUnit: 'mm',
    },
  };

  describe('serializeProject', () => {
    it('should serialize project data correctly', () => {
      const result = serializeProject(mockState);

      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('scene');
      expect(result).toHaveProperty('editor');
      expect(result).toHaveProperty('cad');

      expect(result.metadata).toHaveProperty('createdAt');
      expect(result.metadata).toHaveProperty('updatedAt');
      expect(result.metadata.name).toBe('Untitled Project');
    });

    it('should serialize viewport information', () => {
      const result = serializeProject(mockState);

      expect(result.scene.viewport.camera.position).toEqual([10, 10, 10]);
      expect(result.scene.viewport.controls.autoRotate).toBe(false);
    });

    it('should serialize entities', () => {
      const result = serializeProject(mockState);

      expect(result.scene.entities).toHaveLength(2);

      const wall = result.scene.entities.find((e) => e.type === 'wall');
      expect(wall).toHaveProperty('type', 'wall');
      expect(wall).toHaveProperty('id', 'wall-1');
      expect(wall).toHaveProperty('material', 'concrete');

      const measurement = result.scene.entities.find((e) => e.type === 'measurement');
      expect(measurement).toHaveProperty('type', 'measurement');
      expect(measurement).toHaveProperty('id', 'meas-1');
      expect(measurement).toHaveProperty('result', 5.0);
    });

    it('should serialize editor state', () => {
      const result = serializeProject(mockState);

      expect(result.editor.drawWallToolEnabled).toBe(true);
      expect(result.editor.snapping.orthogonal).toBe(true);
      expect(result.editor.activeTool).toBe('distance');
      expect(result.editor.materials).toHaveLength(1);
      expect(result.editor.viewport).toEqual(mockState.editor.viewport);
    });

    it('should serialize CAD state', () => {
      const result = serializeProject(mockState);

      expect(result.cad.layers).toHaveLength(1);
      expect(result.cad.opacity).toBe(0.75);
      expect(result.cad.importStatus).toBe('success');
      expect(result.cad.selectedUnit).toBe('mm');
    });

    it('should handle empty state gracefully', () => {
      const emptyState = {};
      const result = serializeProject(emptyState);

      expect(result).toHaveProperty('version', '1.0.0');
      expect(result.scene.entities).toEqual([]);
      expect(result.editor).toBeDefined();
      expect(result.cad).toBeDefined();
    });
  });

  describe('deserializeProject', () => {
    const mockProjectData = {
      version: '1.0.0',
      metadata: {
        name: 'Test Project',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      scene: {
        viewport: {
          camera: { position: [5, 5, 5], target: [0, 0, 0], up: [0, 1, 0] },
          controls: { target: [0, 0, 0], autoRotate: true },
        },
        entities: [{ type: 'wall', id: 'wall-1', material: 'brick' }],
      },
      editor: {
        drawWallToolEnabled: false,
        snapping: { orthogonal: false },
        activeTool: 'area',
        viewport: {
          viewMode: '3d',
          layoutMode: 'floating',
          grid: {
            visible: false,
            size: 3000,
            density: 1.5,
            divisions: 60,
          },
          axis: {
            visible: false,
            size: 600,
          },
        },
      },
      cad: {
        layers: [{ id: 'layer-furniture', name: '家具', visible: false }],
        opacity: 0.5,
        selectedUnit: 'cm',
      },
    };

    it('should deserialize project data correctly', () => {
      const result = deserializeProject(mockProjectData);

      expect(result).toHaveProperty('editor');
      expect(result).toHaveProperty('cad');
      expect(result).toHaveProperty('viewport');
      expect(result).toHaveProperty('entities');

      expect(result.editor.drawWallToolEnabled).toBe(false);
      expect(result.editor.snapping.orthogonal).toBe(false);
      expect(result.editor.activeTool).toBe('area');
      expect(result.editor.viewport.viewMode).toBe('3d');
      expect(result.editor.viewport.layoutMode).toBe('floating');
      expect(result.editor.viewport.grid.visible).toBe(false);

      expect(result.cad.opacity).toBe(0.5);
      expect(result.cad.selectedUnit).toBe('cm');
    });

    it('should handle missing data gracefully', () => {
      const incompleteData = {
        version: '1.0.0',
        editor: { drawWallToolEnabled: true },
      };

      const result = deserializeProject(incompleteData);

      expect(result.editor.drawWallToolEnabled).toBe(true);
      expect(result.cad).toEqual({});
      expect(result.viewport).toBeUndefined();
      expect(result.entities).toEqual([]);
    });

    it('should throw error for invalid project data', () => {
      expect(() => deserializeProject(null)).toThrow();
      expect(() => deserializeProject({})).toThrow();
      expect(() => deserializeProject({ version: null })).toThrow();
    });
  });

  describe('validateProject', () => {
    it('should validate correct project data', () => {
      const validProject = {
        version: '1.0.0',
        scene: { entities: [] },
        editor: {},
        cad: {},
      };

      const result = validateProject(validProject);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidProject = {
        scene: { entities: [] },
        editor: {},
      };

      const result = validateProject(invalidProject);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing project version');
    });

    it('should validate entities', () => {
      const projectWithInvalidEntities = {
        version: '1.0.0',
        scene: {
          entities: [
            { type: 'wall' }, // Missing ID
            { id: 'entity-2' }, // Missing type
          ],
        },
        editor: {},
        cad: {},
      };

      const result = validateProject(projectWithInvalidEntities);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entity at index 0 is missing ID');
      expect(result.errors).toContain('Entity at index 1 is missing type');
    });

    it('should provide warnings for missing optional data', () => {
      const minimalProject = {
        version: '1.0.0',
      };

      const result = validateProject(minimalProject);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Missing scene data');
      expect(result.warnings).toContain('Missing editor data');
      expect(result.warnings).toContain('Missing CAD data');
    });

    it('should handle null project data', () => {
      const result = validateProject(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project data is null or undefined');
    });
  });

  describe('migrateProject', () => {
    it('should update version when migrating', () => {
      const oldProject = {
        version: '0.9.0',
        metadata: { name: 'Old Project' },
      };

      const result = migrateProject(oldProject, '0.9.0', '1.0.0');

      expect(result.version).toBe('1.0.0');
      expect(result.metadata.migratedFrom).toBe('0.9.0');
      expect(result.metadata.updatedAt).toBeDefined();
    });

    it('should preserve existing metadata', () => {
      const projectWithMetadata = {
        version: '0.9.0',
        metadata: {
          name: 'Test Project',
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      };

      const result = migrateProject(projectWithMetadata, '0.9.0');

      expect(result.metadata.name).toBe('Test Project');
      expect(result.metadata.createdAt).toBe('2023-01-01T00:00:00.000Z');
      expect(result.metadata.migratedFrom).toBe('0.9.0');
    });

    it('should handle same version migration', () => {
      const currentProject = {
        version: '1.0.0',
        metadata: { name: 'Current Project' },
      };

      const result = migrateProject(currentProject, '1.0.0');

      expect(result.version).toBe('1.0.0');
      expect(result.metadata.name).toBe('Current Project');
      expect(result.metadata.migratedFrom).toBe('1.0.0');
    });

    it('should default to current version if target not specified', () => {
      const oldProject = {
        version: '0.9.0',
        metadata: { name: 'Old Project' },
      };

      const result = migrateProject(oldProject, '0.9.0');

      expect(result.version).toBe('1.0.0');
    });
  });

  describe('ID Stability', () => {
    it('should preserve entity IDs during serialization', () => {
      const stateWithSpecificIds = {
        scene: {
          children: [
            {
              userData: { type: 'wall', id: 'specific-wall-id' },
              position: { toArray: () => [0, 0, 0] },
              rotation: { toArray: () => [0, 0, 0] },
              scale: { toArray: () => [1, 1, 1] },
              geometry: { type: 'BoxGeometry' },
            },
          ],
        },
        editor: {},
        cad: {},
      };

      const serialized = serializeProject(stateWithSpecificIds);
      const wall = serialized.scene.entities.find((e) => e.type === 'wall');

      expect(wall.id).toBe('specific-wall-id');
    });

    it('should generate consistent IDs for entities without IDs', () => {
      const stateWithoutIds = {
        scene: {
          children: [
            {
              userData: { type: 'wall' },
              position: { toArray: () => [0, 0, 0] },
              rotation: { toArray: () => [0, 0, 0] },
              scale: { toArray: () => [1, 1, 1] },
              geometry: { type: 'BoxGeometry' },
            },
          ],
        },
        editor: {},
        cad: {},
      };

      const serialized1 = serializeProject(stateWithoutIds);
      const serialized2 = serializeProject(stateWithoutIds);

      const wall1 = serialized1.scene.entities.find((e) => e.type === 'wall');
      const wall2 = serialized2.scene.entities.find((e) => e.type === 'wall');

      expect(wall1.id).toMatch(/^entity-\d+-[a-z0-9]+$/);
      expect(wall2.id).toMatch(/^entity-\d+-[a-z0-9]+$/);
      // IDs should be different due to timestamp
      expect(wall1.id).not.toBe(wall2.id);
    });
  });
});
