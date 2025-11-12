/**
 * Property Schema Registry
 * Central registry for all entity property schemas
 */

import { wallSchema } from './walls';
import { doorSchema } from './doors';
import { windowSchema } from './windows';
import { measurementSchema } from './measurements';

// Schema registry
const schemas = new Map();

// Register all schemas
schemas.set('wall', wallSchema);
schemas.set('door', doorSchema);
schemas.set('window', windowSchema);
schemas.set('measurement', measurementSchema);

/**
 * Get schema by entity type
 * @param {string} type - Entity type
 * @returns {Object|null} Schema object or null if not found
 */
export function getSchema(type) {
  return schemas.get(type) || null;
}

/**
 * Get all registered schema types
 * @returns {Array<string>} Array of schema type names
 */
export function getSchemaTypes() {
  return Array.from(schemas.keys());
}

/**
 * Register a new schema
 * @param {string} type - Entity type
 * @param {Object} schema - Schema object
 */
export function registerSchema(type, schema) {
  if (!type || !schema) {
    throw new Error('Type and schema are required');
  }
  schemas.set(type, schema);
}

/**
 * Check if a schema exists for the given type
 * @param {string} type - Entity type
 * @returns {boolean} Whether schema exists
 */
export function hasSchema(type) {
  return schemas.has(type);
}

// Export individual schemas for direct import
export { wallSchema, doorSchema, windowSchema, measurementSchema };
