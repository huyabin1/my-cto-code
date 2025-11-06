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
    },
    materials: DEFAULT_MATERIALS,
    activeSelection: { ...DEFAULT_SELECTION },
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
  },
};
