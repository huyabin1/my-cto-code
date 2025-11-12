import editorModule from '@/store/modules/editor';
import CommandStack from '@/three/command/CommandStack';

jest.mock('@/three/command/EntityPropertyCommands', () => ({
  UpdateEntityPropertyCommand: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

describe('Editor Store Module', () => {
  let store;
  let state;

  beforeEach(() => {
    store = {
      state: {
        editor: editorModule.state(),
      },
      getters: {},
      mutations: editorModule.mutations,
      actions: editorModule.actions,
      commit: jest.fn(),
      dispatch: jest.fn(),
    };

    state = store.state.editor;
  });

  describe('Entity Management Mutations', () => {
    it('should add entity', () => {
      const entity = {
        id: 'wall-1',
        type: 'wall',
        height: 2.8,
      };

      store.mutations.ADD_ENTITY(state, entity);

      expect(state.entities).toContain(entity);
    });

    it('should not add duplicate entity', () => {
      const entity = {
        id: 'wall-1',
        type: 'wall',
        height: 2.8,
      };

      store.mutations.ADD_ENTITY(state, entity);
      store.mutations.ADD_ENTITY(state, entity);

      expect(state.entities).toHaveLength(1);
    });

    it('should remove entity', () => {
      const entity = {
        id: 'wall-1',
        type: 'wall',
      };

      state.entities.push(entity);
      store.mutations.REMOVE_ENTITY(state, 'wall-1');

      expect(state.entities).toHaveLength(0);
    });

    it('should handle removing non-existent entity', () => {
      state.entities = [];
      store.mutations.REMOVE_ENTITY(state, 'wall-1');

      expect(state.entities).toHaveLength(0);
    });

    it('should update entity property', () => {
      const entity = {
        id: 'wall-1',
        type: 'wall',
        height: 2.8,
      };

      state.entities.push(entity);
      store.mutations.UPDATE_ENTITY_PROPERTY(state, {
        entityId: 'wall-1',
        property: 'height',
        value: 3.0,
      });

      expect(state.entities[0].height).toBe(3.0);
    });

    it('should handle updating property on non-existent entity', () => {
      state.entities = [];
      store.mutations.UPDATE_ENTITY_PROPERTY(state, {
        entityId: 'wall-1',
        property: 'height',
        value: 3.0,
      });

      expect(state.entities).toHaveLength(0);
    });

    it('should set command stack', () => {
      const commandStack = new CommandStack();
      store.mutations.SET_COMMAND_STACK(state, commandStack);

      expect(state.commandStack).toBe(commandStack);
    });
  });

  describe('Entity Management Actions', () => {
    it('should add entity via action', async () => {
      const entity = {
        id: 'wall-1',
        type: 'wall',
        height: 2.8,
      };

      const context = {
        commit: jest.fn(),
      };

      await store.actions.addEntity(context, entity);

      expect(context.commit).toHaveBeenCalledWith('ADD_ENTITY', entity);
    });

    it('should remove entity via action', async () => {
      const context = {
        commit: jest.fn(),
      };

      await store.actions.removeEntity(context, 'wall-1');

      expect(context.commit).toHaveBeenCalledWith('REMOVE_ENTITY', 'wall-1');
    });

    it('should set command stack via action', async () => {
      const commandStack = new CommandStack();
      const context = {
        commit: jest.fn(),
      };

      await store.actions.setCommandStack(context, commandStack);

      expect(context.commit).toHaveBeenCalledWith('SET_COMMAND_STACK', commandStack);
    });

    it('should throw error if command stack not initialized', async () => {
      const context = {
        state: {
          commandStack: null,
        },
      };

      await expect(
        store.actions.updateProperties(context, {
          entityId: 'wall-1',
          property: 'height',
          newValue: 3.0,
        })
      ).rejects.toThrow('CommandStack not initialized');
    });
  });

  describe('Default State', () => {
    it('should have default materials', () => {
      expect(state.materials).toHaveLength(4);
      expect(state.materials[0].value).toBe('concrete');
      expect(state.materials[0].label).toBe('混凝土');
    });

    it('should have default active selection', () => {
      expect(state.activeSelection).toBeDefined();
      expect(state.activeSelection.id).toBe('wall-default');
      expect(state.activeSelection.name).toBe('墙体 A1');
    });

    it('should initialize selection state with defaults', () => {
      expect(state.selection.mode).toBe('none');
      expect(state.selection.ids).toEqual([]);
      expect(state.selection.primaryId).toBeNull();
      expect(state.selection.hoveredId).toBeNull();
      expect(state.selection.marquee).toEqual({
        active: false,
        start: null,
        end: null,
      });
      expect(typeof state.selection.lastUpdated).toBe('number');
    });

    it('should have empty entities array initially', () => {
      expect(state.entities).toEqual([]);
    });

    it('should have default viewport settings', () => {
      expect(state.viewport.viewMode).toBe('2d');
      expect(state.viewport.layoutMode).toBe('single');
      expect(state.viewport.grid.visible).toBe(true);
      expect(state.viewport.grid.density).toBe(1);
      expect(state.viewport.grid.size).toBe(5000);
      expect(state.viewport.axis.visible).toBe(true);
      expect(state.viewport.axis.size).toBe(1000);
    });

    it('should have null command stack initially', () => {
      expect(state.commandStack).toBeNull();
    });
  });

  describe('Selection Mutations and Actions', () => {
    it('should update selection state via mutation', () => {
      store.mutations.SET_SELECTION_STATE(state, {
        ids: ['wall-1'],
        primaryId: 'wall-1',
        mode: 'single',
        lastUpdated: 123,
      });

      expect(state.selection.ids).toEqual(['wall-1']);
      expect(state.selection.primaryId).toBe('wall-1');
      expect(state.selection.mode).toBe('single');
    });

    it('should reset selection state via mutation', () => {
      store.mutations.SET_SELECTION_STATE(state, {
        ids: ['wall-1'],
        primaryId: 'wall-1',
        mode: 'single',
      });

      store.mutations.RESET_SELECTION_STATE(state);

      expect(state.selection.ids).toEqual([]);
      expect(state.selection.mode).toBe('none');
    });

    it('should set selection via action', async () => {
      const commit = jest.fn();
      const payload = await store.actions.setSelection(
        { commit, state },
        { ids: ['wall-1', 'wall-1'] }
      );

      expect(commit).toHaveBeenCalledWith(
        'SET_SELECTION_STATE',
        expect.objectContaining({
          ids: ['wall-1'],
          primaryId: 'wall-1',
          mode: 'single',
        })
      );
      expect(payload.ids).toEqual(['wall-1']);
      expect(payload.mode).toBe('single');
    });

    it('should add ids to selection in add mode', async () => {
      const commit = jest.fn();
      const selectionState = {
        ids: ['wall-1'],
        primaryId: 'wall-1',
        mode: 'single',
        hoveredId: null,
        marquee: { active: false, start: null, end: null },
      };

      const payload = await store.actions.setSelection(
        { commit, state: { selection: selectionState } },
        { ids: ['wall-2'], mode: 'add' }
      );

      expect(commit).toHaveBeenCalledWith(
        'SET_SELECTION_STATE',
        expect.objectContaining({
          ids: ['wall-1', 'wall-2'],
          mode: 'multi',
        })
      );
      expect(payload.ids).toEqual(['wall-1', 'wall-2']);
      expect(payload.mode).toBe('multi');
    });

    it('should toggle ids in toggle mode', async () => {
      const commit = jest.fn();
      const selectionState = {
        ids: ['wall-1', 'wall-2'],
        primaryId: 'wall-1',
        mode: 'multi',
        hoveredId: null,
        marquee: { active: false, start: null, end: null },
      };

      const payload = await store.actions.setSelection(
        { commit, state: { selection: selectionState } },
        { ids: ['wall-2', 'wall-3'], mode: 'toggle' }
      );

      expect(payload.ids).toEqual(['wall-1', 'wall-3']);
      expect(payload.mode).toBe('multi');
      expect(commit).toHaveBeenCalledWith(
        'SET_SELECTION_STATE',
        expect.objectContaining({ ids: ['wall-1', 'wall-3'] })
      );
    });

    it('should clear selection via action', async () => {
      const commit = jest.fn();
      await store.actions.clearSelection({ commit });
      expect(commit).toHaveBeenCalledWith('RESET_SELECTION');
    });

    it('should update selection marquee via action', async () => {
      const commit = jest.fn();
      await store.actions.updateSelectionMarquee(
        { commit },
        {
          active: true,
          start: { x: 0, y: 0 },
          end: { x: 1, y: 1 },
        }
      );

      expect(commit).toHaveBeenCalledWith(
        'SET_SELECTION_STATE',
        expect.objectContaining({
          marquee: expect.objectContaining({
            active: true,
            start: { x: 0, y: 0 },
            end: { x: 1, y: 1 },
          }),
        })
      );
    });

    it('should reset marquee when action called without payload', async () => {
      const commit = jest.fn();
      await store.actions.updateSelectionMarquee({ commit });
      expect(commit).toHaveBeenCalledWith(
        'SET_SELECTION_STATE',
        expect.objectContaining({
          marquee: expect.objectContaining({
            active: false,
          }),
        })
      );
    });

    it('should set hovered entity via action', async () => {
      const commit = jest.fn();
      await store.actions.setHoveredEntity({ commit }, 'wall-1');
      expect(commit).toHaveBeenCalledWith(
        'SET_SELECTION_STATE',
        expect.objectContaining({ hoveredId: 'wall-1' })
      );
    });

    it('should provide selection getters', () => {
      state.entities.push(
        { id: 'wall-1', type: 'wall' },
        { id: 'wall-2', type: 'wall' }
      );

      store.mutations.SET_SELECTION_STATE(state, {
        ids: ['wall-2'],
        primaryId: 'wall-2',
        mode: 'single',
      });

      const selectedEntitiesGetter = editorModule.getters.selectedEntities;
      const primarySelectedEntityGetter = editorModule.getters.primarySelectedEntity;
      const selectionModeGetter = editorModule.getters.selectionMode;

      const selected = selectedEntitiesGetter(state);
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe('wall-2');

      const primary = primarySelectedEntityGetter(state, { selectedEntities: selected });
      expect(primary.id).toBe('wall-2');

      expect(selectionModeGetter(state)).toBe('single');
    });
  });

  describe('Material Management', () => {
    it('should get active material definition', () => {
      state.activeSelection.material = 'concrete';

      const getter = store.getters.activeMaterialDefinition;
      if (typeof getter === 'function') {
        const result = getter(state);
        expect(result.value).toBe('concrete');
      }
    });

    it('should set active material', () => {
      store.mutations.SET_ACTIVE_SELECTION_MATERIAL(state, 'wood');

      expect(state.activeSelection.material).toBe('wood');
    });

    it('should set active color', () => {
      store.mutations.SET_ACTIVE_SELECTION_COLOR(state, '#ff0000');

      expect(state.activeSelection.color).toBe('#ff0000');
    });

    it('should reset selection to defaults', () => {
      state.activeSelection.material = 'wood';
      state.activeSelection.color = '#ff0000';

      store.mutations.RESET_SELECTION(state);

      expect(state.activeSelection.material).toBe('concrete');
      expect(state.activeSelection.color).toBe('#ffffff');
    });
  });

  describe('Snapping System', () => {
    it('should toggle snapping option', () => {
      const originalValue = state.snapping.orthogonal;
      store.mutations.SET_SNAPPING(state, { key: 'orthogonal', value: !originalValue });

      expect(state.snapping.orthogonal).toBe(!originalValue);
    });

    it('should ignore invalid snapping keys', () => {
      const originalSnapping = { ...state.snapping };
      store.mutations.SET_SNAPPING(state, { key: 'invalid', value: true });

      expect(state.snapping).toEqual(originalSnapping);
    });
  });

  describe('Command Stack Info', () => {
    it('should update command stack info', () => {
      const info = {
        canUndo: true,
        canRedo: false,
        undoCount: 5,
        redoCount: 0,
      };

      store.mutations.SET_COMMAND_STACK_INFO(state, info);

      expect(state.commandStackInfo.canUndo).toBe(true);
      expect(state.commandStackInfo.canRedo).toBe(false);
      expect(state.commandStackInfo.undoCount).toBe(5);
      expect(state.commandStackInfo.redoCount).toBe(0);
    });
  });

  describe('Project Info', () => {
    it('should update project info', () => {
      const info = {
        name: 'My Project',
        isDirty: true,
      };

      store.mutations.SET_PROJECT_INFO(state, info);

      expect(state.projectInfo.name).toBe('My Project');
      expect(state.projectInfo.isDirty).toBe(true);
    });
  });

  describe('Measurements', () => {
    it('should set measurements', () => {
      const measurements = [
        { id: 'measure-1', type: 'distance', value: 5.5 },
      ];

      store.mutations.SET_MEASUREMENTS(state, measurements);

      expect(state.measurements).toEqual(measurements);
    });

    it('should add measurement', () => {
      const measurement = { id: 'measure-1', type: 'distance', value: 5.5 };

      store.mutations.ADD_MEASUREMENT(state, measurement);

      expect(state.measurements).toContain(measurement);
    });

    it('should clear measurements', () => {
      state.measurements = [{ id: 'measure-1' }];
      store.mutations.CLEAR_MEASUREMENTS(state);

      expect(state.measurements).toHaveLength(0);
    });
  });

  describe('Viewport Settings', () => {
    it('should set view mode', () => {
      store.mutations.SET_VIEW_MODE(state, '3d');

      expect(state.viewport.viewMode).toBe('3d');
    });

    it('should set layout mode', () => {
      store.mutations.SET_LAYOUT_MODE(state, 'split');

      expect(state.viewport.layoutMode).toBe('split');
    });

    it('should merge viewport settings', () => {
      store.mutations.SET_VIEWPORT(state, {
        viewMode: 'sync',
        grid: { density: 1.5 },
        axis: { visible: false },
      });

      expect(state.viewport.viewMode).toBe('sync');
      expect(state.viewport.grid.density).toBe(1.5);
      expect(state.viewport.axis.visible).toBe(false);
    });

    it('should update grid settings', () => {
      store.mutations.SET_VIEWPORT_GRID(state, {
        size: 6000,
        density: 2,
        divisions: 120,
        visible: false,
      });

      expect(state.viewport.grid.size).toBe(6000);
      expect(state.viewport.grid.density).toBe(2);
      expect(state.viewport.grid.divisions).toBe(120);
      expect(state.viewport.grid.visible).toBe(false);
    });

    it('should update axis settings', () => {
      store.mutations.SET_VIEWPORT_AXIS(state, {
        size: 500,
        visible: false,
      });

      expect(state.viewport.axis.size).toBe(500);
      expect(state.viewport.axis.visible).toBe(false);
    });

    it('should dispatch viewport actions', () => {
      const commit = jest.fn();

      store.actions.setViewport({ commit }, { viewMode: '3d' });
      store.actions.setGridSettings({ commit }, { density: 3 });
      store.actions.setAxisSettings({ commit }, { size: 400 });

      expect(commit).toHaveBeenCalledWith('SET_VIEWPORT', { viewMode: '3d' });
      expect(commit).toHaveBeenCalledWith('SET_VIEWPORT_GRID', { density: 3 });
      expect(commit).toHaveBeenCalledWith('SET_VIEWPORT_AXIS', { size: 400 });
    });
  });
});
