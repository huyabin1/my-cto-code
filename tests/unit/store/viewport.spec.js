import viewportModule from '@/store/modules/viewport';

describe('Viewport Store Module', () => {
  let store;
  let state;

  beforeEach(() => {
    store = {
      state: {
        viewport: viewportModule.state(),
      },
      getters: {},
      mutations: viewportModule.mutations,
      actions: viewportModule.actions,
      commit: jest.fn(),
      dispatch: jest.fn(),
    };

    state = store.state.viewport;
  });

  describe('Default State', () => {
    it('should have correct default view mode', () => {
      expect(state.viewMode).toBe('2d');
    });

    it('should have correct default layout mode', () => {
      expect(state.layoutMode).toBe('single');
    });

    it('should have default zoom level', () => {
      expect(state.zoomLevel).toBe(1.0);
    });

    it('should have default pan offset', () => {
      expect(state.panOffset).toEqual({ x: 0, y: 0 });
    });

    it('should have grid visible by default', () => {
      expect(state.gridVisible).toBe(true);
    });

    it('should have default snap options', () => {
      expect(state.snapOptions).toEqual({
        grid: false,
        orthogonal: true,
        diagonal45: false,
        node: true,
        intersection: true,
      });
    });

    it('should have camera configurations', () => {
      expect(state.cameraConfig.orthographic).toBeDefined();
      expect(state.cameraConfig.perspective).toBeDefined();
    });

    it('should have controls configuration', () => {
      expect(state.controls).toBeDefined();
      expect(state.controls.enableZoom).toBe(true);
      expect(state.controls.enablePan).toBe(true);
      expect(state.controls.enableRotate).toBe(true);
    });
  });

  describe('Getters', () => {
    let mockGetters;

    const initializeGetters = () => {
      // Create a mock store context for getters
      const mockStore = {
        state,
        getters: {},
        rootState: {},
        rootGetters: {},
      };

      mockGetters = {};

      // Initialize all getters with proper context
      Object.keys(viewportModule.getters).forEach((getterName) => {
        mockGetters[getterName] = viewportModule.getters[getterName](
          state,
          mockGetters,
          mockStore.state,
          mockStore.rootGetters
        );
      });
    };

    beforeEach(() => {
      initializeGetters();
    });

    describe('View Mode Getters', () => {
      it('should detect 2D mode', () => {
        state.viewMode = '2d';
        initializeGetters();
        expect(mockGetters.is2DMode).toBe(true);
        expect(mockGetters.is3DMode).toBe(false);
        expect(mockGetters.isSyncMode).toBe(false);
      });

      it('should detect 3D mode', () => {
        state.viewMode = '3d';
        initializeGetters();
        expect(mockGetters.is2DMode).toBe(false);
        expect(mockGetters.is3DMode).toBe(true);
        expect(mockGetters.isSyncMode).toBe(false);
      });

      it('should detect sync mode', () => {
        state.viewMode = 'sync';
        initializeGetters();
        expect(mockGetters.is2DMode).toBe(false);
        expect(mockGetters.is3DMode).toBe(false);
        expect(mockGetters.isSyncMode).toBe(true);
      });
    });

    describe('Layout Mode Getters', () => {
      it('should detect single layout', () => {
        state.layoutMode = 'single';
        initializeGetters();
        expect(mockGetters.isSingleLayout).toBe(true);
        expect(mockGetters.isSplitLayout).toBe(false);
        expect(mockGetters.isFloatingLayout).toBe(false);
      });

      it('should detect split layout', () => {
        state.layoutMode = 'split';
        initializeGetters();
        expect(mockGetters.isSingleLayout).toBe(false);
        expect(mockGetters.isSplitLayout).toBe(true);
        expect(mockGetters.isFloatingLayout).toBe(false);
      });

      it('should detect floating layout', () => {
        state.layoutMode = 'floating';
        initializeGetters();
        expect(mockGetters.isSingleLayout).toBe(false);
        expect(mockGetters.isSplitLayout).toBe(false);
        expect(mockGetters.isFloatingLayout).toBe(true);
      });
    });

    describe('Camera Configuration Getters', () => {
      it('should return orthographic config for 2D mode', () => {
        state.viewMode = '2d';
        initializeGetters();
        expect(mockGetters.activeCameraConfig).toBe(state.cameraConfig.orthographic);
      });

      it('should return perspective config for 3D mode', () => {
        state.viewMode = '3d';
        initializeGetters();
        expect(mockGetters.activeCameraConfig).toBe(state.cameraConfig.perspective);
      });

      it('should return perspective config for sync mode', () => {
        state.viewMode = 'sync';
        initializeGetters();
        expect(mockGetters.activeCameraConfig).toBe(state.cameraConfig.perspective);
      });
    });

    describe('Snap Options Getters', () => {
      it('should detect when snap is enabled', () => {
        state.snapOptions.orthogonal = true;
        initializeGetters();
        expect(mockGetters.snapEnabled).toBe(true);
      });

      it('should detect when snap is disabled', () => {
        state.snapOptions = {
          grid: false,
          orthogonal: false,
          diagonal45: false,
          node: false,
          intersection: false,
        };
        initializeGetters();
        expect(mockGetters.snapEnabled).toBe(false);
      });

      it('should return snap options list', () => {
        expect(mockGetters.snapOptionsList).toBe(state.snapOptions);
      });
    });

    describe('Utility Getters', () => {
      it('should return viewport state', () => {
        const viewportState = mockGetters.viewportState;
        expect(viewportState).toEqual({
          viewMode: state.viewMode,
          layoutMode: state.layoutMode,
          zoomLevel: state.zoomLevel,
          panOffset: state.panOffset,
          gridVisible: state.gridVisible,
        });
      });

      it('should return serializable state', () => {
        const serializableState = mockGetters.serializableState;
        expect(serializableState).toHaveProperty('viewMode');
        expect(serializableState).toHaveProperty('layoutMode');
        expect(serializableState).toHaveProperty('zoomLevel');
        expect(serializableState).toHaveProperty('panOffset');
        expect(serializableState).toHaveProperty('gridVisible');
        expect(serializableState).toHaveProperty('snapOptions');
        expect(serializableState).toHaveProperty('cameraConfig');
        expect(serializableState).toHaveProperty('controls');
      });
    });
  });

  describe('Mutations', () => {
    describe('View Mode Mutations', () => {
      it('should set view mode', () => {
        store.mutations.SET_VIEW_MODE(state, '3d');
        expect(state.viewMode).toBe('3d');
      });

      it('should not set invalid view mode', () => {
        const originalMode = state.viewMode;
        store.mutations.SET_VIEW_MODE(state, 'invalid');
        expect(state.viewMode).toBe(originalMode);
      });
    });

    describe('Layout Mode Mutations', () => {
      it('should set layout mode', () => {
        store.mutations.SET_LAYOUT_MODE(state, 'split');
        expect(state.layoutMode).toBe('split');
      });

      it('should not set invalid layout mode', () => {
        const originalMode = state.layoutMode;
        store.mutations.SET_LAYOUT_MODE(state, 'invalid');
        expect(state.layoutMode).toBe(originalMode);
      });
    });

    describe('Zoom Mutations', () => {
      it('should set zoom level', () => {
        store.mutations.SET_ZOOM_LEVEL(state, 2.5);
        expect(state.zoomLevel).toBe(2.5);
      });

      it('should clamp zoom level to minimum', () => {
        store.mutations.SET_ZOOM_LEVEL(state, 0.1);
        expect(state.zoomLevel).toBe(state.controls.minZoom);
      });

      it('should clamp zoom level to maximum', () => {
        store.mutations.SET_ZOOM_LEVEL(state, 10);
        expect(state.zoomLevel).toBe(state.controls.maxZoom);
      });

      it('should increment zoom', () => {
        const originalZoom = state.zoomLevel;
        store.mutations.INCREMENT_ZOOM(state, 0.5);
        expect(state.zoomLevel).toBe(originalZoom + 0.5);
      });

      it('should decrement zoom', () => {
        const originalZoom = state.zoomLevel;
        store.mutations.INCREMENT_ZOOM(state, -0.5);
        expect(state.zoomLevel).toBe(originalZoom - 0.5);
      });
    });

    describe('Pan Mutations', () => {
      it('should set pan offset', () => {
        const offset = { x: 10, y: 20 };
        store.mutations.SET_PAN_OFFSET(state, offset);
        expect(state.panOffset).toEqual(offset);
      });

      it('should update pan offset', () => {
        state.panOffset = { x: 10, y: 20 };
        store.mutations.UPDATE_PAN_OFFSET(state, { x: 5, y: -5 });
        expect(state.panOffset).toEqual({ x: 15, y: 15 });
      });

      it('should reset pan offset', () => {
        state.panOffset = { x: 10, y: 20 };
        store.mutations.RESET_PAN_OFFSET(state);
        expect(state.panOffset).toEqual({ x: 0, y: 0 });
      });
    });

    describe('Grid Mutations', () => {
      it('should set grid visibility', () => {
        store.mutations.SET_GRID_VISIBLE(state, false);
        expect(state.gridVisible).toBe(false);
      });

      it('should toggle grid visibility', () => {
        const originalVisibility = state.gridVisible;
        store.mutations.TOGGLE_GRID_VISIBLE(state);
        expect(state.gridVisible).toBe(!originalVisibility);
      });
    });

    describe('Snap Options Mutations', () => {
      it('should set snap option', () => {
        store.mutations.SET_SNAP_OPTION(state, { key: 'grid', value: true });
        expect(state.snapOptions.grid).toBe(true);
      });

      it('should not set invalid snap option', () => {
        const originalOptions = { ...state.snapOptions };
        store.mutations.SET_SNAP_OPTION(state, { key: 'invalid', value: true });
        expect(state.snapOptions).toEqual(originalOptions);
      });

      it('should set multiple snap options', () => {
        const options = { grid: true, orthogonal: false };
        store.mutations.SET_SNAP_OPTIONS(state, options);
        expect(state.snapOptions.grid).toBe(true);
        expect(state.snapOptions.orthogonal).toBe(false);
      });

      it('should toggle snap option', () => {
        const originalValue = state.snapOptions.grid;
        store.mutations.TOGGLE_SNAP_OPTION(state, 'grid');
        expect(state.snapOptions.grid).toBe(!originalValue);
      });
    });

    describe('Camera Configuration Mutations', () => {
      it('should set camera config for specific mode', () => {
        const config = { position: { x: 10, y: 20, z: 30 } };
        store.mutations.SET_CAMERA_CONFIG(state, { mode: 'orthographic', config });
        expect(state.cameraConfig.orthographic.position).toEqual(config.position);
      });

      it('should set orthographic camera config', () => {
        const config = { frustumSize: 100 };
        store.mutations.SET_ORTHOGRAPHIC_CAMERA(state, config);
        expect(state.cameraConfig.orthographic.frustumSize).toBe(100);
      });

      it('should set perspective camera config', () => {
        const config = { fov: 75 };
        store.mutations.SET_PERSPECTIVE_CAMERA(state, config);
        expect(state.cameraConfig.perspective.fov).toBe(75);
      });
    });

    describe('Controls Configuration Mutations', () => {
      it('should set controls config', () => {
        const config = { enableRotate: false };
        store.mutations.SET_CONTROLS_CONFIG(state, config);
        expect(state.controls.enableRotate).toBe(false);
      });
    });

    describe('Reset Mutations', () => {
      it('should reset viewport state', () => {
        state.viewMode = '3d';
        state.layoutMode = 'split';
        state.zoomLevel = 2.0;
        state.panOffset = { x: 10, y: 20 };
        state.gridVisible = false;

        store.mutations.RESET_VIEWPORT_STATE(state);

        expect(state.viewMode).toBe('2d');
        expect(state.layoutMode).toBe('single');
        expect(state.zoomLevel).toBe(1.0);
        expect(state.panOffset).toEqual({ x: 0, y: 0 });
        expect(state.gridVisible).toBe(true);
      });

      it('should reset camera position', () => {
        state.cameraConfig.orthographic.position = { x: 10, y: 20, z: 30 };
        state.cameraConfig.perspective.position = { x: 15, y: 25, z: 35 };
        state.panOffset = { x: 10, y: 20 };
        state.zoomLevel = 2.0;

        store.mutations.RESET_CAMERA_POSITION(state);

        expect(state.cameraConfig.orthographic.position).toEqual({ x: 0, y: 80, z: 0 });
        expect(state.cameraConfig.perspective.position).toEqual({ x: 15, y: 15, z: 15 });
        expect(state.panOffset).toEqual({ x: 0, y: 0 });
        expect(state.zoomLevel).toBe(1.0);
      });
    });

    describe('Import State Mutation', () => {
      it('should import serialized state', () => {
        const serializedState = {
          viewMode: '3d',
          layoutMode: 'split',
          zoomLevel: 2.5,
          panOffset: { x: 10, y: 20 },
          gridVisible: false,
          snapOptions: { grid: true, orthogonal: false },
          cameraConfig: {
            orthographic: { frustumSize: 100 },
            perspective: { fov: 75 },
          },
          controls: { enableRotate: false },
        };

        store.mutations.IMPORT_VIEWPORT_STATE(state, serializedState);

        expect(state.viewMode).toBe('3d');
        expect(state.layoutMode).toBe('split');
        expect(state.zoomLevel).toBe(2.5);
        expect(state.panOffset).toEqual({ x: 10, y: 20 });
        expect(state.gridVisible).toBe(false);
        expect(state.snapOptions.grid).toBe(true);
        expect(state.snapOptions.orthogonal).toBe(false);
        expect(state.cameraConfig.orthographic.frustumSize).toBe(100);
        expect(state.cameraConfig.perspective.fov).toBe(75);
        expect(state.controls.enableRotate).toBe(false);
      });

      it('should handle partial serialized state', () => {
        const originalState = JSON.parse(JSON.stringify(state));
        const serializedState = {
          viewMode: '3d',
          gridVisible: false,
        };

        store.mutations.IMPORT_VIEWPORT_STATE(state, serializedState);

        expect(state.viewMode).toBe('3d');
        expect(state.gridVisible).toBe(false);
        // Other properties should remain unchanged
        expect(state.layoutMode).toBe(originalState.layoutMode);
        expect(state.zoomLevel).toBe(originalState.zoomLevel);
      });
    });
  });

  describe('Actions', () => {
    describe('View Mode Actions', () => {
      it('should set view mode', async () => {
        await store.actions.setViewMode({ commit: store.commit }, '3d');
        expect(store.commit).toHaveBeenCalledWith('SET_VIEW_MODE', '3d');
      });

      it('should toggle view mode', async () => {
        state.viewMode = '2d';
        await store.actions.toggleViewMode({ commit: store.commit, state });
        expect(store.commit).toHaveBeenCalledWith('SET_VIEW_MODE', '3d');
      });
    });

    describe('Layout Mode Actions', () => {
      it('should set layout mode', async () => {
        await store.actions.setLayoutMode({ commit: store.commit }, 'split');
        expect(store.commit).toHaveBeenCalledWith('SET_LAYOUT_MODE', 'split');
      });
    });

    describe('Zoom Actions', () => {
      it('should set zoom level', async () => {
        await store.actions.setZoomLevel({ commit: store.commit }, 2.5);
        expect(store.commit).toHaveBeenCalledWith('SET_ZOOM_LEVEL', 2.5);
      });

      it('should zoom in', async () => {
        await store.actions.zoomIn({ commit: store.commit, state }, 0.5);
        expect(store.commit).toHaveBeenCalledWith('INCREMENT_ZOOM', 0.5);
      });

      it('should zoom out', async () => {
        await store.actions.zoomOut({ commit: store.commit, state }, 0.5);
        expect(store.commit).toHaveBeenCalledWith('INCREMENT_ZOOM', -0.5);
      });

      it('should reset zoom', async () => {
        await store.actions.resetZoom({ commit: store.commit });
        expect(store.commit).toHaveBeenCalledWith('SET_ZOOM_LEVEL', 1.0);
      });
    });

    describe('Pan Actions', () => {
      it('should set pan offset', async () => {
        const offset = { x: 10, y: 20 };
        await store.actions.setPanOffset({ commit: store.commit }, offset);
        expect(store.commit).toHaveBeenCalledWith('SET_PAN_OFFSET', offset);
      });

      it('should update pan offset', async () => {
        const offset = { x: 5, y: -5 };
        await store.actions.updatePanOffset({ commit: store.commit }, offset);
        expect(store.commit).toHaveBeenCalledWith('UPDATE_PAN_OFFSET', offset);
      });

      it('should reset pan offset', async () => {
        await store.actions.resetPanOffset({ commit: store.commit });
        expect(store.commit).toHaveBeenCalledWith('RESET_PAN_OFFSET');
      });
    });

    describe('Grid Actions', () => {
      it('should set grid visibility', async () => {
        await store.actions.setGridVisible({ commit: store.commit }, false);
        expect(store.commit).toHaveBeenCalledWith('SET_GRID_VISIBLE', false);
      });

      it('should toggle grid visibility', async () => {
        await store.actions.toggleGridVisible({ commit: store.commit });
        expect(store.commit).toHaveBeenCalledWith('TOGGLE_GRID_VISIBLE');
      });
    });

    describe('Snap Actions', () => {
      it('should set snap option', async () => {
        const payload = { key: 'grid', value: true };
        await store.actions.setSnapOption({ commit: store.commit }, payload);
        expect(store.commit).toHaveBeenCalledWith('SET_SNAP_OPTION', payload);
      });

      it('should set snap options', async () => {
        const options = { grid: true, orthogonal: false };
        await store.actions.setSnapOptions({ commit: store.commit }, options);
        expect(store.commit).toHaveBeenCalledWith('SET_SNAP_OPTIONS', options);
      });

      it('should toggle snap option', async () => {
        await store.actions.toggleSnapOption({ commit: store.commit }, 'grid');
        expect(store.commit).toHaveBeenCalledWith('TOGGLE_SNAP_OPTION', 'grid');
      });
    });

    describe('Camera Actions', () => {
      it('should set camera config', async () => {
        const payload = { mode: 'orthographic', config: { frustumSize: 100 } };
        await store.actions.setCameraConfig({ commit: store.commit }, payload);
        expect(store.commit).toHaveBeenCalledWith('SET_CAMERA_CONFIG', payload);
      });

      it('should set orthographic camera', async () => {
        const config = { frustumSize: 100 };
        await store.actions.setOrthographicCamera({ commit: store.commit }, config);
        expect(store.commit).toHaveBeenCalledWith('SET_ORTHOGRAPHIC_CAMERA', config);
      });

      it('should set perspective camera', async () => {
        const config = { fov: 75 };
        await store.actions.setPerspectiveCamera({ commit: store.commit }, config);
        expect(store.commit).toHaveBeenCalledWith('SET_PERSPECTIVE_CAMERA', config);
      });
    });

    describe('Controls Actions', () => {
      it('should set controls config', async () => {
        const config = { enableRotate: false };
        await store.actions.setControlsConfig({ commit: store.commit }, config);
        expect(store.commit).toHaveBeenCalledWith('SET_CONTROLS_CONFIG', config);
      });
    });

    describe('Reset Actions', () => {
      it('should reset viewport state', async () => {
        await store.actions.resetViewportState({ commit: store.commit });
        expect(store.commit).toHaveBeenCalledWith('RESET_VIEWPORT_STATE');
      });

      it('should reset camera position', async () => {
        await store.actions.resetCameraPosition({ commit: store.commit });
        expect(store.commit).toHaveBeenCalledWith('RESET_CAMERA_POSITION');
      });
    });

    describe('Complex Actions', () => {
      it('should fit to view with bounds', async () => {
        const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
        await store.actions.fitToView({ commit: store.commit }, { bounds });
        expect(store.commit).toHaveBeenCalledWith('RESET_PAN_OFFSET');
        expect(store.commit).toHaveBeenCalledWith('SET_ZOOM_LEVEL', 1.0);
      });

      it('should fit to view without bounds', async () => {
        await store.actions.fitToView({ commit: store.commit });
        expect(store.commit).toHaveBeenCalledWith('RESET_PAN_OFFSET');
        expect(store.commit).toHaveBeenCalledWith('RESET_CAMERA_POSITION');
      });
    });

    describe('Import/Export Actions', () => {
      it('should export viewport state', async () => {
        const mockGetters = {
          serializableState: { test: 'data' },
        };
        const result = await store.actions.exportViewportState({ getters: mockGetters });
        expect(result).toEqual({ test: 'data' });
      });

      it('should import viewport state', async () => {
        const serializedState = { viewMode: '3d' };
        await store.actions.importViewportState({ commit: store.commit }, serializedState);
        expect(store.commit).toHaveBeenCalledWith('IMPORT_VIEWPORT_STATE', serializedState);
      });
    });

    describe('Persistence Actions', () => {
      let localStorageMock;

      beforeEach(() => {
        localStorageMock = {
          setItem: jest.fn(),
          getItem: jest.fn(),
          removeItem: jest.fn(),
        };
        global.localStorage = localStorageMock;
      });

      afterEach(() => {
        delete global.localStorage;
      });

      it.skip('should save to local storage', () => {
        const mockGetters = {
          serializableState: { test: 'data' },
        };

        // Mock console.warn to catch any errors
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Call the action directly with the mocked localStorage
        viewportModule.actions.saveToLocalStorage({ getters: mockGetters });

        // Check if any warnings were logged
        expect(consoleSpy).not.toHaveBeenCalled();

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'viewport-state',
          JSON.stringify({ test: 'data' })
        );

        consoleSpy.mockRestore();
      });

      it.skip('should load from local storage', () => {
        const serializedState = { viewMode: '3d' };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(serializedState));

        const result = store.actions.loadFromLocalStorage({ commit: store.commit });
        expect(result).toBe(true);
        expect(store.commit).toHaveBeenCalledWith('IMPORT_VIEWPORT_STATE', serializedState);
      });

      it('should handle loading from empty local storage', () => {
        localStorageMock.getItem.mockReturnValue(null);

        const result = store.actions.loadFromLocalStorage({ commit: store.commit });
        expect(result).toBe(false);
        expect(store.commit).not.toHaveBeenCalled();
      });

      it('should clear from local storage', () => {
        store.actions.clearFromLocalStorage();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('viewport-state');
      });

      it('should handle localStorage errors gracefully', () => {
        localStorageMock.setItem.mockImplementation(() => {
          throw new Error('Storage error');
        });
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const mockGetters = {
          serializableState: { test: 'data' },
        };
        store.actions.saveToLocalStorage({ getters: mockGetters });

        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to save viewport state to localStorage:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });
  });
});
