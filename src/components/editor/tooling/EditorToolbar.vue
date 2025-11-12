<template>
  <header class="editor-toolbar">
    <div class="toolbar-left">
      <div class="toolbar-brand">
        <i class="el-icon-s-home" />
        <span class="brand-title">{{ projectTitle }}</span>
      </div>
      <div class="toolbar-group">
        <el-tooltip :content="newTooltip" placement="bottom">
          <el-button
            class="toolbar-button"
            icon="el-icon-document-add"
            size="mini"
            data-testid="toolbar-new"
            @click="$emit('new-project')"
          >
            {{ labels.new }}
          </el-button>
        </el-tooltip>

        <el-tooltip :content="openTooltip" placement="bottom">
          <el-button
            class="toolbar-button"
            icon="el-icon-folder-opened"
            size="mini"
            data-testid="toolbar-open"
            @click="$emit('open-project')"
          >
            {{ labels.open }}
          </el-button>
        </el-tooltip>

        <el-tooltip :content="saveTooltip" placement="bottom">
          <el-button
            class="toolbar-button"
            icon="el-icon-folder"
            size="mini"
            data-testid="toolbar-save"
            @click="$emit('save-project')"
          >
            {{ labels.save }}
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="toolbar-right">
      <div class="toolbar-group">
        <el-tooltip :content="undoTooltip" placement="bottom">
          <el-button
            class="toolbar-button"
            type="text"
            icon="el-icon-refresh-left"
            :disabled="!canUndo"
            data-testid="toolbar-undo"
            @click="handleUndo"
          />
        </el-tooltip>

        <el-tooltip :content="redoTooltip" placement="bottom">
          <el-button
            class="toolbar-button"
            type="text"
            icon="el-icon-refresh-right"
            :disabled="!canRedo"
            data-testid="toolbar-redo"
            @click="handleRedo"
          />
        </el-tooltip>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group view-toggle">
        <el-tooltip :content="twoDTooltip" placement="bottom">
          <el-button
            class="toolbar-button"
            :type="isViewMode('2d') ? 'primary' : 'default'"
            size="mini"
            data-testid="view-2d"
            @click="changeViewMode('2d')"
          >
            {{ labels.view2d }}
          </el-button>
        </el-tooltip>

        <el-tooltip :content="threeDTooltip" placement="bottom">
          <el-button
            class="toolbar-button"
            :type="isViewMode('3d') ? 'primary' : 'default'"
            size="mini"
            data-testid="view-3d"
            @click="changeViewMode('3d')"
          >
            {{ labels.view3d }}
          </el-button>
        </el-tooltip>

        <el-tooltip :content="syncTooltip" placement="bottom">
          <el-button
            class="toolbar-button"
            :type="isViewMode('sync') ? 'primary' : 'default'"
            size="mini"
            data-testid="view-sync"
            @click="changeViewMode('sync')"
          >
            {{ labels.viewSync }}
          </el-button>
        </el-tooltip>
      </div>
    </div>
  </header>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'EditorToolbar',
  computed: {
    ...mapState('editor', {
      projectInfo: (state) => state.projectInfo,
      viewport: (state) => state.viewport,
      commandStackInfo: (state) => state.commandStackInfo,
    }),
    projectTitle() {
      const fallback = this.translate('editor.toolbar.projectUntitled', '未命名项目');
      return this.projectInfo?.name || fallback;
    },
    canUndo() {
      return Boolean(this.commandStackInfo?.canUndo);
    },
    canRedo() {
      return Boolean(this.commandStackInfo?.canRedo);
    },
    labels() {
      return {
        new: this.translate('editor.toolbar.new', '新建'),
        open: this.translate('editor.toolbar.open', '打开'),
        save: this.translate('editor.toolbar.save', '保存'),
        view2d: this.translate('editor.toolbar.view2d', '平面'),
        view3d: this.translate('editor.toolbar.view3d', '三维'),
        viewSync: this.translate('editor.toolbar.viewSync', '同步'),
      };
    },
    newTooltip() {
      return `${this.translate('editor.toolbar.newTooltip', '新建项目')} (Ctrl+N)`;
    },
    openTooltip() {
      return `${this.translate('editor.toolbar.openTooltip', '打开项目')} (Ctrl+O)`;
    },
    saveTooltip() {
      return `${this.translate('editor.toolbar.saveTooltip', '保存项目')} (Ctrl+S)`;
    },
    undoTooltip() {
      return `${this.translate('editor.toolbar.undo', '撤销')} (Ctrl+Z)`;
    },
    redoTooltip() {
      return `${this.translate('editor.toolbar.redo', '重做')} (Ctrl+Y)`;
    },
    twoDTooltip() {
      return this.translate('editor.toolbar.view2dTooltip', '切换到二维视图');
    },
    threeDTooltip() {
      return this.translate('editor.toolbar.view3dTooltip', '切换到三维视图');
    },
    syncTooltip() {
      return this.translate('editor.toolbar.viewSyncTooltip', '显示同步视图');
    },
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeydown);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeydown);
  },
  methods: {
    ...mapActions('editor', ['setViewMode']),
    translate(key, fallback) {
      if (typeof this.$t === 'function') {
        const translated = this.$t(key);
        if (translated !== key) {
          return translated;
        }
      }
      return fallback;
    },
    isViewMode(mode) {
      return this.viewport?.viewMode === mode;
    },
    changeViewMode(mode) {
      if (!this.isViewMode(mode)) {
        this.setViewMode(mode);
      }
    },
    handleUndo() {
      if (this.canUndo) {
        this.$emit('undo');
      }
    },
    handleRedo() {
      if (this.canRedo) {
        this.$emit('redo');
      }
    },
    handleKeydown(event) {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      const { ctrlKey, metaKey, shiftKey, key } = event;
      const isModifier = ctrlKey || metaKey;

      if (isModifier && key.toLowerCase() === 'z') {
        event.preventDefault();
        if (shiftKey) {
          this.handleRedo();
        } else {
          this.handleUndo();
        }
        return;
      }

      if (isModifier && key.toLowerCase() === 'y') {
        event.preventDefault();
        this.handleRedo();
        return;
      }

      if (isModifier && key.toLowerCase() === 's') {
        event.preventDefault();
        this.$emit('save-project');
      }

      if (isModifier && key.toLowerCase() === 'n') {
        event.preventDefault();
        this.$emit('new-project');
      }

      if (isModifier && key.toLowerCase() === 'o') {
        event.preventDefault();
        this.$emit('open-project');
      }
    },
  },
};
</script>

<style scoped>
.editor-toolbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #111827;
  color: #f3f4f6;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toolbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.brand-title {
  color: #f9fafb;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
}

.toolbar-button {
  color: inherit;
}

.toolbar-button.el-button--default {
  color: #f3f4f6;
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
}

.toolbar-button.el-button--default:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
  color: #ffffff;
}

.toolbar-button.el-button--primary {
  background: #2563eb;
  border-color: #2563eb;
}

.toolbar-button.el-button--text {
  color: inherit;
}

.toolbar-button.el-button--text.is-disabled {
  color: rgba(255, 255, 255, 0.3);
}

.view-toggle .toolbar-button {
  min-width: 56px;
}
</style>
