/**
 * Project Manager Tests
 */

import ProjectManager from '@/utils/projectManager';

// Mock dependencies
jest.mock('@/utils/projectSerializer', () => ({
  serializeProject: jest.fn(),
  deserializeProject: jest.fn(),
  validateProject: jest.fn(),
  migrateProject: jest.fn(),
}));

jest.mock('@/utils/autoSave', () => ({
  createAutoSaveManager: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
    getAutoSaveHistory: jest.fn(() => []),
    getLatestAutoSave: jest.fn(() => null),
    restoreFromAutoSave: jest.fn(() => null),
    setEnabled: jest.fn(),
  })),
}));

jest.mock('@/three/exporter/gltfExporter', () => ({
  exportToGLTF: jest.fn(),
  exportWallsToGLTF: jest.fn(),
  downloadGLTF: jest.fn(),
  validateSceneForGLTF: jest.fn(),
  prepareSceneForExport: jest.fn(),
}));

jest.mock('@/three/exporter/objExporter', () => ({
  exportToOBJ: jest.fn(),
  exportWallsToOBJ: jest.fn(),
  downloadOBJ: jest.fn(),
  validateSceneForOBJ: jest.fn(),
}));

// Mock DOM methods
global.URL = {
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn(),
};

global.Blob = jest.fn((content, options) => ({
  content,
  type: options.type,
  size: content.length || 100,
}));

