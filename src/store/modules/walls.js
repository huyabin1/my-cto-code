export default {
  namespaced: true,
  state: () => ({
    walls: [],
  }),
  getters: {
    wallById: (state) => (id) => {
      return state.walls.find(wall => wall.id === id) || null;
    },
    allWalls: (state) => state.walls,
  },
  mutations: {
    ADD_WALL(state, wall) {
      state.walls.push(wall);
    },
    UPDATE_WALL(state, { id, updates }) {
      const index = state.walls.findIndex(wall => wall.id === id);
      if (index !== -1) {
        state.walls[index] = { ...state.walls[index], ...updates };
      }
    },
    DELETE_WALL(state, id) {
      const index = state.walls.findIndex(wall => wall.id === id);
      if (index !== -1) {
        state.walls.splice(index, 1);
      }
    },
    SET_WALLS(state, walls) {
      state.walls = walls;
    },
  },
  actions: {
    addWall({ commit }, wall) {
      commit('ADD_WALL', wall);
    },
    updateWall({ commit }, payload) {
      commit('UPDATE_WALL', payload);
    },
    deleteWall({ commit }, id) {
      commit('DELETE_WALL', id);
    },
    setWalls({ commit }, walls) {
      commit('SET_WALLS', walls);
    },
  },
};