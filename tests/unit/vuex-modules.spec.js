import walls from '@/store/modules/walls';
import selection from '@/store/modules/selection';

describe('Vuex Modules', () => {
  describe('walls module', () => {
    let state;

    beforeEach(() => {
      state = {
        walls: [],
      };
    });

    describe('mutations', () => {
      it('ADD_WALL adds a wall to the state', () => {
        const wall = { id: 'wall-1', name: 'Test Wall' };
        
        walls.mutations.ADD_WALL(state, wall);

        expect(state.walls).toHaveLength(1);
        expect(state.walls[0]).toBe(wall);
      });

      it('UPDATE_WALL updates an existing wall', () => {
        state.walls = [
          { id: 'wall-1', name: 'Old Name', height: 3 },
          { id: 'wall-2', name: 'Another Wall', height: 2 },
        ];

        const updates = { name: 'New Name', height: 4 };
        walls.mutations.UPDATE_WALL(state, { id: 'wall-1', updates });

        expect(state.walls[0]).toEqual({
          id: 'wall-1',
          name: 'New Name',
          height: 4,
        });
        expect(state.walls[1]).toEqual({
          id: 'wall-2',
          name: 'Another Wall',
          height: 2,
        });
      });

      it('UPDATE_WALL does nothing for non-existent wall', () => {
        state.walls = [{ id: 'wall-1', name: 'Test Wall' }];

        walls.mutations.UPDATE_WALL(state, { 
          id: 'non-existent', 
          updates: { name: 'New Name' } 
        });

        expect(state.walls).toHaveLength(1);
        expect(state.walls[0].name).toBe('Test Wall');
      });

      it('DELETE_WALL removes a wall from the state', () => {
        state.walls = [
          { id: 'wall-1', name: 'Wall 1' },
          { id: 'wall-2', name: 'Wall 2' },
          { id: 'wall-3', name: 'Wall 3' },
        ];

        walls.mutations.DELETE_WALL(state, 'wall-2');

        expect(state.walls).toHaveLength(2);
        expect(state.walls.map(w => w.id)).toEqual(['wall-1', 'wall-3']);
      });

      it('DELETE_WALL does nothing for non-existent wall', () => {
        state.walls = [{ id: 'wall-1', name: 'Wall 1' }];

        walls.mutations.DELETE_WALL(state, 'non-existent');

        expect(state.walls).toHaveLength(1);
      });

      it('SET_WALLS replaces all walls', () => {
        const newWalls = [
          { id: 'wall-10', name: 'New Wall 1' },
          { id: 'wall-11', name: 'New Wall 2' },
        ];

        walls.mutations.SET_WALLS(state, newWalls);

        expect(state.walls).toBe(newWalls);
        expect(state.walls).toHaveLength(2);
      });
    });

    describe('getters', () => {
      beforeEach(() => {
        state.walls = [
          { id: 'wall-1', name: 'Wall 1' },
          { id: 'wall-2', name: 'Wall 2' },
          { id: 'wall-3', name: 'Wall 3' },
        ];
      });

      it('wallById returns correct wall', () => {
        const getter = walls.getters.wallById(state);
        const wall = getter('wall-2');

        expect(wall).toEqual({ id: 'wall-2', name: 'Wall 2' });
      });

      it('wallById returns null for non-existent wall', () => {
        const getter = walls.getters.wallById(state);
        const wall = getter('non-existent');

        expect(wall).toBeNull();
      });

      it('allWalls returns all walls', () => {
        const getter = walls.getters.allWalls(state);
        const allWalls = getter;

        expect(allWalls).toEqual(state.walls);
        expect(allWalls).toHaveLength(3);
      });
    });

    describe('actions', () => {
      let commit;

      beforeEach(() => {
        commit = jest.fn();
      });

      it('addWall commits ADD_WALL mutation', () => {
        const wall = { id: 'wall-1', name: 'Test Wall' };

        walls.actions.addWall({ commit }, wall);

        expect(commit).toHaveBeenCalledWith('ADD_WALL', wall);
      });

      it('updateWall commits UPDATE_WALL mutation', () => {
        const payload = { id: 'wall-1', updates: { name: 'New Name' } };

        walls.actions.updateWall({ commit }, payload);

        expect(commit).toHaveBeenCalledWith('UPDATE_WALL', payload);
      });

      it('deleteWall commits DELETE_WALL mutation', () => {
        const id = 'wall-1';

        walls.actions.deleteWall({ commit }, id);

        expect(commit).toHaveBeenCalledWith('DELETE_WALL', id);
      });

      it('setWalls commits SET_WALLS mutation', () => {
        const wallsArray = [{ id: 'wall-1', name: 'Wall 1' }];

        walls.actions.setWalls({ commit }, wallsArray);

        expect(commit).toHaveBeenCalledWith('SET_WALLS', wallsArray);
      });
    });
  });

  describe('selection module', () => {
    let state;

    beforeEach(() => {
      state = {
        activeObjectIds: [],
      };
    });

    describe('mutations', () => {
      it('SET_ACTIVE_OBJECTS sets active object IDs', () => {
        const ids = ['wall-1', 'wall-2'];
        
        selection.mutations.SET_ACTIVE_OBJECTS(state, ids);

        expect(state.activeObjectIds).toEqual(ids);
      });

      it('SET_ACTIVE_OBJECTS handles non-array input', () => {
        selection.mutations.SET_ACTIVE_OBJECTS(state, 'wall-1');

        expect(state.activeObjectIds).toEqual([]);
      });

      it('ADD_ACTIVE_OBJECT adds an object ID', () => {
        state.activeObjectIds = ['wall-1'];
        
        selection.mutations.ADD_ACTIVE_OBJECT(state, 'wall-2');

        expect(state.activeObjectIds).toEqual(['wall-1', 'wall-2']);
      });

      it('ADD_ACTIVE_OBJECT does not add duplicate ID', () => {
        state.activeObjectIds = ['wall-1'];
        
        selection.mutations.ADD_ACTIVE_OBJECT(state, 'wall-1');

        expect(state.activeObjectIds).toEqual(['wall-1']);
      });

      it('REMOVE_ACTIVE_OBJECT removes an object ID', () => {
        state.activeObjectIds = ['wall-1', 'wall-2', 'wall-3'];
        
        selection.mutations.REMOVE_ACTIVE_OBJECT(state, 'wall-2');

        expect(state.activeObjectIds).toEqual(['wall-1', 'wall-3']);
      });

      it('REMOVE_ACTIVE_OBJECT does nothing for non-existent ID', () => {
        state.activeObjectIds = ['wall-1', 'wall-2'];
        
        selection.mutations.REMOVE_ACTIVE_OBJECT(state, 'wall-3');

        expect(state.activeObjectIds).toEqual(['wall-1', 'wall-2']);
      });

      it('CLEAR_ACTIVE_OBJECTS clears all active objects', () => {
        state.activeObjectIds = ['wall-1', 'wall-2'];
        
        selection.mutations.CLEAR_ACTIVE_OBJECTS(state);

        expect(state.activeObjectIds).toEqual([]);
      });
    });

    describe('getters', () => {
      it('activeObjectIds returns active object IDs', () => {
        state.activeObjectIds = ['wall-1', 'wall-2'];
        
        const getter = selection.getters.activeObjectIds(state);
        const ids = getter;

        expect(ids).toEqual(['wall-1', 'wall-2']);
      });

      it('hasActiveSelection returns true when there are active objects', () => {
        state.activeObjectIds = ['wall-1'];
        
        const getter = selection.getters.hasActiveSelection(state);
        const hasSelection = getter;

        expect(hasSelection).toBe(true);
      });

      it('hasActiveSelection returns false when there are no active objects', () => {
        state.activeObjectIds = [];
        
        const getter = selection.getters.hasActiveSelection(state);
        const hasSelection = getter;

        expect(hasSelection).toBe(false);
      });

      it('firstActiveObjectId returns first active object ID', () => {
        state.activeObjectIds = ['wall-1', 'wall-2', 'wall-3'];
        
        const getter = selection.getters.firstActiveObjectId(state);
        const firstId = getter;

        expect(firstId).toBe('wall-1');
      });

      it('firstActiveObjectId returns null when there are no active objects', () => {
        state.activeObjectIds = [];
        
        const getter = selection.getters.firstActiveObjectId(state);
        const firstId = getter;

        expect(firstId).toBeNull();
      });
    });

    describe('actions', () => {
      let commit;

      beforeEach(() => {
        commit = jest.fn();
      });

      it('setActiveObjects commits SET_ACTIVE_OBJECTS mutation', () => {
        const ids = ['wall-1', 'wall-2'];

        selection.actions.setActiveObjects({ commit }, ids);

        expect(commit).toHaveBeenCalledWith('SET_ACTIVE_OBJECTS', ids);
      });

      it('addActiveObject commits ADD_ACTIVE_OBJECT mutation', () => {
        const id = 'wall-1';

        selection.actions.addActiveObject({ commit }, id);

        expect(commit).toHaveBeenCalledWith('ADD_ACTIVE_OBJECT', id);
      });

      it('removeActiveObject commits REMOVE_ACTIVE_OBJECT mutation', () => {
        const id = 'wall-1';

        selection.actions.removeActiveObject({ commit }, id);

        expect(commit).toHaveBeenCalledWith('REMOVE_ACTIVE_OBJECT', id);
      });

      it('clearActiveObjects commits CLEAR_ACTIVE_OBJECTS mutation', () => {
        selection.actions.clearActiveObjects({ commit });

        expect(commit).toHaveBeenCalledWith('CLEAR_ACTIVE_OBJECTS');
      });
    });
  });
});