<template>
  <div class="dxf-upload">
    <el-card>
      <div slot="header">
        <span>DXF 文件导入</span>
      </div>

      <div class="upload-section">
        <el-upload
          ref="upload"
          :auto-upload="false"
          :on-change="handleFileChange"
          :file-list="fileList"
          :limit="1"
          accept=".dxf"
          drag
        >
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">将 DXF 文件拖到此处，或<em>点击上传</em></div>
          <div slot="tip" class="el-upload__tip">只支持 .dxf 格式文件</div>
        </el-upload>
      </div>

      <div v-if="showUnitSelection" class="unit-section">
        <el-divider></el-divider>
        <el-form label-width="100px">
          <el-form-item label="检测单位">
            <el-tag type="info">{{ detectedUnitLabel }}</el-tag>
          </el-form-item>
          <el-form-item label="单位设置">
            <el-select v-model="selectedUnit" placeholder="请选择单位" @change="handleUnitChange">
              <el-option
                v-for="option in unitOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="importStatus === 'processing'" class="status-section">
        <el-progress :percentage="100" :indeterminate="true" status="success"></el-progress>
        <p class="status-text">正在解析文件...</p>
      </div>

      <div v-if="importStatus === 'error'" class="status-section">
        <el-alert title="解析失败" :description="importError" type="error" show-icon></el-alert>
      </div>

      <div v-if="importStatus === 'success'" class="status-section">
        <el-alert
          title="导入成功"
          :description="`已导入 ${totalEntities} 个实体，${totalLayers} 个图层`"
          type="success"
          show-icon
        ></el-alert>
      </div>

      <div v-if="dxfLayers.length > 0" class="layers-section">
        <el-divider></el-divider>
        <h4>图层列表</h4>
        <el-checkbox-group v-model="visibleLayerNames">
          <div v-for="layer in dxfLayers" :key="layer.name" class="layer-item">
            <el-checkbox :label="layer.name" @change="handleLayerVisibilityChange(layer.name)">
              {{ layer.name }} ({{ layer.entities.length }})
            </el-checkbox>
          </div>
        </el-checkbox-group>
      </div>

      <div class="actions-section">
        <el-button
          v-if="fileList.length > 0 && importStatus !== 'processing'"
          type="primary"
          @click="handleImport"
        >
          {{ importStatus === 'success' ? '重新导入' : '开始导入' }}
        </el-button>
        <el-button v-if="importStatus === 'success'" @click="handleClear">清除数据</el-button>
      </div>
    </el-card>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import DxfLoader from '@/three/loader/DxfLoader';
import { getUnitLabel } from '@/utils/unitDetection';

/**
 * DXFUpload Component
 *
 * Provides a complete UI for DXF file import with:
 * - File selection via drag-and-drop or click
 * - Automatic unit detection with manual override
 * - Layer visibility management
 * - Real-time status updates and error handling
 *
 * @emits unit-changed When user overrides detected unit
 * @emits layers-changed When layer visibility changes
 * @emits data-cleared When user clears imported data
 */
export default {
  name: 'DXFUpload',
  data() {
    return {
      fileList: [],
      loader: null,
      visibleLayerNames: [],
    };
  },
  computed: {
    ...mapState('cad', [
      'importStatus',
      'importError',
      'detectedUnit',
      'userUnitOverride',
      'dxfLayers',
      'dxfEntities',
      'unitOptions',
    ]),
    ...mapGetters('cad', ['effectiveUnit', 'visibleDxfLayers']),
    selectedUnit: {
      get() {
        return this.effectiveUnit;
      },
      set(value) {
        this.setUserUnitOverride(value === 'auto' ? null : value);
      },
    },
    showUnitSelection() {
      return this.fileList.length > 0 && this.detectedUnit !== 'auto';
    },
    detectedUnitLabel() {
      return getUnitLabel(this.detectedUnit);
    },
    totalEntities() {
      return this.dxfEntities.length;
    },
    totalLayers() {
      return this.dxfLayers.length;
    },
  },
  watch: {
    dxfLayers() {
      this.updateVisibleLayerNames();
    },
  },
  created() {
    this.loader = new DxfLoader();
    this.updateVisibleLayerNames();
  },
  beforeDestroy() {
    if (this.loader) {
      this.loader.dispose();
    }
  },
  methods: {
    ...mapActions('cad', [
      'parseDxfFile',
      'setUserUnitOverride',
      'toggleDxfLayerVisibility',
      'clearDxfData',
    ]),
    handleFileChange(file) {
      this.fileList = [file];
    },
    async handleImport() {
      if (this.fileList.length === 0) {
        this.$message.warning('请选择文件');
        return;
      }

      try {
        await this.parseDxfFile({
          file: this.fileList[0].raw,
          loader: this.loader,
        });
        this.$message.success('DXF 文件导入成功');
      } catch (error) {
        this.$message.error(`导入失败: ${error.message}`);
      }
    },
    handleUnitChange() {
      this.$emit('unit-changed', this.selectedUnit);
    },
    handleLayerVisibilityChange(layerName) {
      this.toggleDxfLayerVisibility(layerName);
      this.$emit('layers-changed', this.visibleDxfLayers);
    },
    handleClear() {
      this.fileList = [];
      this.clearDxfData();
      this.$refs.upload.clearFiles();
      this.$emit('data-cleared');
    },
    updateVisibleLayerNames() {
      this.visibleLayerNames = this.dxfLayers
        .filter((layer) => layer.visible)
        .map((layer) => layer.name);
    },
  },
};
</script>

<style scoped>
.dxf-upload {
  padding: 20px;
}

.upload-section {
  margin-bottom: 20px;
}

.unit-section {
  margin-top: 20px;
}

.status-section {
  margin-top: 20px;
  margin-bottom: 20px;
}

.status-text {
  text-align: center;
  color: #606266;
  margin-top: 10px;
}

.layers-section {
  margin-top: 20px;
}

.layer-item {
  margin-bottom: 8px;
}

.actions-section {
  margin-top: 20px;
  text-align: center;
}

.actions-section .el-button {
  margin: 0 10px;
}

.el-card {
  max-width: 600px;
  margin: 0 auto;
}

h4 {
  margin-bottom: 15px;
  color: #303133;
}
</style>
