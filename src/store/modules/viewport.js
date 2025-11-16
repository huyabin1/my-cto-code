const DEFAULT_VIEWPORT_STATE = Object.freeze({
  viewMode: '2d', // '2d' | '3d' | 'sync'
  layoutMode: 'single', // 'single' | 'split' | 'floating'
  zoomLevel: 1.0,
  panOffset: { x: 0, y: 0 },
  gridVisible: true,
  snapOptions: {
    grid: false,
    orthogonal: true,
    diagonal45: false,
    node: true,
    intersection: true,
  },
  cameraConfig: {
    // 2D camera settings
    orthographic: {
      frustumSize: 60,
      position: { x: 0, y: 80, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 0, z: -1 },
    },
    // 3D camera settings
    perspective: {
      fov: 60,
      near: 0.1,
      far: 1000,
      position: { x: 15, y: 15, z: 15 },
      target: { x: 0, y: 0, z: 0 },
    },
  },
  controls: {
    enableRotate: true,
    enablePan: true,
    enableZoom: true,
    enableDamping: true,
    dampingFactor: 0.05,
    minZoom: 0.2,
    maxZoom: 5.0,
  },
});

function createDefaultViewportState() {
  return {
    viewMode: DEFAULT_VIEWPORT_STATE.viewMode,
    layoutMode: DEFAULT_VIEWPORT_STATE.layoutMode,
    zoomLevel: DEFAULT_VIEWPORT_STATE.zoomLevel,
    panOffset: { ...DEFAULT_VIEWPORT_STATE.panOffset },
    gridVisible: DEFAULT_VIEWPORT_STATE.gridVisible,
    snapOptions: { ...DEFAULT_VIEWPORT_STATE.snapOptions },
    cameraConfig: {
      orthographic: { ...DEFAULT_VIEWPORT_STATE.cameraConfig.orthographic },
      perspective: { ...DEFAULT_VIEWPORT_STATE.cameraConfig.perspective },
    },
    controls: { ...DEFAULT_VIEWPORT_STATE.controls },
  };
}

