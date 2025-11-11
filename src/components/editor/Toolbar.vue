<template>
  <div class="toolbar">
    <div class="toolbar-section">
      <div class="section-title">
        工具 (快捷键)
      </div>
      <div class="toolbar-buttons">
        <el-button-group>
          <el-tooltip
            content="选择工具 (快捷键: Q)"
            placement="top"
          >
            <el-button
              :type="activeTool === 'select' ? 'primary' : 'default'"
              size="small"
              icon="el-icon-d-arrow"
              @click="selectTool('select')"
            />
          </el-tooltip>
          <el-tooltip
            content="绘制墙体 (快捷键: W)"
            placement="top"
          >
            <el-button
              :type="drawWallToolEnabled ? 'primary' : 'default'"
              size="small"
              icon="el-icon-picture"
              @click="toggleWallTool"
            />
          </el-tooltip>
          <el-tooltip
            content="删除工具 (快捷键: D)"
            placement="top"
          >
            <el-button
              size="small"
              icon="el-icon-delete"
              @click="selectTool('delete')"
            />
          </el-tooltip>
          <el-tooltip
            content="矩形工具 (快捷键: R)"
            placement="top"
          >
            <el-button
              size="small"
              icon="el-icon-s-grid"
              @click="selectTool('rectangle')"
            />
          </el-tooltip>
          <el-tooltip
            content="测量工具 (快捷键: M)"
            placement="top"
          >
            <el-button
              size="small"
              icon="el-icon-s-unfold"
              @click="selectTool('measure')"
            />
          </el-tooltip>
        </el-button-group>
      </div>
    </div>

    <div class="toolbar-section">
      <div class="section-title">
        编辑 (快捷键)
      </div>
      <div class="toolbar-buttons">
        <el-button-group>
          <el-tooltip
            content="撤销 (快捷键: Ctrl+Z)"
            placement="top"
          >
            <el-button
              size="small"
              icon="el-icon-arrow-left"
              :disabled="!canUndo"
              @click="undo"
            />
          </el-tooltip>
          <el-tooltip
            content="重做 (快捷键: Ctrl+Y)"
            placement="top"
          >
            <el-button
              size="small"
              icon="el-icon-arrow-right"
              :disabled="!canRedo"
              @click="redo"
            />
          </el-tooltip>
          <el-tooltip
            content="删除选中 (快捷键: Delete)"
            placement="top"
          >
            <el-button
              size="small"
              icon="el-icon-delete"
              :disabled="!hasSelection"
              @click="deleteSelection"
            />
          </el-tooltip>
        </el-button-group>
      </div>
    </div>

    <div class="toolbar-section">
      <div class="section-title">
        视图 (快捷键)
      </div>
      <div class="toolbar-info">
        <p class="info-item">
          <strong>滚轮缩放:</strong> 鼠标滚轮进行缩放
        </p>
        <p class="info-item">
          <strong>右键平移:</strong> 右键拖拽进行平移
        </p>
        <p class="info-item">
          <strong>空格键:</strong> 按住空格进行平移
        </p>
        <p class="info-item">
          <strong>Escape:</strong> 取消当前操作
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'Toolbar',
  inject: ['store'],
  computed: {
    ...mapState('editor', {
      drawWallToolEnabled: (state) => state.drawWallToolEnabled,
      commandStackInfo: (state) => state.commandStackInfo,
      selection: (state) => state.selection,
    }),
    activeTool() {
      return this.store.state.editor.activeTool;
    },
    canUndo() {
      return this.commandStackInfo && this.commandStackInfo.canUndo;
    },
    canRedo() {
      return this.commandStackInfo && this.commandStackInfo.canRedo;
    },
    hasSelection() {
      return this.selection && this.selection.ids && this.selection.ids.length > 0;
    },
  },
  methods: {
    selectTool(toolName) {
      this.store.dispatch('editor/setActiveTool', toolName);
    },
    toggleWallTool() {
      this.store.dispatch('editor/toggleDrawWallTool');
    },
    undo() {
      const toolController = this.getToolController();
      if (toolController) {
        toolController.undo();
      }
    },
    redo() {
      const toolController = this.getToolController();
      if (toolController) {
        toolController.redo();
      }
    },
    deleteSelection() {
      if (this.hasSelection) {
        this.selection.ids.forEach((id) => {
          this.store.dispatch('editor/removeEntity', id);
        });
        this.store.dispatch('editor/clearSelection');
      }
    },
    getToolController() {
      const floorplanViewport = this.$parent.$refs && this.$parent.$refs.floorplanViewport;
      if (floorplanViewport && floorplanViewport.getToolController) {
        return floorplanViewport.getToolController();
      }
      return null;
    },
  },
};
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toolbar-buttons {
  display: flex;
  gap: 8px;
}

.toolbar-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.info-item {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.info-item strong {
  color: #374151;
  font-weight: 600;
}

::v-deep .el-button-group {
  display: flex;
  gap: 0;
}

::v-deep .el-button-group > .el-button:not(:last-child) {
  margin-right: -1px;
}

::v-deep .el-button {
  border-radius: 4px;
}

::v-deep .el-button:first-child {
  border-radius: 4px 0 0 4px;
}

::v-deep .el-button:last-child {
  border-radius: 0 4px 4px 0;
}
</style>
