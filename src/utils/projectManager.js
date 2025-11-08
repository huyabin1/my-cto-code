/**
 * Project Manager
 * Centralized project management including save, load, export, and auto-save
 */

/* eslint-disable */
import {
  serializeProject,
  deserializeProject,
  validateProject,
  migrateProject,
} from './projectSerializer';
import { createAutoSaveManager } from './autoSave';
import {
  exportToGLTF,
  exportWallsToGLTF,
  downloadGLTF,
  validateSceneForGLTF,
  prepareSceneForExport,
} from '../three/exporter/gltfExporter';
import {
  exportToOBJ,
  exportWallsToOBJ,
  downloadOBJ,
  validateSceneForOBJ,
} from '../three/exporter/objExporter';

class ProjectManager {
  constructor(store, threeScene) {
    this.store = store;
    this.threeScene = threeScene;
    this.autoSaveManager = createAutoSaveManager(store);
    this.currentProject = null;
    this.isDirty = false;
    this.lastSaveTime = null;
  }

  /**
   * Initializes the project manager
   */
  initialize() {
    // Start auto-save
    this.autoSaveManager.start();

    // Listen for state changes to track dirty state
    this.store.subscribe((mutation, state) => {
      this.markDirty();
    });

    // Try to restore from auto-save on startup
    this.tryRestoreFromAutoSave();
  }

  /**
   * Marks the project as dirty (unsaved changes)
   */
  markDirty() {
    this.isDirty = true;
  }

  /**
   * Marks the project as clean (no unsaved changes)
   */
  markClean() {
    this.isDirty = false;
  }

