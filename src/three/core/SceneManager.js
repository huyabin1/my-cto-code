/**
 * SceneManager - Core Three.js scene management utilities
 *
 * This file serves as a placeholder for future core scene management functionality
 * that may be extracted from the ThreeScene component for better reusability.
 */

export class SceneManager {
  constructor() {
    this.scenes = new Map();
  }

  createScene(name) {
    const scene = new THREE.Scene();
    this.scenes.set(name, scene);
    return scene;
  }

  getScene(name) {
    return this.scenes.get(name);
  }

  removeScene(name) {
    this.scenes.delete(name);
  }

  getAllScenes() {
    return Array.from(this.scenes.values());
  }
}
