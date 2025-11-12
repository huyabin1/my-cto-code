<template>
  <div class="editor-layout">
    <EditorToolbar
      @new-project="handleNewProject"
      @open-project="handleOpenProject"
      @save-project="handleSaveProject"
      @undo="handleUndo"
      @redo="handleRedo"
    />
    <div class="editor-main">
      <aside class="editor-sidebar">
        <div class="sidebar-content">
          <header class="sidebar-header">
            <div class="header-text">
              <h1>空间编辑器</h1>
              <span class="header-subtitle">组装 CAD 数据并开始绘制墙体</span>
            </div>
            <el-select v-model="selectedUnitModel" size="mini" class="unit-select">
              <el-option
                v-for="option in unitOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </header>

          <section class="sidebar-block">
            <header class="block-header">
              <h2>视图模式</h2>
            </header>
            <el-radio-group v-model="viewModeModel" size="small" class="view-mode-group">
              <el-radio-button label="2d">平面</el-radio-button>
              <el-radio-button label="3d">3D</el-radio-button>
              <el-radio-button label="sync">同步</el-radio-button>
            </el-radio-group>
            <div v-if="viewModeModel === 'sync'" class="layout-options">
              <el-radio-group v-model="layoutModeModel" size="mini">
                <el-radio label="split">分屏</el-radio>
                <el-radio label="floating">悬浮</el-radio>
              </el-radio-group>
            </div>
          </section>

          <section class="sidebar-block">
            <header class="block-header">
              <h2>CAD 导入</h2>
              <el-tag v-if="importStatus !== 'idle'" :type="statusTagType" size="mini">
                {{ importStatusText }}
              </el-tag>
            </header>

            <div class="dxf-upload">
              <el-button
                type="primary"
                size="small"
                icon="el-icon-upload"
                @click="triggerDxfSelect"
              >
                导入 DXF
              </el-button>
              <input
                ref="dxfInput"
                type="file"
                accept=".dxf"
                class="dxf-input"
                @change="onDxfFileChange"
              />
            </div>

            <p v-if="lastImportedFile" class="upload-hint">最新文件：{{ lastImportedFile }}</p>
            <el-alert
              v-if="importError"
              type="error"
              :closable="false"
              show-icon
              class="status-alert"
            >
              {{ importError }}
            </el-alert>
          </section>

          <section class="sidebar-block">
            <header class="block-header">
              <h2>绘制工具</h2>
            </header>
            <div class="block-row">
              <span class="row-label">绘制墙体</span>
              <el-switch v-model="drawToolModel" active-color="#2563eb" inactive-color="#9ca3af" />
            </div>
          </section>

          <SnappingPanel />

          <section
            ref="layerSection"
            class="sidebar-block"
            :class="{ 'panel-highlight': highlightedSections.layers }"
          >
            <header class="block-header">
              <h2>图层可见性</h2>
            </header>
            <el-checkbox-group v-model="layerVisibilityModel" class="layer-list">
              <el-checkbox v-for="layer in layers" :key="layer.id" :label="layer.id">
                {{ layer.name }}
              </el-checkbox>
            </el-checkbox-group>
          </section>

          <section class="sidebar-block">
            <header class="block-header">
              <h2>CAD 不透明度</h2>
            </header>
            <div class="slider-wrapper">
              <el-slider
                v-model="cadOpacityModel"
                :min="0"
                :max="1"
                :step="0.05"
                show-input
                :show-input-controls="false"
                input-size="small"
              />
            </div>
          </section>

          <MeasurementPanel />

          <div
            ref="objectExplorerSection"
            :class="{ 'panel-highlight': highlightedSections.objects }"
          >
            <ObjectExplorer />
          </div>

          <PropertyPanel />

          <UndoRedoPanel />

          <ProjectPanel ref="projectPanel" />
        </div>
      </aside>

      <main class="editor-canvas" :class="canvasLayoutClass">
        <ToolPalette
          :layer-panel-active="highlightedSections.layers"
          :object-explorer-active="highlightedSections.objects"
          @toggle-layer-panel="handleToggleLayerPanel"
          @toggle-object-explorer="handleToggleObjectExplorer"
        />
        <FloorplanViewport
          v-if="viewModeModel === '2d' || viewModeModel === 'sync'"
          ref="floorplanViewport"
          class="canvas-scene"
          :class="{ 'split-view': viewModeModel === 'sync' && layoutModeModel === 'split' }"
        />
        <PreviewViewport
          v-if="viewModeModel === '3d' || viewModeModel === 'sync'"
          ref="previewViewport"
          class="canvas-scene preview-scene"
          :class="previewViewportClass"
        />
      </main>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three';
