import { v4 as uuidv4 } from 'uuid';

const state = () => ({
  walls: new Map(),
});

const getters = {
  allWalls: (state) => Array.from(state.walls.values()),
  wallById: (state) => (id) => state.walls.get(id),
  wallCount: (state) => state.walls.size,
};

const mutations = {
  ADD_WALL(state, wall) {
    state.walls.set(wall.id, wall);
  },
  REMOVE_WALL(state, id) {
    state.walls.delete(id);
  },
  UPDATE_WALL(state, { id, updates }) {
    const wall = state.walls.get(id);
    if (wall) {
      state.walls.set(id, { ...wall, ...updates });
    }
  },
  CLEAR_WALLS(state) {
    state.walls.clear();
  },
};

const actions = {
  addWall({ commit }, wallData) {
    const wall = {
      id: uuidv4(),
      start: wallData.start,
      end: wallData.end,
      material: wallData.material || 'concrete',
      color: wallData.color || '#ffffff',
      height: wallData.height || 3.0,
      thickness: wallData.thickness || 0.2,
      createdAt: new Date().toISOString(),
      ...wallData,
    };
    commit('ADD_WALL', wall);
    return wall;
  },
  removeWall({ commit }, id) {
    commit('REMOVE_WALL', id);
  },
  updateWall({ commit }, { id, updates }) {
    commit('UPDATE_WALL', { id, updates });
  },
  clearWalls({ commit }) {
    commit('CLEAR_WALLS');
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};