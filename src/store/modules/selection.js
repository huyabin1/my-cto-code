export default {
  namespaced: true,
  state: () => ({
    activeObjectIds: [],
  }),
  getters: {
    activeObjectIds: (state) => state.activeObjectIds,
    hasActiveSelection: (state) => state.activeObjectIds.length > 0,
    firstActiveObjectId: (state) => state.activeObjectIds[0] || null,
  },
  mutations: {
    SET_ACTIVE_OBJECTS(state, ids) {
      state.activeObjectIds = Array.isArray(ids) ? [...ids] : [];
    },
    ADD_ACTIVE_OBJECT(state, id) {
      if (!state.activeObjectIds.includes(id)) {
        state.activeObjectIds.push(id);
      }
    },
    REMOVE_ACTIVE_OBJECT(state, id) {
      const index = state.activeObjectIds.indexOf(id);
      if (index !== -1) {
        state.activeObjectIds.splice(index, 1);
      }
    },
    CLEAR_ACTIVE_OBJECTS(state) {
      state.activeObjectIds = [];
    },
  },
  actions: {
    setActiveObjects({ commit }, ids) {
      commit('SET_ACTIVE_OBJECTS', ids);
    },
    addActiveObject({ commit }, id) {
      commit('ADD_ACTIVE_OBJECT', id);
    },
    removeActiveObject({ commit }, id) {
      commit('REMOVE_ACTIVE_OBJECT', id);
    },
    clearActiveObjects({ commit }) {
      commit('CLEAR_ACTIVE_OBJECTS');
    },
  },
};