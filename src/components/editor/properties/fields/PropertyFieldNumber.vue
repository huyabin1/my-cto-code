<template>
  <div class="property-field">
    <label
      class="field-label"
      :for="fieldId"
    >{{ field.label }}</label>
    <div class="number-input-wrapper">
      <el-input-number
        :id="fieldId"
        v-model="localValue"
        :disabled="disabled"
        :min="field.min"
        :max="field.max"
        :step="field.step || 1"
        :precision="field.precision || 2"
        size="small"
        class="field-control"
        @change="handleChange"
        @blur="handleBlur"
      />
      <span
        v-if="field.unit"
        class="field-unit"
      >{{ field.unit }}</span>
    </div>
    <div
      v-if="errorMessage"
      class="field-error"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'PropertyFieldNumber',
  props: {
    field: {
      type: Object,
      required: true,
    },
    value: {
      type: Number,
      default: 0,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      localValue: this.value,
      errorMessage: '',
    };
  },
  computed: {
    fieldId() {
      return `field-${this.field.key}-${Date.now()}`;
    },
  },
  watch: {
    value(newVal) {
      this.localValue = newVal;
    },
  },
  methods: {
    handleChange(value) {
      this.localValue = value;
      this.validate();
      this.$emit('input', value);
      this.$emit('change', value);
    },
    handleBlur() {
      this.validate();
      this.$emit('blur', this.localValue);
    },
    validate() {
      const { validation } = this.field;
      if (!validation) {
        this.errorMessage = '';
        return true;
      }

      const value = this.localValue;

      // Required validation
      if (validation.required && (value === null || value === undefined || isNaN(value))) {
        this.errorMessage = `${this.field.label}是必填项`;
        return false;
      }

      // Min validation
      if (validation.min !== undefined && value < validation.min) {
        this.errorMessage = `${this.field.label}不能小于${validation.min}`;
        return false;
      }

      // Max validation
      if (validation.max !== undefined && value > validation.max) {
        this.errorMessage = `${this.field.label}不能大于${validation.max}`;
        return false;
      }

      this.errorMessage = '';
      return true;
    },
  },
};
</script>

<style scoped>
.number-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-unit {
  font-size: 12px;
  color: #6b7280;
  min-width: 20px;
}
</style>