const defaultSnapping = () => ({
  enabled: true,
  gridSize: 1,
  mode: 'grid',
});

const state = () => ({
  snapping: defaultSnapping(),
});

const mutations = {
  UPDATE_SNAPPING(currentState, payload) {
    currentState.snapping = {
      ...currentState.snapping,
      ...payload,
    };
  },
  RESET_SNAPPING(currentState) {
    currentState.snapping = defaultSnapping();
  },
};

const actions = {
  updateSnapping({ commit }, payload) {
    commit('UPDATE_SNAPPING', payload);
  },
  resetSnapping({ commit }) {
    commit('RESET_SNAPPING');
  },
};

const getters = {
  snappingEnabled: (state) => Boolean(state.snapping.enabled),
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
