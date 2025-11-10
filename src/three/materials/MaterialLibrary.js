import * as THREE from 'three';

/**
 * MaterialLibrary - 管理PBR材质和贴图资源
 */
class MaterialLibrary {
  constructor() {
    this.materials = new Map();
    this.textures = new Map();
    this.defaultPresets = {
      concrete: {
        color: 0x888888,
        roughness: 0.8,
        metalness: 0.2,
        normalScale: new THREE.Vector2(1, 1),
      },
      brick: {
        color: 0x8b4513,
        roughness: 0.9,
        metalness: 0.1,
        normalScale: new THREE.Vector2(1, 1),
      },
      drywall: {
        color: 0xf5f5f5,
        roughness: 0.95,
        metalness: 0.0,
        normalScale: new THREE.Vector2(0.5, 0.5),
      },
      wood: {
        color: 0x8b4513,
        roughness: 0.9,
        metalness: 0.1,
        normalScale: new THREE.Vector2(2, 2),
      },
      glass: {
        color: 0x87ceeb,
        roughness: 0.1,
        metalness: 0.0,
        transparent: true,
        opacity: 0.8,
        transmission: 0.9,
      },
      metal: {
        color: 0xc0c0c0,
        roughness: 0.2,
        metalness: 1.0,
      },
      plastic: {
        color: 0x4169e1,
        roughness: 0.5,
        metalness: 0.0,
      },
    };
  }

  /**
   * 创建或获取材质
   * @param {string} type - 材质类型
   * @param {Object} options - 材质选项
   * @returns {THREE.MeshStandardMaterial} 材质实例
   */
  getMaterial(type, options = {}) {
    const key = this.getMaterialKey(type, options);

    if (this.materials.has(key)) {
      return this.materials.get(key);
    }

    const material = this.createMaterial(type, options);
    this.materials.set(key, material);
    return material;
  }

  /**
   * 创建新材质
   * @param {string} type - 材质类型
   * @param {Object} options - 材质选项
   * @returns {THREE.MeshStandardMaterial} 材质实例
   */
  createMaterial(type, options = {}) {
    const preset = this.defaultPresets[type] || this.defaultPresets.concrete;
    const config = { ...preset, ...options };

    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: config.roughness,
      metalness: config.metalness,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      transmission: config.transmission || 0.0,
    });

    // 添加贴图支持
    if (config.map) {
      material.map = this.getTexture(config.map);
    }
    if (config.normalMap) {
      material.normalMap = this.getTexture(config.normalMap);
      material.normalScale = config.normalScale;
    }
    if (config.roughnessMap) {
      material.roughnessMap = this.getTexture(config.roughnessMap);
    }
    if (config.metalnessMap) {
      material.metalnessMap = this.getTexture(config.metalnessMap);
    }
    if (config.aoMap) {
      material.aoMap = this.getTexture(config.aoMap);
    }

    material.userData = {
      type,
      config,
    };

    return material;
  }

  /**
   * 获取或创建贴图
   * @param {string|THREE.Texture} texture - 贴图路径或实例
   * @returns {THREE.Texture} 贴图实例
   */
  getTexture(texture) {
    if (texture instanceof THREE.Texture) {
      return texture;
    }

    if (typeof texture === 'string') {
      if (this.textures.has(texture)) {
        return this.textures.get(texture);
      }

      const loader = new THREE.TextureLoader();
      const tex = loader.load(texture);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;

      this.textures.set(texture, tex);
      return tex;
    }

    return null;
  }

  /**
   * 生成材质键值
   * @param {string} type - 材质类型
   * @param {Object} options - 材质选项
   * @returns {string} 材质键值
   */
  getMaterialKey(type, options) {
    const config = { ...this.defaultPresets[type], ...options };
    const keys = Object.keys(config).sort();
    const keyParts = keys.map((key) => `${key}:${config[key]}`);
    return `${type}-${keyParts.join('-')}`;
  }

  /**
   * 释放材质资源
   * @param {string|THREE.Material} material - 材质或键值
   */
  disposeMaterial(material) {
    let materialToDispose;

    if (typeof material === 'string') {
      materialToDispose = this.materials.get(material);
      if (materialToDispose) {
        this.materials.delete(material);
      }
    } else {
      materialToDispose = material;
      // Find and remove from materials map
      for (const [key, mat] of this.materials.entries()) {
        if (mat === materialToDispose) {
          this.materials.delete(key);
          break;
        }
      }
    }

    if (materialToDispose) {
      materialToDispose.dispose();
    }
  }

  /**
   * 释放贴图资源
   * @param {string|THREE.Texture} texture - 贴图路径或实例
   */
  disposeTexture(texture) {
    let textureToDispose;

    if (typeof texture === 'string') {
      textureToDispose = this.textures.get(texture);
      if (textureToDispose) {
        this.textures.delete(texture);
      }
    } else {
      textureToDispose = texture;
      // Find and remove from textures map
      for (const [key, tex] of this.textures.entries()) {
        if (tex === textureToDispose) {
          this.textures.delete(key);
          break;
        }
      }
    }

    if (textureToDispose) {
      textureToDispose.dispose();
    }
  }

  /**
   * 释放所有资源
   */
  dispose() {
    // Dispose all materials
    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();

    // Dispose all textures
    for (const texture of this.textures.values()) {
      texture.dispose();
    }
    this.textures.clear();
  }

  /**
   * 获取可用的材质类型列表
   * @returns {Array<string>} 材质类型列表
   */
  getAvailableMaterialTypes() {
    return Object.keys(this.defaultPresets);
  }

  /**
   * 获取材质预设
   * @param {string} type - 材质类型
   * @returns {Object} 材质预设
   */
  getMaterialPreset(type) {
    return this.defaultPresets[type];
  }

  /**
   * 添加自定义材质预设
   * @param {string} type - 材质类型
   * @param {Object} preset - 材质预设
   */
  addMaterialPreset(type, preset) {
    this.defaultPresets[type] = { ...preset };
  }

  /**
   * 获取材质统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      materialsCount: this.materials.size,
      texturesCount: this.textures.size,
      availableTypes: this.getAvailableMaterialTypes(),
    };
  }
}

// 创建全局实例
const materialLibrary = new MaterialLibrary();

export default materialLibrary;
