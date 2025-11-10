<template>
  <section class="sidebar-block property-panel">
    <header class="property-header">
      <h2>属性面板</h2>
      <span v-if="hasSelection" class="property-subtitle">
        {{ selectionInfo }}
      </span>
      <span v-else class="property-subtitle">
        未选中任何元素
      </span>
    </header>

    <div v-if="!hasSelection" class="no-selection">
      <div class="no-selection-icon">
        <i class="el-icon-mouse"></i>
      </div>
      <div class="no-selection-text">
        <p>请选择一个元素以编辑其属性</p>
      </div>
    </div>

    <PropertyRenderer
      v-else
      :entity="activeSelection"
      :selected-entities="selectedEntities"
      @field-change="handleFieldChange"
      @field-blur="handleFieldBlur"
    />
  </section>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import PropertyRenderer from './properties/PropertyRenderer.vue';

export default {
  name: 'PropertyPanel',
  components: {
    PropertyRenderer,
  },
  computed: {
    ...mapState('editor', ['activeSelection', 'entities']),
    
    hasSelection() {
      return this.activeSelection && this.activeSelection.id && this.activeSelection.id !== 'wall-default';
    },
    
    selectedEntities() {
      if (!this.hasSelection) return [];
      
      // For now, use the active selection as a single entity
      // In the future, this could be extended to support multi-selection
      return [this.activeSelection];
    },
    
    selectionInfo() {
      if (!this.hasSelection) return '';
      
      if (this.selectedEntities.length === 1) {
        return `${this.activeSelection.name || '未命名元素'} (${this.getEntityTypeLabel(this.activeSelection.type)})`;
      } else {
        return `已选中 ${this.selectedEntities.length} 个元素`;
      }
    },
  },
  methods: {
    ...mapActions('editor', ['setActiveMaterial', 'setActiveColor']),
    
    /**
     * Get a human-readable label for entity type
     */
    getEntityTypeLabel(type) {
      const typeLabels = {
        wall: '墙体',
        door: '门',
        window: '窗户',
        measurement: '测量',
      };
      return typeLabels[type] || type || '未知';
    },
    
    /**
     * Handle field change events from PropertyRenderer
     */
    handleFieldChange(event) {
      // Log field changes for debugging
      console.log('Property field changed:', event);
      
      // You can add additional logic here, such as:
      // - Analytics tracking
      // - Custom validation
      // - Side effects
    },
    
    /**
     * Handle field blur events from PropertyRenderer
     */
    handleFieldBlur(event) {
      // Log field blur events for debugging
      console.log('Property field blurred:', event);
      
      // You can add additional logic here, such as:
      // - Auto-save triggers
      // - Validation on blur
      // - State synchronization
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
  margin-top: 4px;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: #6b7280;
}

.no-selection-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-selection-text {
  font-size: 14px;
  line-height: 1.5;
}

// Import property renderer styles
@import './properties/fields/_styles.scss';
</style>