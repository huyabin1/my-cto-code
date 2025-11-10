<template>
  <div class="property-field">
    <label class="field-label" :for="fieldId">{{ field.label }}</label>
    <el-input
      :id="fieldId"
      v-model="localValue"
      :placeholder="field.placeholder || ''"
      :disabled="disabled"
      size="small"
      class="field-control"
      @input="handleInput"
      @blur="handleBlur"
    />
    <div v-if="errorMessage" class="field-error">{{ errorMessage }}</div>
  </div>
</template>

<script>
export default {
  name: 'PropertyFieldText',
  props: {
    field: {
      type: Object,
      required: true,
    },
    value: {
      type: [String, Number],
      default: '',
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
    handleInput(value) {
      this.localValue = value;
      this.validate();
      this.$emit('input', value);
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
      if (validation.required && (!value || value.toString().trim() === '')) {
        this.errorMessage = `${this.field.label}是必填项`;
        return false;
      }

      // Min length validation
      if (validation.minLength && value && value.length < validation.minLength) {
        this.errorMessage = `${this.field.label}最少需要${validation.minLength}个字符`;
        return false;
      }

      // Max length validation
      if (validation.maxLength && value && value.length > validation.maxLength) {
        this.errorMessage = `${this.field.label}不能超过${validation.maxLength}个字符`;
        return false;
      }

      // Pattern validation
      if (validation.pattern && value && !validation.pattern.test(value)) {
        this.errorMessage = `${this.field.label}格式不正确`;
        return false;
      }

      this.errorMessage = '';
      return true;
    },
  },
};
</script>