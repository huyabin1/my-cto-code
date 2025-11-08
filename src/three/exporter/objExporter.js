/**
 * OBJ Exporter
 * Handles exporting Three.js scenes to OBJ format
 */

import * as THREE from 'three';
import { OBJExporter } from 'three-stdlib';

/**
 * Exports a Three.js scene to OBJ format
 * @param {THREE.Scene} scene - Three.js scene to export
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export result
 */
export async function exportToOBJ(scene, options = {}) {
  const exporter = new OBJExporter();

  try {
    // Prepare scene for export
    const preparedScene = prepareSceneForExport(scene, options);

    // Export to OBJ string
    const objString = exporter.parse(preparedScene);

    // Create blob
    const blob = new Blob([objString], { type: 'text/plain' });

    // Export materials if requested
    let mtlBlob = null;
    let mtlString = null;

    if (options.includeMaterials) {
      mtlString = exportMaterials(preparedScene);
      if (mtlString) {
        mtlBlob = new Blob([mtlString], { type: 'text/plain' });
      }
    }

    return {
      objBlob: blob,
      mtlBlob,
      objFilename: generateFilename('obj'),
      mtlFilename: mtlString ? generateFilename('mtl') : null,
      objSize: blob.size,
      mtlSize: mtlBlob ? mtlBlob.size : 0,
      format: 'obj',
      hasMaterials: !!mtlString,
    };
  } catch (error) {
    throw new Error(`OBJ export failed: ${error.message}`);
  }
}

/**
 * Exports specific objects from a scene to OBJ
 * @param {Array<THREE.Object3D>} objects - Objects to export
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export result
 */
export async function exportObjectsToOBJ(objects, options = {}) {
  // Create a temporary scene for export
  const tempScene = new THREE.Scene();

  // Clone and add objects to temporary scene
  objects.forEach((obj) => {
    const clonedObj = obj.clone(true);
    tempScene.add(clonedObj);
  });

  try {
    const result = await exportToOBJ(tempScene, options);

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
export async function exportWallsToOBJ(scene, options = {}) {
  const walls = [];

  scene.traverse((child) => {
    if (child.userData.type === 'wall') {
      walls.push(child);
    }
  });

  if (walls.length === 0) {
    throw new Error('No wall entities found in scene');
  }

  return exportObjectsToOBJ(walls, {
    ...options,
    filename: 'walls',
  });
}

/**
 * Exports materials from scene to MTL format
 * @param {THREE.Scene} scene - Scene to export materials from
 * @returns {string|null} MTL string or null if no materials
 */
function exportMaterials(scene) {
  const materials = new Map();

  // Collect all unique materials
  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      const { material } = child;
      if (!materials.has(material.uuid)) {
        materials.set(material.uuid, material);
      }
    }
  });

  if (materials.size === 0) {
    return null;
  }

  let mtlString = '# Materials exported from Three.js scene\n';
  mtlString += `# Generated on ${new Date().toISOString()}\n\n`;

  materials.forEach((material, uuid) => {
    const materialName = material.name || `material_${uuid.substring(0, 8)}`;

    mtlString += `newmtl ${materialName}\n`;

    // Basic material properties
    if (material.color) {
      mtlString += `Kd ${material.color.r} ${material.color.g} ${material.color.b}\n`;
    }

    if (material.emissive) {
      mtlString += `Ke ${material.emissive.r} ${material.emissive.g} ${material.emissive.b}\n`;
    }

    // Specular properties
    if (material.specular) {
      mtlString += `Ks ${material.specular.r} ${material.specular.g} ${material.specular.b}\n`;
    }

    if (material.shininess !== undefined) {
      mtlString += `Ns ${material.shininess}\n`;
    }

    // Opacity
    if (material.opacity !== undefined && material.opacity < 1) {
      mtlString += `d ${material.opacity}\n`;
      if (material.transparent) {
        mtlString += `Tr ${1 - material.opacity}\n`;
      }
    }

    // Illumination model
    let illum = 2; // Default to phong
    if (material.type === 'MeshBasicMaterial') {
      illum = 0;
    } else if (material.type === 'MeshLambertMaterial') {
      illum = 1;
    } else if (material.type === 'MeshPhongMaterial') {
      illum = 2;
    } else if (material.type === 'MeshStandardMaterial') {
      illum = 2; // Approximate as phong
    }
    mtlString += `illum ${illum}\n`;

    // Texture maps (basic support)
    if (material.map) {
      mtlString += `map_Kd ${material.map.name || 'texture.png'}\n`;
    }

    mtlString += '\n';
  });

  return mtlString;
}

/**
 * Downloads OBJ file(s) to user's computer
 * @param {Object} exportResult - Result from exportToOBJ
 * @param {string} customFilename - Optional custom filename
 */
export function downloadOBJ(exportResult, customFilename = null) {
  const objFilename = customFilename || exportResult.objFilename;

  // Download OBJ file
  const objLink = document.createElement('a');
  objLink.href = URL.createObjectURL(exportResult.objBlob);
  objLink.download = objFilename;
  objLink.style.display = 'none';

  document.body.appendChild(objLink);
  objLink.click();
  document.body.removeChild(objLink);

  // Download MTL file if it exists
  if (exportResult.mtlBlob && exportResult.mtlFilename) {
    setTimeout(() => {
      const mtlLink = document.createElement('a');
      mtlLink.href = URL.createObjectURL(exportResult.mtlBlob);
      mtlLink.download = exportResult.mtlFilename;
      mtlLink.style.display = 'none';

      document.body.appendChild(mtlLink);
      mtlLink.click();
      document.body.removeChild(mtlLink);

      URL.revokeObjectURL(mtlLink.href);
    }, 500);
  }

  // Clean up object URL
  setTimeout(() => {
    URL.revokeObjectURL(objLink.href);
  }, 1000);
}

/**
 * Generates a filename for export
 * @param {string} extension - File extension
 * @returns {string} Generated filename
 */
function generateFilename(extension) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `project-export-${timestamp}.${extension}`;
}

/**
 * Prepares scene for export by optimizing and cleaning up
 * @param {THREE.Scene} scene - Scene to prepare
 * @param {Object} options - Preparation options
 * @returns {THREE.Scene} Prepared scene
 */
function prepareSceneForExport(scene, options = {}) {
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

    // Convert materials to basic types if needed
    if (child.isMesh && child.material) {
      const { material } = child;

      // Convert complex materials to simpler ones for OBJ compatibility
      if (material.type === 'MeshStandardMaterial' || material.type === 'MeshPhysicalMaterial') {
        const basicMaterial = new THREE.MeshPhongMaterial({
          color: material.color,
          emissive: material.emissive,
          shininess: material.roughness ? 1 / material.roughness : 30,
          transparent: material.transparent,
          opacity: material.opacity,
          name: material.name,
        });
        child.material = basicMaterial;
      }
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

/**
 * Validates scene for OBJ export
 * @param {THREE.Scene} scene - Scene to validate
 * @returns {Object} Validation result
 */
export function validateSceneForOBJ(scene) {
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

      // OBJ requires face normals or vertex normals
      if (!child.geometry.attributes.normal && !child.geometry.index) {
        warnings.push(`Mesh "${child.name || 'unnamed'}" has no normals - they will be generated`);
      }
    }

    // Check for materials
    if (child.isMesh && !child.material) {
      warnings.push(
        `Mesh "${child.name || 'unnamed'}" has no material - default material will be used`
      );
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}
