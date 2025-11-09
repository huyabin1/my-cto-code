/**
 * GLTF Exporter Tests
 */

import {
  exportToGLTF,
  exportObjectsToGLTF,
  exportWallsToGLTF,
  downloadGLTF,
  validateSceneForGLTF,
  prepareSceneForExport,
} from '@/three/exporter/gltfExporter';

// Mock Three.js and GLTFExporter
jest.mock('three', () => ({
  Scene: jest.fn(),
  Object3D: jest.fn(),
  Box3: jest.fn(() => ({
    setFromAttribute: jest.fn(),
    getSize: jest.fn(() => ({ x: 1, y: 1, z: 1 })),
  })),
  Vector3: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
}));

jest.mock('three-stdlib', () => ({
  GLTFExporter: jest.fn().mockImplementation(() => ({
    parse: jest.fn(),
  })),
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

const mockLink = {
  href: '',
  download: '',
  style: { display: '' },
  click: jest.fn(),
};

global.document = {
  createElement: jest.fn(() => mockLink),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

describe('GLTF Exporter', () => {
  let mockGLTFExporter;
  let mockScene;

  beforeEach(() => {
    jest.clearAllMocks();

    const { GLTFExporter } = require('three-stdlib');
    mockGLTFExporter = new GLTFExporter();

    mockScene = {
      children: [],
      traverse: jest.fn(),
      clone: jest.fn(() => mockScene),
    };
  });

  describe('exportToGLTF', () => {
    it('should export scene to GLTF format successfully', async () => {
      const mockResult = { nodes: [], materials: [] };
      mockGLTFExporter.parse.mockImplementation((scene, onSuccess, onError, options) => {
        onSuccess(mockResult);
      });

      const result = await exportToGLTF(mockScene);

      expect(mockGLTFExporter.parse).toHaveBeenCalledWith(
        mockScene,
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          binary: false,
          embedImages: true,
        })
      );

      expect(result.success).toBeUndefined(); // We return the result directly
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.format).toBe('gltf');
      expect(result.filename).toMatch(/^project-export-\d{8}-T\d{6}\.gltf$/);
    });

    it('should export to GLB format when binary is true', async () => {
      const mockResult = new ArrayBuffer(100);
      mockGLTFExporter.parse.mockImplementation((scene, onSuccess, onError, options) => {
        onSuccess(mockResult);
      });

      const result = await exportToGLTF(mockScene, { binary: true });

      expect(result.format).toBe('glb');
      expect(result.filename).toMatch(/^project-export-\d{8}-T\d{6}\.glb$/);
    });

    it('should handle export errors', async () => {
      const errorMessage = 'Export failed';
      mockGLTFExporter.parse.mockImplementation((scene, onSuccess, onError, options) => {
        onError(new Error(errorMessage));
      });

      await expect(exportToGLTF(mockScene)).rejects.toThrow(`GLTF export failed: ${errorMessage}`);
    });

    it('should handle blob creation errors', async () => {
      mockGLTFExporter.parse.mockImplementation((scene, onSuccess, onError, options) => {
        onSuccess(null); // Invalid result
      });

      await expect(exportToGLTF(mockScene)).rejects.toThrow('Failed to create glTF blob');
    });
  });

  describe('exportObjectsToGLTF', () => {
    it('should export specific objects to GLTF', async () => {
      const mockObject1 = { clone: jest.fn(() => ({ userData: { type: 'wall' } })) };
      const mockObject2 = { clone: jest.fn(() => ({ userData: { type: 'wall' } })) };
      const objects = [mockObject1, mockObject2];

      mockGLTFExporter.parse.mockImplementation((scene, onSuccess, onError, options) => {
        onSuccess({ nodes: [], materials: [] });
      });

      const result = await exportObjectsToGLTF(objects);

      expect(mockObject1.clone).toHaveBeenCalled();
      expect(mockObject2.clone).toHaveBeenCalled();
      expect(result.format).toBe('gltf');
    });

    it('should clean up temporary scene on success', async () => {
      const mockObject = { clone: jest.fn(() => ({ userData: { type: 'wall' } })) };
      const mockTempScene = {
        add: jest.fn(),
        clear: jest.fn(),
      };

      const { Scene } = require('three');
      Scene.mockImplementation(() => mockTempScene);

      mockGLTFExporter.parse.mockImplementation((scene, onSuccess, onError, options) => {
        onSuccess({ nodes: [], materials: [] });
      });

      await exportObjectsToGLTF([mockObject]);

      expect(mockTempScene.clear).toHaveBeenCalled();
    });

    it('should clean up temporary scene on error', async () => {
      const mockObject = { clone: jest.fn(() => ({ userData: { type: 'wall' } })) };
      const mockTempScene = {
        add: jest.fn(),
        clear: jest.fn(),
      };

      const { Scene } = require('three');
      Scene.mockImplementation(() => mockTempScene);

      mockGLTFExporter.parse.mockImplementation((scene, onSuccess, onError, options) => {
        onError(new Error('Export failed'));
      });

      await expect(exportObjectsToGLTF([mockObject])).rejects.toThrow();
      expect(mockTempScene.clear).toHaveBeenCalled();
    });
  });

  describe('exportWallsToGLTF', () => {
    it('should export only wall entities', async () => {
      const mockWall = { userData: { type: 'wall' } };
      const mockMeasurement = { userData: { type: 'measurement' } };

      mockScene.children = [mockWall, mockMeasurement];
      mockScene.traverse.mockImplementation((callback) => {
        mockScene.children.forEach(callback);
      });

      mockGLTFExporter.parse.mockImplementation((scene, onSuccess, onError, options) => {
        onSuccess({ nodes: [], materials: [] });
      });

      const result = await exportWallsToGLTF(mockScene);

      expect(result).toBeDefined();
      expect(mockGLTFExporter.parse).toHaveBeenCalled();
    });

    it('should throw error when no walls found', async () => {
      mockScene.children = [];
      mockScene.traverse.mockImplementation((callback) => {
        // No children to traverse
      });

      await expect(exportWallsToGLTF(mockScene)).rejects.toThrow('No wall entities found in scene');
    });
  });

  describe('downloadGLTF', () => {
    it('should download GLTF file', () => {
      const exportResult = {
        blob: new Blob(['gltf data'], { type: 'application/json' }),
        filename: 'test.gltf',
        format: 'gltf',
      };

      downloadGLTF(exportResult);

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(exportResult.blob);
      expect(global.document.body.appendChild).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalled();
    });

    it('should use custom filename if provided', () => {
      const exportResult = {
        blob: new Blob(['gltf data'], { type: 'application/json' }),
        filename: 'test.gltf',
        format: 'gltf',
      };

      const customFilename = 'custom-name.gltf';
      downloadGLTF(exportResult, customFilename);

      expect(mockLink.download).toBe(customFilename);
    });

    it('should clean up object URL after download', () => {
      jest.useFakeTimers();

      const exportResult = {
        blob: new Blob(['gltf data'], { type: 'application/json' }),
        filename: 'test.gltf',
        format: 'gltf',
      };

      downloadGLTF(exportResult);

      jest.advanceTimersByTime(1000);

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('validateSceneForGLTF', () => {
    it('should validate empty scene as valid', () => {
      mockScene.children = [];
      mockScene.traverse.mockImplementation((callback) => {
        // No children to traverse
      });

      const result = validateSceneForGLTF(mockScene);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing position attribute', () => {
      const mockMesh = {
        isMesh: true,
        geometry: {
          attributes: {},
        },
        name: 'test-mesh',
      };

      mockScene.children = [mockMesh];
      mockScene.traverse.mockImplementation((callback) => {
        callback(mockMesh);
      });

      const result = validateSceneForGLTF(mockScene);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Mesh "test-mesh" has no position attribute');
    });

    it('should warn about non-indexed geometry', () => {
      const mockMesh = {
        isMesh: true,
        geometry: {
          attributes: {
            position: { count: 7 }, // Not divisible by 3
          },
          index: null,
        },
        name: 'test-mesh',
      };

      mockScene.children = [mockMesh];
      mockScene.traverse.mockImplementation((callback) => {
        callback(mockMesh);
      });

      const result = validateSceneForGLTF(mockScene);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Mesh "test-mesh" has non-indexed geometry with vertex count not divisible by 3'
      );
    });

    it('should warn about missing materials', () => {
      const mockMesh = {
        isMesh: true,
        geometry: {
          attributes: {
            position: { count: 3 },
          },
        },
        material: null,
        name: 'test-mesh',
      };

      mockScene.children = [mockMesh];
      mockScene.traverse.mockImplementation((callback) => {
        callback(mockMesh);
      });

      const result = validateSceneForGLTF(mockScene);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Mesh "test-mesh" has no material');
    });

    it('should detect null scene', () => {
      const result = validateSceneForGLTF(null);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Scene is null or undefined');
    });
  });

  describe('prepareSceneForExport', () => {
    it('should prepare scene for export', () => {
      const mockWall = {
        isMesh: true,
        userData: { type: 'wall' },
        visible: true,
        parent: { remove: jest.fn() },
      };
      const mockHelper = {
        isHelper: true,
        userData: {},
        parent: { remove: jest.fn() },
      };
      const mockMeasurement = {
        userData: { type: 'measurement' },
        parent: { remove: jest.fn() },
      };

      mockScene.children = [mockWall, mockHelper, mockMeasurement];
      mockScene.clone.mockReturnValue({
        children: [mockWall, mockHelper, mockMeasurement],
        traverse: jest.fn((callback) => {
          [mockWall, mockHelper, mockMeasurement].forEach(callback);
        }),
      });

      const preparedScene = prepareSceneForExport(mockScene);

      expect(preparedScene).toBeDefined();
    });

    it('should remove helper objects', () => {
      const mockHelper = {
        isHelper: true,
        userData: {},
        parent: { remove: jest.fn() },
      };

      const mockPreparedScene = {
        children: [mockHelper],
        traverse: jest.fn((callback) => {
          callback(mockHelper);
        }),
      };

      mockScene.clone.mockReturnValue(mockPreparedScene);

      prepareSceneForExport(mockScene);

      expect(mockHelper.parent.remove).toHaveBeenCalledWith(mockHelper);
    });

    it('should remove measurement tools unless included', () => {
      const mockMeasurement = {
        userData: { type: 'measurement' },
        parent: { remove: jest.fn() },
      };

      const mockPreparedScene = {
        children: [mockMeasurement],
        traverse: jest.fn((callback) => {
          callback(mockMeasurement);
        }),
      };

      mockScene.clone.mockReturnValue(mockPreparedScene);

      prepareSceneForExport(mockScene, { includeMeasurements: false });

      expect(mockMeasurement.parent.remove).toHaveBeenCalledWith(mockMeasurement);
    });

    it('should remove invisible objects unless included', () => {
      const mockInvisibleObject = {
        visible: false,
        userData: {},
        parent: { remove: jest.fn() },
      };

      const mockPreparedScene = {
        children: [mockInvisibleObject],
        traverse: jest.fn((callback) => {
          callback(mockInvisibleObject);
        }),
      };

      mockScene.clone.mockReturnValue(mockPreparedScene);

      prepareSceneForExport(mockScene, { includeInvisible: false });

      expect(mockInvisibleObject.parent.remove).toHaveBeenCalledWith(mockInvisibleObject);
    });

    it('should optimize geometries if requested', () => {
      const mockMesh = {
        isMesh: true,
        userData: {},
        geometry: {
          computeBoundingBox: jest.fn(),
          computeBoundingSphere: jest.fn(),
        },
        parent: { remove: jest.fn() },
      };

      const mockPreparedScene = {
        children: [mockMesh],
        traverse: jest.fn((callback) => {
          callback(mockMesh);
        }),
      };

      mockScene.clone.mockReturnValue(mockPreparedScene);

      prepareSceneForExport(mockScene, { optimizeGeometries: true });

      expect(mockMesh.geometry.computeBoundingBox).toHaveBeenCalled();
      expect(mockMesh.geometry.computeBoundingSphere).toHaveBeenCalled();
    });
  });
});
