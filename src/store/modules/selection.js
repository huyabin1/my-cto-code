const state = () => ({
  activeWallId: null,
});

const mutations = {
  SET_SELECTION(currentState, wallId) {
    currentState.activeWallId = wallId || null;
  },
};

const actions = {
  selectWall({ commit }, wallId) {
    commit('SET_SELECTION', wallId);
  },
  clearSelection({ commit }) {
    commit('SET_SELECTION', null);
  },
};

const getters = {
  isSelected: (state) => (wallId) => state.activeWallId === wallId,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
