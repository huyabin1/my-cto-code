import * as THREE from 'three';

/**
 * Setup default lighting for a Three.js scene
 * @param {THREE.Scene} scene - The scene to add lights to
 * @param {Object} options - Lighting configuration options
 */
export function setupLighting(scene, options = {}) {
  const {
    ambientColor = 0x404040,
    ambientIntensity = 0.6,
    directionalColor = 0xffffff,
    directionalIntensity = 0.8,
    directionalPosition = { x: 10, y: 20, z: 10 },
    shadowMapSize = 2048,
    shadowCameraConfig = {
      near: 0.5,
      far: 50,
      left: -20,
      right: 20,
      top: 20,
      bottom: -20,
    },
  } = options;

  // Add ambient light for general illumination
  const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
  scene.add(ambientLight);

  // Add directional light for shadows and key lighting
  const directionalLight = new THREE.DirectionalLight(directionalColor, directionalIntensity);
  directionalLight.position.set(
    directionalPosition.x,
    directionalPosition.y,
    directionalPosition.z
  );

  // Configure shadow properties
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = shadowMapSize;
  directionalLight.shadow.mapSize.height = shadowMapSize;
  directionalLight.shadow.camera.near = shadowCameraConfig.near;
  directionalLight.shadow.camera.far = shadowCameraConfig.far;
  directionalLight.shadow.camera.left = shadowCameraConfig.left;
  directionalLight.shadow.camera.right = shadowCameraConfig.right;
  directionalLight.shadow.camera.top = shadowCameraConfig.top;
  directionalLight.shadow.camera.bottom = shadowCameraConfig.bottom;

  scene.add(directionalLight);

  return {
    ambientLight,
    directionalLight,
  };
}

/**
 * Create a light configuration object for easy serialization
 * @param {THREE.Light} ambientLight - The ambient light
 * @param {THREE.Light} directionalLight - The directional light
 */
export function getLightingConfig(ambientLight, directionalLight) {
  return {
    ambientColor: ambientLight.color.getHex(),
    ambientIntensity: ambientLight.intensity,
    directionalColor: directionalLight.color.getHex(),
    directionalIntensity: directionalLight.intensity,
    directionalPosition: {
      x: directionalLight.position.x,
      y: directionalLight.position.y,
      z: directionalLight.position.z,
    },
    shadowMapSize: directionalLight.shadow.mapSize.width,
    shadowCameraConfig: {
      near: directionalLight.shadow.camera.near,
      far: directionalLight.shadow.camera.far,
      left: directionalLight.shadow.camera.left,
      right: directionalLight.shadow.camera.right,
      top: directionalLight.shadow.camera.top,
      bottom: directionalLight.shadow.camera.bottom,
    },
  };
}

export default {
  setupLighting,
  getLightingConfig,
};
