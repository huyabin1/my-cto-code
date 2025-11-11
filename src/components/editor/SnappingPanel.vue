<template>
  <section class="sidebar-block">
    <header class="block-header">
      <h2>捕捉设置</h2>
      <el-switch
        v-model="snappingEnabled"
        active-color="#10b981"
        inactive-color="#9ca3af"
      />
    </header>

    <div class="snapping-modes">
      <div class="block-row">
        <span class="row-label">正交捕捉</span>
        <el-switch
          v-model="orthogonalModel"
          active-color="#10b981"
          inactive-color="#9ca3af"
        />
      </div>
      <div class="block-row">
        <span class="row-label">45° 捕捉</span>
        <el-switch
          v-model="diagonalModel"
          active-color="#10b981"
          inactive-color="#9ca3af"
        />
      </div>
      <div class="block-row">
        <span class="row-label">网格捕捉</span>
        <el-switch
          v-model="gridModel"
          active-color="#10b981"
          inactive-color="#9ca3af"
        />
      </div>
      <div class="block-row">
        <span class="row-label">节点捕捉</span>
        <el-switch
          v-model="nodeModel"
          active-color="#10b981"
          inactive-color="#9ca3af"
        />
      </div>
      <div class="block-row">
        <span class="row-label">交点捕捉</span>
        <el-switch
          v-model="intersectionModel"
          active-color="#10b981"
          inactive-color="#9ca3af"
        />
      </div>
    </div>

    <div class="snapping-tolerance">
      <label class="tolerance-label">捕捉容差: {{ toleranceValue.toFixed(2) }} m</label>
      <el-slider
        v-model="toleranceValue"
        :min="0.1"
        :max="2"
        :step="0.1"
        :show-stops="true"
        class="tolerance-slider"
      />
    </div>

    <div
      v-if="snappingInfo"
      class="snapping-info"
    >
      <span class="info-label">捕捉类型：</span>
      <span class="info-value">{{ snappingInfo }}</span>
    </div>
  </section>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'SnappingPanel',
  data() {
    return {
      snappingEnabled: true,
      toleranceValue: 0.5,
      snappingInfo: null,
    };
  },
  computed: {
    ...mapState('editor', {
      snapping: (state) => state.snapping,
    }),
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
    nodeModel: {
      get() {
        return this.snapping.node;
      },
      set(value) {
        this.setSnapping({ key: 'node', value });
      },
    },
    intersectionModel: {
      get() {
        return this.snapping.intersection;
      },
      set(value) {
        this.setSnapping({ key: 'intersection', value });
      },
    },
  },
  mounted() {
    this.$bus = this.$bus || {};
  },
  methods: {
    ...mapActions('editor', ['setSnapping']),
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

.snapping-modes {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12px;
  background-color: #f9fafb;
  margin-bottom: 12px;
}

.block-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.block-row:not(:last-child) {
  border-bottom: 1px solid #e5e7eb;
}

.row-label {
  font-size: 13px;
  color: #374151;
}

.snapping-tolerance {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12px;
  background-color: #f9fafb;
  margin-bottom: 12px;
}

.tolerance-label {
  font-size: 12px;
  color: #374151;
  display: block;
  margin-bottom: 8px;
}

.tolerance-slider {
  margin: 0;
}

.snapping-info {
  padding: 8px 12px;
  border-radius: 4px;
  background-color: #dbeafe;
  border-left: 3px solid #2563eb;
  font-size: 12px;
}

.info-label {
  color: #1e40af;
  font-weight: 600;
}

.info-value {
  color: #1e40af;
  margin-left: 4px;
}
</style>
