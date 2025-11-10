const DEFAULT_MATERIALS = [
  { label: '混凝土', value: 'concrete' },
  { label: '砖', value: 'brick' },
  { label: '石膏板', value: 'drywall' },
  { label: '木饰面', value: 'wood' },
];

const DEFAULT_SELECTION = {
  id: 'wall-default',
  name: '墙体 A1',
  material: DEFAULT_MATERIALS[0].value,
  color: '#ffffff',
};

const DEFAULT_SELECTION_STATE = Object.freeze({
  mode: 'none',
  ids: [],
  primaryId: null,
  hoveredId: null,
  marquee: {
    active: false,
    start: null,
    end: null,
  },
  lastUpdated: null,
});

function createDefaultSelectionState() {
  return {
    mode: DEFAULT_SELECTION_STATE.mode,
    ids: [...DEFAULT_SELECTION_STATE.ids],
    primaryId: DEFAULT_SELECTION_STATE.primaryId,
    hoveredId: DEFAULT_SELECTION_STATE.hoveredId,
    marquee: { ...DEFAULT_SELECTION_STATE.marquee },
    lastUpdated: Date.now(),
  };
}

export default {
  namespaced: true,
  state: () => ({
    drawWallToolEnabled: false,
    snapping: {
      orthogonal: true,
      diagonal45: false,
      grid: false,
      node: true,
      intersection: true,
    },
    materials: DEFAULT_MATERIALS,
    activeSelection: { ...DEFAULT_SELECTION },
    activeTool: null, // 'distance' | 'area' | 'angle' | null
    measurements: [],
    measurementResultsVisible: false,
    commandStackInfo: {
      canUndo: false,
      canRedo: false,
      undoCount: 0,
      redoCount: 0,
      maxStackSize: 50,
      undoHistory: [],
      redoHistory: [],
    },
    projectInfo: {
      name: 'Untitled Project',
      createdAt: null,
      lastSaved: null,
      lastLoaded: null,
      isDirty: false,
    },
    lastAutoSave: null,
    entities: [],
    selection: createDefaultSelectionState(),
    viewport: {
      viewMode: '2d', // '2d' | '3d' | 'sync'
      layoutMode: 'single', // 'single' | 'split' | 'floating'
    },
    commandStack: null, // Reference to CommandStack instance
  }),
  getters: {
    activeMaterialDefinition(state) {
      return state.materials.find((item) => item.value === state.activeSelection.material);
    },
    selectedEntities(state) {
      if (!state.selection.ids || state.selection.ids.length === 0) {
        return [];
      }
      const selectionSet = new Set(state.selection.ids);
      return state.entities.filter((entity) => selectionSet.has(entity.id));
    },
    primarySelectedEntity(state, getters) {
      return getters.selectedEntities.length > 0 ? getters.selectedEntities[0] : null;
    },
    selectionMode(state) {
      return state.selection.mode;
    },
  },
  mutations: {
    SET_DRAW_WALL_TOOL(state, enabled) {
      state.drawWallToolEnabled = enabled;
    },
    SET_SNAPPING(state, { key, value }) {
      if (state.snapping[key] === undefined) {
        return;
      }
      state.snapping[key] = value;
    },
    SET_ACTIVE_SELECTION_MATERIAL(state, material) {
      state.activeSelection.material = material;
    },
    SET_ACTIVE_SELECTION_COLOR(state, color) {
      state.activeSelection.color = color;
    },
    SET_SELECTION_STATE(state, selectionState) {
      const next = {
        ...state.selection,
        ...selectionState,
      };

      if (selectionState.ids) {
        next.ids = [...selectionState.ids];
      } else {
        next.ids = [...state.selection.ids];
      }

      const previousMarquee =
        (state.selection && state.selection.marquee) || DEFAULT_SELECTION_STATE.marquee;

      if (selectionState.marquee) {
        next.marquee = {
          ...previousMarquee,
          ...selectionState.marquee,
        };
      } else if (selectionState.marquee === null) {
        next.marquee = { ...DEFAULT_SELECTION_STATE.marquee };
      } else if (!next.marquee) {
        next.marquee = { ...previousMarquee };
      }

      if (next.marquee) {
        next.marquee = { ...next.marquee };
      } else {
        next.marquee = { ...DEFAULT_SELECTION_STATE.marquee };
      }

      state.selection = next;
    },
    RESET_SELECTION_STATE(state) {
      state.selection = createDefaultSelectionState();
    },
    RESET_SELECTION(state) {
      state.activeSelection = { ...DEFAULT_SELECTION };
      state.selection = createDefaultSelectionState();
    },
    SET_ACTIVE_TOOL(state, toolName) {
      state.activeTool = toolName;
    },
    SET_MEASUREMENTS(state, measurements) {
      state.measurements = measurements;
    },
    ADD_MEASUREMENT(state, measurement) {
      state.measurements.push(measurement);
    },
    CLEAR_MEASUREMENTS(state) {
      state.measurements = [];
    },
    SET_MEASUREMENT_RESULTS_VISIBLE(state, visible) {
      state.measurementResultsVisible = visible;
    },
    SET_COMMAND_STACK_INFO(state, info) {
      state.commandStackInfo = { ...info };
    },
    SET_PROJECT_INFO(state, info) {
      state.projectInfo = { ...info };
    },
    SET_LAST_AUTO_SAVE(state, timestamp) {
      state.lastAutoSave = timestamp;
    },
    SET_ENTITIES(state, entities) {
      state.entities = entities;
    },
    SET_VIEW_MODE(state, mode) {
      state.viewport.viewMode = mode;
    },
    SET_LAYOUT_MODE(state, mode) {
      state.viewport.layoutMode = mode;
    },
    ADD_ENTITY(state, entity) {
      if (!state.entities.find((e) => e.id === entity.id)) {
        state.entities.push(entity);
      }
    },
    REMOVE_ENTITY(state, entityId) {
      const index = state.entities.findIndex((e) => e.id === entityId);
      if (index > -1) {
        state.entities.splice(index, 1);
      }
    },
    UPDATE_ENTITY_PROPERTY(state, { entityId, property, value }) {
      const entity = state.entities.find((e) => e.id === entityId);
      if (entity) {
        entity[property] = value;
      }
    },
    SET_COMMAND_STACK(state, commandStack) {
      state.commandStack = commandStack;
    },
  },
  actions: {
    toggleDrawWallTool({ commit, state }) {
      commit('SET_DRAW_WALL_TOOL', !state.drawWallToolEnabled);
    },
    setDrawWallTool({ commit }, enabled) {
      commit('SET_DRAW_WALL_TOOL', enabled);
    },
    toggleSnapping({ commit, state }, key) {
      const current = state.snapping[key];
      if (typeof current === 'undefined') {
        return;
      }
      commit('SET_SNAPPING', { key, value: !current });
    },
    setSnapping({ commit }, payload) {
      commit('SET_SNAPPING', payload);
    },
    setActiveMaterial({ commit }, material) {
      commit('SET_ACTIVE_SELECTION_MATERIAL', material);
    },
    setActiveColor({ commit }, color) {
      commit('SET_ACTIVE_SELECTION_COLOR', color);
    },
    resetSelection({ commit }) {
      commit('RESET_SELECTION');
    },
    setSelection(
      { commit, state },
      { ids = [], mode = 'replace', marquee = null, hoveredId } = {}
    ) {
      const normalizedIds = Array.isArray(ids)
        ? ids.filter((id) => id !== null && id !== undefined)
        : [];
      const uniqueIds = Array.from(new Set(normalizedIds));
      const currentIds = state.selection?.ids ? [...state.selection.ids] : [];
      let finalIds;

      switch (mode) {
        case 'add':
          finalIds = Array.from(new Set([...currentIds, ...uniqueIds]));
          break;
        case 'toggle':
          finalIds = [...currentIds];
          uniqueIds.forEach((id) => {
            const index = finalIds.indexOf(id);
            if (index > -1) {
              finalIds.splice(index, 1);
            } else {
              finalIds.push(id);
            }
          });
          break;
        case 'remove':
          finalIds = currentIds.filter((id) => !uniqueIds.includes(id));
          break;
        default:
          finalIds = uniqueIds;
          break;
      }

      const selectionMode =
        finalIds.length === 0 ? 'none' : finalIds.length === 1 ? 'single' : 'multi';

      const payload = {
        ids: finalIds,
        primaryId: finalIds[0] || null,
        mode: selectionMode,
        marquee: marquee
          ? {
              active: true,
              start: marquee.start ? { x: marquee.start.x, y: marquee.start.y } : null,
              end: marquee.end ? { x: marquee.end.x, y: marquee.end.y } : null,
            }
          : { ...DEFAULT_SELECTION_STATE.marquee },
        lastUpdated: Date.now(),
      };

      if (hoveredId !== undefined) {
        payload.hoveredId = hoveredId;
      }

      commit('SET_SELECTION_STATE', payload);
      return payload;
    },
    clearSelection({ commit }) {
      commit('RESET_SELECTION');
    },
    updateSelectionMarquee({ commit }, marquee) {
      const payload =
        marquee && marquee.active
          ? {
              marquee: {
                active: true,
                start: marquee.start ? { x: marquee.start.x, y: marquee.start.y } : null,
                end: marquee.end ? { x: marquee.end.x, y: marquee.end.y } : null,
              },
              lastUpdated: Date.now(),
            }
          : {
              marquee: { ...DEFAULT_SELECTION_STATE.marquee },
              lastUpdated: Date.now(),
            };
      commit('SET_SELECTION_STATE', payload);
      return payload;
    },
    setHoveredEntity({ commit }, hoveredId = null) {
      commit('SET_SELECTION_STATE', {
        hoveredId,
        lastUpdated: Date.now(),
      });
    },
    setActiveTool({ commit }, toolName) {
      commit('SET_ACTIVE_TOOL', toolName);
    },
    setMeasurements({ commit }, measurements) {
      commit('SET_MEASUREMENTS', measurements);
    },
    addMeasurement({ commit }, measurement) {
      commit('ADD_MEASUREMENT', measurement);
    },
    clearMeasurements({ commit }) {
      commit('CLEAR_MEASUREMENTS');
    },
    setMeasurementResultsVisible({ commit }, visible) {
      commit('SET_MEASUREMENT_RESULTS_VISIBLE', visible);
    },
    setCommandStackInfo({ commit }, info) {
      commit('SET_COMMAND_STACK_INFO', info);
    },
    setProjectInfo({ commit }, info) {
      commit('SET_PROJECT_INFO', info);
    },
    setLastAutoSave({ commit }, timestamp) {
      commit('SET_LAST_AUTO_SAVE', timestamp);
    },
    setViewMode({ commit }, mode) {
      commit('SET_VIEW_MODE', mode);
    },
    setLayoutMode({ commit }, mode) {
      commit('SET_LAYOUT_MODE', mode);
    },
    addEntity({ commit }, entity) {
      commit('ADD_ENTITY', entity);
    },
    removeEntity({ commit }, entityId) {
      commit('REMOVE_ENTITY', entityId);
    },
    setCommandStack({ commit }, commandStack) {
      commit('SET_COMMAND_STACK', commandStack);
    },
    async updateProperties({ state, commit }, { entityId, property, newValue, oldValue }) {
      if (!state.commandStack) {
        throw new Error('CommandStack not initialized');
      }

      const { UpdateEntityPropertyCommand } = await import('@/three/command/EntityPropertyCommands');

      const command = new UpdateEntityPropertyCommand(
        this,
        entityId,
        property,
        newValue,
        oldValue
      );

      try {
        await state.commandStack.execute(command);
      } catch (error) {
        console.error('Failed to update entity property:', error);
        throw error;
      }
    },
  },
};
