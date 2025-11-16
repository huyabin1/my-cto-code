<template>
  <div class="property-field">
    <label class="field-label" :for="fieldId">{{ field.label }}</label>
    <el-color-picker
      :id="fieldId"
      v-model="localValue"
      :disabled="disabled"
      size="small"
      class="field-control"
      @change="handleChange"
      @blur="handleBlur"
    />
    <div v-if="errorMessage" class="field-error">{{ errorMessage }}</div>
  </div>
</template>

<script>
export default {
  name: 'PropertyFieldColor',
  props: {
    field: {
      type: Object,
      required: true,
    },
    value: {
      type: String,
      default: '#ffffff',
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

      // Required validation
      if (validation.required && (!this.localValue || this.localValue === '')) {
        this.errorMessage = `${this.field.label}是必填项`;
        return false;
      }

      // Pattern validation (hex color format)
      if (validation.pattern && this.localValue && !validation.pattern.test(this.localValue)) {
        this.errorMessage = `${this.field.label}必须是有效的颜色格式`;
        return false;
      }

      this.errorMessage = '';
      return true;
    },
  },
};
</script>
