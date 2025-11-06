const defaultLayers = () => ({
  cad: true,
  walls: true,
  helpers: true,
});

const state = () => ({
  units: 'metric',
  layers: defaultLayers(),
  overlay: {
    isLoaded: false,
    data: null,
  },
});

const mutations = {
  SET_UNITS(currentState, units) {
    currentState.units = units;
  },
  SET_LAYER_VISIBILITY(currentState, { layer, visible }) {
    currentState.layers = {
      ...currentState.layers,
      [layer]: visible,
    };
  },
  SET_LAYERS(currentState, payload) {
    currentState.layers = {
      ...currentState.layers,
      ...payload,
    };
  },
  SET_OVERLAY(currentState, overlay) {
    currentState.overlay = {
      isLoaded: Boolean(overlay && overlay.isLoaded),
      data: overlay ? overlay.data || null : null,
    };
  },
  RESET_LAYERS(currentState) {
    currentState.layers = defaultLayers();
  },
};

const actions = {
  setUnits({ commit }, units) {
    commit('SET_UNITS', units);
  },
  toggleLayer({ commit, state }, layer) {
    const next = !state.layers[layer];
    commit('SET_LAYER_VISIBILITY', { layer, visible: next });
  },
  setLayerVisibility({ commit }, payload) {
    commit('SET_LAYER_VISIBILITY', payload);
  },
  setOverlay({ commit }, overlay) {
    commit('SET_OVERLAY', overlay);
  },
  resetLayers({ commit }) {
    commit('RESET_LAYERS');
  },
};

const getters = {
  isLayerVisible: (state) => (layer) => state.layers[layer] !== false,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
