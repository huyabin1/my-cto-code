<template>
  <div class="property-renderer">
    <div
      v-if="!schema"
      class="no-schema"
    >
      <div class="no-schema-icon">
        <i class="el-icon-warning" />
      </div>
      <div class="no-schema-text">
        <p>当前选中元素类型暂不支持属性编辑</p>
        <p class="no-schema-subtitle">
          类型: {{ entity.type || '未知' }}
        </p>
      </div>
    </div>

    <div
      v-else
      class="schema-properties"
    >
      <h3 class="schema-title">
        {{ schema.title }}
      </h3>
      
      <div
        v-if="isMultiSelect"
        class="multi-select-info"
      >
        <el-alert
          title="多选模式"
          type="info"
          :closable="false"
          show-icon
        >
          <template slot="default">
            已选中 {{ selectedEntities.length }} 个{{ schema.title }}，仅显示共同属性
          </template>
        </el-alert>
      </div>

      <div
        v-for="field in schema.fields"
        :key="field.key"
        class="property-field-wrapper"
      >
        <component
          :is="fieldComponent"
          :field="field"
          :value="getFieldValue(field)"
          :disabled="isMultiSelect && !canEditField(field)"
          @input="handleFieldInput(field, $event)"
          @change="handleFieldChange(field, $event)"
          @blur="handleFieldBlur(field, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { getSchema } from './index';
import { getFieldComponent } from './fields';

export default {
  name: 'PropertyRenderer',
  props: {
    entity: {
      type: Object,
      required: true,
    },
    selectedEntities: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    schema() {
      return getSchema(this.entity.type);
    },
    isMultiSelect() {
      return this.selectedEntities.length > 1;
    },
  },
  methods: {
    getFieldComponent,
    /**
     * Get the appropriate field component for a field type
     */
    fieldComponent(field) {
      return getFieldComponent(field.type);
    },
    /**
     * Get field value for the current entity or aggregated value for multi-select
     */
    getFieldValue(field) {
      if (!this.isMultiSelect) {
        return this.entity[field.key] || field.default;
      }

      // For multi-select, check if all entities have the same value
      const values = this.selectedEntities.map(entity => entity[field.key]);
      const firstValue = values[0];
      const allSame = values.every(value => value === firstValue);
      
      return allSame ? firstValue : null;
    },
    /**
     * Check if a field can be edited in multi-select mode
     */
    canEditField(field) {
      if (!this.isMultiSelect) return true;
      
      // Only allow editing fields that have the same value across all selected entities
      const values = this.selectedEntities.map(entity => entity[field.key]);
      const firstValue = values[0];
      return values.every(value => value === firstValue);
    },
    /**
     * Handle field input event
     */
    handleFieldInput(field, value) {
      if (!this.isMultiSelect) {
        this.updateEntityProperty(this.entity.id, field.key, value);
      } else {
        // Update all selected entities
        this.selectedEntities.forEach(entity => {
          this.updateEntityProperty(entity.id, field.key, value);
        });
      }
    },
    /**
     * Handle field change event
     */
    handleFieldChange(field, value) {
      this.$emit('field-change', {
        field: field.key,
        value,
        entity: this.entity,
        entities: this.selectedEntities,
      });
    },
    /**
     * Handle field blur event
     */
    handleFieldBlur(field, value) {
      this.$emit('field-blur', {
        field: field.key,
        value,
        entity: this.entity,
        entities: this.selectedEntities,
      });
    },
    /**
     * Update entity property using the store action
     */
    async updateEntityProperty(entityId, property, value) {
      try {
        // Get the old value for undo/redo support
        const entity = this.selectedEntities.find(e => e.id === entityId) || this.entity;
        const oldValue = entity[property];

        // Use the store action with command support
        await this.$store.dispatch('editor/updateProperties', {
          entityId,
          property,
          newValue: value,
          oldValue,
        });
      } catch (error) {
        console.error('Failed to update entity property:', error);
        this.$message.error('更新属性失败');
      }
    },
  },
};
</script>

<style scoped>
.property-renderer {
  width: 100%;
}

.no-schema {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: #6b7280;
}

.no-schema-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-schema-text {
  font-size: 14px;
  line-height: 1.5;
}

.no-schema-subtitle {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.schema-properties {
  width: 100%;
}

.schema-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.multi-select-info {
  margin-bottom: 16px;
}

.property-field-wrapper {
  margin-bottom: 0; // Field components already have margin
}

// Import field styles
@import './fields/_styles.scss';
</style>