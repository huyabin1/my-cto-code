const DEFAULT_LAYERS = [
  { id: 'layer-structure', name: '结构', visible: true, color: '#2563eb' },
  { id: 'layer-furniture', name: '家具', visible: true, color: '#f97316' },
  { id: 'layer-annotation', name: '标注', visible: false, color: '#10b981' },
  { id: 'layer-electrical', name: '强弱电', visible: true, color: '#ec4899' },
];

const UNIT_OPTIONS = [
  { label: '自动', value: 'auto' },
  { label: '毫米', value: 'mm' },
  { label: '厘米', value: 'cm' },
  { label: '米', value: 'm' },
  { label: '英尺', value: 'ft' },
];

export default {
  namespaced: true,
  state: () => ({
    layers: DEFAULT_LAYERS.map((layer) => ({ ...layer })),
    overlayOpacity: 0.75,
    overlayPolylines: [],
    importStatus: 'idle',
    importError: null,
    lastImportedFile: '',
    unitOptions: UNIT_OPTIONS,
    selectedUnit: UNIT_OPTIONS[0].value,
  }),
  getters: {
    visibleLayerIds(state) {
      return state.layers.filter((layer) => layer.visible).map((layer) => layer.id);
    },
    layerVisibilityMap(state) {
      return state.layers.reduce((acc, layer) => {
        acc[layer.id] = layer.visible;
        return acc;
      }, {});
    },
    layerStyleMap(state) {
      return state.layers.reduce((acc, layer) => {
        acc[layer.id] = {
          color: layer.color,
        };
        return acc;
      }, {});
    },
  },
  mutations: {
    SET_LAYER_VISIBILITY(state, { id, value }) {
      const target = state.layers.find((layer) => layer.id === id);
      if (!target) {
        return;
      }
      target.visible = value;
    },
    SET_MULTIPLE_LAYER_VISIBILITY(state, visibleIds) {
      const visibilitySet = new Set(visibleIds);
      state.layers.forEach((layer) => {
        layer.visible = visibilitySet.has(layer.id);
      });
    },
    SET_OVERLAY_OPACITY(state, opacity) {
      state.overlayOpacity = typeof opacity === 'number' ? opacity : state.overlayOpacity;
    },
    SET_OVERLAY_POLYLINES(state, polylines) {
      state.overlayPolylines = Array.isArray(polylines) ? polylines : [];
    },
    SET_IMPORT_STATUS(state, status) {
      state.importStatus = status;
    },
    SET_IMPORT_ERROR(state, message) {
      state.importError = message;
    },
    SET_LAST_IMPORTED_FILE(state, fileName) {
      state.lastImportedFile = fileName;
    },
    SET_SELECTED_UNIT(state, unit) {
      state.selectedUnit = unit;
    },
  },
  actions: {
    toggleLayerVisibility({ commit, getters }, id) {
      const currentlyVisible = getters.visibleLayerIds.includes(id);
      commit('SET_LAYER_VISIBILITY', { id, value: !currentlyVisible });
    },
    setLayerVisibility({ commit }, visibleIds) {
      commit('SET_MULTIPLE_LAYER_VISIBILITY', visibleIds);
    },
    setOverlayOpacity({ commit }, opacity) {
      commit('SET_OVERLAY_OPACITY', opacity);
    },
    setOverlayPolylines({ commit }, polylines) {
      commit('SET_OVERLAY_POLYLINES', polylines);
    },
    startDxfImport({ commit }, { fileName }) {
      commit('SET_IMPORT_STATUS', 'processing');
      commit('SET_IMPORT_ERROR', null);
      commit('SET_LAST_IMPORTED_FILE', fileName || '');
    },
    completeDxfImport({ commit }, { fileName }) {
      commit('SET_IMPORT_STATUS', 'success');
      if (fileName) {
        commit('SET_LAST_IMPORTED_FILE', fileName);
      }
    },
    failDxfImport({ commit }, { fileName, error }) {
      commit('SET_IMPORT_STATUS', 'error');
      commit('SET_IMPORT_ERROR', error || '解析失败');
      if (fileName) {
        commit('SET_LAST_IMPORTED_FILE', fileName);
      }
    },
    setSelectedUnit({ commit }, unit) {
      commit('SET_SELECTED_UNIT', unit);
    },
  },
};
