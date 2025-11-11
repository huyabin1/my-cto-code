/**
 * ObjectExplorer Component Tests
 */

import { shallowMount, createLocalVue } from '@vue/test-utils';
import ElementUI from 'element-ui';
import Vuex from 'vuex';
import ObjectExplorer from '@/components/editor/panels/ObjectExplorer.vue';

const localVue = createLocalVue();
localVue.use(ElementUI);
localVue.use(Vuex);

describe('ObjectExplorer', () => {
  let wrapper;
  let store;

  const mockState = {
    editor: {
      entities: [
        {
          id: 'wall-1',
          type: 'wall',
          name: '墙体 A1',
          visible: true,
          locked: false,
        },
        {
          id: 'wall-2',
          type: 'wall',
          name: '墙体 A2',
          visible: true,
          locked: false,
        },
        {
          id: 'door-1',
          type: 'door',
          name: '门 D1',
          visible: false,
          locked: false,
        },
        {
          id: 'window-1',
          type: 'window',
          name: '窗户 W1',
          visible: true,
          locked: true,
        },
      ],
      selection: {
        ids: [],
        primaryId: null,
        mode: 'none',
        hoveredId: null,
        marquee: { active: false, start: null, end: null },
        lastUpdated: 0,
      },
    },
    cad: {
      layers: [
        { id: 'layer-1', name: '结构', visible: true },
        { id: 'layer-2', name: '家具', visible: true },
      ],
    },
  };

  const mockActions = {
    setSelection: jest.fn(),
    removeEntity: jest.fn(),
    updateEntityProperty: jest.fn(),
  };

  beforeEach(() => {
    // Reset mock actions
    Object.keys(mockActions).forEach((key) => {
      mockActions[key].mockClear();
    });

    store = new Vuex.Store({
      modules: {
        editor: {
          namespaced: true,
          state: JSON.parse(JSON.stringify(mockState.editor)),
          mutations: {
            UPDATE_ENTITY_PROPERTY: jest.fn((state, { entityId, property, value }) => {
              const entity = state.entities.find((e) => e.id === entityId);
              if (entity) {
                entity[property] = value;
              }
            }),
          },
          actions: mockActions,
          getters: {
            selectedEntities: (state) =>
              state.selection.ids
                .map((id) => state.entities.find((entity) => entity.id === id))
                .filter(Boolean),
          },
        },
        cad: {
          namespaced: true,
          state: JSON.parse(JSON.stringify(mockState.cad)),
        },
      },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render correctly with entities', () => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      expect(wrapper.find('.object-explorer').exists()).toBe(true);
      expect(wrapper.find('.block-header h2').text()).toBe('对象层级');
      expect(wrapper.find('.tree-container').exists()).toBe(true);
      expect(wrapper.find('.empty-state').exists()).toBe(false);
    });

    it('should render empty state when no entities', () => {
      store.state.editor.entities = [];

      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.find('.empty-text').text()).toBe('暂无对象');
      expect(wrapper.find('.tree-container').exists()).toBe(false);
    });

    it('should show delete button when entities are selected', async () => {
      store.state.editor.selection.ids = ['wall-1'];
      store.state.editor.selection.mode = 'single';

      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      await wrapper.vm.$nextTick();

      const deleteButton = wrapper.find('.header-btn');
      expect(deleteButton.exists()).toBe(true);
      expect(deleteButton.text()).toContain('删除');
    });

    it('should not show delete button when no entities selected', () => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      const deleteButton = wrapper.find('.header-btn');
      expect(deleteButton.exists()).toBe(false);
    });
  });

  describe('Tree Data Generation', () => {
    beforeEach(() => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });
    });

    it('should generate tree data grouped by type', () => {
      const treeData = wrapper.vm.treeData;

      expect(treeData.length).toBe(3); // wall, door, window

      const wallGroup = treeData.find((g) => g.type === 'wall');
      expect(wallGroup).toBeDefined();
      expect(wallGroup.label).toBe('墙体');
      expect(wallGroup.children.length).toBe(2);

      const doorGroup = treeData.find((g) => g.type === 'door');
      expect(doorGroup).toBeDefined();
      expect(doorGroup.label).toBe('门');
      expect(doorGroup.children.length).toBe(1);

      const windowGroup = treeData.find((g) => g.type === 'window');
      expect(windowGroup).toBeDefined();
      expect(windowGroup.label).toBe('窗户');
      expect(windowGroup.children.length).toBe(1);
    });

    it('should include correct entity data in tree nodes', () => {
      const treeData = wrapper.vm.treeData;
      const wallGroup = treeData.find((g) => g.type === 'wall');
      const wall1 = wallGroup.children.find((c) => c.id === 'wall-1');

      expect(wall1).toBeDefined();
      expect(wall1.label).toBe('墙体 A1');
      expect(wall1.entityId).toBe('wall-1');
      expect(wall1.visible).toBe(true);
      expect(wall1.locked).toBe(false);
      expect(wall1.isGroup).toBe(false);
    });

    it('should handle entities without names', () => {
      store.state.editor.entities[0].name = '';

      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      const treeData = wrapper.vm.treeData;
      const wallGroup = treeData.find((g) => g.type === 'wall');
      const wall1 = wallGroup.children.find((c) => c.id === 'wall-1');

      expect(wall1.label).toBe('未命名墙体');
    });

    it('should return empty array when no entities', () => {
      store.state.editor.entities = [];

      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      expect(wrapper.vm.treeData).toEqual([]);
    });
  });

  describe('Node Selection', () => {
    beforeEach(() => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });
    });

    it('should handle node click and call setSelection', () => {
      const node = {
        id: 'wall-1',
        entityId: 'wall-1',
        isGroup: false,
        locked: false,
      };

      wrapper.vm.handleNodeClick(node);

      expect(mockActions.setSelection).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ids: ['wall-1'],
          mode: 'replace',
        })
      );
    });

    it('should not handle click on group nodes', () => {
      const groupNode = {
        id: 'group-wall',
        isGroup: true,
      };

      wrapper.vm.handleNodeClick(groupNode);

      expect(mockActions.setSelection).not.toHaveBeenCalled();
    });

    it('should show warning when clicking locked entity', () => {
      const messageSpy = jest.spyOn(wrapper.vm.$message, 'warning');
      const lockedNode = {
        id: 'window-1',
        entityId: 'window-1',
        isGroup: false,
        locked: true,
      };

      wrapper.vm.handleNodeClick(lockedNode);

      expect(messageSpy).toHaveBeenCalledWith('该对象已锁定，无法选择');
      expect(mockActions.setSelection).not.toHaveBeenCalled();
    });

    it('should correctly identify selected nodes', () => {
      store.state.editor.selection.ids = ['wall-1'];

      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      const selectedNode = { entityId: 'wall-1', isGroup: false };
      const unselectedNode = { entityId: 'wall-2', isGroup: false };
      const groupNode = { isGroup: true };

      expect(wrapper.vm.isNodeSelected(selectedNode)).toBe(true);
      expect(wrapper.vm.isNodeSelected(unselectedNode)).toBe(false);
      expect(wrapper.vm.isNodeSelected(groupNode)).toBe(false);
    });
  });

  describe('Visibility Toggle', () => {
    beforeEach(() => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });
    });

    it('should toggle entity visibility', () => {
      const node = {
        entityId: 'wall-1',
        isGroup: false,
      };

      wrapper.vm.handleVisibilityChange(node, false);

      expect(store._modules.root._children.editor.state.entities[0].visible).toBe(false);
    });

    it('should emit visibility-changed event', () => {
      const node = {
        entityId: 'wall-1',
        isGroup: false,
      };

      wrapper.vm.handleVisibilityChange(node, false);

      expect(wrapper.emitted('visibility-changed')).toBeTruthy();
      expect(wrapper.emitted('visibility-changed')[0]).toEqual([
        { entityId: 'wall-1', visible: false },
      ]);
    });

    it('should not handle visibility change for group nodes', () => {
      const groupNode = {
        isGroup: true,
      };

      const commitSpy = jest.spyOn(store, 'commit');

      wrapper.vm.handleVisibilityChange(groupNode, false);

      expect(commitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Lock/Unlock', () => {
    beforeEach(() => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });
    });

    it('should toggle entity lock state', () => {
      const messageSpy = jest.spyOn(wrapper.vm.$message, 'success');
      const node = {
        entityId: 'wall-1',
        isGroup: false,
        locked: false,
      };

      wrapper.vm.handleToggleLock(node);

      expect(store._modules.root._children.editor.state.entities[0].locked).toBe(true);
      expect(messageSpy).toHaveBeenCalledWith('已锁定对象');
    });

    it('should unlock locked entity', () => {
      const messageSpy = jest.spyOn(wrapper.vm.$message, 'success');
      const node = {
        entityId: 'window-1',
        isGroup: false,
        locked: true,
      };

      wrapper.vm.handleToggleLock(node);

      expect(store._modules.root._children.editor.state.entities[3].locked).toBe(false);
      expect(messageSpy).toHaveBeenCalledWith('已解锁对象');
    });

    it('should not handle lock toggle for group nodes', () => {
      const groupNode = {
        isGroup: true,
      };

      const commitSpy = jest.spyOn(store, 'commit');

      wrapper.vm.handleToggleLock(groupNode);

      expect(commitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Delete Operations', () => {
    beforeEach(() => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });
    });

    it('should show confirmation dialog when deleting selected entities', async () => {
      store.state.editor.selection.ids = ['wall-1', 'wall-2'];
      store.state.editor.selection.mode = 'multi';

      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      const confirmSpy = jest.spyOn(wrapper.vm, '$confirm').mockResolvedValue();
      const messageSpy = jest.spyOn(wrapper.vm.$message, 'success');

      await wrapper.vm.handleDeleteSelected();

      expect(confirmSpy).toHaveBeenCalledWith(
        '确定删除选中的对象吗？',
        '确认删除',
        expect.objectContaining({
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
      );

      await wrapper.vm.$nextTick();

      expect(mockActions.removeEntity).toHaveBeenCalledWith(expect.anything(), 'wall-1');
      expect(mockActions.removeEntity).toHaveBeenCalledWith(expect.anything(), 'wall-2');
      expect(messageSpy).toHaveBeenCalledWith('删除成功');
    });

    it('should not delete when user cancels confirmation', async () => {
      store.state.editor.selection.ids = ['wall-1'];
      store.state.editor.selection.mode = 'single';

      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      const confirmSpy = jest.spyOn(wrapper.vm, '$confirm').mockRejectedValue();

      await wrapper.vm.handleDeleteSelected();

      await wrapper.vm.$nextTick();

      expect(mockActions.removeEntity).not.toHaveBeenCalled();
    });

    it('should not execute delete when no entities selected', () => {
      const confirmSpy = jest.spyOn(wrapper.vm, '$confirm');

      wrapper.vm.handleDeleteSelected();

      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe('Context Menu', () => {
    beforeEach(() => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });
    });

    it('should handle context menu on entity nodes', async () => {
      const event = {
        preventDefault: jest.fn(),
        clientX: 100,
        clientY: 200,
      };

      const node = {
        id: 'wall-1',
        entityId: 'wall-1',
        isGroup: false,
        label: '墙体 A1',
      };

      // Mock the refs to avoid the show method error
      wrapper.vm.$refs.contextMenu = {
        show: jest.fn(),
      };

      wrapper.vm.handleContextMenu(event, node, null, null);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(wrapper.vm.contextNode).toBe(node);
      expect(wrapper.vm.contextMenuStyle.left).toBe('100px');
      expect(wrapper.vm.contextMenuStyle.top).toBe('200px');
      expect(wrapper.vm.contextMenuStyle.visibility).toBe('visible');

      await wrapper.vm.$nextTick();

      expect(wrapper.vm.$refs.contextMenu.show).toHaveBeenCalled();
    });

    it('should not show context menu on group nodes', () => {
      const event = {
        preventDefault: jest.fn(),
        clientX: 100,
        clientY: 200,
      };

      const groupNode = {
        id: 'group-wall',
        isGroup: true,
      };

      wrapper.vm.handleContextMenu(event, groupNode, null, null);

      expect(wrapper.vm.contextNode).toBeNull();
    });

    it('should handle delete command from context menu', async () => {
      wrapper.vm.contextNode = {
        id: 'wall-1',
        entityId: 'wall-1',
        isGroup: false,
      };

      const confirmSpy = jest.spyOn(wrapper.vm, '$confirm').mockResolvedValue();
      const messageSpy = jest.spyOn(wrapper.vm.$message, 'success');

      await wrapper.vm.handleContextCommand('delete');

      expect(confirmSpy).toHaveBeenCalled();

      await wrapper.vm.$nextTick();

      expect(mockActions.removeEntity).toHaveBeenCalledWith(expect.anything(), 'wall-1');
      expect(messageSpy).toHaveBeenCalledWith('删除成功');
    });

    it('should handle rename command from context menu', async () => {
      wrapper.vm.contextNode = {
        id: 'wall-1',
        entityId: 'wall-1',
        isGroup: false,
        label: '墙体 A1',
      };

      const promptSpy = jest.spyOn(wrapper.vm, '$prompt').mockResolvedValue({ value: '新名称' });
      const messageSpy = jest.spyOn(wrapper.vm.$message, 'success');
      const commitSpy = jest.spyOn(store, 'commit');

      await wrapper.vm.handleContextCommand('rename');

      expect(promptSpy).toHaveBeenCalledWith('请输入新名称', '重命名', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: '墙体 A1',
      });

      await wrapper.vm.$nextTick();

      expect(commitSpy).toHaveBeenCalledWith('editor/UPDATE_ENTITY_PROPERTY', {
        entityId: 'wall-1',
        property: 'name',
        value: '新名称',
      });
      expect(messageSpy).toHaveBeenCalledWith('重命名成功');
    });

    it('should handle lock command from context menu', () => {
      wrapper.vm.contextNode = {
        id: 'wall-1',
        entityId: 'wall-1',
        isGroup: false,
        locked: false,
      };

      const messageSpy = jest.spyOn(wrapper.vm.$message, 'success');
      const commitSpy = jest.spyOn(store, 'commit');

      wrapper.vm.handleContextCommand('lock');

      expect(commitSpy).toHaveBeenCalledWith('editor/UPDATE_ENTITY_PROPERTY', {
        entityId: 'wall-1',
        property: 'locked',
        value: true,
      });
      expect(messageSpy).toHaveBeenCalledWith('已锁定对象');
    });

    it('should handle unlock command from context menu', () => {
      wrapper.vm.contextNode = {
        id: 'window-1',
        entityId: 'window-1',
        isGroup: false,
        locked: true,
      };

      const messageSpy = jest.spyOn(wrapper.vm.$message, 'success');
      const commitSpy = jest.spyOn(store, 'commit');

      wrapper.vm.handleContextCommand('unlock');

      expect(commitSpy).toHaveBeenCalledWith('editor/UPDATE_ENTITY_PROPERTY', {
        entityId: 'window-1',
        property: 'locked',
        value: false,
      });
      expect(messageSpy).toHaveBeenCalledWith('已解锁对象');
    });

    it('should show info message for duplicate command', () => {
      wrapper.vm.contextNode = {
        id: 'wall-1',
        entityId: 'wall-1',
        isGroup: false,
      };

      const messageSpy = jest.spyOn(wrapper.vm.$message, 'info');

      wrapper.vm.handleContextCommand('duplicate');

      expect(messageSpy).toHaveBeenCalledWith('复制功能即将推出');
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });
    });

    it('should get correct type labels', () => {
      expect(wrapper.vm.getTypeLabel('wall')).toBe('墙体');
      expect(wrapper.vm.getTypeLabel('door')).toBe('门');
      expect(wrapper.vm.getTypeLabel('window')).toBe('窗户');
      expect(wrapper.vm.getTypeLabel('measurement')).toBe('测量');
      expect(wrapper.vm.getTypeLabel('unknown')).toBe('其他');
      expect(wrapper.vm.getTypeLabel('')).toBe('未知');
      expect(wrapper.vm.getTypeLabel(null)).toBe('未知');
    });

    it('should get correct node icons', () => {
      expect(wrapper.vm.getNodeIcon({ isGroup: true })).toBe('el-icon-folder');
      expect(wrapper.vm.getNodeIcon({ isGroup: false, type: 'wall' })).toBe('el-icon-minus');
      expect(wrapper.vm.getNodeIcon({ isGroup: false, type: 'door' })).toBe('el-icon-house');
      expect(wrapper.vm.getNodeIcon({ isGroup: false, type: 'window' })).toBe('el-icon-receiving');
      expect(wrapper.vm.getNodeIcon({ isGroup: false, type: 'measurement' })).toBe('el-icon-ruler');
      expect(wrapper.vm.getNodeIcon({ isGroup: false, type: 'unknown' })).toBe('el-icon-document');
    });

    it('should group entities by type correctly', () => {
      const entities = [
        { id: '1', type: 'wall' },
        { id: '2', type: 'wall' },
        { id: '3', type: 'door' },
      ];

      const groups = wrapper.vm.groupEntitiesByType(entities);

      expect(groups.wall).toHaveLength(2);
      expect(groups.door).toHaveLength(1);
      expect(groups.wall[0].id).toBe('1');
      expect(groups.wall[1].id).toBe('2');
      expect(groups.door[0].id).toBe('3');
    });
  });

  describe('Computed Properties', () => {
    it('should correctly compute hasSelection', async () => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      // Mock tree ref to prevent watcher errors
      wrapper.vm.$refs.tree = {
        setCurrentKey: jest.fn(),
      };

      expect(wrapper.vm.hasSelection).toBe(false);

      store.state.editor.selection.ids = ['wall-1'];
      store.state.editor.selection.mode = 'single';

      await wrapper.vm.$nextTick();

      expect(wrapper.vm.hasSelection).toBe(true);
    });
  });

  describe('Watchers', () => {
    it('should update default expanded keys when tree data changes', async () => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      expect(wrapper.vm.defaultExpandedKeys.length).toBeGreaterThan(0);
      expect(wrapper.vm.defaultExpandedKeys).toContain('group-wall');
      expect(wrapper.vm.defaultExpandedKeys).toContain('group-door');
      expect(wrapper.vm.defaultExpandedKeys).toContain('group-window');
    });

    it('should highlight node when selection changes', async () => {
      wrapper = shallowMount(ObjectExplorer, {
        localVue,
        store,
      });

      // Mock the tree ref
      wrapper.vm.$refs.tree = {
        setCurrentKey: jest.fn(),
      };

      store.state.editor.selection.ids = ['wall-1'];

      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.$refs.tree.setCurrentKey).toHaveBeenCalledWith('wall-1');
    });
  });
});