import { mapState, mapGetters, mapActions } from 'vuex';
import FloorplanViewport from './viewport/FloorplanViewport';
import PreviewViewport from './viewport/PreviewViewport';
import PropertyPanel from './PropertyPanel';
import SnappingPanel from './SnappingPanel';
import MeasurementPanel from './MeasurementPanel';
import UndoRedoPanel from './UndoRedoPanel';
import ProjectPanel from './ProjectPanel';
import ObjectExplorer from './panels/ObjectExplorer';
import EditorToolbar from './tooling/EditorToolbar';
import ToolPalette from './tooling/ToolPalette';

export default {
  name: 'EditorLayout',
  components: {
    PropertyPanel,
    FloorplanViewport,
    PreviewViewport,
    SnappingPanel,
    MeasurementPanel,
    UndoRedoPanel,
    ProjectPanel,
    ObjectExplorer,
    EditorToolbar,
    ToolPalette,
  },
  data() {
    return {
      highlightedSections: {
        layers: false,
        objects: false,
      },
      highlightTimers: {},
    };
  },
  computed: {
    ...mapState('editor', {
      drawWallToolEnabled: (state) => state.drawWallToolEnabled,
      snapping: (state) => state.snapping,
    }),
    ...mapState('viewport', {
      viewport: (state) => state,
    }),
    ...mapState('cad', {
      layers: (state) => state.layers,
      cadOpacity: (state) => state.opacity,
      importStatus: (state) => state.importStatus,
      importError: (state) => state.importError,
      lastImportedFile: (state) => state.lastImportedFile,
      unitOptions: (state) => state.unitOptions,
      selectedUnit: (state) => state.selectedUnit,
    }),
    ...mapGetters('cad', ['visibleLayerIds']),
    drawToolModel: {
      get() {
        return this.drawWallToolEnabled;
      },
      set(value) {
        this.setDrawWallTool(value);
      },
    },
    orthogonalModel: {
      get() {
        return this.snapping.orthogonal;
      },
      set(value) {
        this.setSnapping({ key: 'orthogonal', value });
      },
    },
    diagonalModel: {
      get() {
        return this.snapping.diagonal45;
      },
      set(value) {
        this.setSnapping({ key: 'diagonal45', value });
      },
    },
    gridModel: {
      get() {
        return this.snapping.grid;
      },
      set(value) {
        this.setSnapping({ key: 'grid', value });
      },
    },
    layerVisibilityModel: {
      get() {
        return this.visibleLayerIds;
      },
      set(value) {
        this.setLayerVisibility(value);
      },
    },
    cadOpacityModel: {
      get() {
        return this.cadOpacity;
      },
      set(value) {
        this.setOpacity(value);
      },
    },
    selectedUnitModel: {
      get() {
        return this.selectedUnit;
      },
      set(value) {
        this.setSelectedUnit(value);
      },
    },
    viewModeModel: {
      get() {
        return this.viewport.viewMode;
      },
      set(value) {
        this.setViewMode(value);
      },
    },
    layoutModeModel: {
      get() {
        return this.viewport.layoutMode;
      },
      set(value) {
        this.setLayoutMode(value);
      },
    },
    canvasLayoutClass() {
      if (this.viewModeModel === 'sync' && this.layoutModeModel === 'split') {
        return 'split-layout';
      }
      if (this.viewModeModel === 'sync' && this.layoutModeModel === 'floating') {
        return 'floating-layout';
      }
      return 'single-layout';
    },
    previewViewportClass() {
      if (this.viewModeModel === 'sync' && this.layoutModeModel === 'floating') {
        return 'floating-preview';
      }
      if (this.viewModeModel === 'sync' && this.layoutModeModel === 'split') {
        return 'split-view';
      }
      return '';
    },
    importStatusText() {
      if (this.importStatus === 'processing') {
        return '解析中';
      }
      if (this.importStatus === 'success') {
        return '解析成功';
      }
      if (this.importStatus === 'error') {
        return '解析失败';
      }
      return '';
    },
    statusTagType() {
      if (this.importStatus === 'processing') {
        return 'info';
      }
      if (this.importStatus === 'success') {
        return 'success';
      }
      if (this.importStatus === 'error') {
        return 'danger';
      }
      return 'info';
    },
  },
  provide() {
    return {
      store: this.$store,
    };
  },
  methods: {
    ...mapActions('editor', ['setDrawWallTool', 'setSnapping']),
    ...mapActions('viewport', ['setViewMode', 'setLayoutMode']),
    ...mapActions('cad', [
      'startDxfImport',
      'completeDxfImport',
      'failDxfImport',
      'setOpacity',
      'setSelectedUnit',
      'setLayerVisibility',
    ]),
    triggerDxfSelect() {
      if (this.$refs.dxfInput) {
        this.$refs.dxfInput.click();
      }
    },
    async onDxfFileChange(event) {
      const { files } = event.target;
      if (!files || !files.length) {
        return;
      }
      const [file] = files;
      const extension = file.name.split('.').pop().toLowerCase();
      if (extension !== 'dxf') {
        this.failDxfImport({ fileName: file.name, error: '仅支持 DXF 文件' });
        this.resetFileInput(event.target);
        return;
      }

      this.startDxfImport({ fileName: file.name });

      try {
        // Read file content
        const dxfContent = await this.readFileAsText(file);

        // Import DxfLoader dynamically
        const { default: DxfLoader } = await import('@/three/loader/DxfLoader');

        // Parse DXF with progress callback
        const result = await DxfLoader.parseAsync(dxfContent, {
          targetUnit: this.selectedUnit,
          visibleLayers: this.visibleLayerIds,
          onProgress: (progress, message) => {
            // Update import status with progress
            this.$store.commit(
              'cad/SET_IMPORT_ERROR',
              `${message} (${Math.round(progress * 100)}%)`
            );
          },
        });

        // Update store with parsed data
        await this.processDxfResult(result);

        this.completeDxfImport({ fileName: file.name });
      } catch (error) {
        this.failDxfImport({ fileName: file.name, error: error.message });
      }

      this.resetFileInput(event.target);
    },
    resetFileInput(input) {
      if (input) {
        // eslint-disable-next-line no-param-reassign
        input.value = '';
      }
    },
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('文件读取失败'));
        reader.readAsText(file);
      });
    },
    async processDxfResult(result) {
      // Update layers in store
      if (result.layers && result.layers.length > 0) {
        // Merge with existing layers, preserving visibility settings
        const existingLayers = this.layers;
        const mergedLayers = result.layers.map((newLayer) => {
          const existing = existingLayers.find((l) => l.id === newLayer.id);
          return existing ? { ...existing, name: newLayer.name } : newLayer;
        });

        // Add any existing layers that weren't in the DXF
        existingLayers.forEach((existingLayer) => {
          if (!mergedLayers.find((l) => l.id === existingLayer.id)) {
            mergedLayers.push(existingLayer);
          }
        });

        this.$store.commit('cad/SET_LAYERS', mergedLayers);
      }

      // Add Three.js objects to the scene
      if (result.threeObjects && result.threeObjects.length > 0) {
        const { threeScene } = this.$refs;
        if (threeScene && threeScene.getScene) {
          const scene = threeScene.getScene();

          // Group DXF objects by layer for better organization
          const layerGroups = {};
          result.threeObjects.forEach((obj) => {
            const layerId = obj.userData.layer || '0';
            if (!layerGroups[layerId]) {
              layerGroups[layerId] = new THREE.Group();
              layerGroups[layerId].name = `dxf-layer-${layerId}`;
              layerGroups[layerId].userData = { layerId };
            }
            layerGroups[layerId].add(obj);
          });

          // Add layer groups to scene
          Object.values(layerGroups).forEach((group) => {
            scene.add(group);
          });
        }
      }

      // Map entities to internal format and store them
      if (result.entities && result.entities.length > 0) {
        const { DxfLoader } = await import('@/three/loader/DxfLoader');
        const internalEntities = DxfLoader.mapToInternalEntities(
          result.entities,
          result.conversionFactor
        );

        // Store entities for later use
        this.$store.commit('editor/SET_ENTITIES', internalEntities);
      }
    },
    handleNewProject() {
      const projectPanel = this.$refs.projectPanel;
      if (projectPanel && projectPanel.createNewProject) {
        projectPanel.createNewProject();
      }
    },
    handleOpenProject() {
      const projectPanel = this.$refs.projectPanel;
      if (projectPanel && projectPanel.triggerLoadProject) {
        projectPanel.triggerLoadProject();
      }
    },
    handleSaveProject() {
      const projectPanel = this.$refs.projectPanel;
      if (projectPanel && projectPanel.saveProject) {
        projectPanel.saveProject();
      }
    },
    handleUndo() {
      const { floorplanViewport } = this.$refs;
      if (floorplanViewport && floorplanViewport.getToolController) {
        const toolController = floorplanViewport.getToolController();
        if (toolController) {
          toolController.undo();
        }
      }
    },
    handleRedo() {
      const { floorplanViewport } = this.$refs;
      if (floorplanViewport && floorplanViewport.getToolController) {
        const toolController = floorplanViewport.getToolController();
        if (toolController) {
          toolController.redo();
        }
      }
    },
    handleToggleLayerPanel(show) {
      this.highlightedSections.layers = show;
      if (show) {
        this.scrollIntoView(this.$refs.layerSection);
      }
      this.scheduleHighlightReset('layers', show);
    },
    handleToggleObjectExplorer(show) {
      this.highlightedSections.objects = show;
      if (show) {
        this.scrollIntoView(this.$refs.objectExplorerSection);
      }
      this.scheduleHighlightReset('objects', show);
    },
    scheduleHighlightReset(section, active) {
      if (this.highlightTimers[section]) {
        clearTimeout(this.highlightTimers[section]);
        this.highlightTimers[section] = null;
      }
      if (active) {
        this.highlightTimers[section] = setTimeout(() => {
          this.highlightedSections[section] = false;
          this.highlightTimers[section] = null;
        }, 3000);
      }
    },
    scrollIntoView(element) {
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  },
  beforeDestroy() {
    Object.values(this.highlightTimers).forEach((timer) => {
      if (timer) {
        clearTimeout(timer);
      }
    });
  },
};
</script>

