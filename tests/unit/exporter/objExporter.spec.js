/**
 * OBJ Exporter Tests
 */

import {
  exportToOBJ,
  exportObjectsToOBJ,
  exportWallsToOBJ,
  downloadOBJ,
  validateSceneForOBJ,
} from '@/three/exporter/objExporter';

// Mock Three.js and OBJExporter
jest.mock('three', () => ({
  Scene: jest.fn(),
  Object3D: jest.fn(),
  MeshPhongMaterial: jest.fn(),
}));

jest.mock('three-stdlib', () => ({
  OBJExporter: jest.fn().mockImplementation(() => ({
    parse: jest.fn(),
  }),
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

describe('OBJ Exporter', () => {
  let mockOBJExporter;
  let mockScene;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { OBJExporter } = require('three-stdlib');
    mockOBJExporter = new OBJExporter();
    
    mockScene = {
      children: [],
      traverse: jest.fn(),
      clone: jest.fn(() => mockScene),
    };
  });

  describe('exportToOBJ', () => {
    it('should export scene to OBJ format successfully', async () => {
      const mockOBJString = '# OBJ export\nv 0 0 0\n';
      mockOBJExporter.parse.mockReturnValue(mockOBJString);

      const result = await exportToOBJ(mockScene);

      expect(mockOBJExporter.parse).toHaveBeenCalledWith(mockScene);
      expect(result.objBlob).toBeInstanceOf(Blob);
      expect(result.objFilename).toMatch(/^project-export-\d{8}-T\d{6}\.obj$/);
      expect(result.format).toBe('obj');
      expect(result.hasMaterials).toBe(false);
    });

    it('should include materials when requested', async () => {
      const mockOBJString = '# OBJ export\nv 0 0 0\n';
      const mockMaterial = {
        isMesh: true,
        material: {
          uuid: 'material-uuid',
          name: 'test-material',
          color: { r: 1, g: 1, b: 1 },
          type: 'MeshPhongMaterial',
        },
      };

      mockOBJExporter.parse.mockReturnValue(mockOBJString);
      mockScene.children = [mockMaterial];
      mockScene.traverse.mockImplementation((callback) => {
        callback(mockMaterial);
      });

      const result = await exportToOBJ(mockScene, { includeMaterials: true });

      expect(result.hasMaterials).toBe(true);
      expect(result.mtlBlob).toBeInstanceOf(Blob);
      expect(result.mtlFilename).toMatch(/^project-export-\d{8}-T\d{6}\.mtl$/);
    });

    it('should handle export errors', async () => {
      mockOBJExporter.parse.mockImplementation(() => {
        throw new Error('Export failed');
      });

      await expect(exportToOBJ(mockScene)).rejects.toThrow('OBJ export failed: Export failed');
    });
  });

  describe('exportObjectsToOBJ', () => {
    it('should export specific objects to OBJ', async () => {
      const mockObject1 = { clone: jest.fn(() => ({ userData: { type: 'wall' } })) };
      const mockObject2 = { clone: jest.fn(() => ({ userData: { type: 'wall' } })) };
      const objects = [mockObject1, mockObject2];

      mockOBJExporter.parse.mockReturnValue('# OBJ export\nv 0 0 0\n');

      const result = await exportObjectsToOBJ(objects);

      expect(mockObject1.clone).toHaveBeenCalled();
      expect(mockObject2.clone).toHaveBeenCalled();
      expect(result.format).toBe('obj');
    });

    it('should clean up temporary scene on success', async () => {
      const mockObject = { clone: jest.fn(() => ({ userData: { type: 'wall' } })) };
      const mockTempScene = {
        add: jest.fn(),
        clear: jest.fn(),
      };

      const { Scene } = require('three');
      Scene.mockImplementation(() => mockTempScene);

      mockOBJExporter.parse.mockReturnValue('# OBJ export\nv 0 0 0\n');

      await exportObjectsToOBJ([mockObject]);

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

      mockOBJExporter.parse.mockImplementation(() => {
        throw new Error('Export failed');
      });

      await expect(exportObjectsToOBJ([mockObject])).rejects.toThrow();
      expect(mockTempScene.clear).toHaveBeenCalled();
    });
  });

  describe('exportWallsToOBJ', () => {
    it('should export only wall entities', async () => {
      const mockWall = { userData: { type: 'wall' } };
      const mockMeasurement = { userData: { type: 'measurement' } };

      mockScene.children = [mockWall, mockMeasurement];
      mockScene.traverse.mockImplementation((callback) => {
        mockScene.children.forEach(callback);
      });

      mockOBJExporter.parse.mockReturnValue('# OBJ export\nv 0 0 0\n');

      const result = await exportWallsToOBJ(mockScene);

      expect(result).toBeDefined();
      expect(mockOBJExporter.parse).toHaveBeenCalled();
    });

    it('should throw error when no walls found', async () => {
      mockScene.children = [];
      mockScene.traverse.mockImplementation((callback) => {
        // No children to traverse
      });

      await expect(exportWallsToOBJ(mockScene)).rejects.toThrow('No wall entities found in scene');
    });
  });

  describe('downloadOBJ', () => {
    it('should download OBJ file', () => {
      const exportResult = {
        objBlob: new Blob(['obj data'], { type: 'text/plain' }),
        objFilename: 'test.obj',
        format: 'obj',
        hasMaterials: false,
      };

      downloadOBJ(exportResult);

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(exportResult.objBlob);
      expect(global.document.body.appendChild).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalled();
    });

    it('should use custom filename if provided', () => {
      const exportResult = {
        objBlob: new Blob(['obj data'], { type: 'text/plain' }),
        objFilename: 'test.obj',
        format: 'obj',
        hasMaterials: false,
      };

      const customFilename = 'custom-name.obj';
      downloadOBJ(exportResult, customFilename);

      expect(mockLink.download).toBe(customFilename);
    });

    it('should download MTL file if materials are included', () => {
      jest.useFakeTimers();

      const exportResult = {
        objBlob: new Blob(['obj data'], { type: 'text/plain' }),
        mtlBlob: new Blob(['mtl data'], { type: 'text/plain' }),
        objFilename: 'test.obj',
        mtlFilename: 'test.mtl',
        format: 'obj',
        hasMaterials: true,
      };

      downloadOBJ(exportResult);

      // First download (OBJ)
      expect(global.document.body.appendChild).toHaveBeenCalledTimes(1);
      expect(global.document.body.removeChild).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(500);

      // Second download (MTL)
      expect(global.document.body.appendChild).toHaveBeenCalledTimes(2);
      expect(global.document.body.removeChild).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should clean up object URLs after download', () => {
      jest.useFakeTimers();

      const exportResult = {
        objBlob: new Blob(['obj data'], { type: 'text/plain' }),
        objFilename: 'test.obj',
        format: 'obj',
        hasMaterials: false,
      };

      downloadOBJ(exportResult);

      jest.advanceTimersByTime(1000);

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('validateSceneForOBJ', () => {
    it('should validate empty scene as valid', () => {
      mockScene.children = [];
      mockScene.traverse.mockImplementation((callback) => {
        // No children to traverse
      });

      const result = validateSceneForOBJ(mockScene);

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

      const result = validateSceneForOBJ(mockScene);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Mesh "test-mesh" has no position attribute');
    });

    it('should warn about missing normals', () => {
      const mockMesh = {
        isMesh: true,
        geometry: {
          attributes: {
            position: { count: 3 },
          },
          index: null,
        },
        name: 'test-mesh',
      };

      mockScene.children = [mockMesh];
      mockScene.traverse.mockImplementation((callback) => {
        callback(mockMesh);
      });

      const result = validateSceneForOBJ(mockScene);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Mesh "test-mesh" has no normals - they will be generated');
    });

    it('should warn about missing materials', () => {
      const mockMesh = {
        isMesh: true,
        geometry: {
          attributes: {
            position: { count: 3 },
            normal: { count: 3 },
          },
        },
        material: null,
        name: 'test-mesh',
      };

      mockScene.children = [mockMesh];
      mockScene.traverse.mockImplementation((callback) => {
        callback(mockMesh);
      });

      const result = validateSceneForOBJ(mockScene);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Mesh "test-mesh" has no material - default material will be used');
    });

    it('should detect null scene', () => {
      const result = validateSceneForOBJ(null);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Scene is null or undefined');
    });
  });
});