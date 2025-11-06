const DEFAULT_LAYERS = [
  { id: 'layer-structure', name: '结构', visible: true },
  { id: 'layer-furniture', name: '家具', visible: true },
  { id: 'layer-annotation', name: '标注', visible: false },
  { id: 'layer-electrical', name: '强弱电', visible: true },
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
    opacity: 0.75,
    importStatus: 'idle',
    importError: null,
    lastImportedFile: '',
    unitOptions: UNIT_OPTIONS,
    selectedUnit: UNIT_OPTIONS[0].value,
    detectedUnit: 'auto',
    dxfLayers: [],
    dxfEntities: [],
    dxfExtent: null,
    userUnitOverride: null,
  }),
  getters: {
    visibleLayerIds(state) {
      return state.layers.filter((layer) => layer.visible).map((layer) => layer.id);
    },
    effectiveUnit(state) {
      return state.userUnitOverride || state.detectedUnit;
    },
    visibleDxfLayers(state) {
      return state.dxfLayers.filter((layer) => layer.visible);
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
    SET_OPACITY(state, opacity) {
      state.opacity = opacity;
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
    SET_DETECTED_UNIT(state, unit) {
      state.detectedUnit = unit;
    },
    SET_USER_UNIT_OVERRIDE(state, unit) {
      state.userUnitOverride = unit;
    },
    SET_DXF_LAYERS(state, layers) {
      state.dxfLayers = layers;
    },
    SET_DXF_ENTITIES(state, entities) {
      state.dxfEntities = entities;
    },
    SET_DXF_EXTENT(state, extent) {
      state.dxfExtent = extent;
    },
    UPDATE_DXF_LAYER_VISIBILITY(state, { layerName, visible }) {
      const layer = state.dxfLayers.find((l) => l.name === layerName);
      if (layer) {
        layer.visible = visible;
      }
    },
    CLEAR_DXF_DATA(state) {
      state.dxfLayers = [];
      state.dxfEntities = [];
      state.dxfExtent = null;
      state.detectedUnit = 'auto';
      state.userUnitOverride = null;
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
    setOpacity({ commit }, opacity) {
      commit('SET_OPACITY', opacity);
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
    async parseDxfFile({ commit }, { file, loader }) {
      commit('SET_IMPORT_STATUS', 'processing');
      commit('SET_IMPORT_ERROR', null);
      commit('SET_LAST_IMPORTED_FILE', file.name || '');

      try {
        const result = await loader.load(file);

        commit('SET_DXF_LAYERS', result.layers || []);
        commit('SET_DXF_ENTITIES', result.entities || []);
        commit('SET_DXF_EXTENT', result.extent);

        const { detectUnit } = await import('@/utils/unitDetection');
        const detectedUnit = detectUnit(result.extent);
        commit('SET_DETECTED_UNIT', detectedUnit);

        commit('SET_IMPORT_STATUS', 'success');

        return result;
      } catch (error) {
        commit('SET_IMPORT_STATUS', 'error');
        commit('SET_IMPORT_ERROR', error.message || '解析失败');
        throw error;
      }
    },
    setUserUnitOverride({ commit }, unit) {
      commit('SET_USER_UNIT_OVERRIDE', unit);
    },
    toggleDxfLayerVisibility({ commit, state }, layerName) {
      const layer = state.dxfLayers.find((l) => l.name === layerName);
      if (layer) {
        commit('UPDATE_DXF_LAYER_VISIBILITY', {
          layerName,
          visible: !layer.visible,
        });
      }
    },
    clearDxfData({ commit }) {
      commit('CLEAR_DXF_DATA');
      commit('SET_IMPORT_STATUS', 'idle');
      commit('SET_IMPORT_ERROR', null);
    },
  },
};
