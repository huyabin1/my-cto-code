import * as THREE from 'three';

/**
 * CameraManager - Manages camera instances and properties
 *
 * Provides utilities for creating and managing cameras with consistent settings
 */
export class CameraManager {
  constructor() {
    this.cameras = new Map();
  }

  /**
   * Create a perspective camera with default settings
   * @param {string} id - Unique identifier for the camera
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {Object} options - Camera options
   */
  createPerspectiveCamera(id, width, height, options = {}) {
    const {
      fov = 75,
      near = 0.1,
      far = 1000,
      position = { x: 20, y: 20, z: 20 },
      lookAt = { x: 0, y: 0, z: 0 },
    } = options;

    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

    this.cameras.set(id, camera);
    return camera;
  }

  /**
   * Create an orthographic camera with default settings
   * @param {string} id - Unique identifier for the camera
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {Object} options - Camera options
   */
  createOrthographicCamera(id, width, height, options = {}) {
    const {
      near = 0.1,
      far = 1000,
      zoom = 1,
    } = options;

    const camera = new THREE.OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      near,
      far
    );
    
    camera.zoom = zoom;
    camera.updateProjectionMatrix();

    this.cameras.set(id, camera);
    return camera;
  }

  /**
   * Get a camera by ID
   * @param {string} id - Camera identifier
   */
  getCamera(id) {
    return this.cameras.get(id);
  }

  /**
   * Update camera aspect ratio (typically on window resize)
   * @param {string} id - Camera identifier
   * @param {number} width - New width
   * @param {number} height - New height
   */
  updateAspectRatio(id, width, height) {
    const camera = this.cameras.get(id);
    if (!camera) {
      return false;
    }

    if (camera.isPerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    } else if (camera.isOrthographicCamera) {
      camera.left = width / -2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = height / -2;
      camera.updateProjectionMatrix();
    }

    return true;
  }

  /**
   * Remove a camera
   * @param {string} id - Camera identifier
   */
  removeCamera(id) {
    return this.cameras.delete(id);
  }

  /**
   * Get all cameras
   */
  getAllCameras() {
    return Array.from(this.cameras.values());
  }

  /**
   * Dispose all cameras
   */
  disposeAll() {
    this.cameras.clear();
  }
}

// Singleton instance
let sharedCameraManager = null;

/**
 * Get or create the shared camera manager instance
 */
export function getSharedCameraManager() {
  if (!sharedCameraManager) {
    sharedCameraManager = new CameraManager();
  }
  return sharedCameraManager;
}

export default CameraManager;