<style scoped>
.editor-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background-color: #f3f4f6;
}

.editor-main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.editor-sidebar {
  width: 320px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  min-width: 280px;
}

.sidebar-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.sidebar-header h1 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.header-subtitle {
  font-size: 12px;
  color: #6b7280;
}

.unit-select {
  min-width: 90px;
}

.sidebar-block + .sidebar-block {
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

.dxf-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dxf-input {
  display: none;
}

.upload-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.status-alert {
  margin-top: 12px;
}

.block-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.row-label {
  font-size: 13px;
  color: #374151;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.panel-highlight {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.4);
  border-radius: 8px;
  transition: box-shadow 0.3s ease;
}

.panel-highlight .sidebar-block,
.panel-highlight .object-explorer {
  border-radius: 8px;
}

.slider-wrapper {
  padding: 0 8px;
}

.editor-canvas {
  flex: 1;
  position: relative;
  background: #1f2937;
  display: flex;
}

.canvas-scene {
  flex: 1;
}

.view-mode-group {
  width: 100%;
}

.layout-options {
  margin-top: 12px;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
}

/* Split layout - side by side */
.split-layout {
  flex-direction: row;
  gap: 2px;
}

.split-layout .canvas-scene {
  flex: 1;
  min-width: 0;
}

.split-layout .split-view {
  border-left: 2px solid #374151;
}

/* Floating layout - 3D preview floats over 2D */
.floating-layout {
  position: relative;
}

.floating-preview {
  position: absolute !important;
  top: 20px;
  right: 20px;
  width: 400px;
  height: 300px;
  border: 2px solid #374151;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  z-index: 100;
  background: #2c3e50;
}

/* Single layout - just one view */
.single-layout .canvas-scene {
  width: 100%;
  height: 100%;
}
</style>
