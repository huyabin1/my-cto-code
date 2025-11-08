/**
 * Project Serializer Utility
 * Handles serialization and deserialization of project data
 */

import * as THREE from 'three';

const PROJECT_VERSION = '1.0.0';

/**
 * Generates a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
  return `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Checks version compatibility
 * @param {string} projectVersion - Project version
 * @returns {boolean} Whether versions are compatible
 */
function isVersionCompatible(projectVersion) {
  const currentParts = PROJECT_VERSION.split('.').map(Number);
  const projectParts = projectVersion.split('.').map(Number);
  
  // Major version must match
  return currentParts[0] === projectParts[0];
}

/**
 * Extracts geometry parameters from Three.js geometry
 * @param {THREE.BufferGeometry} geometry - Geometry object
 * @returns {Object} Geometry parameters
 */
function extractGeometryParameters(geometry) {
  if (!geometry) return {};
  
  const params = {};
  
  if (geometry.type === 'BoxGeometry') {
    if (geometry.attributes && geometry.attributes.position) {
      const box = new THREE.Box3().setFromAttribute(geometry.attributes.position);
      const size = box.getSize(new THREE.Vector3());
      params.width = size.x;
      params.height = size.y;
      params.depth = size.z;
    } else {
      // Fallback to default parameters
      params.width = 1;
      params.height = 1;
      params.depth = 1;
    }
  }
  
  return params;
}

/**
 * Serializes a wall entity
 * @param {THREE.Object3D} wall - Wall object
 * @returns {Object} Serialized wall data
 */
function serializeWall(wall) {
  return {
    id: wall.userData.id || generateId(),
    type: 'wall',
    name: wall.userData.name || 'Wall',
    material: wall.userData.material || 'concrete',
    color: wall.userData.color || '#ffffff',
    position: wall.position.toArray(),
    rotation: wall.rotation.toArray(),
    scale: wall.scale.toArray(),
    geometry: {
      type: wall.geometry?.type || 'BoxGeometry',
      parameters: extractGeometryParameters(wall.geometry),
    },
  };
}

/**
 * Serializes a measurement entity
 * @param {THREE.Object3D} measurement - Measurement object
 * @returns {Object} Serialized measurement data
 */
function serializeMeasurement(measurement) {
  return {
    id: measurement.userData.id || generateId(),
    type: 'measurement',
    name: measurement.userData.name || 'Measurement',
    measurementType: measurement.userData.measurementType || 'distance',
    points: measurement.userData.points || [],
    result: measurement.userData.result || 0,
    unit: measurement.userData.unit || 'mm',
    position: measurement.position.toArray(),
    rotation: measurement.rotation.toArray(),
    scale: measurement.scale.toArray(),
  };
}

/**
 * Serializes entities from Three.js scene
 * @param {THREE.Scene} scene - Three.js scene object
 * @returns {Array} Serialized entities
 */
function serializeEntities(scene) {
  const entities = [];
  
  if (!scene || !scene.children) {
    return entities;
  }

  scene.children.forEach((child) => {
    if (child.userData.type === 'wall') {
      entities.push(serializeWall(child));
    } else if (child.userData.type === 'measurement') {
      entities.push(serializeMeasurement(child));
    }
    // Add more entity types as needed
  });

  return entities;
}

/**
 * Creates a project JSON schema from current state
 * @param {Object} state - Vuex store state
 * @returns {Object} Project data object
 */
export function serializeProject(state) {
  const projectData = {
    version: PROJECT_VERSION,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: 'Untitled Project',
    },
    scene: {
      viewport: {
        camera: {
          position: state.camera?.position?.toArray() || [20, 20, 20],
          target: state.camera?.target?.toArray() || [0, 0, 0],
          up: state.camera?.up?.toArray() || [0, 1, 0],
        },
        controls: {
          target: state.controls?.target?.toArray() || [0, 0, 0],
          autoRotate: state.controls?.autoRotate || false,
          autoRotateSpeed: state.controls?.autoRotateSpeed || 2.0,
        },
      },
      entities: serializeEntities(state.scene),
    },
    editor: {
      drawWallToolEnabled: state.editor?.drawWallToolEnabled || false,
      snapping: state.editor?.snapping || {},
      materials: state.editor?.materials || [],
      activeSelection: state.editor?.activeSelection || {},
      activeTool: state.editor?.activeTool || null,
      measurements: state.editor?.measurements || [],
      measurementResultsVisible: state.editor?.measurementResultsVisible || false,
      commandStackInfo: state.editor?.commandStackInfo || {},
    },
    cad: {
      layers: state.cad?.layers || [],
      opacity: state.cad?.opacity || 0.75,
      importStatus: state.cad?.importStatus || 'idle',
      lastImportedFile: state.cad?.lastImportedFile || '',
      selectedUnit: state.cad?.selectedUnit || 'auto',
    },
  };

  return projectData;
}

/**
 * Deserializes project data and returns state updates
 * @param {Object} projectData - Serialized project data
 * @returns {Object} Deserialized state updates
 */
export function deserializeProject(projectData) {
  if (!projectData || !projectData.version) {
    throw new Error('Invalid project data format');
  }

  // Version compatibility check
  if (!isVersionCompatible(projectData.version)) {
    // eslint-disable-next-line no-console
    console.warn(`Project version ${projectData.version} may not be fully compatible with current version ${PROJECT_VERSION}`);
  }

  const stateUpdates = {
    editor: projectData.editor || {},
    cad: projectData.cad || {},
  };

  // Camera and viewport will be handled separately by the scene component
  stateUpdates.viewport = projectData.scene?.viewport;
  stateUpdates.entities = projectData.scene?.entities || [];

  return stateUpdates;
}

/**
 * Migrates project data from older versions
 * @param {Object} projectData - Project data
 * @param {string} fromVersion - Source version
 * @param {string} toVersion - Target version
 * @returns {Object} Migrated project data
 */
export function migrateProject(projectData, fromVersion, toVersion = PROJECT_VERSION) {
  let migratedData = { ...projectData };
  
  // Add migration logic here as versions evolve
  // Example: if (fromVersion === '0.9.0' && toVersion === '1.0.0') { ... }
  
  migratedData.version = toVersion;
  migratedData.metadata = {
    ...migratedData.metadata,
    updatedAt: new Date().toISOString(),
    migratedFrom: fromVersion,
  };
  
  return migratedData;
}

/**
 * Validates project data structure
 * @param {Object} projectData - Project data to validate
 * @returns {Object} Validation result
 */
export function validateProject(projectData) {
  const errors = [];
  const warnings = [];

  if (!projectData) {
    errors.push('Project data is null or undefined');
    return { valid: false, errors, warnings };
  }

  if (!projectData.version) {
    errors.push('Missing project version');
  }

  if (!projectData.scene) {
    warnings.push('Missing scene data');
  }

  if (!projectData.editor) {
    warnings.push('Missing editor data');
  }

  if (!projectData.cad) {
    warnings.push('Missing CAD data');
  }

  // Validate entities
  if (projectData.scene?.entities) {
    projectData.scene.entities.forEach((entity, index) => {
      if (!entity.id) {
        errors.push(`Entity at index ${index} is missing ID`);
      }
      if (!entity.type) {
        errors.push(`Entity at index ${index} is missing type`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}