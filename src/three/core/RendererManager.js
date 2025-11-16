import * as THREE from 'three';

/**
 * RendererManager - Manages WebGL renderer instances
 *
 * Provides utilities for creating and managing renderers with consistent settings
 */
export class RendererManager {
  constructor() {
    this.renderers = new Map();
  }

  /**
   * Create a new renderer with default settings
   * @param {string} id - Unique identifier for the renderer
   * @param {Object} options - Renderer options
   */
  createRenderer(id, options = {}) {
    const {
      antialias = true,
      alpha = true,
      clearColor = '#f5f5f5',
      clearAlpha = 1,
      shadowMap = true,
      shadowMapType = THREE.PCFSoftShadowMap,
      pixelRatio = window.devicePixelRatio,
    } = options;

    const renderer = new THREE.WebGLRenderer({ antialias, alpha });
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(clearColor, clearAlpha);

    if (shadowMap) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = shadowMapType;
    }

    this.renderers.set(id, renderer);
    return renderer;
  }

  /**
   * Get a renderer by ID
   * @param {string} id - Renderer identifier
   */
  getRenderer(id) {
    return this.renderers.get(id);
  }

  /**
   * Remove and dispose a renderer
   * @param {string} id - Renderer identifier
   */
  removeRenderer(id) {
    const renderer = this.renderers.get(id);
    if (renderer) {
      renderer.dispose();

      // Remove canvas from DOM if present
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }

      this.renderers.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Dispose all renderers
   */
  disposeAll() {
    this.renderers.forEach((renderer, id) => {
      this.removeRenderer(id);
    });
  }
}

// Singleton instance
let sharedRendererManager = null;

/**
 * Get or create the shared renderer manager instance
 */
export function getSharedRendererManager() {
  if (!sharedRendererManager) {
    sharedRendererManager = new RendererManager();
  }
  return sharedRendererManager;
}

export default RendererManager;
