<template>
  <div class="property-field">
    <label class="field-label" :for="fieldId">{{ field.label }}</label>
    <el-checkbox :id="fieldId" v-model="localValue" :disabled="disabled" @change="handleChange">
      {{ field.checkboxLabel || field.label }}
    </el-checkbox>
    <div v-if="errorMessage" class="field-error">{{ errorMessage }}</div>
  </div>
</template>

<script>
export default {
  name: 'PropertyFieldCheckbox',
  props: {
    field: {
      type: Object,
      required: true,
    },
    value: {
      type: Boolean,
      default: false,
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
    validate() {
      const { validation } = this.field;
      if (!validation) {
        this.errorMessage = '';
        return true;
      }

      // Checkbox validation is usually not needed, but we can add custom rules if needed
      this.errorMessage = '';
      return true;
    },
  },
};
</script>
