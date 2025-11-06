<template>
  <div class="editor-layout">
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
            <h2>CAD 导入</h2>
            <el-tag v-if="importStatus !== 'idle'" :type="statusTagType" size="mini">
              {{ importStatusText }}
            </el-tag>
          </header>

          <div class="dxf-upload">
            <el-button type="primary" size="small" icon="el-icon-upload" @click="triggerDxfSelect">
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

        <section class="sidebar-block">
          <header class="block-header">
            <h2>捕捉设置</h2>
          </header>
          <div class="block-row">
            <span class="row-label">正交捕捉</span>
            <el-switch v-model="orthogonalModel" active-color="#10b981" inactive-color="#9ca3af" />
          </div>
          <div class="block-row">
            <span class="row-label">45° 捕捉</span>
            <el-switch v-model="diagonalModel" active-color="#10b981" inactive-color="#9ca3af" />
          </div>
          <div class="block-row">
            <span class="row-label">网格捕捉</span>
            <el-switch v-model="gridModel" active-color="#10b981" inactive-color="#9ca3af" />
          </div>
        </section>

        <section class="sidebar-block">
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

        <PropertyPanel />
      </div>
    </aside>

    <main class="editor-canvas">
      <ThreeScene class="canvas-scene" />
    </main>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import { parseDxfArrayBuffer } from '@/utils/dxf';
import ThreeScene from './ThreeScene.vue';
import PropertyPanel from './PropertyPanel.vue';

export default {
  name: 'EditorLayout',
  components: {
    PropertyPanel,
    ThreeScene,
  },
  computed: {
    ...mapState('editor', {
      drawWallToolEnabled: (state) => state.drawWallToolEnabled,
      snapping: (state) => state.snapping,
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
  methods: {
    ...mapActions('editor', ['setDrawWallTool', 'setSnapping']),
    ...mapActions('cad', [
      'startDxfImport',
      'completeDxfImport',
      'failDxfImport',
      'setOpacity',
      'setSelectedUnit',
      'setLayerVisibility',
      'setCadData',
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
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        const result = parseDxfArrayBuffer(arrayBuffer);

        if (!result.layers.length) {
          this.setCadData({
            layers: [],
            layerGeometries: {},
            detectedUnit: result.detectedUnit,
          });
          throw new Error('未从 DXF 中解析到可用几何');
        }

        this.setCadData(result);
        this.setSelectedUnit('auto');
        this.completeDxfImport({ fileName: file.name });
      } catch (error) {
        const message = error && error.message ? error.message : '解析失败';
        this.failDxfImport({ fileName: file.name, error: message });
      } finally {
        this.resetFileInput(event.target);
      }
    },
    readFileAsArrayBuffer(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target.result);
        };
        reader.onerror = () => {
          reject(new Error('DXF 文件读取失败'));
        };
        reader.onabort = () => {
          reject(new Error('DXF 文件读取被中断'));
        };
        reader.readAsArrayBuffer(file);
      });
    },
    resetFileInput(target) {
      if (target) {
        target.value = '';
      }
    },
  },
};
</script>

<style scoped>
.editor-layout {
  display: flex;
  height: 100%;
  min-height: 0;
  background-color: #f3f4f6;
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
</style>
