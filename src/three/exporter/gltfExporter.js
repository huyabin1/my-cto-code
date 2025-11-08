/**
 * GLTF Exporter
 * Handles exporting Three.js scenes to glTF format
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three-stdlib';

/**
 * Exports a Three.js scene to glTF format
 * @param {THREE.Scene} scene - Three.js scene to export
 * @param {Object} options - Export options
 * @returns {Promise<Blob>} Exported glTF data as blob
 */
export async function exportToGLTF(scene, options = {}) {
  const exporter = new GLTFExporter();

  const exportOptions = {
    binary: options.binary || false, // .glb if true, .gltf + assets if false
    embedImages: options.embedImages !== false, // Default to true
    animations: options.animations || false,
    truncateDrawRange: options.truncateDrawRange !== false, // Default to true
    onlyVisible: options.onlyVisible !== false, // Default to true
    maxTextureSize: options.maxTextureSize || 1024,
    includeCustomExtensions: options.includeCustomExtensions || false,
    ...options.gltfOptions,
  };

  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        try {
          let blob;

          if (exportOptions.binary) {
            // GLB format
            blob = new Blob([result], { type: 'application/octet-stream' });
          } else {
            // glTF format
            const output = JSON.stringify(result, null, 2);
            blob = new Blob([output], { type: 'application/json' });
          }

          resolve({
            blob,
            filename: generateFilename('glb', exportOptions.binary),
            format: exportOptions.binary ? 'glb' : 'gltf',
            size: blob.size,
          });
        } catch (error) {
          reject(new Error(`Failed to create glTF blob: ${error.message}`));
        }
      },
      (error) => {
        reject(new Error(`GLTF export failed: ${error.message}`));
      },
      exportOptions
    );
  });
}

/**
 * Exports specific objects from a scene to glTF
 * @param {Array<THREE.Object3D>} objects - Objects to export
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export result
 */
export async function exportObjectsToGLTF(objects, options = {}) {
  // Create a temporary scene for export
  const tempScene = new THREE.Scene();

  // Clone and add objects to temporary scene
  objects.forEach((obj) => {
    const clonedObj = obj.clone(true);
    tempScene.add(clonedObj);
  });

  try {
    const result = await exportToGLTF(tempScene, options);

    // Clean up temporary scene
    tempScene.clear();

    return result;
  } catch (error) {
    // Clean up on error
    tempScene.clear();
    throw error;
  }
}

/**
 * Exports only wall entities from a scene
 * @param {THREE.Scene} scene - Three.js scene
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export result
 */
export async function exportWallsToGLTF(scene, options = {}) {
  const walls = [];

  scene.traverse((child) => {
    if (child.userData.type === 'wall') {
      walls.push(child);
    }
  });

  if (walls.length === 0) {
    throw new Error('No wall entities found in scene');
  }

  return exportObjectsToGLTF(walls, {
    ...options,
    filename: 'walls',
  });
}

/**
 * Downloads glTF file to user's computer
 * @param {Object} exportResult - Result from exportToGLTF
 * @param {string} customFilename - Optional custom filename
 */
export function downloadGLTF(exportResult, customFilename = null) {
  const filename = customFilename || exportResult.filename;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(exportResult.blob);
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up object URL
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
  }, 1000);
}

/**
 * Generates a filename for export
 * @param {string} extension - File extension
 * @param {boolean} binary - Whether it's a binary format
 * @returns {string} Generated filename
 */
function generateFilename(extension, binary = false) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext = binary ? 'glb' : extension;
  return `project-export-${timestamp}.${ext}`;
}

/**
 * Validates scene for glTF export
 * @param {THREE.Scene} scene - Scene to validate
 * @returns {Object} Validation result
 */
export function validateSceneForGLTF(scene) {
  const issues = [];
  const warnings = [];

  if (!scene) {
    issues.push('Scene is null or undefined');
    return { valid: false, issues, warnings };
  }

  // Check for unsupported geometry types
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) {
      if (!child.geometry.attributes.position) {
        issues.push(`Mesh "${child.name || 'unnamed'}" has no position attribute`);
      }

      if (child.geometry.index === null && child.geometry.attributes.position.count % 3 !== 0) {
        warnings.push(
          `Mesh "${
            child.name || 'unnamed'
          }" has non-indexed geometry with vertex count not divisible by 3`
        );
      }
    }

    // Check for materials
    if (child.isMesh && !child.material) {
      warnings.push(`Mesh "${child.name || 'unnamed'}" has no material`);
    }
  });

  // Check for duplicate material names (can cause issues in some exporters)
  const materialNames = new Set();
  scene.traverse((child) => {
    if (child.isMesh && child.material && child.material.name) {
      if (materialNames.has(child.material.name)) {
        warnings.push(`Duplicate material name: "${child.material.name}"`);
      } else {
        materialNames.add(child.material.name);
      }
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Prepares scene for export by optimizing and cleaning up
 * @param {THREE.Scene} scene - Scene to prepare
 * @param {Object} options - Preparation options
 * @returns {THREE.Scene} Prepared scene
 */
export function prepareSceneForExport(scene, options = {}) {
  const preparedScene = scene.clone();

  // Remove helper objects and non-exportable items
  const objectsToRemove = [];

  preparedScene.traverse((child) => {
    // Remove helper objects
    if (child.isHelper || child.userData.isHelper) {
      objectsToRemove.push(child);
    }

    // Remove measurement tools
    if (child.userData.type === 'measurement' && !options.includeMeasurements) {
      objectsToRemove.push(child);
    }

    // Remove grid helpers
    if (child.isGridHelper) {
      objectsToRemove.push(child);
    }

    // Remove invisible objects unless explicitly included
    if (!child.visible && !options.includeInvisible) {
      objectsToRemove.push(child);
    }
  });

  // Remove marked objects
  objectsToRemove.forEach((obj) => {
    obj.parent?.remove(obj);
  });

  // Optimize geometries if requested
  if (options.optimizeGeometries) {
    preparedScene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry.computeBoundingBox();
        child.geometry.computeBoundingSphere();
      }
    });
  }

  return preparedScene;
}
