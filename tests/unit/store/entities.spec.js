/**
 * Entities Store Module Tests
 * 测试实体创建、批量更新和删除功能
 */

import entitiesModule, { ENTITY_TYPES } from '@/store/modules/entities';

describe('Entities Store Module', () => {
  let store;
  let state;

  beforeEach(() => {
    // Create a mock store structure
    store = {
      state: {
        entities: entitiesModule.state(),
      },
      getters: {},
      mutations: entitiesModule.mutations,
      actions: entitiesModule.actions,
      commit: jest.fn(),
      dispatch: jest.fn(),
      rootState: {
        cad: {
          layers: [
            { id: 'layer-structure', name: '结构', visible: true },
            { id: 'layer-furniture', name: '家具', visible: true },
            { id: 'layer-annotation', name: '标注', visible: false },
          ],
        },
      },
      rootGetters: {
        'cad/visibleLayerIds': ['layer-structure', 'layer-furniture'],
      },
    };

    // Setup getters with proper context
    Object.keys(entitiesModule.getters).forEach(getterName => {
      store.getters[getterName] = entitiesModule.getters[getterName](
        store.state.entities,
        store.getters,
        store.rootState,
        store.rootGetters
      );
    });

    state = store.state.entities;
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const initialState = entitiesModule.state();
      
      expect(initialState.entities).toEqual([]);
      expect(initialState.indexes.byId).toBeInstanceOf(Map);
      expect(initialState.indexes.byType).toBeInstanceOf(Map);
      expect(initialState.indexes.byLayer).toBeInstanceOf(Map);
      expect(initialState.hierarchy).toBeInstanceOf(Map);
      expect(initialState.selection.ids).toEqual([]);
      expect(initialState.selection.primaryId).toBeNull();
      expect(initialState.stats.totalEntities).toBe(0);
    });
  });

  describe('Entity Creation', () => {
    it('should create a wall entity with default properties', () => {
      const entity = {
        id: 'wall-1',
        name: 'Test Wall',
        height: 3.0,
      };

      store.mutations.ADD_ENTITY(state, entity);

      expect(state.entities).toContain(entity);
      expect(state.indexes.byId.get('wall-1')).toBe(entity);
      expect(state.indexes.byType.get('wall')).toContain(entity);
      expect(state.stats.totalEntities).toBe(1);
      expect(state.stats.entitiesByType.wall).toBe(1);
    });

    it('should create multiple entities at once', () => {
      const entities = [
        { id: 'wall-1', type: 'wall', name: 'Wall 1' },
        { id: 'door-1', type: 'door', name: 'Door 1' },
        { id: 'window-1', type: 'window', name: 'Window 1' },
      ];

      store.mutations.ADD_ENTITIES(state, entities);

      expect(state.entities).toHaveLength(3);
      expect(state.indexes.byId.get('wall-1')).toBeTruthy();
      expect(state.indexes.byId.get('door-1')).toBeTruthy();
      expect(state.indexes.byId.get('window-1')).toBeTruthy();
      expect(state.stats.totalEntities).toBe(3);
    });

    it('should throw error for duplicate entity IDs', () => {
      const entity = { id: 'wall-1', type: 'wall', name: 'Wall 1' };
      
      store.mutations.ADD_ENTITY(state, entity);
      
      expect(() => {
        store.mutations.ADD_ENTITY(state, entity);
      }).toThrow('Entity with id wall-1 already exists');
    });

    it('should validate entity structure', () => {
      const invalidEntity = { type: 'invalid' };
      
      expect(() => {
        store.mutations.ADD_ENTITY(state, invalidEntity);
      }).toThrow('Entity must have a valid id');

      const invalidEntity2 = { id: 'test', type: 'invalid' };
      
      expect(() => {
        store.mutations.ADD_ENTITY(state, invalidEntity2);
      }).toThrow('Entity must have a valid type');
    });
  });

  describe('Entity Updates', () => {
    beforeEach(() => {
      const entity = {
        id: 'wall-1',
        type: 'wall',
        name: 'Test Wall',
        height: 2.8,
        visible: true,
      };
      store.mutations.ADD_ENTITY(state, entity);
    });

    it('should update single entity property', () => {
      store.mutations.UPDATE_ENTITY(state, {
        id: 'wall-1',
        updates: { height: 3.0, material: 'brick' }
      });

      const entity = state.indexes.byId.get('wall-1');
      expect(entity.height).toBe(3.0);
      expect(entity.material).toBe('brick');
      expect(entity.updatedAt).toBeGreaterThan(0);
    });

    it('should update multiple entities', () => {
      // Add another entity
      const entity2 = {
        id: 'wall-2',
        type: 'wall',
        name: 'Test Wall 2',
        height: 2.8,
      };
      store.mutations.ADD_ENTITY(state, entity2);

      const updates = [
        { id: 'wall-1', updates: { height: 3.0 } },
        { id: 'wall-2', updates: { height: 3.2 } },
      ];

      store.mutations.UPDATE_ENTITIES(state, updates);

      expect(state.indexes.byId.get('wall-1').height).toBe(3.0);
      expect(state.indexes.byId.get('wall-2').height).toBe(3.2);
    });

    it('should throw error when updating non-existent entity', () => {
      expect(() => {
        store.mutations.UPDATE_ENTITY(state, {
          id: 'non-existent',
          updates: { height: 3.0 }
        });
      }).toThrow('Entity with id non-existent not found');
    });
  });

  describe('Entity Deletion', () => {
    beforeEach(() => {
      const entities = [
        { id: 'wall-1', type: 'wall', name: 'Wall 1' },
        { id: 'door-1', type: 'door', name: 'Door 1' },
        { id: 'window-1', type: 'window', name: 'Window 1' },
      ];
      store.mutations.ADD_ENTITIES(state, entities);
      
      // Set up selection
      store.mutations.SET_SELECTION(state, { ids: ['wall-1', 'door-1'] });
    });

    it('should delete single entity', () => {
      store.mutations.REMOVE_ENTITY(state, 'wall-1');

      expect(state.entities).toHaveLength(2);
      expect(state.indexes.byId.get('wall-1')).toBeUndefined();
      expect(state.selection.ids).not.toContain('wall-1');
    });

    it('should delete multiple entities', () => {
      store.mutations.REMOVE_ENTITIES(state, ['wall-1', 'door-1']);

      expect(state.entities).toHaveLength(1);
      expect(state.indexes.byId.get('wall-1')).toBeUndefined();
      expect(state.indexes.byId.get('door-1')).toBeUndefined();
      expect(state.selection.ids).toHaveLength(0);
    });

    it('should update primary selection when primary entity is deleted', () => {
      store.mutations.SET_SELECTION(state, { 
        ids: ['wall-1', 'door-1'], 
        primaryId: 'wall-1' 
      });

      store.mutations.REMOVE_ENTITY(state, 'wall-1');

      expect(state.selection.primaryId).toBe('door-1');
    });

    it('should throw error when deleting non-existent entity', () => {
      expect(() => {
        store.mutations.REMOVE_ENTITY(state, 'non-existent');
      }).toThrow('Entity with id non-existent not found');
    });
  });

  describe('Selection Management', () => {
    beforeEach(() => {
      const entities = [
        { id: 'wall-1', type: 'wall', name: 'Wall 1' },
        { id: 'door-1', type: 'door', name: 'Door 1' },
        { id: 'window-1', type: 'window', name: 'Window 1' },
      ];
      store.mutations.ADD_ENTITIES(state, entities);
    });

    it('should set selection', () => {
      store.mutations.SET_SELECTION(state, { 
        ids: ['wall-1', 'door-1'], 
        primaryId: 'wall-1' 
      });

      expect(state.selection.ids).toEqual(['wall-1', 'door-1']);
      expect(state.selection.primaryId).toBe('wall-1');
    });

    it('should add to selection', () => {
      store.mutations.SET_SELECTION(state, { ids: ['wall-1'] });
      store.mutations.ADD_TO_SELECTION(state, ['door-1', 'window-1']);

      expect(state.selection.ids).toEqual(['wall-1', 'door-1', 'window-1']);
    });

    it('should remove from selection', () => {
      store.mutations.SET_SELECTION(state, { ids: ['wall-1', 'door-1', 'window-1'] });
      store.mutations.REMOVE_FROM_SELECTION(state, ['door-1']);

      expect(state.selection.ids).toEqual(['wall-1', 'window-1']);
    });

    it('should clear selection', () => {
      store.mutations.SET_SELECTION(state, { ids: ['wall-1', 'door-1'] });
      store.mutations.CLEAR_SELECTION(state);

      expect(state.selection.ids).toEqual([]);
      expect(state.selection.primaryId).toBeNull();
    });
  });

  describe('Getters', () => {
    beforeEach(() => {
      const entities = [
        { 
          id: 'wall-1', 
          type: 'wall', 
          name: 'Wall 1',
          visible: true,
          locked: false,
          layer: 'layer-structure',
        },
        { 
          id: 'wall-2', 
          type: 'wall', 
          name: 'Wall 2',
          visible: false,
          locked: false,
          layer: 'layer-structure',
        },
        { 
          id: 'door-1', 
          type: 'door', 
          name: 'Door 1',
          visible: true,
          locked: true,
          layer: 'layer-furniture',
        },
        { 
          id: 'window-1', 
          type: 'window', 
          name: 'Window 1',
          visible: true,
          locked: false,
          layer: 'layer-annotation',
        },
      ];
      store.mutations.ADD_ENTITIES(state, entities);
      store.mutations.SET_SELECTION(state, { ids: ['wall-1', 'door-1'] });
    });

    it('should get entity by ID', () => {
      const entity = store.getters.getEntityById('wall-1');
      expect(entity).toBeTruthy();
      expect(entity.id).toBe('wall-1');
    });

    it('should get entities by type', () => {
      const walls = store.getters.getEntitiesByType('wall');
      expect(walls).toHaveLength(2);
      expect(walls[0].type).toBe('wall');
    });

    it('should get entities by layer', () => {
      const structureEntities = store.getters.getEntitiesByLayer('layer-structure');
      expect(structureEntities).toHaveLength(2);
      expect(structureEntities[0].layer).toBe('layer-structure');
    });

    it('should get visible entities by layer', () => {
      const visibleStructure = store.getters.visibleEntitiesByLayer('layer-structure');
      expect(visibleStructure).toHaveLength(1);
      expect(visibleStructure[0].id).toBe('wall-1');
    });

    it('should get selected entities', () => {
      const selected = store.getters.selectedEntities;
      expect(selected).toHaveLength(2);
      expect(selected.map(e => e.id)).toEqual(['wall-1', 'door-1']);
    });

    it('should get primary selected entity', () => {
      const primary = store.getters.primarySelectedEntity;
      expect(primary).toBeTruthy();
      expect(primary.id).toBe('wall-1');
    });

    it('should check if entity is selected', () => {
      expect(store.getters.isEntitySelected('wall-1')).toBe(true);
      expect(store.getters.isEntitySelected('window-1')).toBe(false);
    });

    it('should get visible entities', () => {
      const visible = store.getters.visibleEntities;
      expect(visible).toHaveLength(2); // wall-1 and door-1 (layer-annotation is not visible)
    });

    it('should get unlocked entities', () => {
      const unlocked = store.getters.unlockedEntities;
      expect(unlocked).toHaveLength(3); // all except door-1 which is locked
    });

    it('should get entity statistics', () => {
      const stats = store.getters.entityStats;
      expect(stats.totalEntities).toBe(4);
      expect(stats.entitiesByType.wall).toBe(2);
      expect(stats.entitiesByType.door).toBe(1);
      expect(stats.entitiesByType.window).toBe(1);
    });

    it('should check selection state', () => {
      expect(store.getters.hasEntities).toBe(true);
      expect(store.getters.hasSelection).toBe(true);
      expect(store.getters.isMultiSelection).toBe(true);
    });
  });

  describe('Actions', () => {
    beforeEach(() => {
      const entities = [
        { id: 'wall-1', type: 'wall', name: 'Wall 1' },
        { id: 'door-1', type: 'door', name: 'Door 1' },
      ];
      store.mutations.ADD_ENTITIES(state, entities);
    });

    describe('CRUD Actions', () => {
      it('should create entity via action', async () => {
        const entityData = { name: 'New Wall', height: 3.0 };
        const result = await entitiesModule.actions.createEntity(
          { commit: store.commit },
          { type: 'wall', ...entityData }
        );

        expect(store.commit).toHaveBeenCalledWith('ADD_ENTITY', expect.any(Object));
        expect(result.type).toBe('wall');
        expect(result.name).toBe('New Wall');
        expect(result.height).toBe(3.0);
      });

      it('should create multiple entities via action', async () => {
        const entitiesData = [
          { name: 'Wall 1', height: 2.8 },
          { name: 'Wall 2', height: 3.0 },
        ];
        const result = await entitiesModule.actions.createEntities(
          { commit: store.commit },
          { type: 'wall', entities: entitiesData }
        );

        expect(store.commit).toHaveBeenCalledWith('ADD_ENTITIES', expect.any(Array));
        expect(result).toHaveLength(2);
        expect(result[0].type).toBe('wall');
      });

      it('should update geometry via action', async () => {
        const geometry = { type: 'BoxGeometry', parameters: { width: 5, height: 3 } };
        
        await entitiesModule.actions.updateGeometry(
          { commit: store.commit },
          { id: 'wall-1', geometry }
        );

        expect(store.commit).toHaveBeenCalledWith('UPDATE_ENTITY', {
          id: 'wall-1',
          updates: { geometry, updatedAt: expect.any(Number) }
        });
      });

      it('should delete selection via action', async () => {
        store.mutations.SET_SELECTION(state, { ids: ['wall-1'] });
        
        const result = await entitiesModule.actions.deleteSelection({
          state,
          commit: store.commit,
        });

        expect(store.commit).toHaveBeenCalledWith('REMOVE_ENTITIES', ['wall-1']);
        expect(store.commit).toHaveBeenCalledWith('CLEAR_SELECTION');
        expect(result).toEqual(['wall-1']);
      });
    });

    describe('Duplicate Actions', () => {
      it('should duplicate selected entities', async () => {
        store.mutations.SET_SELECTION(state, { ids: ['wall-1'] });
        const offset = { x: 2, y: 0, z: 0 };
        
        const result = await entitiesModule.actions.duplicateEntities(
          { state, commit: store.commit, getters: store.getters },
          { offset }
        );

        expect(store.commit).toHaveBeenCalledWith('ADD_ENTITIES', expect.any(Array));
        expect(result).toHaveLength(1);
        expect(result[0].name).toContain('Copy');
        expect(result[0].id).not.toBe('wall-1');
      });

      it('should duplicate specific entities', async () => {
        const result = await entitiesModule.actions.duplicateEntities(
          { state, commit: store.commit, getters: store.getters },
          { ids: ['wall-1'], offset: { x: 1, y: 1 } }
        );

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('wall');
      });
    });

    describe('Selection Actions', () => {
      it('should select all entities', async () => {
        await entitiesModule.actions.selectAll({ state, commit: store.commit });
        
        expect(store.commit).toHaveBeenCalledWith('SET_SELECTION', {
          ids: ['wall-1', 'door-1']
        });
      });

      it('should select by type', async () => {
        await entitiesModule.actions.selectByType(
          { commit: store.commit, getters: store.getters },
          'wall'
        );
        
        expect(store.commit).toHaveBeenCalledWith('SET_SELECTION', {
          ids: ['wall-1']
        });
      });

      it('should select by layer', async () => {
        await entitiesModule.actions.selectByLayer(
          { commit: store.commit, getters: store.getters },
          'layer-structure'
        );
        
        expect(store.commit).toHaveBeenCalledWith('SET_SELECTION', {
          ids: ['wall-1']
        });
      });
    });

    describe('Visibility and Lock Actions', () => {
      it('should toggle entity visibility', async () => {
        await entitiesModule.actions.toggleEntityVisibility(
          { commit: store.commit, getters: store.getters },
          'wall-1'
        );
        
        expect(store.commit).toHaveBeenCalledWith('UPDATE_ENTITY', {
          id: 'wall-1',
          updates: { visible: false }
        });
      });

      it('should set entities visibility', async () => {
        await entitiesModule.actions.setEntitiesVisibility(
          { commit: store.commit },
          { ids: ['wall-1', 'door-1'], visible: false }
        );
        
        expect(store.commit).toHaveBeenCalledWith('UPDATE_ENTITIES', [
          { id: 'wall-1', updates: { visible: false } },
          { id: 'door-1', updates: { visible: false } }
        ]);
      });

      it('should toggle entity lock', async () => {
        await entitiesModule.actions.toggleEntityLock(
          { commit: store.commit, getters: store.getters },
          'wall-1'
        );
        
        expect(store.commit).toHaveBeenCalledWith('UPDATE_ENTITY', {
          id: 'wall-1',
          updates: { locked: true }
        });
      });
    });

    describe('Layer Actions', () => {
      it('should move entities to layer', async () => {
        await entitiesModule.actions.moveEntitiesToLayer(
          { commit: store.commit },
          { ids: ['wall-1'], layerId: 'layer-furniture' }
        );
        
        expect(store.commit).toHaveBeenCalledWith('UPDATE_ENTITIES', [
          { id: 'wall-1', updates: { layer: 'layer-furniture' } }
        ]);
      });
    });

    describe('Import/Export Actions', () => {
      it('should export entities', async () => {
        const result = await entitiesModule.actions.exportEntities({ state });
        
        expect(result).toEqual(state.entities);
        expect(JSON.stringify(result)).toBeTruthy();
      });

      it('should import entities', async () => {
        const newEntities = [
          { id: 'imported-1', type: 'wall', name: 'Imported Wall' }
        ];
        
        await entitiesModule.actions.importEntities(
          { commit: store.commit },
          newEntities
        );
        
        expect(store.commit).toHaveBeenCalledWith('REPLACE_ENTITIES', newEntities);
      });
    });
  });

  describe('Performance and Indexing', () => {
    it('should rebuild indexes after entity addition', () => {
      const entity = { id: 'wall-1', type: 'wall', name: 'Wall 1' };
      
      store.mutations.ADD_ENTITY(state, entity);
      
      expect(state.indexes.byId.get('wall-1')).toBe(entity);
      expect(state.indexes.byType.get('wall')).toContain(entity);
      expect(state.stats.totalEntities).toBe(1);
    });

    it('should rebuild indexes after entity removal', () => {
      const entity = { id: 'wall-1', type: 'wall', name: 'Wall 1' };
      store.mutations.ADD_ENTITY(state, entity);
      
      store.mutations.REMOVE_ENTITY(state, 'wall-1');
      
      expect(state.indexes.byId.get('wall-1')).toBeUndefined();
      expect(state.indexes.byType.get('wall')).toEqual([]);
      expect(state.stats.totalEntities).toBe(0);
    });

    it('should handle large number of entities efficiently', () => {
      const entities = Array.from({ length: 1000 }, (_, i) => ({
        id: `entity-${i}`,
        type: i % 2 === 0 ? 'wall' : 'door',
        name: `Entity ${i}`,
      }));
      
      const startTime = performance.now();
      store.mutations.ADD_ENTITIES(state, entities);
      const endTime = performance.now();
      
      expect(state.entities).toHaveLength(1000);
      expect(state.stats.totalEntities).toBe(1000);
      expect(state.stats.entitiesByType.wall).toBe(500);
      expect(state.stats.entitiesByType.door).toBe(500);
      
      // Performance check - should complete quickly
      expect(endTime - startTime).toBeLessThan(100); // 100ms
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid entity data gracefully', () => {
      const invalidEntities = [
        null,
        undefined,
        { type: 'wall' }, // missing id
        { id: 'test' }, // missing type
        { id: 'test', type: 'invalid' }, // invalid type
      ];
      
      invalidEntities.forEach(entity => {
        expect(() => {
          store.mutations.ADD_ENTITY(state, entity);
        }).toThrow();
      });
    });

    it('should maintain data consistency on errors', () => {
      const validEntity = { id: 'wall-1', type: 'wall', name: 'Wall 1' };
      store.mutations.ADD_ENTITY(state, validEntity);
      
      const initialCount = state.entities.length;
      
      // Try to add invalid entity
      expect(() => {
        store.mutations.ADD_ENTITY(state, { id: 'wall-1', type: 'wall', name: 'Duplicate' });
      }).toThrow();
      
      // Ensure state is unchanged
      expect(state.entities).toHaveLength(initialCount);
      expect(state.indexes.byId.get('wall-1')).toBe(validEntity);
    });
  });

  describe('Serialization Safety', () => {
    it('should not create circular references in entity data', () => {
      const entity = {
        id: 'wall-1',
        type: 'wall',
        name: 'Wall 1',
        geometry: { type: 'BoxGeometry' },
      };
      
      store.mutations.ADD_ENTITY(state, entity);
      
      // Try to serialize - should not throw circular reference error
      expect(() => {
        JSON.stringify(state.entities);
      }).not.toThrow();
      
      // Try to serialize indexes - should not throw
      expect(() => {
        JSON.stringify(Array.from(state.indexes.byId.entries()));
      }).not.toThrow();
    });

    it('should handle complex nested data structures', () => {
      const complexEntity = {
        id: 'complex-1',
        type: 'wall',
        name: 'Complex Wall',
        geometry: {
          type: 'BoxGeometry',
          parameters: {
            width: 5,
            height: 3,
            depth: 0.2,
          },
        },
        material: {
          type: 'MeshStandardMaterial',
          properties: {
            color: '#ffffff',
            roughness: 0.5,
            metalness: 0.1,
          },
        },
        metadata: {
          created: '2023-01-01',
          version: '1.0.0',
          tags: ['interior', 'load-bearing'],
        },
      };
      
      store.mutations.ADD_ENTITY(state, complexEntity);
      
      // Should be able to serialize and deserialize
      const serialized = JSON.stringify(state.entities);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized[0].id).toBe('complex-1');
      expect(deserialized[0].geometry.type).toBe('BoxGeometry');
      expect(deserialized[0].metadata.tags).toEqual(['interior', 'load-bearing']);
    });
  });
});