describe('Project Manager', () => {
  let mockStore;
  let mockThreeScene;
  let projectManager;
  let mockSerializer;
  let mockGLTFExporter;
  let mockOBJExporter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset modules to get fresh mocks
    jest.resetModules();

    // Get fresh mocks
    mockSerializer = require('@/utils/projectSerializer');
    mockGLTFExporter = require('@/three/exporter/gltfExporter');
    mockOBJExporter = require('@/three/exporter/objExporter');

    // Create mock store
    mockStore = {
      state: {
        editor: { drawWallToolEnabled: true },
        cad: { opacity: 0.75 },
      },
      subscribe: jest.fn(),
      commit: jest.fn(),
      _mutations: {
        'editor/SET_DRAW_WALL_TOOL_ENABLED': [jest.fn()],
        'editor/SET_PROJECT_INFO': [jest.fn()],
        'editor/SET_LAST_AUTO_SAVE': [jest.fn()],
        'cad/SET_OPACITY': [jest.fn()],
      },
    };

    // Create mock Three.js scene
    mockThreeScene = {
      scene: {
        children: [],
        traverse: jest.fn(),
      },
      camera: {
        position: { set: jest.fn() },
        lookAt: jest.fn(),
        updateProjectionMatrix: jest.fn(),
      },
      controls: {
        target: { set: jest.fn() },
        update: jest.fn(),
      },
    };

    projectManager = new ProjectManager(mockStore, mockThreeScene);
  });

  afterEach(() => {
    if (projectManager) {
      projectManager.destroy();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(projectManager.store).toBe(mockStore);
      expect(projectManager.threeScene).toBe(mockThreeScene);
      expect(projectManager.currentProject).toBeNull();
      expect(projectManager.isDirty).toBe(false);
      expect(projectManager.lastSaveTime).toBeNull();
    });
  });

  describe('Initialization', () => {
    it('should initialize auto-save manager and subscribe to store', () => {
      const { createAutoSaveManager } = require('@/utils/autoSave');

      projectManager.initialize();

      expect(createAutoSaveManager).toHaveBeenCalledWith(mockStore);
      expect(mockStore.subscribe).toHaveBeenCalled();
    });

    it('should try to restore from auto-save on startup', async () => {
      const mockAutoSaveManager = {
        start: jest.fn(),
        destroy: jest.fn(),
        getLatestAutoSave: jest.fn(() => ({
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        })),
        restoreFromAutoSave: jest.fn(() => ({ data: { version: '1.0.0' } })),
        setEnabled: jest.fn(),
      };

      const { createAutoSaveManager } = require('@/utils/autoSave');
      createAutoSaveManager.mockReturnValue(mockAutoSaveManager);

      projectManager = new ProjectManager(mockStore, mockThreeScene);

      await projectManager.initialize();

      expect(mockAutoSaveManager.restoreFromAutoSave).toHaveBeenCalledWith(0);
    });
  });

  describe('Dirty State Management', () => {
    it('should mark project as dirty on store changes', () => {
      expect(projectManager.isDirty).toBe(false);

      // Simulate store mutation
      const mutation = { type: 'editor/SET_DRAW_WALL_TOOL_ENABLED', payload: false };
      mockStore.subscribe.mock.calls[0][0](mutation, mockStore.state);

      expect(projectManager.isDirty).toBe(true);
    });

    it('should mark project as clean', () => {
      projectManager.markDirty();
      expect(projectManager.isDirty).toBe(true);

      projectManager.markClean();
      expect(projectManager.isDirty).toBe(false);
    });
  });

  describe('Save Project', () => {
    const mockProjectData = {
      version: '1.0.0',
      metadata: { name: 'Test Project' },
      scene: { entities: [] },
      editor: {},
      cad: {},
    };

    beforeEach(() => {
      mockSerializer.serializeProject.mockReturnValue(mockProjectData);
      mockSerializer.validateProject.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
      });
    });

    it('should save project successfully', async () => {
      // Mock URL.createObjectURL and download
      const mockLink = {
        href: 'mock-url',
        download: '',
        style: { display: '' },
        click: jest.fn(),
      };

      global.document.createElement = jest.fn(() => mockLink);
      global.document.body = {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      };

      const result = await projectManager.saveProject('test-project.json');

      expect(mockSerializer.serializeProject).toHaveBeenCalledWith(mockStore.state);
      expect(mockSerializer.validateProject).toHaveBeenCalledWith(mockProjectData);
      expect(result.success).toBe(true);
      expect(result.filename).toBe('test-project.json');
      expect(projectManager.currentProject).toBe(mockProjectData);
      expect(projectManager.isDirty).toBe(false);
    });

    it('should handle save validation errors', async () => {
      mockSerializer.validateProject.mockReturnValue({
        valid: false,
        errors: ['Invalid project data'],
        warnings: [],
      });

      await expect(projectManager.saveProject()).rejects.toThrow(
        'Save failed: Project validation failed: Invalid project data'
      );
    });

    it('should generate filename if not provided', async () => {
      global.document.createElement = jest.fn(() => ({
        href: 'mock-url',
        download: '',
        style: { display: '' },
        click: jest.fn(),
      }));
      global.document.body = {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      };

      await projectManager.saveProject();

      expect(mockSerializer.serializeProject).toHaveBeenCalled();
    });
  });

  describe('Load Project', () => {
    const mockFile = new File(['{"version": "1.0.0"}'], 'test.json', { type: 'application/json' });
    const mockProjectData = {
      version: '1.0.0',
      metadata: { name: 'Loaded Project' },
      scene: { entities: [] },
      editor: { drawWallToolEnabled: false },
      cad: { opacity: 0.5 },
    };

    beforeEach(() => {
      mockSerializer.validateProject.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
      });
      mockSerializer.deserializeProject.mockReturnValue({
        editor: { drawWallToolEnabled: false },
        cad: { opacity: 0.5 },
        entities: [],
      });
    });

    it('should load project successfully', async () => {
      // Mock FileReader
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null,
        result: JSON.stringify(mockProjectData),
      };

      global.FileReader = jest.fn(() => mockFileReader);

      const promise = projectManager.loadProject(mockFile);

      // Simulate FileReader.onload
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: JSON.stringify(mockProjectData) } });
        }
      }, 0);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test.json');
      expect(result.projectName).toBe('Loaded Project');
      expect(mockSerializer.deserializeProject).toHaveBeenCalledWith(mockProjectData);
    });

    it('should handle load validation errors', async () => {
      mockSerializer.validateProject.mockReturnValue({
        valid: false,
        errors: ['Invalid file format'],
        warnings: [],
      });

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null,
        result: '{"invalid": "data"}',
      };

      global.FileReader = jest.fn(() => mockFileReader);

      const promise = projectManager.loadProject(mockFile);
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: '{"invalid": "data"}' } });
        }
      }, 0);

      await expect(promise).rejects.toThrow(
        'Load failed: Project validation failed: Invalid file format'
      );
    });

    it('should migrate project if version differs', async () => {
      const oldProjectData = { ...mockProjectData, version: '0.9.0' };
      const migratedProjectData = { ...mockProjectData, version: '1.0.0' };

      mockSerializer.migrateProject.mockReturnValue(migratedProjectData);

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null,
        result: JSON.stringify(oldProjectData),
      };

      global.FileReader = jest.fn(() => mockFileReader);

      const promise = projectManager.loadProject(mockFile);
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: JSON.stringify(oldProjectData) } });
        }
      }, 0);

      await promise;

      expect(mockSerializer.migrateProject).toHaveBeenCalledWith(oldProjectData, '0.9.0', '1.0.0');
      expect(mockSerializer.deserializeProject).toHaveBeenCalledWith(migratedProjectData);
    });
  });

  describe('Export to GLTF', () => {
    beforeEach(() => {
      mockGLTFExporter.validateSceneForGLTF.mockReturnValue({
        valid: true,
        issues: [],
        warnings: [],
      });
      mockGLTFExporter.prepareSceneForExport.mockReturnValue(mockThreeScene.scene);
      mockGLTFExporter.exportToGLTF.mockResolvedValue({
        blob: new Blob(['gltf data'], { type: 'application/json' }),
        filename: 'test.gltf',
        format: 'gltf',
        size: 100,
      });
    });

    it('should export to GLTF successfully', async () => {
      const result = await projectManager.exportToGLTF({ binary: false });

      expect(mockGLTFExporter.validateSceneForGLTF).toHaveBeenCalledWith(mockThreeScene.scene);
      expect(mockGLTFExporter.prepareSceneForExport).toHaveBeenCalledWith(
        mockThreeScene.scene,
        expect.any(Object)
      );
      expect(mockGLTFExporter.exportToGLTF).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.format).toBe('gltf');
    });

    it('should export only walls if requested', async () => {
      mockGLTFExporter.exportWallsToGLTF.mockResolvedValue({
        blob: new Blob(['walls data'], { type: 'application/json' }),
        filename: 'walls.gltf',
        format: 'gltf',
        size: 50,
      });

      const result = await projectManager.exportToGLTF({ wallsOnly: true });

      expect(mockGLTFExporter.exportWallsToGLTF).toHaveBeenCalled();
      expect(result.entityCount).toBe('walls only');
    });

    it('should handle export validation errors', async () => {
      mockGLTFExporter.validateSceneForGLTF.mockReturnValue({
        valid: false,
        issues: ['Invalid scene'],
        warnings: [],
      });

      await expect(projectManager.exportToGLTF()).rejects.toThrow(
        'GLTF export failed: Scene validation failed: Invalid scene'
      );
    });
  });

  describe('Export to OBJ', () => {
    beforeEach(() => {
      mockOBJExporter.validateSceneForOBJ.mockReturnValue({
        valid: true,
        issues: [],
        warnings: [],
      });
      mockOBJExporter.exportToOBJ.mockResolvedValue({
        objBlob: new Blob(['obj data'], { type: 'text/plain' }),
        mtlBlob: new Blob(['mtl data'], { type: 'text/plain' }),
        objFilename: 'test.obj',
        mtlFilename: 'test.mtl',
        objSize: 100,
        mtlSize: 50,
        hasMaterials: true,
      });
    });

    it('should export to OBJ successfully', async () => {
      const result = await projectManager.exportToOBJ({ includeMaterials: true });

      expect(mockOBJExporter.validateSceneForOBJ).toHaveBeenCalledWith(mockThreeScene.scene);
      expect(mockOBJExporter.exportToOBJ).toHaveBeenCalledWith(
        mockThreeScene.scene,
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.format).toBe('obj');
      expect(result.hasMaterials).toBe(true);
    });

    it('should export only walls if requested', async () => {
      mockOBJExporter.exportWallsToOBJ.mockResolvedValue({
        objBlob: new Blob(['walls obj data'], { type: 'text/plain' }),
        objFilename: 'walls.obj',
        objSize: 75,
        hasMaterials: false,
      });

      const result = await projectManager.exportToOBJ({ wallsOnly: true });

      expect(mockOBJExporter.exportWallsToOBJ).toHaveBeenCalled();
      expect(result.entityCount).toBe('walls only');
    });
  });

  describe('New Project', () => {
    it('should create new project', () => {
      projectManager.createNewProject('New Test Project');

      expect(projectManager.currentProject).toBeNull();
      expect(projectManager.isDirty).toBe(false);
      expect(mockStore.commit).toHaveBeenCalledWith('editor/SET_PROJECT_INFO', {
        name: 'New Test Project',
        createdAt: expect.any(Date),
        isDirty: false,
      });
    });
  });

  describe('Auto-save Restoration', () => {
    it('should restore from auto-save successfully', async () => {
      const mockAutoSaveManager = {
        start: jest.fn(),
        destroy: jest.fn(),
        getAutoSaveHistory: jest.fn(() => []),
        getLatestAutoSave: jest.fn(() => null),
        restoreFromAutoSave: jest.fn(() => ({
          data: { version: '1.0.0' },
          timestamp: '2023-01-01T00:00:00.000Z',
          saveCount: 1,
        })),
        setEnabled: jest.fn(),
      };

      const { createAutoSaveManager } = require('@/utils/autoSave');
      createAutoSaveManager.mockReturnValue(mockAutoSaveManager);

      mockSerializer.deserializeProject.mockReturnValue({
        editor: { drawWallToolEnabled: true },
        cad: { opacity: 0.75 },
      });

      projectManager = new ProjectManager(mockStore, mockThreeScene);
      projectManager.autoSaveManager = mockAutoSaveManager;

      const result = await projectManager.restoreFromAutoSave(0);

      expect(result.success).toBe(true);
      expect(result.timestamp).toBe('2023-01-01T00:00:00.000Z');
      expect(result.saveCount).toBe(1);
    });

    it('should handle auto-save restoration errors', async () => {
      const mockAutoSaveManager = {
        start: jest.fn(),
        destroy: jest.fn(),
        getAutoSaveHistory: jest.fn(() => []),
        getLatestAutoSave: jest.fn(() => null),
        restoreFromAutoSave: jest.fn(() => null),
        setEnabled: jest.fn(),
      };

      const { createAutoSaveManager } = require('@/utils/autoSave');
      createAutoSaveManager.mockReturnValue(mockAutoSaveManager);

      projectManager = new ProjectManager(mockStore, mockThreeScene);
      projectManager.autoSaveManager = mockAutoSaveManager;

      await expect(projectManager.restoreFromAutoSave(0)).rejects.toThrow(
        'Auto-save restore failed: Auto-save data not found'
      );
    });
  });

  describe('Cleanup', () => {
    it('should destroy project manager properly', () => {
      const mockAutoSaveManager = {
        start: jest.fn(),
        destroy: jest.fn(),
        getAutoSaveHistory: jest.fn(() => []),
        getLatestAutoSave: jest.fn(() => null),
        restoreFromAutoSave: jest.fn(() => null),
        setEnabled: jest.fn(),
      };

      const { createAutoSaveManager } = require('@/utils/autoSave');
      createAutoSaveManager.mockReturnValue(mockAutoSaveManager);

      projectManager = new ProjectManager(mockStore, mockThreeScene);
      projectManager.autoSaveManager = mockAutoSaveManager;

      projectManager.destroy();

      expect(mockAutoSaveManager.destroy).toHaveBeenCalled();
    });
  });
});