  /**
   * Saves the current project
   * @param {string} filename - Optional filename
   * @returns {Promise<Object>} Save result
   */
  async saveProject(filename = null) {
    try {
      const { state } = this.store;
      const projectData = serializeProject(state);

      // Add save metadata
      projectData.metadata.updatedAt = new Date().toISOString();
      projectData.metadata.name = filename || projectData.metadata.name;
      projectData.metadata.saveType = 'manual';

      // Validate project data
      const validation = validateProject(projectData);
      if (!validation.valid) {
        throw new Error(`Project validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('Project validation warnings:', validation.warnings);
      }

      // Create file for download
      const jsonString = JSON.stringify(projectData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Generate filename
      const saveFilename = filename || `project-${Date.now()}.json`;

      // Download file
      this.downloadFile(blob, saveFilename);

      // Update state
      this.currentProject = projectData;
      this.markClean();
      this.lastSaveTime = new Date();

      // Update store
      this.store.commit('editor/SET_PROJECT_INFO', {
        name: projectData.metadata.name,
        lastSaved: this.lastSaveTime,
        isDirty: false,
      });

      return {
        success: true,
        filename: saveFilename,
        size: blob.size,
        timestamp: this.lastSaveTime,
      };
    } catch (error) {
      throw new Error(`Save failed: ${error.message}`);
    }
  }

  /**
   * Loads a project from file
   * @param {File} file - Project file to load
   * @returns {Promise<Object>} Load result
   */
  async loadProject(file) {
    try {
      // Read file
      const text = await this.readFileAsText(file);
      const projectData = JSON.parse(text);

      // Validate project data
      const validation = validateProject(projectData);
      if (!validation.valid) {
        throw new Error(`Project validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('Project validation warnings:', validation.warnings);
      }

      // Check version compatibility and migrate if needed
      let finalProjectData = projectData;
      if (projectData.version !== '1.0.0') {
        finalProjectData = migrateProject(projectData, projectData.version);
      }

      // Deserialize project data
      const stateUpdates = deserializeProject(finalProjectData);

      // Apply state updates to store
      this.applyStateUpdates(stateUpdates);

      // Restore viewport if available
      if (stateUpdates.viewport) {
        this.restoreViewport(stateUpdates.viewport);
      }

      // Recreate entities in Three.js scene
      if (stateUpdates.entities) {
        await this.recreateEntities(stateUpdates.entities);
      }

      // Update state
      this.currentProject = finalProjectData;
      this.markClean();

      // Update store
      this.store.commit('editor/SET_PROJECT_INFO', {
        name: finalProjectData.metadata.name,
        lastLoaded: new Date(),
        isDirty: false,
      });

      return {
        success: true,
        filename: file.name,
        projectName: finalProjectData.metadata.name,
        version: finalProjectData.version,
        entityCount: stateUpdates.entities?.length || 0,
      };
    } catch (error) {
      throw new Error(`Load failed: ${error.message}`);
    }
  }

  /**
   * Exports project to glTF format
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportToGLTF(options = {}) {
    try {
      const { scene } = this.threeScene;

      // Validate scene
      const validation = validateSceneForGLTF(scene);
      if (!validation.valid) {
        throw new Error(`Scene validation failed: ${validation.issues.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('Scene validation warnings:', validation.warnings);
      }

      // Prepare scene for export
      const preparedScene = prepareSceneForExport(scene, options);

      // Export options
      const exportOptions = {
        binary: options.binary || false,
        includeMeasurements: options.includeMeasurements || false,
        onlyVisible: options.onlyVisible !== false,
        ...options,
      };

      let result;
      if (options.wallsOnly) {
        result = await exportWallsToGLTF(preparedScene, exportOptions);
      } else {
        result = await exportToGLTF(preparedScene, exportOptions);
      }

      // Download file
      const filename = options.filename || result.filename;
      downloadGLTF(result, filename);

      return {
        success: true,
        format: result.format,
        filename,
        size: result.size,
        entityCount: options.wallsOnly ? 'walls only' : 'all entities',
      };
    } catch (error) {
      throw new Error(`GLTF export failed: ${error.message}`);
    }
  }

  /**
   * Exports project to OBJ format
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportToOBJ(options = {}) {
    try {
      const { scene } = this.threeScene;

      // Validate scene
      const validation = validateSceneForOBJ(scene);
      if (!validation.valid) {
        throw new Error(`Scene validation failed: ${validation.issues.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('Scene validation warnings:', validation.warnings);
      }

      // Export options
      const exportOptions = {
        includeMaterials: options.includeMaterials !== false,
        includeMeasurements: options.includeMeasurements || false,
        onlyVisible: options.onlyVisible !== false,
        ...options,
      };

      let result;
      if (options.wallsOnly) {
        result = await exportWallsToOBJ(scene, exportOptions);
      } else {
        result = await exportToOBJ(scene, exportOptions);
      }

      // Download file(s)
      const filename = options.filename || result.objFilename;
      downloadOBJ(result, filename);

      return {
        success: true,
        format: 'obj',
        filename,
        size: result.objSize,
        hasMaterials: result.hasMaterials,
        materialSize: result.mtlSize,
        entityCount: options.wallsOnly ? 'walls only' : 'all entities',
      };
    } catch (error) {
      throw new Error(`OBJ export failed: ${error.message}`);
    }
  }

  /**
   * Creates a new project
   * @param {string} name - Project name
   */
  createNewProject(name = 'New Project') {
    // Clear current project
    this.currentProject = null;
    this.markClean();

    // Reset store state
    this.store.dispatch('editor/resetSelection');
    this.store.dispatch('editor/clearMeasurements');

    // Clear Three.js scene (except camera and lights)
    this.clearScene();

    // Update store
    this.store.commit('editor/SET_PROJECT_INFO', {
      name,
      createdAt: new Date(),
      isDirty: false,
    });
  }

  /**
   * Gets auto-save history
   * @returns {Array} Auto-save history
   */
  getAutoSaveHistory() {
    return this.autoSaveManager.getAutoSaveHistory();
  }

  /**
   * Restores from auto-save
   * @param {number} saveIndex - Index of save to restore
   * @returns {Promise<Object>} Restore result
   */
  async restoreFromAutoSave(saveIndex = 0) {
    try {
      const saveData = this.autoSaveManager.restoreFromAutoSave(saveIndex);

      if (!saveData) {
        throw new Error('Auto-save data not found');
      }

      // Deserialize and apply state
      const stateUpdates = deserializeProject(saveData.data);
      this.applyStateUpdates(stateUpdates);

      // Restore viewport if available
      if (stateUpdates.viewport) {
        this.restoreViewport(stateUpdates.viewport);
      }

      // Recreate entities
      if (stateUpdates.entities) {
        await this.recreateEntities(stateUpdates.entities);
      }

      // Update state
      this.currentProject = saveData.data;
      this.markClean();

      return {
        success: true,
        timestamp: saveData.timestamp,
        saveCount: saveData.saveCount,
      };
    } catch (error) {
      throw new Error(`Auto-save restore failed: ${error.message}`);
    }
  }

  /**
   * Tries to restore from the most recent auto-save on startup
   */
  async tryRestoreFromAutoSave() {
    const latestSave = this.autoSaveManager.getLatestAutoSave();

    if (latestSave) {
      // Could show a dialog asking if user wants to restore
      // For now, automatically restore if there was a recent save
      const saveTime = new Date(latestSave.timestamp);
      const now = new Date();
      const hoursDiff = (now - saveTime) / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        // Auto-restore if save is less than 24 hours old
        try {
          await this.restoreFromAutoSave(0);
          console.log('Auto-restored project from', saveTime.toISOString());
        } catch (error) {
          console.warn('Failed to auto-restore project:', error.message);
        }
      }
    }
  }

