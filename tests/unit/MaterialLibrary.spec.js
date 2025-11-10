import * as THREE from 'three';
import { resetThreeMocks } from './__mocks__/threeMock';
import MaterialLibrary from '@/three/materials/MaterialLibrary';

describe('MaterialLibrary', () => {
  let materialLibrary;

  beforeEach(() => {
    resetThreeMocks();
    materialLibrary = new MaterialLibrary();
  });

  afterEach(() => {
    materialLibrary.dispose();
  });

  describe('getMaterial', () => {
    it('creates material with default preset', () => {
      const material = materialLibrary.getMaterial('concrete');

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.color.getHex()).toBe(0x888888);
      expect(material.roughness).toBe(0.8);
      expect(material.metalness).toBe(0.2);
      expect(material.userData.type).toBe('concrete');
    });

    it('creates material with custom options', () => {
      const options = {
        color: 0xff0000,
        roughness: 0.3,
        metalness: 0.7,
      };
      const material = materialLibrary.getMaterial('wood', options);

      expect(material.color.getHex()).toBe(0xff0000);
      expect(material.roughness).toBe(0.3);
      expect(material.metalness).toBe(0.7);
    });

    it('returns cached material for same key', () => {
      const material1 = materialLibrary.getMaterial('concrete');
      const material2 = materialLibrary.getMaterial('concrete');

      expect(material1).toBe(material2);
    });

    it('creates different materials for different options', () => {
      const material1 = materialLibrary.getMaterial('concrete', { color: 0xff0000 });
      const material2 = materialLibrary.getMaterial('concrete', { color: 0x00ff00 });

      expect(material1).not.toBe(material2);
    });

    it('falls back to concrete preset for unknown type', () => {
      const material = materialLibrary.getMaterial('unknown');

      expect(material.color.getHex()).toBe(0x888888); // concrete color
      expect(material.userData.type).toBe('unknown');
    });
  });

  describe('createMaterial', () => {
    it('creates glass material with transparency', () => {
      const material = materialLibrary.createMaterial('glass');

      expect(material.transparent).toBe(true);
      expect(material.opacity).toBe(0.8);
      expect(material.transmission).toBe(0.9);
    });

    it('creates metal material with high metalness', () => {
      const material = materialLibrary.createMaterial('metal');

      expect(material.metalness).toBe(1.0);
      expect(material.roughness).toBe(0.2);
    });

    it('applies texture options', () => {
      const mockTexture = { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping };

      jest.spyOn(materialLibrary, 'getTexture').mockReturnValue(mockTexture);

      const options = {
        map: 'texture.jpg',
        normalMap: 'normal.jpg',
        roughnessMap: 'roughness.jpg',
        metalnessMap: 'metalness.jpg',
        aoMap: 'ao.jpg',
      };
      const material = materialLibrary.createMaterial('concrete', options);

      expect(material.map).toBe(mockTexture);
      expect(material.normalMap).toBe(mockTexture);
      expect(material.roughnessMap).toBe(mockTexture);
      expect(material.metalnessMap).toBe(mockTexture);
      expect(material.aoMap).toBe(mockTexture);

      materialLibrary.getTexture.mockRestore();
    });
  });

  describe('getTexture', () => {
    it('returns existing texture instance', () => {
      const texture = new THREE.Texture();
      const result = materialLibrary.getTexture(texture);

      expect(result).toBe(texture);
    });

    it('loads texture from string path', () => {
      const texture = materialLibrary.getTexture('test.jpg');

      expect(texture).toBeDefined();
      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    });

    it('caches loaded textures', () => {
      const texture1 = materialLibrary.getTexture('test.jpg');
      const texture2 = materialLibrary.getTexture('test.jpg');

      expect(texture1).toBe(texture2);
    });

    it('returns null for invalid texture input', () => {
      const texture = materialLibrary.getTexture(123);
      expect(texture).toBeNull();
    });
  });

  describe('getMaterialKey', () => {
    it('generates consistent keys', () => {
      const options = { color: 0xff0000, roughness: 0.5 };
      const key1 = materialLibrary.getMaterialKey('concrete', options);
      const key2 = materialLibrary.getMaterialKey('concrete', options);

      expect(key1).toBe(key2);
    });

    it('generates different keys for different options', () => {
      const key1 = materialLibrary.getMaterialKey('concrete', { color: 0xff0000 });
      const key2 = materialLibrary.getMaterialKey('concrete', { color: 0x00ff00 });

      expect(key1).not.toBe(key2);
    });

    it('generates different keys for different types', () => {
      const key1 = materialLibrary.getMaterialKey('concrete', {});
      const key2 = materialLibrary.getMaterialKey('wood', {});

      expect(key1).not.toBe(key2);
    });
  });

  describe('disposeMaterial', () => {
    it('disposes material by string key', () => {
      const material = materialLibrary.getMaterial('concrete');
      const key = materialLibrary.getMaterialKey('concrete', {});

      materialLibrary.disposeMaterial(key);

      expect(material.dispose).toHaveBeenCalled();
    });

    it('disposes material by instance', () => {
      const material = materialLibrary.getMaterial('concrete');

      materialLibrary.disposeMaterial(material);

      expect(material.dispose).toHaveBeenCalled();
    });

    it('does nothing for non-existent material', () => {
      const material = { dispose: jest.fn() };

      materialLibrary.disposeMaterial(material);

      expect(material.dispose).not.toHaveBeenCalled();
    });
  });

  describe('disposeTexture', () => {
    it('disposes texture by string path', () => {
      const texture = materialLibrary.getTexture('test.jpg');

      materialLibrary.disposeTexture('test.jpg');

      expect(texture.dispose).toHaveBeenCalled();
    });

    it('disposes texture by instance', () => {
      const texture = materialLibrary.getTexture('test.jpg');

      materialLibrary.disposeTexture(texture);

      expect(texture.dispose).toHaveBeenCalled();
    });

    it('does nothing for non-existent texture', () => {
      const texture = { dispose: jest.fn() };

      materialLibrary.disposeTexture(texture);

      expect(texture.dispose).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('disposes all materials and textures', () => {
      const material1 = materialLibrary.getMaterial('concrete');
      const material2 = materialLibrary.getMaterial('wood');
      const texture1 = materialLibrary.getTexture('test1.jpg');
      const texture2 = materialLibrary.getTexture('test2.jpg');

      materialLibrary.dispose();

      expect(material1.dispose).toHaveBeenCalled();
      expect(material2.dispose).toHaveBeenCalled();
      expect(texture1.dispose).toHaveBeenCalled();
      expect(texture2.dispose).toHaveBeenCalled();
    });

    it('clears internal maps', () => {
      materialLibrary.getMaterial('concrete');
      materialLibrary.getTexture('test.jpg');

      materialLibrary.dispose();

      expect(materialLibrary.materials.size).toBe(0);
      expect(materialLibrary.textures.size).toBe(0);
    });
  });

  describe('getAvailableMaterialTypes', () => {
    it('returns all default material types', () => {
      const types = materialLibrary.getAvailableMaterialTypes();

      expect(types).toContain('concrete');
      expect(types).toContain('wood');
      expect(types).toContain('glass');
      expect(types).toContain('metal');
      expect(types).toContain('plastic');
      expect(types).toContain('brick');
      expect(types).toContain('drywall');
    });
  });

  describe('getMaterialPreset', () => {
    it('returns material preset', () => {
      const preset = materialLibrary.getMaterialPreset('glass');

      expect(preset.color).toBe(0x87ceeb);
      expect(preset.roughness).toBe(0.1);
      expect(preset.metalness).toBe(0.0);
      expect(preset.transparent).toBe(true);
    });

    it('returns undefined for unknown type', () => {
      const preset = materialLibrary.getMaterialPreset('unknown');
      expect(preset).toBeUndefined();
    });
  });

  describe('addMaterialPreset', () => {
    it('adds custom material preset', () => {
      const customPreset = {
        color: 0x123456,
        roughness: 0.7,
        metalness: 0.3,
      };

      materialLibrary.addMaterialPreset('custom', customPreset);

      const preset = materialLibrary.getMaterialPreset('custom');
      expect(preset.color).toBe(0x123456);
      expect(preset.roughness).toBe(0.7);
      expect(preset.metalness).toBe(0.3);
    });

    it('updates existing preset', () => {
      materialLibrary.addMaterialPreset('concrete', { color: 0xff0000 });

      const preset = materialLibrary.getMaterialPreset('concrete');
      expect(preset.color).toBe(0xff0000);
    });
  });

  describe('getStats', () => {
    it('returns correct statistics', () => {
      materialLibrary.getMaterial('concrete');
      materialLibrary.getMaterial('wood');
      materialLibrary.getTexture('test1.jpg');
      materialLibrary.getTexture('test2.jpg');

      const stats = materialLibrary.getStats();

      expect(stats.materialsCount).toBe(2);
      expect(stats.texturesCount).toBe(2);
      expect(stats.availableTypes).toContain('concrete');
      expect(stats.availableTypes).toContain('wood');
    });

    it('returns zero stats when empty', () => {
      const stats = materialLibrary.getStats();

      expect(stats.materialsCount).toBe(0);
      expect(stats.texturesCount).toBe(0);
      expect(Array.isArray(stats.availableTypes)).toBe(true);
    });
  });

  describe('material presets', () => {
    it('has correct concrete preset', () => {
      const preset = materialLibrary.defaultPresets.concrete;
      expect(preset.color).toBe(0x888888);
      expect(preset.roughness).toBe(0.8);
      expect(preset.metalness).toBe(0.2);
    });

    it('has correct wood preset', () => {
      const preset = materialLibrary.defaultPresets.wood;
      expect(preset.color).toBe(0x8b4513);
      expect(preset.roughness).toBe(0.9);
      expect(preset.metalness).toBe(0.1);
    });

    it('has correct glass preset', () => {
      const preset = materialLibrary.defaultPresets.glass;
      expect(preset.color).toBe(0x87ceeb);
      expect(preset.roughness).toBe(0.1);
      expect(preset.metalness).toBe(0.0);
      expect(preset.transparent).toBe(true);
      expect(preset.opacity).toBe(0.8);
      expect(preset.transmission).toBe(0.9);
    });

    it('has correct metal preset', () => {
      const preset = materialLibrary.defaultPresets.metal;
      expect(preset.color).toBe(0xc0c0c0);
      expect(preset.roughness).toBe(0.2);
      expect(preset.metalness).toBe(1.0);
    });

    it('has correct plastic preset', () => {
      const preset = materialLibrary.defaultPresets.plastic;
      expect(preset.color).toBe(0x4169e1);
      expect(preset.roughness).toBe(0.5);
      expect(preset.metalness).toBe(0.0);
    });

    it('has correct brick preset', () => {
      const preset = materialLibrary.defaultPresets.brick;
      expect(preset.color).toBe(0x8b4513);
      expect(preset.roughness).toBe(0.9);
      expect(preset.metalness).toBe(0.1);
    });

    it('has correct drywall preset', () => {
      const preset = materialLibrary.defaultPresets.drywall;
      expect(preset.color).toBe(0xf5f5f5);
      expect(preset.roughness).toBe(0.95);
      expect(preset.metalness).toBe(0.0);
    });
  });

  describe('texture loading', () => {
    it('handles texture loading callback', () => {
      const onLoad = jest.fn();
      const onProgress = jest.fn();
      const onError = jest.fn();

      materialLibrary.getTexture('test.jpg', onLoad, onProgress, onError);

      // TextureLoader mock should call onLoad
      expect(onLoad).toHaveBeenCalled();
    });

    it('sets correct texture wrapping', () => {
      const texture = materialLibrary.getTexture('test.jpg');

      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    });
  });
});