export default {
  namespaced: true,
  state: () => createDefaultViewportState(),

  getters: {
    // View mode getters
    is2DMode: (state) => state.viewMode === '2d',
    is3DMode: (state) => state.viewMode === '3d',
    isSyncMode: (state) => state.viewMode === 'sync',

    // Layout mode getters
    isSingleLayout: (state) => state.layoutMode === 'single',
    isSplitLayout: (state) => state.layoutMode === 'split',
    isFloatingLayout: (state) => state.layoutMode === 'floating',

    // Camera configuration getters
    activeCameraConfig: (state) => {
      return state.viewMode === '2d'
        ? state.cameraConfig.orthographic
        : state.cameraConfig.perspective;
    },

    // Controls configuration
    controlsConfig: (state) => state.controls,

    // Snap options getters
    snapEnabled: (state) => {
      return Object.values(state.snapOptions).some((enabled) => enabled);
    },
    snapOptionsList: (state) => state.snapOptions,

    // Utility getters for viewport state
    viewportState: (state) => ({
      viewMode: state.viewMode,
      layoutMode: state.layoutMode,
      zoomLevel: state.zoomLevel,
      panOffset: state.panOffset,
      gridVisible: state.gridVisible,
    }),

    // Export/Import support
    serializableState: (state) => ({
      viewMode: state.viewMode,
      layoutMode: state.layoutMode,
      zoomLevel: state.zoomLevel,
      panOffset: { ...state.panOffset },
      gridVisible: state.gridVisible,
      snapOptions: { ...state.snapOptions },
      cameraConfig: {
        orthographic: { ...state.cameraConfig.orthographic },
        perspective: { ...state.cameraConfig.perspective },
      },
      controls: { ...state.controls },
    }),
  },

  mutations: {
    // View mode mutations
    SET_VIEW_MODE(state, mode) {
      if (['2d', '3d', 'sync'].includes(mode)) {
        state.viewMode = mode;
      }
    },

    // Layout mode mutations
    SET_LAYOUT_MODE(state, mode) {
      if (['single', 'split', 'floating'].includes(mode)) {
        state.layoutMode = mode;
      }
    },

    // Zoom mutations
    SET_ZOOM_LEVEL(state, level) {
      state.zoomLevel = Math.max(state.controls.minZoom, Math.min(state.controls.maxZoom, level));
    },

    INCREMENT_ZOOM(state, delta) {
      const newLevel = state.zoomLevel + delta;
      state.zoomLevel = Math.max(
        state.controls.minZoom,
        Math.min(state.controls.maxZoom, newLevel)
      );
    },

    // Pan mutations
    SET_PAN_OFFSET(state, offset) {
      state.panOffset = { ...offset };
    },

    UPDATE_PAN_OFFSET(state, { x = 0, y = 0 }) {
      state.panOffset.x += x;
      state.panOffset.y += y;
    },

    RESET_PAN_OFFSET(state) {
      state.panOffset = { ...DEFAULT_VIEWPORT_STATE.panOffset };
    },

    // Grid visibility mutations
    SET_GRID_VISIBLE(state, visible) {
      state.gridVisible = visible;
    },

    TOGGLE_GRID_VISIBLE(state) {
      state.gridVisible = !state.gridVisible;
    },

    // Snap options mutations
    SET_SNAP_OPTION(state, { key, value }) {
      if (state.snapOptions[key] !== undefined) {
        state.snapOptions[key] = value;
      }
    },

    SET_SNAP_OPTIONS(state, options) {
      state.snapOptions = { ...state.snapOptions, ...options };
    },

    TOGGLE_SNAP_OPTION(state, key) {
      if (state.snapOptions[key] !== undefined) {
        state.snapOptions[key] = !state.snapOptions[key];
      }
    },

    // Camera configuration mutations
    SET_CAMERA_CONFIG(state, { mode, config }) {
      if (state.cameraConfig[mode]) {
        state.cameraConfig[mode] = { ...state.cameraConfig[mode], ...config };
      }
    },

    SET_ORTHOGRAPHIC_CAMERA(state, config) {
      state.cameraConfig.orthographic = { ...state.cameraConfig.orthographic, ...config };
    },

    SET_PERSPECTIVE_CAMERA(state, config) {
      state.cameraConfig.perspective = { ...state.cameraConfig.perspective, ...config };
    },

    // Controls configuration mutations
    SET_CONTROLS_CONFIG(state, config) {
      state.controls = { ...state.controls, ...config };
    },

    // Reset mutations
    RESET_VIEWPORT_STATE(state) {
      const defaultState = createDefaultViewportState();
      Object.keys(defaultState).forEach((key) => {
        state[key] = defaultState[key];
      });
    },

    RESET_CAMERA_POSITION(state) {
      state.cameraConfig.orthographic = { ...DEFAULT_VIEWPORT_STATE.cameraConfig.orthographic };
      state.cameraConfig.perspective = { ...DEFAULT_VIEWPORT_STATE.cameraConfig.perspective };
      state.panOffset = { ...DEFAULT_VIEWPORT_STATE.panOffset };
      state.zoomLevel = DEFAULT_VIEWPORT_STATE.zoomLevel;
    },

    // Import state mutation
    IMPORT_VIEWPORT_STATE(state, serializedState) {
      if (serializedState.viewMode) state.viewMode = serializedState.viewMode;
      if (serializedState.layoutMode) state.layoutMode = serializedState.layoutMode;
      if (typeof serializedState.zoomLevel === 'number')
        state.zoomLevel = serializedState.zoomLevel;
      if (serializedState.panOffset) state.panOffset = { ...serializedState.panOffset };
      if (typeof serializedState.gridVisible === 'boolean')
        state.gridVisible = serializedState.gridVisible;
      if (serializedState.snapOptions)
        state.snapOptions = { ...state.snapOptions, ...serializedState.snapOptions };
      if (serializedState.cameraConfig) {
        if (serializedState.cameraConfig.orthographic) {
          state.cameraConfig.orthographic = {
            ...state.cameraConfig.orthographic,
            ...serializedState.cameraConfig.orthographic,
          };
        }
        if (serializedState.cameraConfig.perspective) {
          state.cameraConfig.perspective = {
            ...state.cameraConfig.perspective,
            ...serializedState.cameraConfig.perspective,
          };
        }
      }
      if (serializedState.controls) {
        state.controls = { ...state.controls, ...serializedState.controls };
      }
    },
  },

  actions: {
    // View mode actions
    setViewMode({ commit }, mode) {
      commit('SET_VIEW_MODE', mode);
    },

    toggleViewMode({ commit, state }) {
      const modes = ['2d', '3d', 'sync'];
      const currentIndex = modes.indexOf(state.viewMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      commit('SET_VIEW_MODE', modes[nextIndex]);
    },

    // Layout mode actions
    setLayoutMode({ commit }, mode) {
      commit('SET_LAYOUT_MODE', mode);
    },

    // Zoom actions
    setZoomLevel({ commit }, level) {
      commit('SET_ZOOM_LEVEL', level);
    },

    zoomIn({ commit, state }, delta = 0.1) {
      commit('INCREMENT_ZOOM', delta);
    },

    zoomOut({ commit, state }, delta = 0.1) {
      commit('INCREMENT_ZOOM', -delta);
    },

    resetZoom({ commit }) {
      commit('SET_ZOOM_LEVEL', DEFAULT_VIEWPORT_STATE.zoomLevel);
    },

    // Pan actions
    setPanOffset({ commit }, offset) {
      commit('SET_PAN_OFFSET', offset);
    },

    updatePanOffset({ commit }, offset) {
      commit('UPDATE_PAN_OFFSET', offset);
    },

    resetPanOffset({ commit }) {
      commit('RESET_PAN_OFFSET');
    },

    // Grid actions
    setGridVisible({ commit }, visible) {
      commit('SET_GRID_VISIBLE', visible);
    },

    toggleGridVisible({ commit }) {
      commit('TOGGLE_GRID_VISIBLE');
    },

    // Snap actions
    setSnapOption({ commit }, payload) {
      commit('SET_SNAP_OPTION', payload);
    },

    setSnapOptions({ commit }, options) {
      commit('SET_SNAP_OPTIONS', options);
    },

    toggleSnapOption({ commit }, key) {
      commit('TOGGLE_SNAP_OPTION', key);
    },

    // Camera actions
    setCameraConfig({ commit }, payload) {
      commit('SET_CAMERA_CONFIG', payload);
    },

    setOrthographicCamera({ commit }, config) {
      commit('SET_ORTHOGRAPHIC_CAMERA', config);
    },

    setPerspectiveCamera({ commit }, config) {
      commit('SET_PERSPECTIVE_CAMERA', config);
    },

    // Controls actions
    setControlsConfig({ commit }, config) {
      commit('SET_CONTROLS_CONFIG', config);
    },

    // Reset actions
    resetViewportState({ commit }) {
      commit('RESET_VIEWPORT_STATE');
    },

    resetCameraPosition({ commit }) {
      commit('RESET_CAMERA_POSITION');
    },

    // Complex actions
    fitToView({ commit }, { bounds = null, padding = 0.1 } = {}) {
      // This would typically calculate the appropriate zoom and pan
      // to fit the given bounds or all content in view
      if (bounds) {
        // Calculate zoom and pan to fit bounds
        // This is a placeholder implementation
        commit('RESET_PAN_OFFSET');
        commit('SET_ZOOM_LEVEL', 1.0);
      } else {
        // Fit all content to view
        commit('RESET_PAN_OFFSET');
        commit('RESET_CAMERA_POSITION');
      }
    },

    // Import/Export actions
    exportViewportState({ getters }) {
      return getters.serializableState;
    },

    importViewportState({ commit }, serializedState) {
      commit('IMPORT_VIEWPORT_STATE', serializedState);
    },

    // Persistence hooks
    saveToLocalStorage({ getters, state }) {
      try {
        const serialized = getters.serializableState;
        localStorage.setItem('viewport-state', JSON.stringify(serialized));
      } catch (error) {
        console.warn('Failed to save viewport state to localStorage:', error);
      }
    },

    loadFromLocalStorage({ commit }) {
      try {
        const serialized = localStorage.getItem('viewport-state');
        if (serialized) {
          const state = JSON.parse(serialized);
          commit('IMPORT_VIEWPORT_STATE', state);
          return true;
        }
      } catch (error) {
        console.warn('Failed to load viewport state from localStorage:', error);
      }
      return false;
    },

    clearFromLocalStorage() {
      try {
        localStorage.removeItem('viewport-state');
      } catch (error) {
        console.warn('Failed to clear viewport state from localStorage:', error);
      }
    },
  },
};
