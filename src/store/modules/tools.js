const state = () => ({
  activeTool: null,
});

const mutations = {
  SET_ACTIVE_TOOL(currentState, tool) {
    currentState.activeTool = tool || null;
  },
};

const actions = {
  activateTool({ commit }, tool) {
    commit('SET_ACTIVE_TOOL', tool);
  },
  clearTool({ commit }) {
    commit('SET_ACTIVE_TOOL', null);
  },
};

const getters = {
  isActive: (state) => (tool) => state.activeTool === tool,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
