import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

/**
 * Material Presets for Wall Factory
 * Each preset defines default PBR parameters for common wall materials
 */
const MATERIAL_PRESETS = {
  concrete: {
    color: 0xcccccc,
    roughness: 0.9,
    metalness: 0.0,
  },
  wood: {
    color: 0x8b6f47,
    roughness: 0.8,
    metalness: 0.0,
  },
  glass: {
    color: 0xaaddff,
    roughness: 0.1,
    metalness: 0.5,
  },
};

/**
 * WallFactory - Parametric wall factory for Three.js
 *
 * Creates a parametric wall mesh from start/end points with configurable dimensions
 * and material presets. Returns a THREE.Group containing the wall mesh with utility
 * methods for runtime updates and bounding box queries.
 *
 * @param {Object} config - Wall configuration
 * @param {THREE.Vector3} config.start - Start point of wall (default: {x:0, y:0, z:0})
 * @param {THREE.Vector3} config.end - End point of wall (default: {x:1, y:0, z:0})
 * @param {number} config.height - Wall height in meters (default: 2.8)
 * @param {number} config.thickness - Wall thickness in meters (default: 0.2)
 * @param {string} config.material - Material preset name: 'concrete', 'wood', 'glass' (default: 'concrete')
 * @param {number} config.color - Override color for material (optional, hex value)
 * @param {number} config.roughness - Override roughness (optional, 0-1)
 * @param {number} config.metalness - Override metalness (optional, 0-1)
 *
 * @returns {THREE.Group} Group containing wall mesh with update() and getBoundingBox() methods
 *
 * @example
 * const wall = WallFactory({
 *   start: new THREE.Vector3(0, 0, 0),
 *   end: new THREE.Vector3(5, 0, 0),
 *   height: 3.0,
 *   material: 'wood'
 * });
 * scene.add(wall);
 *
 * // Update wall dynamically
 * wall.update({ height: 4.0, material: 'concrete' });
 *
 * // Get bounding box
 * const bbox = wall.getBoundingBox();
 */
export function WallFactory(config = {}) {
  // Initialize configuration with defaults
  const defaultConfig = {
    start: new THREE.Vector3(0, 0, 0),
    end: new THREE.Vector3(1, 0, 0),
    height: 2.8,
    thickness: 0.2,
    material: 'concrete',
  };

  // Merge user config with defaults
  let currentConfig = { ...defaultConfig, ...config };

  // Generate unique ID for this wall
  const wallId = uuidv4();

  // Create the group that will hold the wall mesh
  const group = new THREE.Group();

  // Store metadata in userData
  group.userData = {
    type: 'wall',
    id: wallId,
    config: { ...currentConfig },
  };

  // Internal mesh reference
  let wallMesh = null;

  /**
   * Computes geometry from start/end points with proper orientation and UVs
   * @private
   */
  function createGeometry() {
    const { start, end, height, thickness } = currentConfig;

    // Calculate wall direction and length
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    // Create box geometry centered at origin
    const geometry = new THREE.BoxGeometry(length, height, thickness);

    // Compute UV mapping to repeat every meter
    const uvAttribute = geometry.attributes.uv;
    const posAttribute = geometry.attributes.position;

    for (let i = 0; i < uvAttribute.count; i += 1) {
      const y = posAttribute.getY(i);

      // Determine which face this vertex belongs to and scale UVs
      // Box geometry has vertices arranged in a specific pattern
      // We need to map based on the actual dimension
      const u = uvAttribute.getX(i);
      const v = uvAttribute.getY(i);

      // For box geometry, we scale UVs based on the physical dimensions
      // Front/back faces use length and height
      // Top/bottom faces use length and thickness
      // Left/right faces use thickness and height

      // Get the face normal direction to determine which face we're on
      const absY = Math.abs(y);
      const absZ = Math.abs(Math.abs(posAttribute.getZ(i)) - thickness / 2);

      if (absZ < 0.001) {
        // Front or back face (uses length x height)
        uvAttribute.setXY(i, u * length, v * height);
      } else if (absY > height / 2 - 0.001) {
        // Top or bottom face (uses length x thickness)
        uvAttribute.setXY(i, u * length, v * thickness);
      } else {
        // Left or right face (uses thickness x height)
        uvAttribute.setXY(i, u * thickness, v * height);
      }
    }

    uvAttribute.needsUpdate = true;

    // Ensure normals are computed correctly
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Creates material from preset or custom parameters
   * @private
   */
  function createMaterial() {
    const { material: presetName, color, roughness, metalness } = currentConfig;

    // Get preset defaults
    const preset = MATERIAL_PRESETS[presetName] || MATERIAL_PRESETS.concrete;

    // Create material with overrides
    return new THREE.MeshStandardMaterial({
      color: color !== undefined ? color : preset.color,
      roughness: roughness !== undefined ? roughness : preset.roughness,
      metalness: metalness !== undefined ? metalness : preset.metalness,
    });
  }

  /**
   * Positions and orients the mesh along the start-end segment
   * @private
   */
  function positionMesh() {
    if (!wallMesh) return;

    const { start, end, height } = currentConfig;

    // Calculate midpoint between start and end
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Position mesh at midpoint, raised by half height
    wallMesh.position.copy(midpoint);
    wallMesh.position.y += height / 2;

    // Calculate rotation to align with direction
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const angle = Math.atan2(direction.z, direction.x);

    // Rotate around Y axis to align with direction
    wallMesh.rotation.y = angle;
  }

  /**
   * Builds or rebuilds the wall mesh
   * @private
   */
  function buildMesh() {
    // Remove existing mesh if present
    if (wallMesh) {
      group.remove(wallMesh);
      if (wallMesh.geometry) wallMesh.geometry.dispose();
      if (wallMesh.material) wallMesh.material.dispose();
    }

    // Create new geometry and material
    const geometry = createGeometry();
    const material = createMaterial();

    // Create mesh
    wallMesh = new THREE.Mesh(geometry, material);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    // Position and orient the mesh
    positionMesh();

    // Add to group
    group.add(wallMesh);
  }

  /**
   * Updates wall configuration and rebuilds geometry/material
   * Preserves the same group object reference
   *
   * @param {Object} newConfig - Partial configuration to merge with current config
   */
  group.update = function update(newConfig) {
    // Merge new config with current
    currentConfig = { ...currentConfig, ...newConfig };

    // Update userData
    group.userData.config = { ...currentConfig };

    // Rebuild mesh
    buildMesh();
  };

  /**
   * Returns axis-aligned bounding box in world space
   *
   * @returns {THREE.Box3} Bounding box containing the wall mesh
   */
  group.getBoundingBox = function getBoundingBox() {
    const box = new THREE.Box3();

    if (wallMesh) {
      // Update world matrix to ensure accurate bounds
      group.updateMatrixWorld(true);

      // Compute bounding box in world space
      box.setFromObject(wallMesh);
    }

    return box;
  };

  // Initial build
  buildMesh();

  return group;
}

export default WallFactory;
