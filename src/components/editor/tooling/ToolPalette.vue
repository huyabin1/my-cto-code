<template>
  <aside class="tool-palette">
    <div class="tool-group">
      <el-tooltip content="选择 (V)" placement="right">
        <button
          class="tool-button"
          :class="{ active: activeTool === 'select' }"
          data-testid="tool-select"
          @click="setTool('select')"
        >
          <i class="el-icon-mouse" />
        </button>
      </el-tooltip>

      <el-tooltip content="绘制墙体 (W)" placement="right">
        <button
          class="tool-button"
          :class="{ active: activeTool === 'wall' }"
          data-testid="tool-wall"
          @click="setTool('wall')"
        >
          <i class="el-icon-menu" />
        </button>
      </el-tooltip>

      <el-tooltip content="添加门 (D)" placement="right">
        <button
          class="tool-button"
          :class="{ active: activeTool === 'door', disabled: true }"
          :disabled="true"
          data-testid="tool-door"
          @click="setTool('door')"
        >
          <i class="el-icon-tickets" />
        </button>
      </el-tooltip>

      <el-tooltip content="添加窗 (N)" placement="right">
        <button
          class="tool-button"
          :class="{ active: activeTool === 'window', disabled: true }"
          :disabled="true"
          data-testid="tool-window"
          @click="setTool('window')"
        >
          <i class="el-icon-postcard" />
        </button>
      </el-tooltip>
    </div>

    <div class="tool-separator" />

    <div class="tool-group">
      <el-tooltip content="测量距离 (M)" placement="right">
        <button
          class="tool-button"
          :class="{ active: activeTool === 'distance' }"
          data-testid="tool-distance"
          @click="setTool('distance')"
        >
          <i class="el-icon-rank" />
        </button>
      </el-tooltip>

      <el-tooltip content="测量面积 (A)" placement="right">
        <button
          class="tool-button"
          :class="{ active: activeTool === 'area' }"
          data-testid="tool-area"
          @click="setTool('area')"
        >
          <i class="el-icon-crop" />
        </button>
      </el-tooltip>

      <el-tooltip content="测量角度 (G)" placement="right">
        <button
          class="tool-button"
          :class="{ active: activeTool === 'angle' }"
          data-testid="tool-angle"
          @click="setTool('angle')"
        >
          <i class="el-icon-set-up" />
        </button>
      </el-tooltip>
    </div>

    <div class="tool-separator" />

    <div class="tool-group">
      <el-tooltip content="图层 (L)" placement="right">
        <button
          class="tool-button"
          :class="{ active: showLayerPanel }"
          data-testid="tool-layers"
          @click="toggleLayerPanel"
        >
          <i class="el-icon-files" />
        </button>
      </el-tooltip>

      <el-tooltip content="对象列表 (O)" placement="right">
        <button
          class="tool-button"
          :class="{ active: showObjectExplorer }"
          data-testid="tool-objects"
          @click="toggleObjectExplorer"
        >
          <i class="el-icon-s-operation" />
        </button>
      </el-tooltip>
    </div>
  </aside>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'ToolPalette',
  props: {
    layerPanelActive: {
      type: Boolean,
      default: false,
    },
    objectExplorerActive: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      showLayerPanel: this.layerPanelActive,
      showObjectExplorer: this.objectExplorerActive,
    };
  },
  computed: {
    ...mapState('editor', {
      drawWallToolEnabled: (state) => state.drawWallToolEnabled,
      editorActiveTool: (state) => state.activeTool,
    }),
    activeTool() {
      if (this.drawWallToolEnabled) {
        return 'wall';
      }
      if (this.editorActiveTool === 'distance') {
        return 'distance';
      }
      if (this.editorActiveTool === 'area') {
        return 'area';
      }
      if (this.editorActiveTool === 'angle') {
        return 'angle';
      }
      return 'select';
    },
  },
  watch: {
    layerPanelActive(value) {
      this.showLayerPanel = value;
    },
    objectExplorerActive(value) {
      this.showObjectExplorer = value;
    },
  },
  mounted() {
    this.setupKeyboardShortcuts();
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeydown);
  },
  methods: {
    ...mapActions('editor', ['setDrawWallTool', 'setActiveTool']),
    setTool(tool) {
      if (tool === 'wall') {
        this.setActiveTool(null);
        this.setDrawWallTool(true);
      } else if (tool === 'distance' || tool === 'area' || tool === 'angle') {
        this.setDrawWallTool(false);
        this.setActiveTool(tool);
      } else if (tool === 'select') {
        this.setDrawWallTool(false);
        this.setActiveTool(null);
      }
    },
    toggleLayerPanel() {
      this.showLayerPanel = !this.showLayerPanel;
      this.$emit('toggle-layer-panel', this.showLayerPanel);
    },
    toggleObjectExplorer() {
      this.showObjectExplorer = !this.showObjectExplorer;
      this.$emit('toggle-object-explorer', this.showObjectExplorer);
    },
    setupKeyboardShortcuts() {
      window.addEventListener('keydown', this.handleKeydown);
    },
    handleKeydown(event) {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const key = event.key.toLowerCase();

      switch (key) {
        case 'v':
          event.preventDefault();
          this.setTool('select');
          break;
        case 'w':
          event.preventDefault();
          this.setTool('wall');
          break;
        case 'm':
          event.preventDefault();
          this.setTool('distance');
          break;
        case 'a':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            this.setTool('area');
          }
          break;
        case 'g':
          event.preventDefault();
          this.setTool('angle');
          break;
        case 'l':
          event.preventDefault();
          this.toggleLayerPanel();
          break;
        case 'o':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            this.toggleObjectExplorer();
          }
          break;
        default:
          break;
      }
    },
  },
};
</script>

<style scoped>
.tool-palette {
  position: absolute;
  left: 16px;
  top: 72px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-separator {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.tool-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 18px;
  padding: 0;
}

.tool-button:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #2563eb;
  color: #2563eb;
}

.tool-button.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.tool-button:disabled,
.tool-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-button:disabled:hover {
  background: #ffffff;
  border-color: #e5e7eb;
  color: #374151;
}

.tool-button i {
  font-size: 18px;
}
</style>
