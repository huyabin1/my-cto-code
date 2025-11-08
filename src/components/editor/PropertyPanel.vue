<template>
  <section class="sidebar-block property-panel">
    <header class="property-header">
      <h2>属性面板</h2>
      <span class="property-subtitle">{{ activeSelection.name }}</span>
    </header>

    <div class="property-field">
      <label class="field-label">墙体材料</label>
      <el-select v-model="selectedMaterial" size="small" class="field-control">
        <el-option
          v-for="material in materials"
          :key="material.value"
          :label="material.label"
          :value="material.value"
        />
      </el-select>
    </div>

    <div class="property-field">
      <label class="field-label">墙体颜色</label>
      <el-color-picker v-model="selectedColor" size="small" class="field-control" />
    </div>
  </section>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { UpdateActiveSelectionCommand } from '@/three/command';

export default {
  name: 'PropertyPanel',
  computed: {
    ...mapState('editor', ['materials', 'activeSelection']),
    selectedMaterial: {
      get() {
        return this.activeSelection.material;
      },
      set(value) {
        this.updateMaterialWithCommand(value);
      },
    },
    selectedColor: {
      get() {
        return this.activeSelection.color;
      },
      set(value) {
        this.updateColorWithCommand(value);
      },
    },
  },
  methods: {
    ...mapActions('editor', ['setActiveMaterial', 'setActiveColor']),

    // 使用命令系统更新材质
    updateMaterialWithCommand(value) {
      // 获取ThreeScene组件的toolController
      const { threeScene } = this.$parent.$refs;
      if (threeScene && threeScene.getToolController) {
        const toolController = threeScene.getToolController();
        if (toolController) {
          toolController.updateActiveSelection('material', value);
        }
      } else {
        // 回退到直接更新
        this.setActiveMaterial(value);
      }
    },

    // 使用命令系统更新颜色
    updateColorWithCommand(value) {
      const { threeScene } = this.$parent.$refs;
      if (threeScene && threeScene.getToolController) {
        const toolController = threeScene.getToolController();
        if (toolController) {
          toolController.updateActiveSelection('color', value);
        }
      } else {
        // 回退到直接更新
        this.setActiveColor(value);
      }
    },
  },
};
</script>

<style scoped>
.property-panel {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
  margin-top: 16px;
}

.property-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.property-header h2 {
  font-size: 14px;
  color: #111827;
  margin: 0;
}

.property-subtitle {
  font-size: 12px;
  color: #6b7280;
}

.property-field + .property-field {
  margin-top: 12px;
}

.field-label {
  display: block;
  font-size: 12px;
  color: #4b5563;
  margin-bottom: 6px;
}

.field-control {
  width: 100%;
}
</style>
