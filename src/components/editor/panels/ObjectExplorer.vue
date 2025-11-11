<template>
  <section class="sidebar-block object-explorer">
    <header class="block-header">
      <h2>对象层级</h2>
      <div class="header-actions">
        <el-button
          v-if="hasSelection"
          type="text"
          icon="el-icon-delete"
          size="mini"
          class="header-btn"
          @click="handleDeleteSelected"
        >
          删除
        </el-button>
      </div>
    </header>

    <div
      v-if="entities.length === 0"
      class="empty-state"
    >
      <div class="empty-icon">
        <i class="el-icon-folder-opened" />
      </div>
      <p class="empty-text">
        暂无对象
      </p>
    </div>

    <div
      v-else
      class="tree-container"
    >
      <el-tree
        ref="tree"
        :data="treeData"
        :props="treeProps"
        :expand-on-click-node="false"
        :highlight-current="true"
        :default-expanded-keys="defaultExpandedKeys"
        node-key="id"
        @node-click="handleNodeClick"
        @node-contextmenu="handleContextMenu"
      >
        <template #default="{ node, data }">
          <div
            class="tree-node-content"
            :class="{ 'is-selected': isNodeSelected(data) }"
          >
            <div class="node-main">
              <el-checkbox
                v-if="!data.isGroup"
                :value="data.visible !== false"
                :class="{ 'node-checkbox': true, 'is-locked': data.locked }"
                @change="handleVisibilityChange(data, $event)"
                @click.native.stop
              />
              <i
                :class="getNodeIcon(data)"
                class="node-icon"
              />
              <span class="node-label">{{ data.label }}</span>
              <span
                v-if="data.isGroup"
                class="node-count"
              >({{ data.children.length }})</span>
            </div>
            <div
              v-if="!data.isGroup"
              class="node-actions"
            >
              <el-button
                v-if="data.locked"
                type="text"
                icon="el-icon-lock"
                size="mini"
                class="action-btn"
                @click.stop="handleToggleLock(data)"
              />
              <el-button
                v-else
                type="text"
                icon="el-icon-unlock"
                size="mini"
                class="action-btn action-btn-muted"
                @click.stop="handleToggleLock(data)"
              />
            </div>
          </div>
        </template>
      </el-tree>
    </div>

    <el-dropdown
      ref="contextMenu"
      trigger="click"
      placement="bottom-start"
      class="context-menu"
      :style="contextMenuStyle"
      @command="handleContextCommand"
    >
      <span />
      <el-dropdown-menu slot="dropdown">
        <el-dropdown-item
          command="delete"
          icon="el-icon-delete"
        >
          删除
        </el-dropdown-item>
        <el-dropdown-item
          :command="contextNode && contextNode.locked ? 'unlock' : 'lock'"
          :icon="contextNode && contextNode.locked ? 'el-icon-unlock' : 'el-icon-lock'"
        >
          {{ contextNode && contextNode.locked ? '解锁' : '锁定' }}
        </el-dropdown-item>
        <el-dropdown-item
          command="rename"
          icon="el-icon-edit"
        >
          重命名
        </el-dropdown-item>
        <el-dropdown-item
          command="duplicate"
          icon="el-icon-document-copy"
          divided
        >
          复制
        </el-dropdown-item>
      </el-dropdown-menu>
    </el-dropdown>
  </section>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'ObjectExplorer',
  data() {
    return {
      treeProps: {
        children: 'children',
        label: 'label',
      },
      defaultExpandedKeys: [],
      contextNode: null,
      contextMenuStyle: {
        position: 'fixed',
        left: '0px',
        top: '0px',
        visibility: 'hidden',
      },
    };
  },
  computed: {
    ...mapState('editor', {
      entities: (state) => state.entities,
      selection: (state) => state.selection,
    }),
    ...mapState('cad', {
      layers: (state) => state.layers,
    }),
    ...mapGetters('editor', ['selectedEntities']),

    hasSelection() {
      return this.selection.ids && this.selection.ids.length > 0;
    },

    treeData() {
      if (this.entities.length === 0) {
        return [];
      }

      // Group entities by type
      const typeGroups = this.groupEntitiesByType(this.entities);

      return Object.keys(typeGroups).map((type) => ({
        id: `group-${type}`,
        label: this.getTypeLabel(type),
        isGroup: true,
        type,
        children: typeGroups[type].map((entity) => ({
          id: entity.id,
          label: entity.name || `未命名${this.getTypeLabel(entity.type)}`,
          isGroup: false,
          entityId: entity.id,
          type: entity.type,
          visible: entity.visible !== false,
          locked: entity.locked || false,
          layer: entity.layer,
        })),
      }));
    },
  },
  watch: {
    treeData: {
      handler(newData) {
        // Auto-expand all groups by default
        this.defaultExpandedKeys = newData.filter((item) => item.isGroup).map((item) => item.id);
      },
      immediate: true,
    },
    'selection.ids': {
      handler(newIds) {
        // Highlight selected node in tree
        if (this.$refs.tree && newIds && newIds.length > 0) {
          this.$nextTick(() => {
            const firstId = newIds[0];
            if (this.$refs.tree && typeof this.$refs.tree.setCurrentKey === 'function') {
              this.$refs.tree.setCurrentKey(firstId);
            }
          });
        }
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions('editor', ['setSelection', 'removeEntity', 'updateEntityProperty']),

    groupEntitiesByType(entities) {
      const groups = {};
      entities.forEach((entity) => {
        const type = entity.type || 'unknown';
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(entity);
      });
      return groups;
    },

    getTypeLabel(type) {
      const labels = {
        wall: '墙体',
        door: '门',
        window: '窗户',
        measurement: '测量',
        unknown: '其他',
      };
      return labels[type] || type || '未知';
    },

    getNodeIcon(node) {
      if (node.isGroup) {
        return 'el-icon-folder';
      }
      const icons = {
        wall: 'el-icon-minus',
        door: 'el-icon-house',
        window: 'el-icon-receiving',
        measurement: 'el-icon-ruler',
        unknown: 'el-icon-document',
      };
      return icons[node.type] || 'el-icon-document';
    },

    isNodeSelected(node) {
      if (node.isGroup) {
        return false;
      }
      return this.selection.ids && this.selection.ids.includes(node.entityId);
    },

    handleNodeClick(data) {
      if (data.isGroup) {
        return;
      }

      // Check if entity is locked
      if (data.locked) {
        this.$message.warning('该对象已锁定，无法选择');
        return;
      }

      // Set selection in store
      this.setSelection({ ids: [data.entityId], mode: 'replace' });
    },

    handleVisibilityChange(data, visible) {
      if (data.isGroup) {
        return;
      }

      // Update entity visibility through store mutation
      this.$store.commit('editor/UPDATE_ENTITY_PROPERTY', {
        entityId: data.entityId,
        property: 'visible',
        value: visible,
      });

      // Emit event for canvas to update
      this.$emit('visibility-changed', { entityId: data.entityId, visible });
    },

    handleToggleLock(data) {
      if (data.isGroup) {
        return;
      }

      const newLockState = !data.locked;

      // Update entity locked state through store mutation
      this.$store.commit('editor/UPDATE_ENTITY_PROPERTY', {
        entityId: data.entityId,
        property: 'locked',
        value: newLockState,
      });

      this.$message.success(newLockState ? '已锁定对象' : '已解锁对象');
    },

    handleDeleteSelected() {
      if (!this.hasSelection) {
        return;
      }

      this.$confirm('确定删除选中的对象吗？', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          this.selection.ids.forEach((id) => {
            this.removeEntity(id);
          });
          this.$message.success('删除成功');
        })
        .catch(() => {
          // User cancelled
        });
    },

    handleContextMenu(event, data, node, component) {
      if (data.isGroup) {
        return;
      }

      event.preventDefault();
      this.contextNode = data;

      // Position context menu at mouse location
      this.contextMenuStyle = {
        position: 'fixed',
        left: `${event.clientX}px`,
        top: `${event.clientY}px`,
        visibility: 'visible',
      };

      // Trigger dropdown
      this.$nextTick(() => {
        if (this.$refs.contextMenu) {
          this.$refs.contextMenu.show();
        }
      });
    },

    handleContextCommand(command) {
      if (!this.contextNode) {
        return;
      }

      const entity = this.contextNode;

      switch (command) {
        case 'delete':
          this.$confirm('确定删除该对象吗？', '确认删除', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          })
            .then(() => {
              this.removeEntity(entity.entityId);
              this.$message.success('删除成功');
            })
            .catch(() => {
              // User cancelled
            });
          break;
        case 'lock':
        case 'unlock':
          this.handleToggleLock(entity);
          break;
        case 'rename':
          this.$prompt('请输入新名称', '重命名', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputValue: entity.label,
          })
            .then(({ value }) => {
              if (value && value.trim()) {
                this.$store.commit('editor/UPDATE_ENTITY_PROPERTY', {
                  entityId: entity.entityId,
                  property: 'name',
                  value: value.trim(),
                });
                this.$message.success('重命名成功');
              }
            })
            .catch(() => {
              // User cancelled
            });
          break;
        case 'duplicate':
          this.$message.info('复制功能即将推出');
          break;
        default:
          break;
      }

      // Hide context menu
      this.contextMenuStyle.visibility = 'hidden';
      this.contextNode = null;
    },
  },
};
</script>

