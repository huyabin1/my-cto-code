/**
 * Auto-save Utility
 * Handles automatic saving of project data to localStorage
 */

import { serializeProject, deserializeProject, validateProject } from './projectSerializer';

const AUTO_SAVE_KEY = 'editor-auto-save';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MAX_AUTO_SAVES = 5; // Keep only last 5 auto-saves

class AutoSaveManager {
  constructor(store) {
    this.store = store;
    this.autoSaveTimer = null;
    this.lastSaveTime = null;
    this.isEnabled = true;
    this.saveCount = 0;
  }

  /**
   * Starts the auto-save timer
   */
  start() {
    if (this.autoSaveTimer) {
      this.stop();
    }

    this.autoSaveTimer = setInterval(() => {
      this.performAutoSave();
    }, AUTO_SAVE_INTERVAL);

    // Perform initial save after 5 seconds
    setTimeout(() => {
      this.performAutoSave();
    }, 5000);
  }

  /**
   * Stops the auto-save timer
   */
  stop() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Enables or disables auto-save
   * @param {boolean} enabled - Whether auto-save should be enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  /**
   * Performs an auto-save operation
   */
  async performAutoSave() {
    if (!this.isEnabled) {
      return;
    }

    try {
      const { state } = this.store;
      const projectData = serializeProject(state);

      // Add auto-save metadata
      projectData.metadata.autoSave = {
        saveCount: ++this.saveCount,
        timestamp: new Date().toISOString(),
        triggeredBy: 'timer',
      };

      // Save to localStorage with rotation
      await this.saveToLocalStorage(projectData);

      this.lastSaveTime = new Date();

      // Dispatch event for UI updates
      this.store.commit('editor/SET_LAST_AUTO_SAVE', this.lastSaveTime);

      console.log('Auto-save completed at', this.lastSaveTime.toISOString());
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Could dispatch error to store for UI notification
    }
  }

  /**
   * Saves project data to localStorage with rotation
   * @param {Object} projectData - Project data to save
   */
  async saveToLocalStorage(projectData) {
    try {
      // Get existing auto-saves
      const existingSaves = this.getAutoSaveHistory();

      // Add new save to the beginning
      existingSaves.unshift({
        data: projectData,
        timestamp: projectData.metadata.autoSave.timestamp,
        saveCount: projectData.metadata.autoSave.saveCount,
      });

      // Keep only the most recent saves
      const limitedSaves = existingSaves.slice(0, MAX_AUTO_SAVES);

      // Save to localStorage
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(limitedSaves));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        // Clear old saves and try again
        this.clearOldAutoSaves();
        localStorage.setItem(
          AUTO_SAVE_KEY,
          JSON.stringify([
            {
              data: projectData,
              timestamp: projectData.metadata.autoSave.timestamp,
              saveCount: projectData.metadata.autoSave.saveCount,
            },
          ])
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Retrieves auto-save history from localStorage
   * @returns {Array} Array of auto-save entries
   */
  getAutoSaveHistory() {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to retrieve auto-save history:', error);
      return [];
    }
  }

  /**
   * Gets the most recent auto-save
   * @returns {Object|null} Most recent auto-save data or null
   */
  getLatestAutoSave() {
    const history = this.getAutoSaveHistory();
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Restores project from auto-save
   * @param {number} saveIndex - Index of save to restore (0 = most recent)
   * @returns {Object|null} Restored project data or null
   */
  restoreFromAutoSave(saveIndex = 0) {
    const history = this.getAutoSaveHistory();

    if (saveIndex >= history.length) {
      return null;
    }

    const saveEntry = history[saveIndex];

    // Validate the project data
    const validation = validateProject(saveEntry.data);
    if (!validation.valid) {
      console.error('Auto-save data validation failed:', validation.errors);
      return null;
    }

    if (validation.warnings.length > 0) {
      console.warn('Auto-save data validation warnings:', validation.warnings);
    }

    return {
      data: saveEntry.data,
      timestamp: saveEntry.timestamp,
      saveCount: saveEntry.saveCount,
    };
  }

  /**
   * Clears all auto-saves from localStorage
   */
  clearAllAutoSaves() {
    localStorage.removeItem(AUTO_SAVE_KEY);
    this.saveCount = 0;
  }

  /**
   * Clears old auto-saves to free up space
   */
  clearOldAutoSaves() {
    const history = this.getAutoSaveHistory();
    const limitedSaves = history.slice(0, Math.floor(MAX_AUTO_SAVES / 2));
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(limitedSaves));
  }

  /**
   * Gets auto-save statistics
   * @returns {Object} Auto-save statistics
   */
  getAutoSaveStats() {
    const history = this.getAutoSaveHistory();

    return {
      totalSaves: history.length,
      lastSaveTime: this.lastSaveTime,
      saveCount: this.saveCount,
      isEnabled: this.isEnabled,
      oldestSave: history.length > 0 ? history[history.length - 1].timestamp : null,
      newestSave: history.length > 0 ? history[0].timestamp : null,
    };
  }

  /**
   * Forces an immediate auto-save
   */
  async forceSave() {
    await this.performAutoSave();
  }

  /**
   * Cleanup method to be called when component is destroyed
   */
  destroy() {
    this.stop();
  }
}

/**
 * Creates and initializes an auto-save manager
 * @param {Object} store - Vuex store instance
 * @returns {AutoSaveManager} Auto-save manager instance
 */
export function createAutoSaveManager(store) {
  return new AutoSaveManager(store);
}

export default AutoSaveManager;
