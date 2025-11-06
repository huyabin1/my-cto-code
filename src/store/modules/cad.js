import { unitToMeters } from '@/utils/dxf';

const DEFAULT_LAYER_COLOR = '#9ca3af';
const UNIT_OPTIONS = [
  { label: '自动', value: 'auto' },
  { label: '毫米 (mm)', value: 'mm' },
  { label: '厘米 (cm)', value: 'cm' },
  { label: '米 (m)', value: 'm' },
];

const DEFAULT_SELECTED_UNIT = UNIT_OPTIONS[0].value;
const DEFAULT_DETECTED_UNIT = 'mm';

function normalizeLayers(layers, previousVisibilityMap) {
  if (!Array.isArray(layers)) {
    return [];
  }

  return layers.map((layer) => {
    const id = layer.id || layer.name;
    const fallbackVisibility = typeof layer.visible === 'boolean' ? layer.visible : true;
    return {
      id,
      name: layer.name || id,
      color: layer.color || DEFAULT_LAYER_COLOR,
      visible: previousVisibilityMap.has(id) ? previousVisibilityMap.get(id) : fallbackVisibility,
      entityCount: typeof layer.entityCount === 'number' ? layer.entityCount : 0,
    };
  });
}

function normalizeLayerGeometries(layerGeometries, normalizedLayers) {
  const result = {};

  if (layerGeometries && typeof layerGeometries === 'object') {
    Object.keys(layerGeometries).forEach((key) => {
      const entry = layerGeometries[key] || {};
      result[key] = {
        name: entry.name || key,
        color: entry.color || DEFAULT_LAYER_COLOR,
        polylines: Array.isArray(entry.polylines) ? entry.polylines.map((polyline) => ({ ...polyline })) : [],
      };
    });
  }

  normalizedLayers.forEach((layer) => {
    if (!result[layer.id]) {
      result[layer.id] = {
        name: layer.name,
        color: layer.color,
        polylines: [],
      };
    }
  });

  return result;
}

export default {
  namespaced: true,
  state: () => ({
    layers: [],
    layerGeometries: {},
    opacity: 0.75,
    importStatus: 'idle',
    importError: null,
    lastImportedFile: '',
    unitOptions: UNIT_OPTIONS,
    selectedUnit: DEFAULT_SELECTED_UNIT,
    detectedUnit: DEFAULT_DETECTED_UNIT,
  }),
  getters: {
    visibleLayerIds(state) {
      return state.layers.filter((layer) => layer.visible).map((layer) => layer.id);
    },
    unitScale(state) {
      const unit = state.selectedUnit === 'auto' ? state.detectedUnit : state.selectedUnit;
      return unitToMeters(unit);
    },
    effectiveUnit(state) {
      return state.selectedUnit === 'auto' ? state.detectedUnit : state.selectedUnit;
    },
    hasCadData(state) {
      return Object.keys(state.layerGeometries).length > 0;
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
      state.detectedUnit = unit || DEFAULT_DETECTED_UNIT;
    },
    SET_LAYERS(state, layers) {
      state.layers = layers;
    },
    SET_LAYER_GEOMETRIES(state, geometries) {
      state.layerGeometries = geometries;
    },
    RESET_CAD_DATA(state) {
      state.layers = [];
      state.layerGeometries = {};
      state.detectedUnit = DEFAULT_DETECTED_UNIT;
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
    setCadData({ commit, state }, payload = {}) {
      const previousVisibility = new Map(state.layers.map((layer) => [layer.id, layer.visible]));
      const normalizedLayers = normalizeLayers(payload.layers || [], previousVisibility);
      const normalizedGeometries = normalizeLayerGeometries(payload.layerGeometries || {}, normalizedLayers);

      commit('SET_LAYERS', normalizedLayers);
      commit('SET_LAYER_GEOMETRIES', normalizedGeometries);
      commit('SET_DETECTED_UNIT', payload.detectedUnit || state.detectedUnit || DEFAULT_DETECTED_UNIT);
    },
    clearCadData({ commit }) {
      commit('RESET_CAD_DATA');
    },
  },
};
