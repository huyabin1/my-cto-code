<template>
  <section class="sidebar-block undo-redo-panel">
    <header class="block-header">
      <h2>撤销/重做</h2>
      <div class="action-buttons">
        <el-button
          :disabled="!canUndo"
          size="mini"
          icon="el-icon-refresh-left"
          title="撤销 (Ctrl+Z)"
          @click="undo"
        >
          撤销
        </el-button>
        <el-button
          :disabled="!canRedo"
          size="mini"
          icon="el-icon-refresh-right"
          title="重做 (Ctrl+Y)"
          @click="redo"
        >
          重做
        </el-button>
      </div>
    </header>

    <div class="stack-info">
      <div class="info-row">
        <span class="info-label">撤销栈:</span>
        <span class="info-value">{{ undoCount }}/{{ maxStackSize }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">重做栈:</span>
        <span class="info-value">{{ redoCount }}</span>
      </div>
    </div>

    <div
      v-if="undoHistory.length > 0"
      class="history-section"
    >
      <h3 class="history-title">
        最近操作
      </h3>
      <div class="history-list">
        <div
          v-for="(item, index) in recentHistory"
          :key="item.id"
          class="history-item"
          :class="{ current: index === 0 }"
        >
          <span class="history-description">{{ item.description }}</span>
        </div>
      </div>
    </div>

    <div class="clear-section">
      <el-button
        size="mini"
        type="danger"
        plain
        :disabled="undoCount === 0 && redoCount === 0"
        @click="clearHistory"
      >
        清空历史
      </el-button>
    </div>
  </section>
</template>

<script>
import { mapState } from 'vuex';

export default {
  name: 'UndoRedoPanel',
  computed: {
    ...mapState('editor', ['commandStackInfo']),

    canUndo() {
      return this.commandStackInfo.canUndo;
    },

    canRedo() {
      return this.commandStackInfo.canRedo;
    },

    undoCount() {
      return this.commandStackInfo.undoCount;
    },

    redoCount() {
      return this.commandStackInfo.redoCount;
    },

    maxStackSize() {
      return this.commandStackInfo.maxStackSize;
    },

    undoHistory() {
      return this.commandStackInfo.undoHistory || [];
    },

    redoHistory() {
      return this.commandStackInfo.redoHistory || [];
    },

    recentHistory() {
      // 只显示最近的5个操作
      return this.undoHistory.slice(0, 5);
    },
  },
  methods: {
    undo() {
      const { threeScene } = this.$parent.$refs;
      if (threeScene && threeScene.getToolController) {
        const toolController = threeScene.getToolController();
        if (toolController) {
          toolController.undo();
        }
      }
    },

    redo() {
      const { threeScene } = this.$parent.$refs;
      if (threeScene && threeScene.getToolController) {
        const toolController = threeScene.getToolController();
        if (toolController) {
          toolController.redo();
        }
      }
    },

    clearHistory() {
      this.$confirm('确定要清空所有操作历史吗？此操作不可撤销。', '确认清空', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          const { threeScene } = this.$parent.$refs;
          if (threeScene && threeScene.getToolController) {
            const toolController = threeScene.getToolController();
            if (toolController) {
              toolController.clearCommandStack();
              this.$message.success('操作历史已清空');
            }
          }
        })
        .catch(() => {
          // 用户取消
        });
    },
  },
};
</script>

<style scoped>
.undo-redo-panel {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
  margin-top: 16px;
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

.action-buttons {
  display: flex;
  gap: 6px;
}

.stack-info {
  margin-bottom: 12px;
  padding: 8px;
  background-color: #f9fafb;
  border-radius: 4px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  line-height: 1.5;
}

.info-label {
  color: #6b7280;
}

.info-value {
  color: #111827;
  font-weight: 500;
}

.history-section {
  margin-bottom: 12px;
}

.history-title {
  font-size: 12px;
  color: #374151;
  margin: 0 0 6px 0;
  font-weight: 500;
}

.history-list {
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background-color: #ffffff;
}

.history-item {
  padding: 6px 8px;
  font-size: 11px;
  color: #6b7280;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item.current {
  background-color: #eff6ff;
  color: #1d4ed8;
  font-weight: 500;
}

.history-item.current::before {
  content: '▶';
  margin-right: 6px;
  font-size: 8px;
}

.history-description {
  flex: 1;
  truncate: true;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clear-section {
  text-align: center;
}
</style>
