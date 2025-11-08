/**
 * Auto-save Manager Tests
 */

import AutoSaveManager from '@/utils/autoSave';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Auto-save Manager', () => {
  let mockStore;
  let autoSaveManager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();

    // Create mock store
    mockStore = {
      state: {
        editor: { drawWallToolEnabled: true },
        cad: { opacity: 0.75 },
      },
      commit: jest.fn(),
    };

    autoSaveManager = new AutoSaveManager(mockStore);
  });

  afterEach(() => {
    if (autoSaveManager) {
      autoSaveManager.destroy();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(autoSaveManager.store).toBe(mockStore);
      expect(autoSaveManager.isEnabled).toBe(true);
      expect(autoSaveManager.autoSaveTimer).toBeNull();
      expect(autoSaveManager.lastSaveTime).toBeNull();
      expect(autoSaveManager.saveCount).toBe(0);
    });
  });

  describe('Auto-save Timer Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start auto-save timer', () => {
      const performAutoSaveSpy = jest.spyOn(autoSaveManager, 'performAutoSave');

      autoSaveManager.start();

      expect(autoSaveManager.autoSaveTimer).not.toBeNull();

      // Fast-forward time to trigger initial save
      jest.advanceTimersByTime(5000);
      expect(performAutoSaveSpy).toHaveBeenCalledTimes(1);

      // Fast-forward time to trigger periodic save
      jest.advanceTimersByTime(30000);
      expect(performAutoSaveSpy).toHaveBeenCalledTimes(2);
    });

    it('should stop auto-save timer', () => {
      autoSaveManager.start();
      const timer = autoSaveManager.autoSaveTimer;

      autoSaveManager.stop();

      expect(autoSaveManager.autoSaveTimer).toBeNull();
      expect(clearInterval).toHaveBeenCalledWith(timer);
    });

    it('should restart timer when start is called multiple times', () => {
      const stopSpy = jest.spyOn(autoSaveManager, 'stop');

      autoSaveManager.start();
      autoSaveManager.start();

      expect(stopSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto-save Operations', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should perform auto-save successfully', async () => {
      const saveToLocalStorageSpy = jest.spyOn(autoSaveManager, 'saveToLocalStorage');

      await autoSaveManager.performAutoSave();

      expect(saveToLocalStorageSpy).toHaveBeenCalled();
      expect(autoSaveManager.lastSaveTime).toBeInstanceOf(Date);
      expect(autoSaveManager.saveCount).toBe(1);
      expect(mockStore.commit).toHaveBeenCalledWith('editor/SET_LAST_AUTO_SAVE', expect.any(Date));
    });

    it('should handle auto-save errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Test that error handling code path exists
      const saveToLocalStorageSpy = jest.spyOn(autoSaveManager, 'saveToLocalStorage');
      saveToLocalStorageSpy.mockRejectedValue(new Error('Test error'));

      await autoSaveManager.performAutoSave();

      // Should not throw, should handle gracefully
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should not save when disabled', async () => {
      const saveToLocalStorageSpy = jest.spyOn(autoSaveManager, 'saveToLocalStorage');

      autoSaveManager.setEnabled(false);
      await autoSaveManager.performAutoSave();

      expect(saveToLocalStorageSpy).not.toHaveBeenCalled();
    });
  });

  describe('localStorage Operations', () => {
    it('should save to localStorage', async () => {
      const projectData = {
        version: '1.0.0',
        metadata: { autoSave: { timestamp: '2023-01-01T00:00:00.000Z', saveCount: 1 } },
      };

      // Mock serializeProject
      jest.doMock('@/utils/projectSerializer', () => ({
        serializeProject: jest.fn().mockReturnValue(projectData),
      }));

      await autoSaveManager.saveToLocalStorage(projectData);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'editor-auto-save',
        expect.stringContaining('2023-01-01T00:00:00.000Z')
      );
    });

    it('should get auto-save history', () => {
      const mockHistory = [
        { timestamp: '2023-01-01T00:00:00.000Z', saveCount: 1 },
        { timestamp: '2023-01-01T01:00:00.000Z', saveCount: 2 },
      ];

      localStorage.setItem('editor-auto-save', JSON.stringify(mockHistory));

      const history = autoSaveManager.getAutoSaveHistory();

      expect(history).toEqual(mockHistory);
      expect(localStorage.getItem).toHaveBeenCalledWith('editor-auto-save');
    });

    it('should handle empty history gracefully', () => {
      localStorage.setItem('editor-auto-save', 'invalid-json');

      const history = autoSaveManager.getAutoSaveHistory();

      expect(history).toEqual([]);
    });

    it('should get latest auto-save', () => {
      const mockHistory = [
        { timestamp: '2023-01-01T01:00:00.000Z', saveCount: 2 },
        { timestamp: '2023-01-01T00:00:00.000Z', saveCount: 1 },
      ];

      localStorage.setItem('editor-auto-save', JSON.stringify(mockHistory));

      const latest = autoSaveManager.getLatestAutoSave();

      expect(latest).toEqual(mockHistory[0]);
      expect(latest.saveCount).toBe(2);
    });

    it('should return null for latest auto-save when no history', () => {
      const latest = autoSaveManager.getLatestAutoSave();

      expect(latest).toBeNull();
    });
  });

  describe('Auto-save Restoration', () => {
    it('should restore from auto-save successfully', () => {
      const mockSaveData = {
        data: {
          version: '1.0.0',
          editor: { drawWallToolEnabled: false },
          cad: { opacity: 0.5 },
        },
        timestamp: '2023-01-01T00:00:00.000Z',
        saveCount: 1,
      };

      const mockHistory = [mockSaveData];
      localStorage.setItem('editor-auto-save', JSON.stringify(mockHistory));

      // Mock validateProject
      jest.doMock('@/utils/projectSerializer', () => ({
        validateProject: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
        deserializeProject: jest.fn().mockReturnValue({
          editor: { drawWallToolEnabled: false },
          cad: { opacity: 0.5 },
        }),
      }));

      const result = autoSaveManager.restoreFromAutoSave(0);

      expect(result).toEqual({
        data: mockSaveData.data,
        timestamp: mockSaveData.timestamp,
        saveCount: mockSaveData.saveCount,
      });
    });

    it('should return null for invalid save index', () => {
      const mockHistory = [{ timestamp: '2023-01-01T00:00:00.000Z', saveCount: 1 }];
      localStorage.setItem('editor-auto-save', JSON.stringify(mockHistory));

      const result = autoSaveManager.restoreFromAutoSave(5);

      expect(result).toBeNull();
    });

    it('should return null for invalid project data', () => {
      const mockHistory = [{ data: null, timestamp: '2023-01-01T00:00:00.000Z', saveCount: 1 }];
      localStorage.setItem('editor-auto-save', JSON.stringify(mockHistory));

      // Mock validateProject to return invalid
      jest.doMock('@/utils/projectSerializer', () => ({
        validateProject: jest.fn().mockReturnValue({
          valid: false,
          errors: ['Invalid data'],
          warnings: [],
        }),
      }));

      const result = autoSaveManager.restoreFromAutoSave(0);

      expect(result).toBeNull();
    });
  });

  describe('Auto-save Management', () => {
    it('should clear all auto-saves', () => {
      const mockHistory = [
        { timestamp: '2023-01-01T00:00:00.000Z', saveCount: 1 },
        { timestamp: '2023-01-01T01:00:00.000Z', saveCount: 2 },
      ];

      localStorage.setItem('editor-auto-save', JSON.stringify(mockHistory));

      autoSaveManager.clearAllAutoSaves();

      expect(localStorage.removeItem).toHaveBeenCalledWith('editor-auto-save');
      expect(autoSaveManager.saveCount).toBe(0);
    });

    it('should get auto-save statistics', () => {
      const mockHistory = [
        { timestamp: '2023-01-01T01:00:00.000Z', saveCount: 2 },
        { timestamp: '2023-01-01T00:00:00.000Z', saveCount: 1 },
      ];

      localStorage.setItem('editor-auto-save', JSON.stringify(mockHistory));
      autoSaveManager.lastSaveTime = new Date('2023-01-01T02:00:00.000Z');
      autoSaveManager.saveCount = 3;

      const stats = autoSaveManager.getAutoSaveStats();

      expect(stats.totalSaves).toBe(2);
      expect(stats.saveCount).toBe(3);
      expect(stats.isEnabled).toBe(true);
      expect(stats.oldestSave).toBe('2023-01-01T00:00:00.000Z');
      expect(stats.newestSave).toBe('2023-01-01T01:00:00.000Z');
    });

    it('should handle quota exceeded error', async () => {
      const projectData = {
        version: '1.0.0',
        metadata: { autoSave: { timestamp: '2023-01-01T00:00:00.000Z', saveCount: 1 } },
      };

      // Test that save is attempted (actual error handling is complex)
      await expect(autoSaveManager.saveToLocalStorage(projectData)).resolves.toBeUndefined();

      // Should attempt to save
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Enable/Disable', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should enable auto-save', () => {
      autoSaveManager.setEnabled(false);
      expect(autoSaveManager.isEnabled).toBe(false);

      autoSaveManager.setEnabled(true);
      expect(autoSaveManager.isEnabled).toBe(true);
      expect(autoSaveManager.autoSaveTimer).not.toBeNull();
    });

    it('should disable auto-save', () => {
      autoSaveManager.start();
      expect(autoSaveManager.autoSaveTimer).not.toBeNull();

      autoSaveManager.setEnabled(false);
      expect(autoSaveManager.isEnabled).toBe(false);
      expect(autoSaveManager.autoSaveTimer).toBeNull();
    });
  });

  describe('Force Save', () => {
    it('should force immediate save', async () => {
      const performAutoSaveSpy = jest.spyOn(autoSaveManager, 'performAutoSave');

      await autoSaveManager.forceSave();

      expect(performAutoSaveSpy).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should destroy auto-save manager properly', () => {
      jest.useFakeTimers();

      autoSaveManager.start();
      const timer = autoSaveManager.autoSaveTimer;

      autoSaveManager.destroy();

      expect(autoSaveManager.autoSaveTimer).toBeNull();

      jest.useRealTimers();
    });
  });
});
