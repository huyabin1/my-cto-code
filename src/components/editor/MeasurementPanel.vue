<template>
  <section v-if="showMeasurementPanel" class="sidebar-block">
    <header class="block-header">
      <h2>测量工具</h2>
    </header>

    <div class="measurement-controls">
      <div class="tool-buttons">
        <el-button
          v-for="tool in measurementTools"
          :key="tool.key"
          :type="activeTool === tool.key ? 'primary' : 'default'"
          size="small"
          @click="selectTool(tool.key)"
        >
          {{ tool.label }}
        </el-button>
      </div>

      <div v-if="activeTool" class="tool-actions">
        <p class="tool-hint">{{ toolHints[activeTool] }}</p>
        <div class="action-buttons">
          <el-button size="small" @click="clearMeasurements">清空</el-button>
          <el-button type="success" size="small" @click="exportMeasurements">导出</el-button>
        </div>
      </div>
    </div>

    <div v-if="measurements.length > 0" class="measurement-results">
      <header class="results-header">
        <h3>测量结果</h3>
        <span class="result-count">({{ measurements.length }})</span>
      </header>

      <div class="results-list">
        <div v-for="(m, index) in measurements" :key="index" class="result-item">
          <span class="result-type">{{ formatMeasurementType(m.type) }}</span>
          <span class="result-value">{{ formatMeasurementValue(m) }}</span>
          <el-button
            type="text"
            size="small"
            icon="el-icon-delete"
            class="delete-btn"
            @click="removeMeasurement(index)"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'MeasurementPanel',
  data() {
    return {
      measurementTools: [
        { key: 'distance', label: '距离' },
        { key: 'area', label: '面积' },
        { key: 'angle', label: '角度' },
      ],
      toolHints: {
        distance: '点击两个点以测量距离',
        area: '点击至少三个点以围合面积，再次点击完成',
        angle: '点击三个点以测量角度',
      },
      showMeasurementPanel: true,
    };
  },
  computed: {
    ...mapState('editor', {
      activeTool: (state) => state.activeTool,
      measurements: (state) => state.measurements,
    }),
  },
  methods: {
    ...mapActions('editor', ['setActiveTool', 'addMeasurement', 'clearMeasurements']),
    selectTool(toolKey) {
      if (this.activeTool === toolKey) {
        this.setActiveTool(null);
      } else {
        this.setActiveTool(toolKey);
      }
    },
    removeMeasurement(index) {
      const newMeasurements = [...this.measurements];
      newMeasurements.splice(index, 1);
      this.$store.commit('editor/SET_MEASUREMENTS', newMeasurements);
    },
    formatMeasurementType(type) {
      const types = {
        distance: '距离',
        area: '面积',
        angle: '角度',
      };
      return types[type] || type;
    },
    formatMeasurementValue(measurement) {
      if (measurement.type === 'distance') {
        return `${measurement.distance.toFixed(2)} m`;
      }
      if (measurement.type === 'area') {
        return `${measurement.area.toFixed(2)} m²`;
      }
      if (measurement.type === 'angle') {
        return `${measurement.angle.toFixed(2)}°`;
      }
      return '';
    },
    exportMeasurements() {
      const data = {
        timestamp: new Date().toISOString(),
        measurements: this.measurements.map((m) => ({
          type: this.formatMeasurementType(m.type),
          value: this.formatMeasurementValue(m),
          raw: m,
        })),
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `measurements-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      this.$message.success('测量结果已导出');
    },
  },
};
</script>

<style scoped>
.sidebar-block {
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

.measurement-controls {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12px;
  background-color: #f9fafb;
}

.tool-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tool-buttons .el-button {
  flex: 1;
  min-width: 70px;
}

.tool-hint {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-buttons .el-button {
  flex: 1;
}

.measurement-results {
  margin-top: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12px;
  background-color: #f9fafb;
}

.results-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.results-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.result-count {
  font-size: 12px;
  color: #6b7280;
}

.results-list {
  max-height: 200px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
}

.result-item:last-child {
  border-bottom: none;
}

.result-type {
  color: #6b7280;
  min-width: 40px;
}

.result-value {
  color: #111827;
  font-weight: 500;
  flex: 1;
  text-align: right;
  margin-right: 8px;
}

.delete-btn {
  color: #ef4444 !important;
}
</style>
