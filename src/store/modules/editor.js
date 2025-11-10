const DEFAULT_MATERIALS = [
  { label: '混凝土', value: 'concrete' },
  { label: '砖', value: 'brick' },
  { label: '石膏板', value: 'drywall' },
  { label: '木饰面', value: 'wood' },
];

const DEFAULT_SELECTION = {
  id: 'wall-default',
  name: '墙体 A1',
  material: DEFAULT_MATERIALS[0].value,
  color: '#ffffff',
};

export default {
  namespaced: true,
  state: () => ({
    drawWallToolEnabled: false,
    snapping: {
      orthogonal: true,
      diagonal45: false,
      grid: false,
      node: true,
      intersection: true,
    },
    materials: DEFAULT_MATERIALS,
    activeSelection: { ...DEFAULT_SELECTION },
    activeTool: null, // 'distance' | 'area' | 'angle' | null
    measurements: [],
    measurementResultsVisible: false,
    commandStackInfo: {
      canUndo: false,
      canRedo: false,
      undoCount: 0,
      redoCount: 0,
      maxStackSize: 50,
      undoHistory: [],
      redoHistory: [],
    },
    projectInfo: {
      name: 'Untitled Project',
      createdAt: null,
      lastSaved: null,
      lastLoaded: null,
      isDirty: false,
    },
    lastAutoSave: null,
    entities: [],
    viewport: {
      viewMode: '2d', // '2d' | '3d' | 'sync'
      layoutMode: 'single', // 'single' | 'split' | 'floating'
    },
  }),
  getters: {
    activeMaterialDefinition(state) {
      return state.materials.find((item) => item.value === state.activeSelection.material);
    },
  },
  mutations: {
    SET_DRAW_WALL_TOOL(state, enabled) {
      state.drawWallToolEnabled = enabled;
    },
    SET_SNAPPING(state, { key, value }) {
      if (state.snapping[key] === undefined) {
        return;
      }
      state.snapping[key] = value;
    },
    SET_ACTIVE_SELECTION_MATERIAL(state, material) {
      state.activeSelection.material = material;
    },
    SET_ACTIVE_SELECTION_COLOR(state, color) {
      state.activeSelection.color = color;
    },
    RESET_SELECTION(state) {
      state.activeSelection = { ...DEFAULT_SELECTION };
    },
    SET_ACTIVE_TOOL(state, toolName) {
      state.activeTool = toolName;
    },
    SET_MEASUREMENTS(state, measurements) {
      state.measurements = measurements;
    },
    ADD_MEASUREMENT(state, measurement) {
      state.measurements.push(measurement);
    },
    CLEAR_MEASUREMENTS(state) {
      state.measurements = [];
    },
    SET_MEASUREMENT_RESULTS_VISIBLE(state, visible) {
      state.measurementResultsVisible = visible;
    },
    SET_COMMAND_STACK_INFO(state, info) {
      state.commandStackInfo = { ...info };
    },
    SET_PROJECT_INFO(state, info) {
      state.projectInfo = { ...info };
    },
    SET_LAST_AUTO_SAVE(state, timestamp) {
      state.lastAutoSave = timestamp;
    },
    SET_ENTITIES(state, entities) {
      state.entities = entities;
    },
    SET_VIEW_MODE(state, mode) {
      state.viewport.viewMode = mode;
    },
    SET_LAYOUT_MODE(state, mode) {
      state.viewport.layoutMode = mode;
    },
  },
  actions: {
    toggleDrawWallTool({ commit, state }) {
      commit('SET_DRAW_WALL_TOOL', !state.drawWallToolEnabled);
    },
    setDrawWallTool({ commit }, enabled) {
      commit('SET_DRAW_WALL_TOOL', enabled);
    },
    toggleSnapping({ commit, state }, key) {
      const current = state.snapping[key];
      if (typeof current === 'undefined') {
        return;
      }
      commit('SET_SNAPPING', { key, value: !current });
    },
    setSnapping({ commit }, payload) {
      commit('SET_SNAPPING', payload);
    },
    setActiveMaterial({ commit }, material) {
      commit('SET_ACTIVE_SELECTION_MATERIAL', material);
    },
    setActiveColor({ commit }, color) {
      commit('SET_ACTIVE_SELECTION_COLOR', color);
    },
    resetSelection({ commit }) {
      commit('RESET_SELECTION');
    },
    setActiveTool({ commit }, toolName) {
      commit('SET_ACTIVE_TOOL', toolName);
    },
    setMeasurements({ commit }, measurements) {
      commit('SET_MEASUREMENTS', measurements);
    },
    addMeasurement({ commit }, measurement) {
      commit('ADD_MEASUREMENT', measurement);
    },
    clearMeasurements({ commit }) {
      commit('CLEAR_MEASUREMENTS');
    },
    setMeasurementResultsVisible({ commit }, visible) {
      commit('SET_MEASUREMENT_RESULTS_VISIBLE', visible);
    },
    setCommandStackInfo({ commit }, info) {
      commit('SET_COMMAND_STACK_INFO', info);
    },
    setProjectInfo({ commit }, info) {
      commit('SET_PROJECT_INFO', info);
    },
    setLastAutoSave({ commit }, timestamp) {
      commit('SET_LAST_AUTO_SAVE', timestamp);
    },
    setViewMode({ commit }, mode) {
      commit('SET_VIEW_MODE', mode);
    },
    setLayoutMode({ commit }, mode) {
      commit('SET_LAYOUT_MODE', mode);
    },
  },
};
