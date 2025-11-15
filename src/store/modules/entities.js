/**
 * Entities Store Module
 * 统一的元素数据模型，支撑创建/修改/删除流程
 */

import { generateId } from '@/utils/projectSerializer';

// Entity type definitions
export const ENTITY_TYPES = {
  WALL: 'wall',
  DOOR: 'door',
  WINDOW: 'window',
  SPACE: 'space',
  MEASUREMENT: 'measurement',
};

// Default entity properties by type
const DEFAULT_ENTITY_PROPERTIES = {
  [ENTITY_TYPES.WALL]: {
    height: 2.8,
    thickness: 0.2,
    material: 'concrete',
    color: '#ffffff',
    layer: 'layer-structure',
  },
  [ENTITY_TYPES.DOOR]: {
    width: 0.9,
    height: 2.1,
    doorType: 'single',
    material: 'wood',
    color: '#8B4513',
    layer: 'layer-structure',
  },
  [ENTITY_TYPES.WINDOW]: {
    width: 1.2,
    height: 1.5,
    windowType: 'casement',
    material: 'aluminum',
    color: '#C0C0C0',
    layer: 'layer-structure',
  },
  [ENTITY_TYPES.SPACE]: {
    area: 0,
    perimeter: 0,
    roomType: 'living',
    layer: 'layer-structure',
  },
  [ENTITY_TYPES.MEASUREMENT]: {
    value: 0,
    unit: 'm',
    layer: 'layer-annotation',
  },
};

// Initial state
function createInitialState() {
  return {
    // All entities in the project
    entities: [],
    // Indexes for efficient querying
    indexes: {
      byType: new Map(),
      byLayer: new Map(),
      byId: new Map(),
    },
    // Entity hierarchy (parent-child relationships)
    hierarchy: new Map(),
    // Selection state
    selection: {
      ids: [],
      primaryId: null,
      lastUpdated: null,
    },
    // Performance tracking
    stats: {
      totalEntities: 0,
      entitiesByType: {},
      entitiesByLayer: {},
    },
  };
}

// Helper functions
function rebuildIndexes(state) {
  state.indexes.byId.clear();
  state.indexes.byType.clear();
  state.indexes.byLayer.clear();
  
  const typeCount = {};
  const layerCount = {};

  state.entities.forEach(entity => {
    // Build ID index
    state.indexes.byId.set(entity.id, entity);
    
    // Build type index
    if (!state.indexes.byType.has(entity.type)) {
      state.indexes.byType.set(entity.type, []);
    }
    state.indexes.byType.get(entity.type).push(entity);
    typeCount[entity.type] = (typeCount[entity.type] || 0) + 1;
    
    // Build layer index
    const layer = entity.layer || 'default';
    if (!state.indexes.byLayer.has(layer)) {
      state.indexes.byLayer.set(layer, []);
    }
    state.indexes.byLayer.get(layer).push(entity);
    layerCount[layer] = (layerCount[layer] || 0) + 1;
  });

  // Update stats
  state.stats.totalEntities = state.entities.length;
  state.stats.entitiesByType = typeCount;
  state.stats.entitiesByLayer = layerCount;
}