<style scoped>
.object-explorer {
  margin-top: 20px;
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.block-header h2 {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-btn {
  padding: 4px 8px;
  font-size: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  margin: 0;
}

.tree-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 8px;
}

.tree-node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.tree-node-content.is-selected {
  background-color: #ecf5ff;
}

.node-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.node-checkbox {
  flex-shrink: 0;
}

.node-checkbox.is-locked {
  opacity: 0.5;
}

.node-icon {
  flex-shrink: 0;
  font-size: 14px;
  color: #6b7280;
}

.node-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #374151;
}

.node-count {
  flex-shrink: 0;
  font-size: 12px;
  color: #9ca3af;
  margin-left: 4px;
}

.node-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.tree-node-content:hover .node-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px;
  font-size: 12px;
  color: #6b7280;
}

.action-btn-muted {
  opacity: 0.4;
}

.action-btn:hover {
  color: #2563eb;
}

.context-menu {
  pointer-events: none;
}

/* Override Element UI tree styles */
::v-deep .el-tree {
  background-color: transparent;
}

::v-deep .el-tree-node__content {
  height: auto;
  min-height: 32px;
  padding: 2px 0;
}

::v-deep .el-tree-node__content:hover {
  background-color: #f3f4f6;
}

::v-deep .el-tree-node.is-current > .el-tree-node__content {
  background-color: transparent;
}

::v-deep .el-tree-node__expand-icon {
  color: #9ca3af;
  font-size: 14px;
}

::v-deep .el-checkbox__inner {
  width: 16px;
  height: 16px;
}

::v-deep .el-checkbox__inner::after {
  width: 4px;
  height: 8px;
  left: 5px;
  top: 1px;
}
</style>