  /**
   * Applies state updates to the store
   * @param {Object} stateUpdates - State updates to apply
   */
  applyStateUpdates(stateUpdates) {
    if (stateUpdates.editor) {
      Object.keys(stateUpdates.editor).forEach((key) => {
        const mutationName = `SET_${key.toUpperCase()}`;
        // eslint-disable-next-line no-underscore-dangle
        if (this.store._mutations[`editor/${mutationName}`]) {
          this.store.commit(`editor/${mutationName}`, stateUpdates.editor[key]);
        }
      });
    }

    if (stateUpdates.cad) {
      Object.keys(stateUpdates.cad).forEach((key) => {
        const mutationName = `SET_${key.toUpperCase()}`;
        // eslint-disable-next-line no-underscore-dangle
        if (this.store._mutations[`cad/${mutationName}`]) {
          this.store.commit(`cad/${mutationName}`, stateUpdates.cad[key]);
        }
      });
    }
  }

  /**
   * Restores viewport settings
   * @param {Object} viewport - Viewport data
   */
  restoreViewport(viewport) {
    if (viewport.camera && this.threeScene.camera) {
      const pos = viewport.camera.position;
      const target = viewport.camera.target;

      this.threeScene.camera.position.set(pos[0], pos[1], pos[2]);

      if (target) {
        this.threeScene.controls.target.set(target[0], target[1], target[2]);
      }

      this.threeScene.camera.updateProjectionMatrix();
      this.threeScene.controls.update();
    }
  }

  /**
   * Recreates entities in the Three.js scene
   * @param {Array} entities - Entity data
   */
  recreateEntities(entities) {
    // This would need to be implemented based on your entity creation system
    // For now, just log the entities that would be recreated
    // eslint-disable-next-line no-console
    console.log('Would recreate entities:', entities);

    // Implementation would involve:
    // 1. Clear existing entities
    // 2. Recreate each entity based on its type and data
    // 3. Add them to the scene
  }

  /**
   * Clears the Three.js scene
   */
  clearScene() {
    const { scene } = this.threeScene;

    // Remove all entities except camera, lights, and helpers
    const objectsToRemove = [];

    scene.traverse((child) => {
      if (
        child.userData.type === 'wall' ||
        child.userData.type === 'measurement' ||
        child.userData.type === 'entity'
      ) {
        objectsToRemove.push(child);
      }
    });

    objectsToRemove.forEach((obj) => {
      scene.remove(obj);
    });
  }

  /**
   * Reads a file as text
   * @param {File} file - File to read
   * @returns {Promise<string>} File content
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Downloads a file to the user's computer
   * @param {Blob} blob - File data
   * @param {string} filename - Filename
   */
  downloadFile(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(link.href);
    }, 1000);
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.autoSaveManager) {
      this.autoSaveManager.destroy();
    }
  }
}

/**
 * Creates a project manager instance
 * @param {Object} store - Vuex store
 * @param {Object} threeScene - Three.js scene component
 * @returns {ProjectManager} Project manager instance
 */
export function createProjectManager(store, threeScene) {
  return new ProjectManager(store, threeScene);
}

export default ProjectManager;
