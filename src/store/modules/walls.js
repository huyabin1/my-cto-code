const clonePoint = (point = {}) => ({
  x: point.x || 0,
  y: point.y || 0,
  z: point.z || 0,
});

const cloneWall = (wall) => ({
  id: wall.id,
  start: clonePoint(wall.start),
  end: clonePoint(wall.end),
  height: wall.height != null ? wall.height : 3,
  thickness: wall.thickness != null ? wall.thickness : 0.2,
  metadata: wall.metadata ? { ...wall.metadata } : {},
});

const cloneCollection = (walls = []) => walls.map(cloneWall);

const MAX_HISTORY = 50;

const state = () => ({
  items: [],
  undoStack: [],
  redoStack: [],
});

const mutations = {
  UPSERT_WALL(currentState, wall) {
    if (!wall || !wall.id) {
      return;
    }

    const nextWall = cloneWall(wall);
    const index = currentState.items.findIndex((item) => item.id === wall.id);

    if (index === -1) {
      currentState.items = [...currentState.items, nextWall];
    } else {
      const items = [...currentState.items];
      items.splice(index, 1, nextWall);
      currentState.items = items;
    }
  },
  REMOVE_WALL(currentState, wallId) {
    currentState.items = currentState.items.filter((wall) => wall.id !== wallId);
  },
  SET_WALLS(currentState, walls) {
    currentState.items = cloneCollection(walls);
  },
  PUSH_HISTORY(currentState) {
    currentState.undoStack = [...currentState.undoStack, cloneCollection(currentState.items)].slice(-MAX_HISTORY);
  },
  POP_HISTORY(currentState) {
    currentState.undoStack = currentState.undoStack.slice(0, -1);
  },
  CLEAR_REDO(currentState) {
    currentState.redoStack = [];
  },
  PUSH_REDO_SNAPSHOT(currentState) {
    currentState.redoStack = [...currentState.redoStack, cloneCollection(currentState.items)].slice(-MAX_HISTORY);
  },
  POP_REDO(currentState) {
    currentState.redoStack = currentState.redoStack.slice(0, -1);
  },
};

const actions = {
  addWall({ commit }, wall) {
    commit('PUSH_HISTORY');
    commit('UPSERT_WALL', wall);
    commit('CLEAR_REDO');
  },
  removeWall({ commit }, wallId) {
    commit('PUSH_HISTORY');
    commit('REMOVE_WALL', wallId);
    commit('CLEAR_REDO');
  },
  updateWall({ commit }, wall) {
    commit('PUSH_HISTORY');
    commit('UPSERT_WALL', wall);
    commit('CLEAR_REDO');
  },
  replaceWalls({ commit }, walls) {
    commit('SET_WALLS', walls);
  },
  undo({ state, commit }) {
    if (!state.undoStack.length) {
      return;
    }

    const snapshot = state.undoStack[state.undoStack.length - 1];
    commit('PUSH_REDO_SNAPSHOT');
    commit('SET_WALLS', snapshot);
    commit('POP_HISTORY');
  },
  redo({ state, commit }) {
    if (!state.redoStack.length) {
      return;
    }

    const snapshot = state.redoStack[state.redoStack.length - 1];
    commit('PUSH_HISTORY');
    commit('SET_WALLS', snapshot);
    commit('POP_REDO');
  },
};

const getters = {
  getWallById: (state) => (id) => state.items.find((wall) => wall.id === id),
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