function createEntity(type, properties = {}) {
  const defaults = DEFAULT_ENTITY_PROPERTIES[type] || {};
  const entity = {
    id: properties.id || generateId(),
    type,
    name: properties.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${Date.now()}`,
    visible: properties.visible !== undefined ? properties.visible : true,
    locked: properties.locked !== undefined ? properties.locked : false,
    layer: properties.layer || defaults.layer || 'default',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...defaults,
    ...properties,
  };

  // Ensure reserved properties take precedence
  entity.id = properties.id || generateId();
  entity.type = type;
  entity.name = properties.name || entity.name;
  entity.visible = properties.visible !== undefined ? properties.visible : true;
  entity.locked = properties.locked !== undefined ? properties.locked : false;
  entity.layer = properties.layer || defaults.layer || 'default';
  entity.createdAt = Date.now();
  entity.updatedAt = Date.now();

  return entity;
}

function validateEntity(entity) {
  if (!entity.id || typeof entity.id !== 'string') {
    throw new Error('Entity must have a valid id');
  }
  if (!entity.type || !Object.values(ENTITY_TYPES).includes(entity.type)) {
    throw new Error('Entity must have a valid type');
  }
  if (!entity.name || typeof entity.name !== 'string') {
    throw new Error('Entity must have a valid name');
  }
  return true;
}

export default {
  namespaced: true,
  
  state: createInitialState,
  
  getters: {
    // Basic entity getters
    allEntities: (state) => state.entities,
    getEntityById: (state) => (id) => state.indexes.byId.get(id),
    getEntitiesByIds: (state) => (ids) => ids.map(id => state.indexes.byId.get(id)).filter(Boolean),
    
    // Type-based getters
    getEntitiesByType: (state) => (type) => state.indexes.byType.get(type) || [],
    walls: (state, getters) => getters.getEntitiesByType(ENTITY_TYPES.WALL),
    doors: (state, getters) => getters.getEntitiesByType(ENTITY_TYPES.DOOR),
    windows: (state, getters) => getters.getEntitiesByType(ENTITY_TYPES.WINDOW),
    spaces: (state, getters) => getters.getEntitiesByType(ENTITY_TYPES.SPACE),
    measurements: (state, getters) => getters.getEntitiesByType(ENTITY_TYPES.MEASUREMENT),
    
    // Layer-based getters
    getEntitiesByLayer: (state) => (layerId) => state.indexes.byLayer.get(layerId) || [],
    visibleEntitiesByLayer: (state, getters, rootState, rootGetters) => (layerId) => {
      const layerEntities = getters.getEntitiesByLayer(layerId);
      const visibleLayerIds = rootGetters['cad/visibleLayerIds'];
      return layerEntities.filter(entity => 
        entity.visible && 
        visibleLayerIds.includes(entity.layer)
      );
    },
    
    // Selection-based getters
    selectedEntities: (state) => {
      return state.selection.ids.map(id => state.indexes.byId.get(id)).filter(Boolean);
    },
    primarySelectedEntity: (state, getters) => {
      return state.selection.primaryId ? state.indexes.byId.get(state.selection.primaryId) : null;
    },
    isEntitySelected: (state) => (id) => state.selection.ids.includes(id),
    
    // Visibility and filtering
    visibleEntities: (state, getters, rootState, rootGetters) => {
      const visibleLayerIds = rootGetters['cad/visibleLayerIds'];
      return state.entities.filter(entity => 
        entity.visible && 
        visibleLayerIds.includes(entity.layer)
      );
    },
    unlockedEntities: (state) => state.entities.filter(entity => !entity.locked),
    editableEntities: (state, getters, rootState, rootGetters) => {
      const visibleLayerIds = rootGetters['cad/visibleLayerIds'];
      return state.entities.filter(entity => 
        entity.visible && 
        !entity.locked && 
        visibleLayerIds.includes(entity.layer)
      );
    },
    
    // Hierarchy getters
    getEntityChildren: (state) => (parentId) => {
      const children = [];
      state.hierarchy.forEach((childIds, id) => {
        if (id === parentId) {
          children.push(...childIds.map(childId => state.indexes.byId.get(childId)).filter(Boolean));
        }
      });
      return children;
    },
    getEntityParent: (state) => (childId) => {
      for (const [parentId, childIds] of state.hierarchy) {
        if (childIds.includes(childId)) {
          return parentId;
        }
      }
      return null;
    },
    
    // Statistics
    entityStats: (state) => state.stats,
    entityCount: (state) => state.entities.length,
    entityCountByType: (state) => state.stats.entitiesByType,
    entityCountByLayer: (state) => state.stats.entitiesByLayer,
    
    // Utility getters
    hasEntities: (state) => state.entities.length > 0,
    hasSelection: (state) => state.selection.ids.length > 0,
    isMultiSelection: (state) => state.selection.ids.length > 1,
  },
  
  mutations: {
    // Entity CRUD mutations
    ADD_ENTITY(state, entity) {
      validateEntity(entity);
      
      // Check for duplicates
      if (state.indexes.byId.has(entity.id)) {
        throw new Error(`Entity with id ${entity.id} already exists`);
      }
      
      state.entities.push(entity);
      rebuildIndexes(state);
    },
    
    ADD_ENTITIES(state, entities) {
      entities.forEach(entity => {
        validateEntity(entity);
        
        if (state.indexes.byId.has(entity.id)) {
          throw new Error(`Entity with id ${entity.id} already exists`);
        }
      });
      
      state.entities.push(...entities);
      rebuildIndexes(state);
    },
    
    UPDATE_ENTITY(state, { id, updates }) {
      const entity = state.indexes.byId.get(id);
      if (!entity) {
        throw new Error(`Entity with id ${id} not found`);
      }
      
      // Apply updates
      Object.assign(entity, updates, { updatedAt: Date.now() });
      rebuildIndexes(state);
    },
    
    UPDATE_ENTITIES(state, updates) {
      updates.forEach(({ id, updates: entityUpdates }) => {
        const entity = state.indexes.byId.get(id);
        if (entity) {
          Object.assign(entity, entityUpdates, { updatedAt: Date.now() });
        }
      });
      rebuildIndexes(state);
    },
    
    REMOVE_ENTITY(state, id) {
      const index = state.entities.findIndex(e => e.id === id);
      if (index === -1) {
        throw new Error(`Entity with id ${id} not found`);
      }
      
      state.entities.splice(index, 1);
      
      // Remove from hierarchy
      state.hierarchy.delete(id);
      state.hierarchy.forEach((children, parentId) => {
        const childIndex = children.indexOf(id);
        if (childIndex > -1) {
          children.splice(childIndex, 1);
        }
      });
      
      // Remove from selection
      const selectionIndex = state.selection.ids.indexOf(id);
      if (selectionIndex > -1) {
        state.selection.ids.splice(selectionIndex, 1);
        if (state.selection.primaryId === id) {
          state.selection.primaryId = state.selection.ids[0] || null;
        }
      }
      
      rebuildIndexes(state);
    },
    
    REMOVE_ENTITIES(state, ids) {
      const idSet = new Set(ids);
      
      state.entities = state.entities.filter(entity => !idSet.has(entity.id));
      
      // Remove from hierarchy
      ids.forEach(id => {
        state.hierarchy.delete(id);
      });
      state.hierarchy.forEach((children, parentId) => {
        state.hierarchy.set(parentId, children.filter(id => !idSet.has(id)));
      });
      
      // Remove from selection
      state.selection.ids = state.selection.ids.filter(id => !idSet.has(id));
      if (state.selection.primaryId && idSet.has(state.selection.primaryId)) {
        state.selection.primaryId = state.selection.ids[0] || null;
      }
      
      rebuildIndexes(state);
    },
    
    // Selection mutations
    SET_SELECTION(state, { ids = [], primaryId = null }) {
      const uniqueIds = [...new Set(ids)];
      state.selection.ids = uniqueIds;
      state.selection.primaryId = primaryId || (uniqueIds[0] || null);
      state.selection.lastUpdated = Date.now();
    },
    
    ADD_TO_SELECTION(state, ids) {
      const newIds = Array.isArray(ids) ? ids : [ids];
      const uniqueNewIds = newIds.filter(id => !state.selection.ids.includes(id));
      state.selection.ids.push(...uniqueNewIds);
      if (!state.selection.primaryId && uniqueNewIds.length > 0) {
        state.selection.primaryId = uniqueNewIds[0];
      }
      state.selection.lastUpdated = Date.now();
    },
    
    REMOVE_FROM_SELECTION(state, ids) {
      const idsToRemove = Array.isArray(ids) ? ids : [ids];
      state.selection.ids = state.selection.ids.filter(id => !idsToRemove.includes(id));
      if (state.selection.primaryId && idsToRemove.includes(state.selection.primaryId)) {
        state.selection.primaryId = state.selection.ids[0] || null;
      }
      state.selection.lastUpdated = Date.now();
    },
    
    CLEAR_SELECTION(state) {
      state.selection.ids = [];
      state.selection.primaryId = null;
      state.selection.lastUpdated = Date.now();
    },
    
    // Hierarchy mutations
    SET_ENTITY_PARENT(state, { childId, parentId }) {
      // Remove from current parent
      state.hierarchy.forEach((children, currentParentId) => {
        const index = children.indexOf(childId);
        if (index > -1) {
          children.splice(index, 1);
        }
      });
      
      // Add to new parent
      if (parentId && !state.hierarchy.has(parentId)) {
        state.hierarchy.set(parentId, []);
      }
      if (parentId) {
        state.hierarchy.get(parentId).push(childId);
      }
    },
    
    // Bulk operations
    RESET_ENTITIES(state) {
      Object.assign(state, createInitialState());
    },
    
    REPLACE_ENTITIES(state, entities) {
      state.entities = entities;
      rebuildIndexes(state);
    },
  },
  
  actions: {
    // CRUD Actions
    async createEntities({ commit }, { type, entities }) {
      const createdEntities = entities.map(props => createEntity(type, props));
      commit('ADD_ENTITIES', createdEntities);
      return createdEntities;
    },
    
    async createEntity({ commit }, { type, ...properties }) {
      const entity = createEntity(type, properties);
      commit('ADD_ENTITY', entity);
      return entity;
    },
    
    async updateGeometry({ commit }, { id, geometry }) {
      commit('UPDATE_ENTITY', { 
        id, 
        updates: { geometry, updatedAt: Date.now() } 
      });
    },
    
    async updateEntity({ commit }, { id, updates }) {
      commit('UPDATE_ENTITY', { id, updates });
    },
    
    async updateEntities({ commit }, updates) {
      commit('UPDATE_ENTITIES', updates);
    },
    
    async deleteSelection({ state, commit }) {
      if (state.selection.ids.length === 0) {
        return [];
      }
      
      const deletedIds = [...state.selection.ids];
      commit('REMOVE_ENTITIES', deletedIds);
      commit('CLEAR_SELECTION');
      return deletedIds;
    },
    
    async deleteEntity({ commit }, id) {
      commit('REMOVE_ENTITY', id);
    },
    
    async deleteEntities({ commit }, ids) {
      commit('REMOVE_ENTITIES', ids);
    },
    
    // Duplicate operations
    async duplicateEntities({ state, commit, getters }, { ids = null, offset = { x: 1, y: 1, z: 0 } }) {
      const idsToDuplicate = ids || state.selection.ids;
      if (idsToDuplicate.length === 0) {
        return [];
      }
      
      const entitiesToDuplicate = getters.getEntitiesByIds(idsToDuplicate);
      const duplicatedEntities = [];
      
      for (const originalEntity of entitiesToDuplicate) {
        const duplicatedEntity = {
          ...originalEntity,
          id: generateId(),
          name: `${originalEntity.name} (Copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        // Apply offset to position if it exists
        if (duplicatedEntity.position && Array.isArray(duplicatedEntity.position)) {
          duplicatedEntity.position = [
            duplicatedEntity.position[0] + offset.x,
            duplicatedEntity.position[1] + offset.y,
            duplicatedEntity.position[2] + (offset.z || 0),
          ];
        }
        
        duplicatedEntities.push(duplicatedEntity);
      }
      
      commit('ADD_ENTITIES', duplicatedEntities);
      return duplicatedEntities;
    },
    
    // Selection actions
    async setSelection({ commit }, { ids, primaryId }) {
      commit('SET_SELECTION', { ids, primaryId });
    },
    
    async addToSelection({ commit }, ids) {
      commit('ADD_TO_SELECTION', ids);
    },
    
    async removeFromSelection({ commit }, ids) {
      commit('REMOVE_FROM_SELECTION', ids);
    },
    
    async clearSelection({ commit }) {
      commit('CLEAR_SELECTION');
    },
    
    async selectAll({ state, commit }) {
      const allIds = state.entities.map(e => e.id);
      commit('SET_SELECTION', { ids: allIds });
    },
    
    async selectByType({ commit, getters }, type) {
      const entities = getters.getEntitiesByType(type);
      const ids = entities.map(e => e.id);
      commit('SET_SELECTION', { ids });
    },
    
    async selectByLayer({ commit, getters }, layerId) {
      const entities = getters.getEntitiesByLayer(layerId);
      const ids = entities.map(e => e.id);
      commit('SET_SELECTION', { ids });
    },
    
    // Visibility actions
    async toggleEntityVisibility({ commit, getters }, id) {
      const entity = getters.getEntityById(id);
      if (entity) {
        commit('UPDATE_ENTITY', { 
          id, 
          updates: { visible: !entity.visible } 
        });
      }
    },
    
    async setEntitiesVisibility({ commit }, { ids, visible }) {
      const updates = ids.map(id => ({ id, updates: { visible } }));
      commit('UPDATE_ENTITIES', updates);
    },
    
    // Lock actions
    async toggleEntityLock({ commit, getters }, id) {
      const entity = getters.getEntityById(id);
      if (entity) {
        commit('UPDATE_ENTITY', { 
          id, 
          updates: { locked: !entity.locked } 
        });
      }
    },
    
    async setEntitiesLock({ commit }, { ids, locked }) {
      const updates = ids.map(id => ({ id, updates: { locked } }));
      commit('UPDATE_ENTITIES', updates);
    },
    
    // Layer actions
    async moveEntitiesToLayer({ commit }, { ids, layerId }) {
      const updates = ids.map(id => ({ id, updates: { layer: layerId } }));
      commit('UPDATE_ENTITIES', updates);
    },
    
    // Batch operations
    async batchUpdate({ commit }, updates) {
      commit('UPDATE_ENTITIES', updates);
    },
    
    // Cleanup and maintenance
    async cleanupOrphanedEntities({ state, commit }) {
      // Remove entities that reference non-existent parents
      const orphanedIds = [];
      state.hierarchy.forEach((children, parentId) => {
        const parentExists = state.indexes.byId.has(parentId);
        if (!parentExists) {
          orphanedIds.push(...children);
        }
      });
      
      if (orphanedIds.length > 0) {
        commit('REMOVE_ENTITIES', orphanedIds);
      }
      
      return orphanedIds;
    },
    
    // Import/Export support
    async exportEntities({ state }) {
      return JSON.parse(JSON.stringify(state.entities));
    },
    
    async importEntities({ commit }, entities) {
      commit('REPLACE_ENTITIES', entities);
    },
  },
};