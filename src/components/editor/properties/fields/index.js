/**
 * Property Field Components
 * Common field components for dynamic property rendering
 */

import PropertyFieldText from './PropertyFieldText.vue';
import PropertyFieldSelect from './PropertyFieldSelect.vue';
import PropertyFieldNumber from './PropertyFieldNumber.vue';
import PropertyFieldColor from './PropertyFieldColor.vue';
import PropertyFieldCheckbox from './PropertyFieldCheckbox.vue';

export {
  PropertyFieldText,
  PropertyFieldSelect,
  PropertyFieldNumber,
  PropertyFieldColor,
  PropertyFieldCheckbox,
};

// Field component mapping
export const fieldComponents = {
  text: PropertyFieldText,
  select: PropertyFieldSelect,
  number: PropertyFieldNumber,
  color: PropertyFieldColor,
  checkbox: PropertyFieldCheckbox,
};

/**
 * Get field component by type
 * @param {string} type - Field type
 * @returns {Component|null} Field component or null if not found
 */
export function getFieldComponent(type) {
  return fieldComponents[type] || null;
}

/**
 * Get all supported field types
 * @returns {Array<string>} Array of field type names
 */
export function getFieldTypes() {
  return Object.keys(fieldComponents);
}
